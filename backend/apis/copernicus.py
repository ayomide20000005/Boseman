import os
import requests
from dotenv import load_dotenv

load_dotenv()

COPERNICUS_CLIENT_ID     = os.getenv("COPERNICUS_CLIENT_ID")
COPERNICUS_CLIENT_SECRET = os.getenv("COPERNICUS_CLIENT_SECRET")

TOKEN_URL  = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
SEARCH_URL = "https://catalogue.dataspace.copernicus.eu/odata/v1/Products"


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
    Query Copernicus Data Space for recent Sentinel-2 imagery.
    Returns normalized data for the Urban Sprawl map layer.
    """
    try:
        # ── Step 1: Get access token ──
        token = _get_access_token()

        headers = {
            "Authorization": f"Bearer {token}",
            "Accept":        "application/json"
        }

        # ── Step 2: Very simple lightweight query — just top 5 recent products ──
        params = {
            "$filter":  "startswith(Name,'S2A') and Online eq true",
            "$orderby": "ContentDate/Start desc",
            "$top":     5,
            "$select":  "Id,Name,ContentDate,Footprint,Online",
        }

        response = requests.get(
            SEARCH_URL,
            headers=headers,
            params=params,
            timeout=60
        )
        response.raise_for_status()
        data = response.json()

        products_raw = data.get("value", [])

        if not products_raw:
            return {
                "source":   "Copernicus",
                "query":    query,
                "message":  "No recent imagery found",
                "products": []
            }

        # ── Step 3: Normalize results ──
        products = []
        for item in products_raw:
            footprint = item.get("Footprint", "")
            bbox = None
            if footprint:
                try:
                    coords_str = footprint.replace("geography'SRID=4326;POLYGON ((", "").replace("))'", "")
                    coord_pairs = coords_str.strip().split(",")
                    lngs, lats = [], []
                    for pair in coord_pairs:
                        parts = pair.strip().split()
                        if len(parts) == 2:
                            lngs.append(float(parts[0]))
                            lats.append(float(parts[1]))
                    if lngs and lats:
                        bbox = {
                            "min_lat": min(lats),
                            "max_lat": max(lats),
                            "min_lng": min(lngs),
                            "max_lng": max(lngs),
                        }
                except Exception:
                    bbox = None

            products.append({
                "id":     item.get("Id", ""),
                "title":  item.get("Name", "Sentinel-2 Image"),
                "date":   item.get("ContentDate", {}).get("Start", "Unknown date"),
                "online": item.get("Online", False),
                "bbox":   bbox,
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