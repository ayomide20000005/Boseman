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
    "venomous", "reptile", "displacement", "urban", "sighting"
]


def search_nominatim(query: str) -> dict | None:
    """
    Geocode a location from the search query using Nominatim.
    Strips snake-related terms to extract the location cleanly.
    """
    try:
        # ── Step 1: Try geocoding the full query first ──
        result = _geocode(query)

        # ── Step 2: Strip snake terms and retry with clean location ──
        if not result:
            cleaned = _clean_location(query)
            if cleaned and cleaned.lower() != query.lower():
                result = _geocode(cleaned)

        # ── Step 3: If still no result try each word individually ──
        if not result:
            cleaned = _clean_location(query)
            words = cleaned.split()
            for word in reversed(words):
                if len(word) > 2:
                    result = _geocode(word)
                    if result:
                        break

        return result

    except requests.exceptions.Timeout:
        raise Exception("Nominatim request timed out")
    except requests.exceptions.ConnectionError:
        raise Exception("Could not connect to Nominatim API")
    except requests.exceptions.HTTPError as e:
        raise Exception(f"Nominatim HTTP error: {str(e)}")
    except Exception as e:
        raise Exception(f"Nominatim error: {str(e)}")


def _clean_location(query: str) -> str:
    """
    Strip snake-related and non-location terms from query.
    """
    cleaned = query
    for term in SNAKE_TERMS:
        cleaned = cleaned.lower().replace(term.lower(), "").strip()
    cleaned = " ".join(cleaned.split())
    return cleaned


def _geocode(query: str) -> dict | None:
    """
    Internal function to perform the actual geocoding request.
    """
    if not query or len(query.strip()) < 2:
        return None

    params = {
        "q":              query,
        "format":         "json",
        "limit":          1,
        "addressdetails": 1,
    }

    response = requests.get(
        f"{BASE_URL}/search",
        headers=HEADERS,
        params=params,
        timeout=10
    )
    response.raise_for_status()
    data = response.json()

    if not data:
        return None

    place   = data[0]
    address = place.get("address", {})

    # ── Build clean display name ──
    city    = address.get("city") or address.get("town") or address.get("village") or ""
    state   = address.get("state", "")
    country = address.get("country", "")

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
        "importance":   place.get("importance", 0),
        "boundingbox":  place.get("boundingbox", []),
    }