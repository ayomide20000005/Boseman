# backend/apis/gbif.py

import requests

BASE_URL = "https://api.gbif.org/v1"
SERPENTES_KEY = 11592253

SNAKE_TERMS = [
    "snake", "cobra", "mamba", "python", "viper", "boa",
    "adder", "anaconda", "rattlesnake", "asp", "krait",
    "boomslang", "puff adder", "green mamba", "black mamba",
    "king cobra", "rock python", "ball python", "corn snake",
    "garter snake", "water moccasin", "copperhead", "bushmaster",
    "fer-de-lance", "taipan", "death adder", "sea snake",
    "tree snake", "rat snake", "serpent", "serpentes"
]


def _parse_query(query: str) -> tuple[str | None, str | None]:
    q = query.lower().strip()
    found_species = None
    for term in SNAKE_TERMS:
        if term in q:
            found_species = term
            break

    cleaned = q
    for term in SNAKE_TERMS:
        cleaned = cleaned.replace(term.lower(), "").strip()
    cleaned = " ".join(cleaned.split())
    found_location = cleaned if cleaned else None

    return found_species, found_location


def search_gbif(query: str, bbox: dict | None = None) -> list:
    try:
        species, location = _parse_query(query)

        if species and not location:
            return _fetch_occurrences(q=species, bbox=bbox)

        if location and not species:
            return _fetch_occurrences(q=location, bbox=bbox)

        if species and location:
            results = _fetch_occurrences(q=f"{species} {location}", bbox=bbox)
            if not results:
                results = _fetch_occurrences(q=species, bbox=bbox)
            return results

        return _fetch_occurrences(q=query, bbox=bbox)

    except requests.exceptions.Timeout:
        raise Exception("GBIF request timed out")
    except requests.exceptions.ConnectionError:
        raise Exception("Could not connect to GBIF API")
    except requests.exceptions.HTTPError as e:
        raise Exception(f"GBIF HTTP error: {str(e)}")
    except Exception as e:
        raise Exception(f"GBIF error: {str(e)}")


def _fetch_occurrences(q: str, bbox: dict | None = None) -> list:
    params = {
        "q":                  q,
        "taxonKey":           SERPENTES_KEY,
        "limit":              50,
        "hasCoordinate":      True,
        "hasGeospatialIssue": False,
    }

    if bbox:
        # GBIF uses decimalLatitude and decimalLongitude range via geometry
        params["decimalLatitude"]  = f"{bbox.get('min_lat')},{bbox.get('max_lat')}"
        params["decimalLongitude"] = f"{bbox.get('min_lng')},{bbox.get('max_lng')}"

    response = requests.get(
        f"{BASE_URL}/occurrence/search",
        params=params,
        timeout=10
    )
    response.raise_for_status()
    data = response.json()

    results = []
    for occ in data.get("results", []):
        lat = occ.get("decimalLatitude")
        lng = occ.get("decimalLongitude")
        if lat is None or lng is None:
            continue

        species_name = occ.get("species") or occ.get("scientificName", "Unknown species")
        common_name  = occ.get("vernacularName", species_name)
        country      = occ.get("country", "")
        state        = occ.get("stateProvince", "")
        locality     = occ.get("locality", "")

        location_parts = [p for p in [locality, state, country] if p]
        location = ", ".join(location_parts) if location_parts else "Unknown location"

        year  = occ.get("year", "")
        month = occ.get("month", "")
        day   = occ.get("day", "")
        date_parts = [str(p) for p in [year, month, day] if p]
        date = "-".join(date_parts) if date_parts else "Unknown date"

        institution = occ.get("institutionCode", "") or occ.get("datasetName", "Unknown source")

        media = occ.get("media", [])
        photo_url = None
        if media:
            photo_url = media[0].get("identifier")

        results.append({
            "source":      "GBIF",
            "id":          occ.get("key"),
            "species":     species_name,
            "common_name": common_name,
            "location":    location,
            "country":     country,
            "latitude":    lat,
            "longitude":   lng,
            "date":        date,
            "photo_url":   photo_url,
            "institution": institution,
            "basis":       occ.get("basisOfRecord", "Unknown"),
            "url":         f"https://www.gbif.org/occurrence/{occ.get('key')}",
        })

    return results