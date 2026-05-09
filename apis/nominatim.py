# apis/nominatim.py

import requests

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


def _strip_snake_terms(query: str) -> str:
    """Strip snake terms to extract just the location portion."""
    cleaned = query.lower()
    for term in sorted(SNAKE_TERMS, key=len, reverse=True):
        cleaned = cleaned.replace(term.lower(), " ")
    return " ".join(cleaned.split()).strip()


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


def _score_candidate(place: dict) -> float:
    """
    Score a Nominatim candidate by type and importance.
    Higher = better match.
    """
    type_priority = {
        "country":        12,
        "state":          11,
        "city":           10,
        "town":            9,
        "municipality":    8,
        "administrative":  7,
        "village":         6,
        "suburb":          5,
        "county":          4,
        "water":           1,
        "other":           0,
    }

    place_type  = place.get("type", "other")
    place_class = place.get("class", "other")
    importance  = float(place.get("importance", 0))

    type_score = type_priority.get(place_type, 0)
    if place_class == "boundary" and place_type in ("administrative", "country", "state"):
        type_score += 3
    if place_class == "place":
        type_score += 2

    return type_score + (importance * 3)


def _normalize(place: dict) -> dict:
    """Convert a raw Nominatim result into Boseman's location format."""
    address  = place.get("address", {})
    city     = (address.get("city") or address.get("town") or
                address.get("village") or address.get("municipality") or "")
    state    = address.get("state", "")
    country  = address.get("country", "")

    location_parts = [p for p in [city, state, country] if p]
    display_name   = ", ".join(location_parts) if location_parts else place.get("display_name", "")

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


def search_nominatim(query: str) -> dict | None:
    try:
        # Strategy 1: Try the full original query first
        # Nominatim is smart — let it parse the full text
        candidates = _fetch_candidates(query)
        if candidates:
            best = max(candidates, key=_score_candidate)
            return _normalize(best)

        # Strategy 2: Strip snake terms and try the location portion
        location_str = _strip_snake_terms(query)
        if location_str and location_str != query.lower():
            candidates = _fetch_candidates(location_str)
            if candidates:
                best = max(candidates, key=_score_candidate)
                return _normalize(best)

        # Strategy 3: Try each word individually, pick best result
        words = query.split()
        all_candidates = []
        for word in words:
            if len(word) > 2 and word.lower() not in [t.lower() for t in SNAKE_TERMS]:
                results = _fetch_candidates(word)
                all_candidates.extend(results)

        if all_candidates:
            best = max(all_candidates, key=_score_candidate)
            return _normalize(best)

        return None

    except requests.exceptions.Timeout:
        raise Exception("Nominatim request timed out")
    except requests.exceptions.ConnectionError:
        raise Exception("Could not connect to Nominatim API")
    except requests.exceptions.HTTPError as e:
        raise Exception(f"Nominatim HTTP error: {str(e)}")
    except Exception as e:
        raise Exception(f"Nominatim error: {str(e)}")