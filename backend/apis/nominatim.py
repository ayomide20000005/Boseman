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


def search_nominatim(query: str) -> dict | None:
    """
    Geocode a location from the search query using Nominatim.
    Strips snake terms, prioritizes cities, picks best name match.
    """
    try:
        # ── Step 1: Clean the query ──
        cleaned = _clean_location(query)
        if not cleaned:
            cleaned = query

        # ── Step 2: Try each word in the cleaned query ──
        # Try the full cleaned query first
        candidates = _fetch_candidates(cleaned)
        best = _pick_best(candidates, cleaned)

        # ── Step 3: If no good match try each word separately ──
        if not best:
            words = cleaned.split()
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


def _clean_location(query: str) -> str:
    """Strip snake terms to extract the location part."""
    cleaned = query
    for term in SNAKE_TERMS:
        cleaned = cleaned.lower().replace(term.lower(), "").strip()
    cleaned = " ".join(cleaned.split())
    return cleaned


def _fetch_candidates(query: str) -> list:
    """Fetch top 10 location candidates from Nominatim."""
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
    """
    Pick the best matching location from candidates.
    Prioritizes cities and towns over countries.
    Uses name similarity to avoid wrong matches like Lagos vs Laos.
    """
    if not candidates:
        return None

    # ── Priority order for place types ──
    type_priority = {
        "city":             10,
        "town":             9,
        "municipality":     8,
        "administrative":   7,
        "village":          6,
        "suburb":           5,
        "county":           4,
        "state":            3,
        "country":          2,
        "water":            1,
        "other":            0,
    }

    scored = []
    for place in candidates:
        place_type  = place.get("type", "other")
        place_class = place.get("class", "other")
        address     = place.get("address", {})
        importance  = float(place.get("importance", 0))

        # Get the primary name of this place
        city    = address.get("city") or address.get("town") or address.get("village") or ""
        country = address.get("country", "")
        name    = city or place.get("display_name", "").split(",")[0].strip()

        # ── Name similarity score (0 to 1) ──
        # This prevents "Lagos" from matching "Laos"
        similarity = SequenceMatcher(
            None,
            query.lower(),
            name.lower()
        ).ratio()

        # ── Only keep results where name is similar enough ──
        if similarity < 0.6:
            continue

        # ── Type score ──
        type_score = type_priority.get(place_type, 0)
        if place_class == "place":
            type_score += 2

        # ── Final score combines similarity + type + importance ──
        final_score = (similarity * 5) + type_score + (importance * 2)

        scored.append((final_score, place, city, country, address))

    if not scored:
        return None

    # Pick highest scored
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