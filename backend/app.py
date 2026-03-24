# backend/app.py

import os
import concurrent.futures
import google.generativeai as genai
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

genai.configure(api_key=os.getenv("GEMINI_API_KEY"))

PERSONA_PROMPTS = {
    "Researcher": (
        "You are a scientific analyst. Respond in precise, academic language. "
        "Reference species taxonomy, coordinates, data sources, and USDRI score components. "
        "Be thorough and data-dense."
    ),
    "Health Worker": (
        "You are a public health advisor. Lead with the risk level and what it means clinically. "
        "Highlight venomous species, bite risk, and nearest medical facilities. "
        "Be direct and clinically focused."
    ),
    "Resident": (
        "You are a community safety advisor. Use plain, simple language — no jargon. "
        "Tell the person clearly if their area is safe or dangerous and what to watch for. "
        "Be reassuring but honest."
    ),
    "Urban Planner": (
        "You are an urban environmental analyst. Focus on habitat loss, urban expansion, "
        "and displacement trends. Use policy-relevant framing. Reference land cover data."
    ),
    "Wildlife Responder": (
        "You are a field wildlife expert. Focus on sighting clusters, species diversity, "
        "hotspot locations, and actionable field data. Be concise and practical."
    ),
    "Farmer": (
        "You are an agricultural safety advisor. Focus on which species are near farmland, "
        "seasonal activity patterns, and livestock threat. Use plain practical language."
    ),
    "Journalist": (
        "You are a data journalist. Pull out the most newsworthy figures — trends, "
        "comparisons, human impact. Write in punchy, quotable language with clear stats."
    ),
    "Student": (
        "You are an educational guide. Explain findings clearly with context. "
        "Include species information, habitat explanations, and why displacement happens. "
        "Be engaging and informative."
    ),
    "Tour Guide": (
        "You are a wildlife safety guide. Focus on active sighting zones, species identification, "
        "safe vs unsafe areas, and seasonal patterns. Be practical and location-aware."
    ),
    "First Responder": (
        "You are an emergency response advisor. Lead immediately with risk level, "
        "active species, and nearest hospital. Be extremely brief and high-contrast. "
        "Every word must count."
    ),
}


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
        'risk_score':   None,
        'errors':       []
    }

    call_all = len(filters) == 0

    # ── Run Nominatim first to get bbox for location filtering ──
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


@app.route('/ai-insight', methods=['POST'])
def ai_insight():
    data = request.get_json()

    if not data:
        return jsonify({'error': 'No data provided'}), 400

    query       = data.get('query', '')
    persona     = data.get('persona', 'Researcher')
    search_data = data.get('search_data', {})
    history     = data.get('history', [])

    sightings    = search_data.get('sightings', [])
    occurrences  = search_data.get('occurrences', [])
    species_info = search_data.get('species_info', {})
    location     = search_data.get('location', {})
    risk_score   = search_data.get('risk_score', {})
    earth_engine = search_data.get('earth_engine', {})
    copernicus   = search_data.get('copernicus', {})

    total_sightings = len(sightings) + len(occurrences)
    location_name   = location.get('display_name', 'the searched area') if location else 'the searched area'
    risk_label      = risk_score.get('label', 'Unknown') if risk_score else 'Unknown'
    risk_num        = risk_score.get('score', 'N/A') if risk_score else 'N/A'

    species_sample = list({
        s.get('common_name') or s.get('species')
        for s in (sightings + occurrences)
        if s.get('common_name') or s.get('species')
    })[:5]

    data_summary = f"""
Search query: {query}
Location: {location_name}
Total sightings and occurrences: {total_sightings}
Species found: {', '.join(species_sample) if species_sample else 'None identified'}
USDRI Risk Score: {risk_num}/100 — {risk_label}
Risk components: {risk_score.get('components', {}) if risk_score else 'N/A'}
Habitat loss data available: {'Yes' if earth_engine and earth_engine.get('tile_url') else 'No'}
Urban sprawl features found: {len(copernicus.get('features', [])) if copernicus else 0}
Species info source: Wikipedia — {species_info.get('title', 'N/A') if species_info else 'N/A'}
    """.strip()

    persona_instruction = PERSONA_PROMPTS.get(persona, PERSONA_PROMPTS['Researcher'])

    system_prompt = (
        f"{persona_instruction}\n\n"
        "You are analyzing real data returned from iNaturalist, GBIF, Wikipedia, "
        "Google Earth Engine, and Copernicus APIs. "
        "Only make claims supported by the data summary provided. "
        "Cite your sources inline like [iNaturalist], [GBIF], [Wikipedia], [GEE], [Copernicus]. "
        "Do not hallucinate. Keep your response concise and grounded."
    )

    try:
        model = genai.GenerativeModel(
            model_name="gemini-2.5-pro",
            system_instruction=system_prompt,
        )

        gemini_history = []
        for turn in history:
            role = "user" if turn["role"] == "user" else "model"
            gemini_history.append({"role": role, "parts": [turn["content"]]})

        chat = model.start_chat(history=gemini_history)

        if not history:
            user_message = f"Here is the data for the search '{query}':\n\n{data_summary}\n\nPlease give me your analysis."
        else:
            user_message = query

        response = chat.send_message(user_message)

        return jsonify({
            'reply':   response.text,
            'persona': persona,
            'query':   query,
        }), 200

    except Exception as e:
        return jsonify({'error': f'AI insight error: {str(e)}'}), 500


@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'Boseman backend is running'}), 200


if __name__ == '__main__':
    app.run(debug=True, port=5000)