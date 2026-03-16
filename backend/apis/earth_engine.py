import ee
import os

def get_gee_layer():
    try:
        # Initialize EE with Project ID from .env
        # Requires 'earthengine authenticate' to be run once on server
        dataset = ee.ImageCollection('MODIS/006/MOD13Q1').filterDate('2020-01-01', '2023-12-31').select('NDVI')
        vis_params = {'min': 0, 'max': 9000, 'palette': ['white', 'green']}
        map_id = dataset.mean().getMapId(vis_params)
        return map_id['tile_fetcher'].url_format
    except:
        return ""