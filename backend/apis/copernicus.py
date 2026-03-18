import os
import requests
from dotenv import load_dotenv

load_dotenv()

COPERNICUS_CLIENT_ID     = os.getenv("COPERNICUS_CLIENT_ID")
COPERNICUS_CLIENT_SECRET = os.getenv("COPERNICUS_CLIENT_SECRET")

TOKEN_URL    = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
CATALOGUE_URL = "https://catalogue.dataspace.copernicus.eu/odata/v1"
SEARCH_URL   = "https://catalogue.dataspace.copernicus.eu/resto/api/collections/Sentinel2/search.json"


def _get_access_token() -> str:
    """
    Authenticate with Copernicus using client credentials
    and return a bearer access token.
    """
    payload = {
        "grant_type":    "client_credentials",
        "client_id":     COPERNICUS_CLIENT_ID,
        "client_secret": COPERNICUS_CLIENT_SECRET,
    }

    response = requests.post(
        TOKEN_URL,
        data=payload,
        timeout=15
    )
    response.raise_for_status()
    token_data = response.json()
    return token_data["access_token"]


def get_copernicus_data(query: str) -> dict | None:
    """
    Query Copernicus Data Space for recent Sentinel-2 imagery
    and land cover data relevant to the searched location.
    Returns normalized data for the Urban Sprawl map layer.
    """
    try:
        # ── Step 1: Get access token ──
        token = _get_access_token()

        headers = {
            "Authorization": f"Bearer {token}",
            "Content-Type":  "application/json"
        }

        # ── Step 2: Search for recent Sentinel-2 imagery ──
        params = {
            "q":             query,
            "maxRecords":    10,
            "sortParam":     "startDate",
            "sortOrder":     "descending",
            "status":        "ONLINE",
            "dataset":       "ESA-DATASET",
            "productType":   "S2MSI2A",   # Sentinel-2 Level-2A (surface reflectance)
            "cloudCover":    "[0,30]",     # max 30% cloud cover
        }

        response = requests.get(
            SEARCH_URL,
            headers=headers,
            params=params,
            timeout=20
        )
        response.raise_for_status()
        data = response.json()

        features = data.get("features", [])
        if not features:
            return {
                "source":   "Copernicus",
                "query":    query,
                "message":  "No recent imagery found for this location",
                "products": []
            }

        # ── Step 3: Normalize results ──
        products = []
        for feature in features[:5]:
            props    = feature.get("properties", {})
            geometry = feature.get("geometry", {})

            # Extract bounding box from geometry
            coords   = geometry.get("coordinates", [[]])[0]
            bbox     = None
            if coords:
                lngs = [c[0] for c in coords if len(c) >= 2]
                lats = [c[1] for c in coords if len(c) >= 2]
                if lngs and lats:
                    bbox = {
                        "min_lat": min(lats),
                        "max_lat": max(lats),
                        "min_lng": min(lngs),
                        "max_lng": max(lngs),
                    }

            products.append({
                "id":           props.get("id", ""),
                "title":        props.get("title", "Sentinel-2 Image"),
                "date":         props.get("startDate", "Unknown date"),
                "cloud_cover":  props.get("cloudCover", "N/A"),
                "platform":     props.get("platform", "Sentinel-2"),
                "bbox":         bbox,
                "thumbnail":    props.get("thumbnail", None),
                "download_url": props.get("services", {}).get("download", {}).get("url", None),
            })

        return {
            "source":        "Copernicus",
            "query":         query,
            "total_results": data.get("properties", {}).get("totalResults", len(products)),
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