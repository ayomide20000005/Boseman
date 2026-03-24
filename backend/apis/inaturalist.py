# backend/apis/inaturalist.py

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


def search_inaturalist(query: str, bbox: dict | None = None) -> list:
    try:
        species, location = _parse_query(query)

        if species and not location:
            return _fetch_observations(place_guess=None, taxon_id=85553, bbox=bbox)

        if location and not species:
            return _fetch_observations(place_guess=location, taxon_id=85553, bbox=bbox)

        if species and location:
            results = _fetch_observations(place_guess=location, taxon_id=85553, bbox=bbox)
            if not results:
                results = _fetch_observations(place_guess=None, taxon_id=85553, bbox=bbox)
            return results

        return _fetch_observations(place_guess=query, taxon_id=85553, bbox=bbox)

    except requests.exceptions.Timeout:
        raise Exception("iNaturalist request timed out")
    except requests.exceptions.ConnectionError:
        raise Exception("Could not connect to iNaturalist API")
    except requests.exceptions.HTTPError as e:
        raise Exception(f"iNaturalist HTTP error: {str(e)}")
    except Exception as e:
        raise Exception(f"iNaturalist error: {str(e)}")


def _fetch_observations(place_guess: str | None, taxon_id: int, bbox: dict | None = None) -> list:
    params = {
        "taxon_id":  taxon_id,
        "per_page":  50,
        "order":     "desc",
        "order_by":  "created_at",
        "has[]":     "geo",
        "photos":    "true",
    }

    if bbox:
        # Use bounding box for precise location filtering
        params["nelat"] = bbox.get("max_lat")
        params["nelng"] = bbox.get("max_lng")
        params["swlat"] = bbox.get("min_lat")
        params["swlng"] = bbox.get("min_lng")
    elif place_guess:
        params["place_guess"] = place_guess

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

        photo_url = None
        photos = obs.get("photos", [])
        if photos:
            photo_url = photos[0].get("url", "").replace("square", "medium")

        taxon        = obs.get("taxon", {})
        species_name = taxon.get("name", "Unknown species")
        common_name  = taxon.get("preferred_common_name", species_name)
        place        = obs.get("place_guess", "Unknown location")
        user         = obs.get("user", {})
        observer     = user.get("login", "Unknown observer")

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