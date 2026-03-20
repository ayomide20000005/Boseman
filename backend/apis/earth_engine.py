# backend/apis/earth_engine.py

import os
import ee
from dotenv import load_dotenv

load_dotenv()

GEE_PROJECT      = os.getenv("GEE_PROJECT")
SERVICE_ACCOUNT  = "boseman@eternal-galaxy-485500-g4.iam.gserviceaccount.com"
KEY_FILE         = os.path.join(os.path.dirname(__file__), "..", "eternal-galaxy-485500-g4-6f1c7aa78004.json")


def _init_ee():
    """Initialize Earth Engine with service account credentials."""
    credentials = ee.ServiceAccountCredentials(SERVICE_ACCOUNT, KEY_FILE)
    ee.Initialize(credentials, project=GEE_PROJECT)


def get_earth_engine_data(query: str) -> dict | None:
    """
    Query Google Earth Engine for land cover and vegetation loss data.
    Returns normalized data for the Habitat Loss map layer.
    """
    try:
        _init_ee()

        # ── Forest loss layer ──
        forest = (
            ee.Image("UMD/hansen/global_forest_change_2023_v1_11")
            .select("lossyear")
            .visualize(min=0, max=23, palette=["ffffff", "ffcc00", "ff6600", "cc0000"])
        )

        forest_map  = forest.getMapId()
        tile_url    = forest_map["tile_fetcher"].url_format

        # ── NDVI layer ──
        ndvi = (
            ee.ImageCollection("MODIS/006/MOD13A2")
            .select("NDVI")
            .mean()
            .visualize(min=0, max=9000, palette=["brown", "yellow", "green"])
        )

        ndvi_map      = ndvi.getMapId()
        ndvi_tile_url = ndvi_map["tile_fetcher"].url_format

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

    except Exception as e:
        raise Exception(f"Google Earth Engine error: {str(e)}")