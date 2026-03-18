import os
import requests
from dotenv import load_dotenv

load_dotenv()

GEE_API_KEY  = os.getenv("GEE_API_KEY")
GEE_PROJECT  = os.getenv("GEE_PROJECT")

BASE_URL = "https://earthengine.googleapis.com/v1"


def get_earth_engine_data(query: str) -> dict | None:
    """
    Query Google Earth Engine REST API for land cover and
    vegetation loss data relevant to the searched location.
    Returns normalized data for the Habitat Loss map layer.
    """
    try:
        # ── Step 1: Search for relevant assets ──
        search_url = f"{BASE_URL}/projects/{GEE_PROJECT}/assets:search"

        search_params = {
            "key":   GEE_API_KEY,
            "query": query,
        }

        search_response = requests.get(
            search_url,
            params=search_params,
            timeout=15
        )

        # ── Step 2: Get NDVI / vegetation data using known GEE datasets ──
        # Use the Hansen Global Forest Change dataset for habitat loss
        asset_url = f"{BASE_URL}/projects/{GEE_PROJECT}/maps"

        payload = {
            "expression": {
                "functionInvocationValue": {
                    "functionName": "Image.visualize",
                    "arguments": {
                        "this": {
                            "functionInvocationValue": {
                                "functionName": "Image.select",
                                "arguments": {
                                    "this": {
                                        "functionInvocationValue": {
                                            "functionName": "Image.load",
                                            "arguments": {
                                                "id": {
                                                    "constantValue": "UMD/hansen/global_forest_change_2023_v1_11"
                                                }
                                            }
                                        }
                                    },
                                    "bandSelectors": {
                                        "constantValue": ["lossyear"]
                                    }
                                }
                            }
                        },
                        "min":     {"constantValue": 0},
                        "max":     {"constantValue": 23},
                        "palette": {"constantValue": ["ffffff", "ffcc00", "ff6600", "cc0000"]}
                    }
                }
            }
        }

        map_response = requests.post(
            asset_url,
            params={"key": GEE_API_KEY},
            json=payload,
            timeout=20
        )

        tile_url = None
        if map_response.status_code == 200:
            map_data = map_response.json()
            tile_url = map_data.get("tilesetToken") or map_data.get("name")

            # Build the tile URL for Leaflet
            if tile_url:
                tile_url = f"https://earthengine.googleapis.com/v1/{tile_url}/tiles/{{z}}/{{x}}/{{y}}?key={GEE_API_KEY}"

        # ── Step 3: Get NDVI vegetation health data ──
        ndvi_payload = {
            "expression": {
                "functionInvocationValue": {
                    "functionName": "Image.visualize",
                    "arguments": {
                        "this": {
                            "functionInvocationValue": {
                                "functionName": "ImageCollection.mean",
                                "arguments": {
                                    "this": {
                                        "functionInvocationValue": {
                                            "functionName": "ImageCollection.select",
                                            "arguments": {
                                                "this": {
                                                    "functionInvocationValue": {
                                                        "functionName": "ImageCollection.load",
                                                        "arguments": {
                                                            "id": {
                                                                "constantValue": "MODIS/006/MOD13A2"
                                                            }
                                                        }
                                                    }
                                                },
                                                "bandSelectors": {
                                                    "constantValue": ["NDVI"]
                                                }
                                            }
                                        }
                                    }
                                }
                            }
                        },
                        "min":     {"constantValue": 0},
                        "max":     {"constantValue": 9000},
                        "palette": {"constantValue": ["brown", "yellow", "green"]}
                    }
                }
            }
        }

        ndvi_response = requests.post(
            asset_url,
            params={"key": GEE_API_KEY},
            json=ndvi_payload,
            timeout=20
        )

        ndvi_tile_url = None
        if ndvi_response.status_code == 200:
            ndvi_data     = ndvi_response.json()
            ndvi_token    = ndvi_data.get("tilesetToken") or ndvi_data.get("name")
            if ndvi_token:
                ndvi_tile_url = f"https://earthengine.googleapis.com/v1/{ndvi_token}/tiles/{{z}}/{{x}}/{{y}}?key={GEE_API_KEY}"

        return {
            "source":         "Google Earth Engine",
            "query":          query,
            "layer_type":     "habitat_loss",
            "description":    "Hansen Global Forest Change — annual tree cover loss since 2000",
            "tile_url":       tile_url,
            "ndvi_tile_url":  ndvi_tile_url,
            "legend": {
                "title":  "Forest Loss Year",
                "colors": ["#ffffff", "#ffcc00", "#ff6600", "#cc0000"],
                "labels": ["No loss", "Early loss", "Recent loss", "Latest loss"]
            },
            "datasets_used": [
                "UMD/hansen/global_forest_change_2023_v1_11",
                "MODIS/006/MOD13A2"
            ]
        }

    except requests.exceptions.Timeout:
        raise Exception("Google Earth Engine request timed out")
    except requests.exceptions.ConnectionError:
        raise Exception("Could not connect to Google Earth Engine API")
    except requests.exceptions.HTTPError as e:
        raise Exception(f"Google Earth Engine HTTP error: {str(e)}")
    except Exception as e:
        raise Exception(f"Google Earth Engine error: {str(e)}")