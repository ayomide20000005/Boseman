# apis/earth_engine.py

import os
import ee
import json
from dotenv import load_dotenv

load_dotenv()

GEE_PROJECT  = os.getenv("GEE_PROJECT")
GEE_KEY_JSON = os.getenv("GEE_KEY_JSON")
KEY_FILE     = os.path.join(os.path.dirname(__file__), "eternal-galaxy-485500-g4-6f1c7aa78004.json")


def _init_ee():
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


def get_earth_engine_data(query: str, bbox: dict = None) -> dict | None:
    try:
        _init_ee()

        hansen = ee.Image("UMD/hansen/global_forest_change_2024_v1_12_v1_11")
        loss      = hansen.select("loss")
        treecover = hansen.select("treecover2000")

        if bbox:
            region = ee.Geometry.Rectangle([
                bbox["min_lng"],
                bbox["min_lat"],
                bbox["max_lng"],
                bbox["max_lat"]
            ])

            total_forest = treecover.gt(0).reduceRegion(
                reducer=ee.Reducer.sum(),
                geometry=region,
                scale=30,
                maxPixels=1e9
            ).getInfo().get("treecover2000", 0)

            total_loss = loss.reduceRegion(
                reducer=ee.Reducer.sum(),
                geometry=region,
                scale=30,
                maxPixels=1e9
            ).getInfo().get("loss", 0)

            if total_forest and total_forest > 0:
                forest_loss_percent = round((total_loss / total_forest) * 100, 2)
            else:
                forest_loss_percent = 0.0

        else:
            forest_loss_percent = 0.0

        return {
            "description":         "GEE Hansen forest change data",
            "forest_loss_percent": forest_loss_percent,
            "tile_url":            None
        }

    except Exception as e:
        print(f"GEE Error: {e}")
        return None