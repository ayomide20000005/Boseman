# apis/earth_engine.py

import requests

BASE_URL = "https://data-api.globalforestwatch.org"

HEADERS = {
    "User-Agent": "Boseman/1.0 (urban snake displacement search engine)",
    "Content-Type": "application/json"
}


def get_earth_engine_data(query: str, bbox: dict = None) -> dict | None:
    try:
        if not bbox:
            return None

        min_lng = bbox["min_lng"]
        min_lat = bbox["min_lat"]
        max_lng = bbox["max_lng"]
        max_lat = bbox["max_lat"]

        # Global Forest Watch — tree cover loss API
        # Uses Hansen/UMD dataset, same source GEE was using
        payload = {
            "geometry": {
                "type": "Polygon",
                "coordinates": [[
                    [min_lng, min_lat],
                    [max_lng, min_lat],
                    [max_lng, max_lat],
                    [min_lng, max_lat],
                    [min_lng, min_lat],
                ]]
            }
        }

        response = requests.post(
            f"{BASE_URL}/dataset/umd_tree_cover_loss/latest/query/json",
            headers=HEADERS,
            json=payload,
            timeout=20
        )
        response.raise_for_status()
        data = response.json()

        rows = data.get("data", [])

        if not rows:
            return {
                "source":              "GlobalForestWatch",
                "description":         "Hansen/UMD tree cover loss data",
                "forest_loss_percent": 0.0,
                "total_loss_ha":       0.0,
                "total_cover_ha":      0.0,
            }

        # Sum up tree cover loss across all years returned
        total_loss_ha  = sum(row.get("umd_tree_cover_loss__ha", 0) or 0 for row in rows)
        total_cover_ha = sum(row.get("umd_tree_cover_extent_2000__ha", 0) or 0 for row in rows)

        if total_cover_ha > 0:
            forest_loss_percent = round((total_loss_ha / total_cover_ha) * 100, 2)
        else:
            forest_loss_percent = 0.0

        # Cap at 100 just in case
        forest_loss_percent = min(forest_loss_percent, 100.0)

        return {
            "source":              "GlobalForestWatch",
            "description":         "Hansen/UMD tree cover loss data",
            "forest_loss_percent": forest_loss_percent,
            "total_loss_ha":       round(total_loss_ha, 2),
            "total_cover_ha":      round(total_cover_ha, 2),
        }

    except requests.exceptions.Timeout:
        raise Exception("Global Forest Watch request timed out")
    except requests.exceptions.ConnectionError:
        raise Exception("Could not connect to Global Forest Watch API")
    except requests.exceptions.HTTPError as e:
        raise Exception(f"Global Forest Watch HTTP error: {str(e)}")
    except Exception as e:
        raise Exception(f"Global Forest Watch error: {str(e)}")