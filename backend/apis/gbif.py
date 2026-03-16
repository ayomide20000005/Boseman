import requests

def get_gbif_data(query):
    url = "https://api.gbif.org/v1/occurrence/search"
    params = {"scientificName": query, "limit": 10}
    try:
        resp = requests.get(url, params=params, timeout=10)
        data = resp.json()
        return [{
            "lat": item.get("decimalLatitude"),
            "lng": item.get("decimalLongitude"),
            "basis": item.get("basisOfRecord")
        } for item in data.get("results", []) if "decimalLatitude" in item]
    except:
        return []