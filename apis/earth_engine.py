import os
import ee
import json
from dotenv import load_dotenv

load_dotenv()

GEE_PROJECT = os.getenv("GEE_PROJECT")
GEE_KEY_JSON = os.getenv("GEE_KEY_JSON")
KEY_FILE = os.path.join(os.path.dirname(__file__), "eternal-galaxy-485500-g4-e4550197b72b.json")


def _init_ee():
    """Initialize Earth Engine with service account credentials."""
    if GEE_KEY_JSON:
        credentials = ee.ServiceAccountCredentials(
            "boseman@eternal-galaxy-485500-g4.iam.gserviceaccount.com",
            key_data=json.loads(GEE_KEY_JSON)
        )
    else:
        credentials = ee.ServiceAccountCredentials(
            "boseman@eternal-galaxy-485500-g4.iam.gserviceaccount.com",
            KEY_FILE
        )
    ee.Initialize(credentials, project=GEE_PROJECT)


def get_earth_engine_data(query: str) -> dict | None:
    try:
        _init_ee()
        forest = ee.Image("UMD/hansen/global_forest_change_2024_v1_12_v1_11").select("lossyear")
        return {"description": "GEE data loaded", "tile_url": None}
    except Exception as e:
        print(f"GEE Error: {e}")
        return None
