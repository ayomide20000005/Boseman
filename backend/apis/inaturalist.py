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


def search_inaturalist(query: str) -> list:
    """
    Search iNaturalist for snake observations matching the query.
    Returns a list of normalized sighting objects for the frontend.
    """
    try:
        params = {
            "q":              query,
            "taxon_name":     "Serpentes",   # restrict to snakes only
            "per_page":       50,
            "order":          "desc",
            "order_by":       "created_at",
            "has[]":          "geo",          # only results with coordinates
            "photos":         "true",
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

            # ── Extract photo ──
            photo_url = None
            photos = obs.get("photos", [])
            if photos:
                photo_url = photos[0].get("url", "").replace("square", "medium")

            # ── Extract species name ──
            taxon = obs.get("taxon", {})
            species_name   = taxon.get("name", "Unknown species")
            common_name    = taxon.get("preferred_common_name", species_name)

            # ── Extract place ──
            place = obs.get("place_guess", "Unknown location")

            # ── Extract observer ──
            user = obs.get("user", {})
            observer = user.get("login", "Unknown observer")

            # ── Skip if no coordinates ──
            if lat is None or lng is None:
                continue

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

    except requests.exceptions.Timeout:
        raise Exception("iNaturalist request timed out")
    except requests.exceptions.ConnectionError:
        raise Exception("Could not connect to iNaturalist API")
    except requests.exceptions.HTTPError as e:
        raise Exception(f"iNaturalist HTTP error: {str(e)}")
    except Exception as e:
        raise Exception(f"iNaturalist error: {str(e)}")