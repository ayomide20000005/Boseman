import requests
import os

def get_inaturalist_data(query):
    url = f"https://api.inaturalist.org/v1/observations"
    params = {
        "q": query,
        "taxon_name": "Serpentes",
        "per_page": 10,
        "order_by": "created_at"
    }
    try:
        response = requests.get(url, params=params, timeout=10)
        data = response.json()
        results = []
        for obs in data.get('results', []):
            results.append({
                "species": obs.get('taxon', {}).get('name', 'Unknown'),
                "common_name": obs.get('taxon', {}).get('preferred_common_name', 'Snake'),
                "lat": obs.get('location', '').split(',')[0],
                "lng": obs.get('location', '').split(',')[1],
                "photo": obs.get('photos', [{}])[0].get('url', ''),
                "date": obs.get('observed_on_details', {}).get('date', 'Unknown')
            })
        return results
    except Exception as e:
        return []