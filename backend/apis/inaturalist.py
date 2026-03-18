import os
import requests
from dotenv import load_dotenv

load_dotenv()

INATURALIST_API_KEY = os.getenv("INATURALIST_API_KEY")
BASE_URL = "https://api.inaturalist.org/v1"

HEADERS = {
    "Authorization": f"Bearer {INATURALIST_API_KEY}",
    "Content-Type": "application/json"
}

SNAKE_TERMS = [
    "snake", "cobra", "mamba", "python", "viper", "boa",
    "adder", "anaconda", "rattlesnake", "asp", "krait",
    "boomslang", "puff adder", "green mamba", "black mamba",
    "king cobra", "rock python", "ball python", "corn snake",
    "garter snake", "water moccasin", "copperhead", "bushmaster",
    "fer-de-lance", "taipan", "death adder", "sea snake",
    "tree snake", "rat snake", "serpent", "serpentes"
]


def _clean_location(query: str) -> str:
    """
    Strip snake-related terms from query to extract the location part.
    """
    cleaned = query
    for term in SNAKE_TERMS:
        cleaned = cleaned.lower().replace(term.lower(), "").strip()
    # Clean up extra spaces
    cleaned = " ".join(cleaned.split())
    return cleaned if cleaned else query


def search_inaturalist(query: str) -> list:
    """
    Search iNaturalist for snake observations matching the query.
    First tries with full query, then with location-only query.
    Returns a list of normalized sighting objects for the frontend.
    """
    try:
        # ── Try 1: Search with full query ──
        results = _fetch_observations(query)

        # ── Try 2: If no results, try with location only ──
        if not results:
            location = _clean_location(query)
            if location and location.lower() != query.lower():
                results = _fetch_observations(location)

        return results

    except requests.exceptions.Timeout:
        raise Exception("iNaturalist request timed out")
    except requests.exceptions.ConnectionError:
        raise Exception("Could not connect to iNaturalist API")
    except requests.exceptions.HTTPError as e:
        raise Exception(f"iNaturalist HTTP error: {str(e)}")
    except Exception as e:
        raise Exception(f"iNaturalist error: {str(e)}")


def _fetch_observations(query: str) -> list:
    """
    Internal function to fetch observations from iNaturalist.
    """
    params = {
        "q":          query,
        "taxon_name": "Serpentes",
        "per_page":   50,
        "order":      "desc",
        "order_by":   "created_at",
        "has[]":      "geo",
        "photos":     "true",
    }

    response = requests.get(
        f"{BASE_URL}/observations",
        headers=HEADERS,
        params=params,
        timeout=10
    )
    response.raise_for_status()
    data = response.json()

    results = []
    for obs in data.get("results", []):
        # ── Extract coordinates ──
        coords = obs.get("location", "")
        lat, lng = None, None
        if coords:
            parts = coords.split(",")
            if len(parts) == 2:
                try:
                    lat = float(parts[0])
                    lng = float(parts[1])
                except ValueError:
                    pass

        if lat is None or lng is None:
            continue

        # ── Extract photo ──
        photo_url = None
        photos = obs.get("photos", [])
        if photos:
            photo_url = photos[0].get("url", "").replace("square", "medium")

        # ── Extract species name ──
        taxon = obs.get("taxon", {})
        species_name = taxon.get("name", "Unknown species")
        common_name  = taxon.get("preferred_common_name", species_name)

        # ── Extract place ──
        place = obs.get("place_guess", "Unknown location")

        # ── Extract observer ──
        user     = obs.get("user", {})
        observer = user.get("login", "Unknown observer")

        results.append({
            "source":        "iNaturalist",
            "id":            obs.get("id"),
            "species":       species_name,
            "common_name":   common_name,
            "location":      place,
            "latitude":      lat,
            "longitude":     lng,
            "date":          obs.get("observed_on", "Unknown date"),
            "photo_url":     photo_url,
            "observer":      observer,
            "url":           f"https://www.inaturalist.org/observations/{obs.get('id')}",
            "quality_grade": obs.get("quality_grade", "casual"),
        })

    return results