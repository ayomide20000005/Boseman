# backend/apis/wikipedia.py

import requests

BASE_URL   = "https://en.wikipedia.org/api/rest_v1"
SEARCH_URL = "https://en.wikipedia.org/w/api.php"

HEADERS = {
    "User-Agent": "Boseman/1.0 (urban snake displacement search engine; contact@boseman.app)"
}

SNAKE_TERMS = [
    "snake", "cobra", "mamba", "python", "viper", "boa",
    "adder", "anaconda", "rattlesnake", "asp", "krait",
    "boomslang", "puff adder", "green mamba", "black mamba",
    "king cobra", "rock python", "ball python", "corn snake",
    "garter snake", "water moccasin", "copperhead", "bushmaster",
    "fer-de-lance", "taipan", "death adder", "sea snake",
    "tree snake", "rat snake", "serpent"
]

LOCATION_TERMS = [
    "lagos", "nairobi", "accra", "cairo", "johannesburg", "nigeria",
    "kenya", "ghana", "egypt", "india", "brazil", "indonesia",
    "africa", "asia", "urban", "city", "town", "displacement"
]


def _extract_species(query: str) -> str:
    """
    Extract the species/snake term from the query.
    If no species term found, return the full query.
    """
    q = query.lower()
    for term in SNAKE_TERMS:
        if term in q:
            return term
    return query


def search_wikipedia(query: str) -> dict | None:
    """
    Search Wikipedia for species info matching the query.
    Returns a normalized info object for the frontend species panel.
    """
    try:
        # ── Step 1: Extract species term from query ──
        species_term = _extract_species(query)

        # ── Step 2: Search for the best matching Wikipedia page ──
        search_params = {
            "action":   "query",
            "list":     "search",
            "srsearch": species_term,
            "format":   "json",
            "srlimit":  5,
        }

        search_response = requests.get(
            SEARCH_URL,
            headers=HEADERS,
            params=search_params,
            timeout=10
        )
        search_response.raise_for_status()
        search_data = search_response.json()

        search_results = search_data.get("query", {}).get("search", [])
        if not search_results:
            return None

        # ── Step 3: Pick best result — prefer snake/reptile pages ──
        page_title = None
        for result in search_results:
            title   = result.get("title", "").lower()
            snippet = result.get("snippet", "").lower()
            if any(t in title or t in snippet for t in ["snake", "cobra", "viper", "serpent", "reptile", "mamba", "python"]):
                page_title = result.get("title")
                break

        # Fallback to first result if no snake page found
        if not page_title:
            page_title = search_results[0].get("title")

        if not page_title:
            return None

        # ── Step 4: Fetch full page summary ──
        summary_response = requests.get(
            f"{BASE_URL}/page/summary/{page_title.replace(' ', '_')}",
            headers=HEADERS,
            timeout=10
        )
        summary_response.raise_for_status()
        summary_data = summary_response.json()

        # ── Step 5: Reject disambiguation pages ──
        if summary_data.get("type") == "disambiguation":
            # Try next result
            for result in search_results[1:]:
                fallback_title = result.get("title")
                if not fallback_title:
                    continue
                fb_response = requests.get(
                    f"{BASE_URL}/page/summary/{fallback_title.replace(' ', '_')}",
                    headers=HEADERS,
                    timeout=10
                )
                if fb_response.status_code == 200:
                    fb_data = fb_response.json()
                    if fb_data.get("type") != "disambiguation":
                        summary_data = fb_data
                        page_title   = fallback_title
                        break
            else:
                return None

        # ── Step 6: Fetch extended info ──
        content_params = {
            "action":      "query",
            "titles":      page_title,
            "prop":        "extracts|categories|images",
            "exintro":     True,
            "explaintext": True,
            "format":      "json",
            "redirects":   1,
        }

        content_response = requests.get(
            SEARCH_URL,
            headers=HEADERS,
            params=content_params,
            timeout=10
        )
        content_response.raise_for_status()
        content_data = content_response.json()

        pages        = content_data.get("query", {}).get("pages", {})
        page         = next(iter(pages.values()), {})
        full_extract = page.get("extract", "")

        # ── Step 7: Extract thumbnail ──
        thumbnail = summary_data.get("thumbnail", {})
        image_url = thumbnail.get("source") if thumbnail else None

        # ── Step 8: Extract categories ──
        categories = page.get("categories", [])
        category_names = [
            c.get("title", "").replace("Category:", "")
            for c in categories
            if any(t in c.get("title", "").lower() for t in ["snake", "serpent", "viper", "cobra", "reptile"])
        ]

        # ── Step 9: Build clean description ──
        description = summary_data.get("extract", "")
        if not description and full_extract:
            description = full_extract[:600]

        if not description:
            return None

        return {
            "source":       "Wikipedia",
            "title":        summary_data.get("title", page_title),
            "description":  description,
            "full_extract": full_extract[:1500] if full_extract else description,
            "image_url":    image_url,
            "categories":   category_names[:5],
            "url":          summary_data.get("content_urls", {}).get("desktop", {}).get("page", f"https://en.wikipedia.org/wiki/{page_title.replace(' ', '_')}"),
            "lang":         "en",
        }

    except requests.exceptions.Timeout:
        raise Exception("Wikipedia request timed out")
    except requests.exceptions.ConnectionError:
        raise Exception("Could not connect to Wikipedia API")
    except requests.exceptions.HTTPError as e:
        raise Exception(f"Wikipedia HTTP error: {str(e)}")
    except Exception as e:
        raise Exception(f"Wikipedia error: {str(e)}")