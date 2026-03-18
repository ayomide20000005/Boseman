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

    # ── Decide which APIs to call based on active filters ──
    # If no filters selected call everything by default
    call_all = len(filters) == 0

    with concurrent.futures.ThreadPoolExecutor() as executor:

        futures = {}

        # iNaturalist — species or location filter or all
        if call_all or 'species' in filters or 'location' in filters:
            futures['inaturalist'] = executor.submit(search_inaturalist, query)

        # GBIF — species filter or all
        if call_all or 'species' in filters:
            futures['gbif'] = executor.submit(search_gbif, query)

        # Wikipedia — species filter or all
        if call_all or 'species' in filters:
            futures['wikipedia'] = executor.submit(search_wikipedia, query)

        # Nominatim — location filter or all
        if call_all or 'location' in filters:
            futures['nominatim'] = executor.submit(search_nominatim, query)

        # Google Earth Engine — habitat loss filter or all
        if call_all or 'habitat' in filters:
            futures['earth_engine'] = executor.submit(get_earth_engine_data, query)

        # Copernicus — urban sprawl filter or all
        if call_all or 'urban' in filters:
            futures['copernicus'] = executor.submit(get_copernicus_data, query)

        # ── Collect results ──
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

        if 'nominatim' in futures:
            try:
                results['location'] = futures['nominatim'].result(timeout=15)
            except Exception as e:
                results['errors'].append({'source': 'Nominatim', 'error': str(e)})

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

    return jsonify(results), 200


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'Boseman backend is running'}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5000)