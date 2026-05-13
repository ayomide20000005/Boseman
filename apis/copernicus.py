# apis/copernicus.py

import requests

BASE_URL = "https://overpass-api.de/api/interpreter"

HEADERS = {
    "User-Agent": "Boseman/1.0 (urban snake displacement search engine)",
    "Content-Type": "application/x-www-form-urlencoded"
}


def _get_bbox_size(bbox: dict) -> float:
    """Calculate the area of the bounding box in degrees squared."""
    lat_span = abs(bbox["max_lat"] - bbox["min_lat"])
    lng_span = abs(bbox["max_lng"] - bbox["min_lng"])
    return lat_span * lng_span


def _adjust_bbox(bbox: dict) -> dict:
    """
    Make bbox dynamic based on city size.
    Small cities get a wider box, large cities get a tighter one
    to avoid Overpass timeout and get meaningful data.
    """
    size = _get_bbox_size(bbox)

    if size < 0.01:
        # Very small area — pad generously
        pad = 0.05
    elif size < 0.1:
        # Small city — pad slightly
        pad = 0.02
    elif size > 5.0:
        # Very large area — shrink to avoid timeout
        center_lat = (bbox["min_lat"] + bbox["max_lat"]) / 2
        center_lng = (bbox["min_lng"] + bbox["max_lng"]) / 2
        return {
            "min_lat": center_lat - 0.5,
            "max_lat": center_lat + 0.5,
            "min_lng": center_lng - 0.5,
            "max_lng": center_lng + 0.5,
        }
    else:
        pad = 0.0

    return {
        "min_lat": bbox["min_lat"] - pad,
        "max_lat": bbox["max_lat"] + pad,
        "min_lng": bbox["min_lng"] - pad,
        "max_lng": bbox["max_lng"] + pad,
    }


def get_copernicus_data(query: str, bbox: dict = None) -> dict | None:
    try:
        if not bbox:
            return {
                "source":        "OSM Overpass",
                "query":         query,
                "message":       "No bounding box provided",
                "features":      [],
                "urban_percent": 0.0,
            }

        adjusted = _adjust_bbox(bbox)

        min_lat = adjusted["min_lat"]
        min_lng = adjusted["min_lng"]
        max_lat = adjusted["max_lat"]
        max_lng = adjusted["max_lng"]

        overpass_query = f"""
        [out:json][timeout:25];
        (
          way["landuse"="residential"]({min_lat},{min_lng},{max_lat},{max_lng});
          way["landuse"="commercial"]({min_lat},{min_lng},{max_lat},{max_lng});
          way["landuse"="industrial"]({min_lat},{min_lng},{max_lat},{max_lng});
          way["landuse"="retail"]({min_lat},{min_lng},{max_lat},{max_lng});
          way["landuse"="construction"]({min_lat},{min_lng},{max_lat},{max_lng});
          way["building"]({min_lat},{min_lng},{max_lat},{max_lng});
        );
        out count;
        """

        response = requests.post(
            BASE_URL,
            headers=HEADERS,
            data={"data": overpass_query},
            timeout=30
        )
        response.raise_for_status()
        data = response.json()

        # Handle both ways Overpass can return count
        total_count = 0
        elements    = data.get("elements", [])

        for element in elements:
            if element.get("type") == "count":
                tags        = element.get("tags", {})
                total_count = int(tags.get("total", 0))
                break

        # Fallback — if count element not found count elements directly
        if total_count == 0 and elements:
            total_count = len([e for e in elements if e.get("type") in ("way", "node", "relation")])

        # Scale: 0 = 0%, 500+ = 100%
        urban_percent = round(min(total_count / 500 * 100, 100), 2)

        return {
            "source":        "OSM Overpass",
            "query":         query,
            "description":   "OpenStreetMap urban land use and building density data",
            "features":      elements,
            "total_count":   total_count,
            "urban_percent": urban_percent,
        }

    except requests.exceptions.Timeout:
        raise Exception("OSM Overpass request timed out")
    except requests.exceptions.ConnectionError:
        raise Exception("Could not connect to OSM Overpass API")
    except requests.exceptions.HTTPError as e:
        raise Exception(f"OSM Overpass HTTP error: {str(e)}")
    except Exception as e:
        raise Exception(f"OSM Overpass error: {str(e)}")