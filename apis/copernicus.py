# apis/copernicus.py

import requests

BASE_URL = "https://overpass-api.de/api/interpreter"

HEADERS = {
    "User-Agent": "Boseman/1.0 (urban snake displacement search engine)",
    "Content-Type": "application/x-www-form-urlencoded"
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

        min_lat = bbox["min_lat"]
        min_lng = bbox["min_lng"]
        max_lat = bbox["max_lat"]
        max_lng = bbox["max_lng"]

        # Query OSM for urban land use features inside the bounding box
        # We count buildings, residential, commercial, industrial, retail areas
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

        # Extract total count of urban features
        total_count = 0
        elements = data.get("elements", [])
        for element in elements:
            if element.get("type") == "count":
                tags = element.get("tags", {})
                total_count = int(tags.get("total", 0))
                break

        if total_count == 0 and elements:
            total_count = len(elements)

        # Convert feature count to urban percentage
        # Scale: 0 features = 0%, 500+ features = 100%
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