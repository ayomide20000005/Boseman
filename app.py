import os
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
from apis.risk_score import compute_risk_score

load_dotenv()

app = Flask(__name__)
CORS(app)

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
            futures['earth_engine'] = executor.submit(get_earth_engine_data, query)
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
        results['risk_score'] = compute_risk_score(
            sightings=results['sightings'],
            occurrences=results['occurrences'],
            location=results['location'],
            earth_engine=results['earth_engine'],
            copernicus=results['copernicus'],
        )
    except Exception as e:
        results['errors'].append({'source': 'RiskScore', 'error': str(e)})

    return jsonify(results), 200

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'Boseman backend is running'}), 200

if __name__ == '__main__':
    app.run(debug=True, port=5000)
@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'message': 'Boseman backend is running'}), 200
