import requests

def get_wiki_info(query):
    url = "https://en.wikipedia.org/api/rest_v1/page/summary/" + query.replace(" ", "_")
    try:
        resp = requests.get(url, timeout=5)
        data = resp.json()
        return {
            "title": data.get("title"),
            "extract": data.get("extract"),
            "thumbnail": data.get("thumbnail", {}).get("source")
        }
    except:
        return None