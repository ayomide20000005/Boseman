# apis/risk_score.py

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
    total = len(sightings) + len(occurrences)
    if total == 0:
        return 0.0
    if location and location.get("boundingbox"):
        try:
            bb       = location["boundingbox"]
            lat_span = abs(float(bb[1]) - float(bb[0]))
            lng_span = abs(float(bb[3]) - float(bb[2]))
            area_km2 = max(lat_span * lng_span * 111 * 111, 1)
            density  = total / area_km2
            score    = min(density * 25, 25)
        except Exception:
            score = min(total / 10 * 25, 25)
    else:
        score = min(total / 50 * 25, 25)
    return round(score, 2)


def _habitat_loss_score(earth_engine: dict) -> float:
    if not earth_engine:
        return 0.0
    forest_loss_percent = earth_engine.get("forest_loss_percent") or 0.0
    return round(25 * max(0, min(forest_loss_percent, 100)) / 100, 2)


def _urban_expansion_score(copernicus: dict) -> float:
    if not copernicus:
        return 0.0
    count = len(copernicus.get("features", []))
    return round(min(count / 10 * 25, 25), 2)


def _proximity_score(sightings: list, occurrences: list, location: dict) -> float:
    if not location:
        return 0.0
    all_results = sightings + occurrences
    if not all_results:
        return 0.0
    city_lat = location.get("latitude")
    city_lng = location.get("longitude")
    if not city_lat or not city_lng:
        return 0.0
    lats = [r["latitude"]  for r in all_results if r.get("latitude") and r.get("longitude")]
    lngs = [r["longitude"] for r in all_results if r.get("latitude") and r.get("longitude")]
    if not lats:
        return 0.0
    centroid_lat = sum(lats) / len(lats)
    centroid_lng = sum(lngs) / len(lngs)
    R    = 6371
    dlat = math.radians(centroid_lat - city_lat)
    dlng = math.radians(centroid_lng - city_lng)
    a    = math.sin(dlat/2)**2 + math.cos(math.radians(city_lat)) * math.cos(math.radians(centroid_lat)) * math.sin(dlng/2)**2
    dist = R * 2 * math.asin(math.sqrt(a))
    return round(max(0, 25 * math.exp(-dist / 40)), 2)


def compute_risk_score(
    sightings:    list,
    occurrences:  list,
    location:     dict,
    earth_engine: dict,
    copernicus:   dict,
) -> dict:
    density_score   = _density_score(sightings, occurrences, location)
    habitat_score   = _habitat_loss_score(earth_engine)
    urban_score     = _urban_expansion_score(copernicus)
    proximity_score = _proximity_score(sightings, occurrences, location)

    total = min(round(density_score + habitat_score + urban_score + proximity_score, 1), 100)
    band  = _get_band(total)

    city = "this area"
    if location:
        city = location.get("city") or location.get("display_name", "this area")

    interpretations = {
        "Low":      f"Low displacement pressure detected in {city}. Snake sightings appear to be within natural range.",
        "Moderate": f"Moderate displacement signals in {city}. Some habitat pressure detected — worth monitoring.",
        "High":     f"High displacement risk in {city}. Significant urban pressure and habitat loss detected near sighting clusters.",
        "Critical": f"Critical displacement risk in {city}. Sightings are concentrated in urban areas with major habitat loss — active displacement likely.",
    }

    return {
        "score":          total,
        "label":          band["label"],
        "color":          band["color"],
        "interpretation": interpretations.get(band["label"], f"Displacement risk assessed for {city}."),
        "components": {
            "density":   {"score": density_score,   "label": "Sighting Density",  "max": 25},
            "habitat":   {"score": habitat_score,   "label": "Habitat Loss",       "max": 25},
            "urban":     {"score": urban_score,     "label": "Urban Expansion",    "max": 25},
            "proximity": {"score": proximity_score, "label": "Urban Proximity",    "max": 25},
        },
    }