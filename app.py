# app.py

import os
import time
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

# ══════════════════════════════════════
# CACHE
# Simple in-memory cache — stores results per location query
# Cache duration: 24 hours (86400 seconds)
# ══════════════════════════════════════

_cache = {}
CACHE_TTL = 86400  # 24 hours in seconds


def _cache_key(query: str) -> str:
    """Normalize query to use as cache key."""
    return query.strip().lower()


def _get_cached(query: str):
    key = _cache_key(query)
    if key in _cache:
        entry = _cache[key]
        age   = time.time() - entry["timestamp"]
        if age < CACHE_TTL:
            return entry["data"]
        else:
            # Expired — remove it
            del _cache[key]
    return None


def _set_cache(query: str, data: dict):
    key          = _cache_key(query)
    _cache[key]  = {
        "timestamp": time.time(),
        "data":      data,
    }


def _clean_cache():
    """Remove all expired entries from cache."""
    now     = time.time()
    expired = [k for k, v in _cache.items() if now - v["timestamp"] >= CACHE_TTL]
    for k in expired:
        del _cache[k]


# ══════════════════════════════════════
# SEARCH ROUTE
# ══════════════════════════════════════

@app.route('/search', methods=['POST'])
def search():
    data = request.get_json()
    if not data or 'query' not in data:
        return jsonify({'error': 'No query provided'}), 400

    query   = data.get('query', '').strip()
    filters = data.get('filters', [])

    if not query:
        return jsonify({'error': 'Query cannot be empty'}), 400

    # ── Check cache first ──
    cached = _get_cached(query)
    if cached:
        return jsonify({**cached, 'cached': True}), 200

    # ── Clean expired cache entries periodically ──
    _clean_cache()

    results = {
        'query':        query,
        'filters':      filters,
        'sightings':    [],
        'occurrences':  [],
        'species_info': None,
        'location':     None,
        'earth_engine': None,
        'copernicus':   None,
        'risk_score':   None,
        'cached':       False,
        'errors':       []
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
            futures['inaturalist']  = executor.submit(search_inaturalist, query, bbox)
        if call_all or 'species' in filters:
            futures['gbif']         = executor.submit(search_gbif, query, bbox)
        if call_all or 'species' in filters:
            futures['wikipedia']    = executor.submit(search_wikipedia, query)
        if call_all or 'habitat' in filters:
            futures['earth_engine'] = executor.submit(get_earth_engine_data, query, bbox)
        if call_all or 'urban' in filters:
            futures['copernicus']   = executor.submit(get_copernicus_data, query, bbox)

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

    # ── Store in cache ──
    _set_cache(query, results)

    return jsonify(results), 200


# ══════════════════════════════════════
# HEALTH ROUTE
# ══════════════════════════════════════

@app.route('/health', methods=['GET'])
def health():
    return jsonify({
        'status':       'Boseman backend is running',
        'cache_size':   len(_cache),
        'cache_keys':   list(_cache.keys()),
    }), 200


if __name__ == '__main__':
    app.run(debug=True, port=5000)