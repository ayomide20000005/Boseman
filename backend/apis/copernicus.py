import os
import requests
from dotenv import load_dotenv

load_dotenv()

COPERNICUS_CLIENT_ID     = os.getenv("COPERNICUS_CLIENT_ID")
COPERNICUS_CLIENT_SECRET = os.getenv("COPERNICUS_CLIENT_SECRET")

TOKEN_URL  = "https://identity.dataspace.copernicus.eu/auth/realms/CDSE/protocol/openid-connect/token"
STAC_URL   = "https://catalogue.dataspace.copernicus.eu/stac/collections/clms_urban-atlas_land-cover-use_europe_V025ha_vector_static_v01/items"
WMS_URL    = "https://mapserver.dataspace.copernicus.eu/ogc"
WMS_LAYER  = "CLMS_UA_LCU_S2021_V025ha"


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
    Query Copernicus Urban Atlas STAC API for land cover data.
    Returns WMS layer info and feature bboxes for the Urban Sprawl map layer.
    """
    try:
        # ── Step 1: Get access token ──
        token = _get_access_token()

        headers = {
            "Authorization": f"Bearer {token}",
            "Accept":        "application/json"
        }

        # ── Step 2: Query STAC items — no heavy catalogue, just metadata ──
        params = {
            "limit": 10,
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
                "source":    "Copernicus",
                "query":     query,
                "message":   "No urban land cover data found",
                "features":  [],
                "wms_url":   None,
                "wms_layer": WMS_LAYER,
            }

        # ── Step 3: Normalize features ──
        normalized = []
        for feature in features:
            props    = feature.get("properties", {})
            bbox     = feature.get("bbox", [])
            geometry = feature.get("geometry", {})

            # Extract WMS link from feature links
            links    = feature.get("links", [])
            wms_link = next((l.get("href") for l in links if l.get("rel") == "wms"), WMS_URL)

            # Get WMS layers from link
            wms_layers = next(
                (l.get("wms:layers", [WMS_LAYER]) for l in links if l.get("rel") == "wms"),
                [WMS_LAYER]
            )

            bbox_dict = None
            if len(bbox) == 4:
                bbox_dict = {
                    "min_lng": bbox[0],
                    "min_lat": bbox[1],
                    "max_lng": bbox[2],
                    "max_lat": bbox[3],
                }

            private = props.get("_private", {}).get("odata", {})

            normalized.append({
                "id":           feature.get("id", ""),
                "region":       props.get("region:name", private.get("fuaName", "Unknown")),
                "country":      props.get("region:country", private.get("countryCode", "")),
                "date":         props.get("datetime", "2021-01-01"),
                "bbox":         bbox_dict,
                "geometry":     geometry,
                "wms_url":      wms_link,
                "wms_layers":   wms_layers,
            })

        return {
            "source":      "Copernicus",
            "query":       query,
            "layer_type":  "urban_sprawl",
            "description": "Urban Atlas land cover and land use data — European urban areas 2021",
            "wms_url":     WMS_URL,
            "wms_layer":   WMS_LAYER,
            "wms_params": {
                "SERVICE":     "WMS",
                "VERSION":     "1.3.0",
                "REQUEST":     "GetMap",
                "LAYERS":      WMS_LAYER,
                "FORMAT":      "image/png",
                "TRANSPARENT": "true",
                "CRS":         "EPSG:4326",
            },
            "features":       normalized,
            "total_features": len(normalized),
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