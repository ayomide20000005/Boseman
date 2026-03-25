# backend/apis/nominatim.py

import requests
from difflib import SequenceMatcher

BASE_URL = "https://nominatim.openstreetmap.org"

HEADERS = {
    "User-Agent": "Boseman/1.0 (urban snake displacement search engine)"
}

SNAKE_TERMS = [
    "snake", "cobra", "mamba", "python", "viper", "boa",
    "adder", "anaconda", "rattlesnake", "asp", "krait",
    "boomslang", "puff adder", "green mamba", "black mamba",
    "king cobra", "rock python", "ball python", "corn snake",
    "garter snake", "water moccasin", "copperhead", "bushmaster",
    "fer-de-lance", "taipan", "death adder", "sea snake",
    "tree snake", "rat snake", "serpent", "serpentes",
    "venomous", "reptile", "displacement", "sighting"
]


def _parse_query(query: str) -> str | None:
    """
    Strip snake terms to extract location. Returns None if nothing left.
    """
    cleaned = query.lower()
    for term in SNAKE_TERMS:
        cleaned = cleaned.replace(term.lower(), "").strip()
    cleaned = " ".join(cleaned.split())
    return cleaned if cleaned else None


def search_nominatim(query: str) -> dict | None:
    try:
        location = _parse_query(query)

        # If nothing left after stripping snake terms
        # the query is species-only — no location to geocode
        if not location:
            return None

        candidates = _fetch_candidates(location)
        best = _pick_best(candidates, location)

        if not best:
            words = location.split()
            for word in reversed(words):
                if len(word) > 2:
                    candidates = _fetch_candidates(word)
                    best = _pick_best(candidates, word)
                    if best:
                        break

        return best

    except requests.exceptions.Timeout:
        raise Exception("Nominatim request timed out")
    except requests.exceptions.ConnectionError:
        raise Exception("Could not connect to Nominatim API")
    except requests.exceptions.HTTPError as e:
        raise Exception(f"Nominatim HTTP error: {str(e)}")
    except Exception as e:
        raise Exception(f"Nominatim error: {str(e)}")


def _fetch_candidates(query: str) -> list:
    if not query or len(query.strip()) < 2:
        return []

    params = {
        "q":              query,
        "format":         "json",
        "limit":          10,
        "addressdetails": 1,
    }

    response = requests.get(
        f"{BASE_URL}/search",
        headers=HEADERS,
        params=params,
        timeout=10
    )
    response.raise_for_status()
    return response.json()


def _pick_best(candidates: list, query: str) -> dict | None:
    if not candidates:
        return None

    type_priority = {
        "city":           10,
        "town":            9,
        "municipality":    8,
        "administrative":  7,
        "village":         6,
        "suburb":          5,
        "county":          4,
        "state":           3,
        "country":         2,
        "water":           1,
        "other":           0,
    }

    scored = []
    for place in candidates:
        place_type  = place.get("type", "other")
        place_class = place.get("class", "other")
        address     = place.get("address", {})
        importance  = float(place.get("importance", 0))

        city    = address.get("city") or address.get("town") or address.get("village") or ""
        country = address.get("country", "")
        name    = city or place.get("display_name", "").split(",")[0].strip()

        similarity = SequenceMatcher(None, query.lower(), name.lower()).ratio()

        if similarity < 0.6:
            continue

        type_score  = type_priority.get(place_type, 0)
        if place_class == "place":
            type_score += 2

        final_score = (similarity * 5) + type_score + (importance * 2)
        scored.append((final_score, place, city, country, address))

    if not scored:
        return None

    scored.sort(key=lambda x: x[0], reverse=True)
    _, place, city, country, address = scored[0]

    state          = address.get("state", "")
    location_parts = [p for p in [city, state, country] if p]
    display_name   = ", ".join(location_parts) if location_parts else place.get("display_name", query)

    return {
        "source":       "Nominatim",
        "display_name": display_name,
        "latitude":     float(place.get("lat", 0)),
        "longitude":    float(place.get("lon", 0)),
        "country":      country,
        "state":        state,
        "city":         city,
        "type":         place.get("type", ""),
        "importance":   float(place.get("importance", 0)),
        "boundingbox":  place.get("boundingbox", []),
    }