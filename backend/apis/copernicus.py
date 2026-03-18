import os
import requests
from dotenv import load_dotenv

load_dotenv()

COPERNICUS_CLIENT_ID     = os.getenv("COPERNICUS_CLIENT_ID")
COPERNICUS_CLIENT_SECRET = os.getenv("COPERNICUS_CLIENT_SECRET")

TOKEN_URL = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
STAC_URL  = "https://catalogue.dataspace.copernicus.eu/stac/collections/SENTINEL-2/items"


def _get_access_token() -> str:
    payload = {
        "grant_type":    "client_credentials",
        "client_id":     COPERNICUS_CLIENT_ID,
        "client_secret": COPERNICUS_CLIENT_SECRET,
    }
    response = requests.post(TOKEN_URL, data=payload, timeout=30)
    response.raise_for_status()
    return response.json()["access_token"]


def get_copernicus_data(query: str) -> dict | None:
    """
    Query Copernicus STAC API for recent Sentinel-2 imagery.
    Returns normalized data for the Urban Sprawl map layer.
    """
    try:
        # ── Step 1: Get access token ──
        token = _get_access_token()

        headers = {
            "Authorization": f"Bearer {token}",
            "Accept":        "application/json"
        }

        # ── Step 2: Query STAC API — lightweight and fast ──
        params = {
            "limit":    5,
            "sortby":   "-datetime",
        }

        response = requests.get(
            STAC_URL,
            headers=headers,
            params=params,
            timeout=30
        )
        response.raise_for_status()
        data = response.json()

        features = data.get("features", [])

        if not features:
            return {
                "source":   "Copernicus",
                "query":    query,
                "message":  "No recent imagery found",
                "products": []
            }

        # ── Step 3: Normalize results ──
        products = []
        for feature in features:
            props    = feature.get("properties", {})
            geometry = feature.get("geometry", {})
            bbox     = feature.get("bbox", None)

            # Convert bbox array [min_lng, min_lat, max_lng, max_lat] to dict
            bbox_dict = None
            if bbox and len(bbox) == 4:
                bbox_dict = {
                    "min_lng": bbox[0],
                    "min_lat": bbox[1],
                    "max_lng": bbox[2],
                    "max_lat": bbox[3],
                }

            # Extract thumbnail link
            links     = feature.get("links", [])
            thumbnail = next((l.get("href") for l in links if l.get("rel") == "thumbnail"), None)

            products.append({
                "id":           feature.get("id", ""),
                "title":        props.get("title", feature.get("id", "Sentinel-2 Image")),
                "date":         props.get("datetime", "Unknown date"),
                "cloud_cover":  props.get("eo:cloud_cover", "N/A"),
                "platform":     props.get("platform", "Sentinel-2"),
                "bbox":         bbox_dict,
                "thumbnail":    thumbnail,
            })

        return {
            "source":        "Copernicus",
            "query":         query,
            "total_results": len(products),
            "products":      products,
            "layer_type":    "urban_sprawl",
            "description":   "Recent Sentinel-2 satellite imagery showing land cover and urban expansion"
        }

    except requests.exceptions.Timeout:
        raise Exception("Copernicus request timed out")
    except requests.exceptions.ConnectionError:
        raise Exception("Could not connect to Copernicus Data Space")
    except requests.exceptions.HTTPError as e:
        raise Exception(f"Copernicus HTTP error: {str(e)}")
    except KeyError:
        raise Exception("Copernicus authentication failed — check your client ID and secret in .env")
    except Exception as e:
        raise Exception(f"Copernicus error: {str(e)}")