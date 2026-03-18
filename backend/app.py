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

load_dotenv()

app = Flask(__name__)
CORS(app)


@app.route('/search', methods=['POST'])
def search():
    data = request.get_json()

    if not data or 'query' not in data:
        return jsonify({'error': 'No query provided'}), 400

    query   = data.get('query', '').strip()
    filters = data.get('filters', [])

    if not query:
        return jsonify({'error': 'Query cannot be empty'}), 400

    results = {
        'query':        query,
        'filters':      filters,
        'sightings':    [],
        'occurrences':  [],
        'species_info': None,
        'location':     None,
        'earth_engine': None,
        'copernicus':   None,
        'errors':       []
    }

    # ── Run all API calls in parallel ──
    with concurrent.futures.ThreadPoolExecutor() as executor:

        future_inaturalist = executor.submit(search_inaturalist, query)
        future_gbif        = executor.submit(search_gbif, query)
        future_wikipedia   = executor.submit(search_wikipedia, query)
        future_nominatim   = executor.submit(search_nominatim, query)
        future_ee          = executor.submit(get_earth_engine_data, query)
        future_copernicus  = executor.submit(get_copernicus_data, query)

        # ── iNaturalist ──
        try:
            results['sightings'] = future_inaturalist.result(timeout=15)
        except Exception as e:
            results['errors'].append({'source': 'iNaturalist', 'error': str(e)})

        # ── GBIF ──
        try:
            results['occurrences'] = future_gbif.result(timeout=15)
        except Exception as e:
            results['errors'].append({'source': 'GBIF', 'error': str(e)})

        # ── Wikipedia ──
        try:
            results['species_info'] = future_wikipedia.result(timeout=15)
        except Exception as e:
            results['errors'].append({'source': 'Wikipedia', 'error': str(e)})

        # ── Nominatim ──
        try:
            results['location'] = future_nominatim.result(timeout=15)
        except Exception as e:
            results['errors'].append({'source': 'Nominatim', 'error': str(e)})

        # ── Google Earth Engine ──
        try:
            results['earth_engine'] = future_ee.result(timeout=30)
        except Exception as e:
            results['errors'].append({'source': 'EarthEngine', 'error': str(e)})

        # ── Copernicus ──
        try:
            results['copernicus'] = future_copernicus.result(timeout=30)
        except Exception as e:
            results['errors'].append({'source': 'Copernicus', 'error': str(e)})

    return jsonify(results), 200


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'Boseman backend is running'}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5000)