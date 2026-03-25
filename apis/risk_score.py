# backend/apis/risk_score.py

import math


RISK_BANDS = [
    (0,  25,  "Low",      "#00b874"),
    (26, 50,  "Moderate", "#f0a500"),
    (51, 75,  "High",     "#f06000"),
    (76, 100, "Critical", "#cc0000"),
]


def _get_band(score: float) -> dict:
    for low, high, label, color in RISK_BANDS:
        if low <= score <= high:
            return {"label": label, "color": color}
    return {"label": "Unknown", "color": "#888"}


def _density_score(sightings: list, occurrences: list, location: dict) -> float:
    """
    Score 0-25 based on total sighting count relative to location area.
    More sightings in a bounded area = higher pressure.
    """
    total = len(sightings) + len(occurrences)
    if total == 0:
        return 0.0

    # If we have a bounding box, normalize by area
    if location and location.get("boundingbox"):
        try:
            bb       = location["boundingbox"]
            lat_span = abs(float(bb[1]) - float(bb[0]))
            lng_span = abs(float(bb[3]) - float(bb[2]))
            area_km2 = lat_span * lng_span * 111 * 111
            area_km2 = max(area_km2, 1)
            density  = total / area_km2
            # Normalize: 1 sighting/km² = full score
            score    = min(density * 25, 25)
        except Exception:
            score = min(total / 10 * 25, 25)
    else:
        # No bbox — just use raw count, 50 sightings = full score
        score = min(total / 50 * 25, 25)

    return round(score, 2)


def _habitat_loss_score(earth_engine: dict) -> float:
    """
    Score 0-25 based on GEE habitat loss data availability and tile presence.
    If GEE returned tile URLs, habitat loss data exists for this area.
    We score based on whether data is present and how recent the loss is.
    """
    if not earth_engine:
        return 0.0

    score = 0.0

    # Tile URL present means GEE successfully computed loss data
    if earth_engine.get("tile_url"):
        score += 15.0

    # NDVI tile present means vegetation health data available
    if earth_engine.get("ndvi_tile_url"):
        score += 10.0

    return round(score, 2)


def _urban_expansion_score(copernicus: dict) -> float:
    """
    Score 0-25 based on Copernicus urban atlas features found near location.
    More urban features = more expansion pressure.
    """
    if not copernicus:
        return 0.0

    features = copernicus.get("features", [])
    count    = len(features)

    if count == 0:
        return 0.0

    # 10 features = full score
    score = min(count / 10 * 25, 25)
    return round(score, 2)


def _proximity_score(sightings: list, occurrences: list, location: dict) -> float:
    """
    Score 0-25 based on how close sighting cluster centroid is to urban center.
    Sightings inside or very close to city = high displacement pressure.
    """
    if not location:
        return 0.0

    all_results = sightings + occurrences
    if not all_results:
        return 0.0

    city_lat = location.get("latitude")
    city_lng = location.get("longitude")

    if not city_lat or not city_lng:
        return 0.0

    # Compute centroid of all sightings
    lats = [r["latitude"]  for r in all_results if r.get("latitude")  and r.get("longitude")]
    lngs = [r["longitude"] for r in all_results if r.get("latitude")  and r.get("longitude")]

    if not lats:
        return 0.0

    centroid_lat = sum(lats) / len(lats)
    centroid_lng = sum(lngs) / len(lngs)

    # Haversine distance in km between centroid and city center
    R    = 6371
    dlat = math.radians(centroid_lat - city_lat)
    dlng = math.radians(centroid_lng - city_lng)
    a    = math.sin(dlat/2)**2 + math.cos(math.radians(city_lat)) * math.cos(math.radians(centroid_lat)) * math.sin(dlng/2)**2
    dist = R * 2 * math.asin(math.sqrt(a))

    # Closer to city center = higher score
    # 0 km = 25, 50km = ~12, 100km+ = 0
    score = max(0, 25 * math.exp(-dist / 40))
    return round(score, 2)


def compute_risk_score(
    sightings:    list,
    occurrences:  list,
    location:     dict,
    earth_engine: dict,
    copernicus:   dict,
) -> dict:
    """
    Compute the Urban Snake Displacement Risk Index (USDRI) for a location.
    Returns a score 0-100 with component breakdown and risk band.
    """
    density_score  = _density_score(sightings, occurrences, location)
    habitat_score  = _habitat_loss_score(earth_engine)
    urban_score    = _urban_expansion_score(copernicus)
    proximity_score= _proximity_score(sightings, occurrences, location)

    total = round(density_score + habitat_score + urban_score + proximity_score, 1)
    total = min(total, 100)

    band = _get_band(total)

    return {
        "score":       total,
        "label":       band["label"],
        "color":       band["color"],
        "components": {
            "density":   {"score": density_score,   "label": "Sighting Density",    "max": 25},
            "habitat":   {"score": habitat_score,   "label": "Habitat Loss",         "max": 25},
            "urban":     {"score": urban_score,     "label": "Urban Expansion",      "max": 25},
            "proximity": {"score": proximity_score, "label": "Urban Proximity",      "max": 25},
        },
        "interpretation": _interpret(total, band["label"], location),
    }


def _interpret(score: float, label: str, location: dict) -> str:
    city = location.get("city") or location.get("display_name", "this area") if location else "this area"
    if label == "Low":
        return f"Low displacement pressure detected in {city}. Snake sightings appear to be within natural range."
    if label == "Moderate":
        return f"Moderate displacement signals in {city}. Some habitat pressure detected — worth monitoring."
    if label == "High":
        return f"High displacement risk in {city}. Significant urban pressure and habitat loss detected near sighting clusters."
    if label == "Critical":
        return f"Critical displacement risk in {city}. Sightings are concentrated in urban areas with major habitat loss — active displacement likely."
    return f"Displacement risk assessed for {city}."