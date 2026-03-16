import requests

def get_coords(location_query):
    url = "https://nominatim.openstreetmap.org/search"
    params = {"q": location_query, "format": "json", "limit": 1}
    headers = {"User-Agent": "BosemanSearchEngine/1.0"}
    try:
        resp = requests.get(url, params=params, headers=headers)
        data = resp.json()
        if data:
            return {"lat": float(data[0]["lat"]), "lng": float(data[0]["lon"])}
    except:
        pass
    return {"lat": 0, "lng": 0}