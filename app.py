# app.py

import os
import math
import requests
import concurrent.futures
from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
from apis.inaturalist import search_inaturalist
from apis.gbif import search_gbif
from apis.wikipedia import search_wikipedia
from apis.nominatim import search_nominatim
from apis.earth_engine import get_earth_engine_data
from apis.copernicus import get_copernicus_data

load_dotenv()

app = Flask(__name__)
CORS(app)

USDRI_API_URL = "https://usdri-api.onrender.com/score/raw"


def _compute_bbox_area(bbox: dict) -> float:
    if not bbox:
        return 1.0
    lat_span = abs(bbox["max_lat"] - bbox["min_lat"])
    lng_span = abs(bbox["max_lng"] - bbox["min_lng"])
    area_km2 = lat_span * lng_span * 111 * 111
    return max(area_km2, 1.0)


def _compute_distance_km(sightings: list, occurrences: list, location: dict) -> float:
    if not location:
        return 100.0

    all_results = sightings + occurrences
    if not all_results:
        return 100.0

    city_lat = location.get("latitude")
    city_lng = location.get("longitude")

    if not city_lat or not city_lng:
        return 100.0

    lats = [r["latitude"]  for r in all_results if r.get("latitude") and r.get("longitude")]
    lngs = [r["longitude"] for r in all_results if r.get("latitude") and r.get("longitude")]

    if not lats:
        return 100.0

    centroid_lat = sum(lats) / len(lats)
    centroid_lng = sum(lngs) / len(lngs)

    R    = 6371
    dlat = math.radians(centroid_lat - city_lat)
    dlng = math.radians(centroid_lng - city_lng)
    a    = (math.sin(dlat / 2) ** 2 +
            math.cos(math.radians(city_lat)) *
            math.cos(math.radians(centroid_lat)) *
            math.sin(dlng / 2) ** 2)
    dist = R * 2 * math.asin(math.sqrt(a))

    return round(dist, 2)


def _call_usdri_api(sightings, occurrences, location, earth_engine, copernicus, bbox):
    try:
        total_observations = len(sightings) + len(occurrences)
        bbox_area_km2      = _compute_bbox_area(bbox)
        forest_loss_pct    = 0.0
        urban_feature_count = 0
        distance_km        = _compute_distance_km(sightings, occurrences, location)

        if earth_engine and earth_engine.get("forest_loss_percent") is not None:
            forest_loss_pct = earth_engine["forest_loss_percent"]

        if copernicus and copernicus.get("features"):
            urban_feature_count = len(copernicus["features"])

        payload = {
            "total_observations":          total_observations,
            "bbox_area_km2":               bbox_area_km2,
            "forest_loss_percent":         forest_loss_pct,
            "urban_feature_count":         urban_feature_count,
            "distance_to_urban_center_km": distance_km
        }

        response = requests.post(USDRI_API_URL, json=payload, timeout=30)
        response.raise_for_status()
        return response.json()

    except Exception as e:
        return {"error": f"USDRI API call failed: {str(e)}"}


@app.route('/search', methods=['POST'])
def search():
    data = request.get_json()
    if not data or 'query' not in data:
        return jsonify({'error': 'No query provided'}), 400

    query = data.get('query', '').strip()
    filters = data.get('filters', [])

    if not query:
        return jsonify({'error': 'Query cannot be empty'}), 400

    results = {
        'query': query,
        'filters': filters,
        'sightings': [],
        'occurrences': [],
        'species_info': None,
        'location': None,
        'earth_engine': None,
        'copernicus': None,
        'risk_score': None,
        'errors': []
    }

    call_all = len(filters) == 0

    bbox = None
    if call_all or 'location' in filters:
        try:
            location_data = search_nominatim(query)
            if location_data:
                results['location'] = location_data
                bb = location_data.get('boundingbox', [])
                if len(bb) == 4:
                    bbox = {
                        'min_lat': float(bb[0]),
                        'max_lat': float(bb[1]),
                        'min_lng': float(bb[2]),
                        'max_lng': float(bb[3]),
                    }
        except Exception as e:
            results['errors'].append({'source': 'Nominatim', 'error': str(e)})

    with concurrent.futures.ThreadPoolExecutor() as executor:
        futures = {}

        if call_all or 'species' in filters or 'location' in filters:
            futures['inaturalist'] = executor.submit(search_inaturalist, query, bbox)
        if call_all or 'species' in filters:
            futures['gbif'] = executor.submit(search_gbif, query, bbox)
        if call_all or 'species' in filters:
            futures['wikipedia'] = executor.submit(search_wikipedia, query)
        if call_all or 'habitat' in filters:
            futures['earth_engine'] = executor.submit(get_earth_engine_data, query, bbox)
        if call_all or 'urban' in filters:
            futures['copernicus'] = executor.submit(get_copernicus_data, query)

        if 'inaturalist' in futures:
            try:
                results['sightings'] = futures['inaturalist'].result(timeout=15)
            except Exception as e:
                results['errors'].append({'source': 'iNaturalist', 'error': str(e)})
        if 'gbif' in futures:
            try:
                results['occurrences'] = futures['gbif'].result(timeout=15)
            except Exception as e:
                results['errors'].append({'source': 'GBIF', 'error': str(e)})
        if 'wikipedia' in futures:
            try:
                results['species_info'] = futures['wikipedia'].result(timeout=15)
            except Exception as e:
                results['errors'].append({'source': 'Wikipedia', 'error': str(e)})
        if 'earth_engine' in futures:
            try:
                results['earth_engine'] = futures['earth_engine'].result(timeout=30)
            except Exception as e:
                results['errors'].append({'source': 'EarthEngine', 'error': str(e)})
        if 'copernicus' in futures:
            try:
                results['copernicus'] = futures['copernicus'].result(timeout=30)
            except Exception as e:
                results['errors'].append({'source': 'Copernicus', 'error': str(e)})

    try:
        results['risk_score'] = _call_usdri_api(
            sightings=results['sightings'],
            occurrences=results['occurrences'],
            location=results['location'],
            earth_engine=results['earth_engine'],
            copernicus=results['copernicus'],
            bbox=bbox
        )
    except Exception as e:
        results['errors'].append({'source': 'RiskScore', 'error': str(e)})

    return jsonify(results), 200


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'Boseman backend is running'}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5000)