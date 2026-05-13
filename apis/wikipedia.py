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

SNAKE_ECOLOGY_KEYWORDS = [
    "snake", "serpent", "reptile", "venom", "cobra", "mamba",
    "python", "viper", "habitat", "urban", "displacement", "ecology"
]


def _extract_species(query: str) -> str:
    q = query.lower()
    for term in SNAKE_TERMS:
        if term in q:
            return term
    return query


def _extract_location(query: str) -> str | None:
    cleaned = query.lower()
    for term in SNAKE_TERMS:
        cleaned = cleaned.replace(term.lower(), "").strip()
    cleaned = " ".join(cleaned.split())
    return cleaned if cleaned else None


def _fetch_summary(title: str) -> dict | None:
    try:
        response = requests.get(
            f"{BASE_URL}/page/summary/{title.replace(' ', '_')}",
            headers=HEADERS,
            timeout=10
        )
        if response.status_code == 200:
            data = response.json()
            if data.get("type") != "disambiguation":
                return data
    except Exception:
        pass
    return None


def _fetch_page_extract(title: str) -> str:
    try:
        params = {
            "action":      "query",
            "titles":      title,
            "prop":        "extracts",
            "exintro":     True,
            "explaintext": True,
            "format":      "json",
            "redirects":   1,
        }
        response = requests.get(SEARCH_URL, headers=HEADERS, params=params, timeout=10)
        response.raise_for_status()
        pages = response.json().get("query", {}).get("pages", {})
        page  = next(iter(pages.values()), {})
        return page.get("extract", "")
    except Exception:
        return ""


def _search_wikipedia(term: str) -> list:
    try:
        params = {
            "action":   "query",
            "list":     "search",
            "srsearch": term,
            "format":   "json",
            "srlimit":  5,
        }
        response = requests.get(SEARCH_URL, headers=HEADERS, params=params, timeout=10)
        response.raise_for_status()
        return response.json().get("query", {}).get("search", [])
    except Exception:
        return []


def _get_location_ecology(location: str) -> str | None:
    """
    Pull location Wikipedia page and extract any snake-related
    ecological information about that region.
    """
    try:
        results = _search_wikipedia(location)
        if not results:
            return None

        for result in results:
            title   = result.get("title", "")
            snippet = result.get("snippet", "").lower()
            if any(k in snippet for k in SNAKE_ECOLOGY_KEYWORDS):
                extract = _fetch_page_extract(title)
                if extract:
                    # Extract sentences mentioning snakes or ecology
                    sentences = extract.split(".")
                    relevant  = [
                        s.strip() for s in sentences
                        if any(k in s.lower() for k in SNAKE_ECOLOGY_KEYWORDS)
                    ]
                    if relevant:
                        return ". ".join(relevant[:3]) + "."

        # Fallback — just get the location page intro
        page_title = results[0].get("title")
        if page_title:
            extract = _fetch_page_extract(page_title)
            if extract:
                return extract[:500]

    except Exception:
        pass
    return None


def search_wikipedia(query: str) -> dict | None:
    try:
        # Extract species and location from query
        species_term  = _extract_species(query)
        location_term = _extract_location(query)

        # Search for species info
        search_results = _search_wikipedia(species_term)
        if not search_results:
            return None

        # Pick best snake/reptile page
        page_title = None
        for result in search_results:
            title   = result.get("title", "").lower()
            snippet = result.get("snippet", "").lower()
            if any(t in title or t in snippet for t in ["snake", "cobra", "viper", "serpent", "reptile", "mamba", "python"]):
                page_title = result.get("title")
                break

        if not page_title:
            page_title = search_results[0].get("title")

        if not page_title:
            return None

        # Fetch species summary
        summary_data = _fetch_summary(page_title)

        # Try fallbacks if disambiguation
        if not summary_data:
            for result in search_results[1:]:
                fallback_title = result.get("title")
                if fallback_title:
                    summary_data = _fetch_summary(fallback_title)
                    if summary_data:
                        page_title = fallback_title
                        break

        if not summary_data:
            return None

        # Fetch full extract
        full_extract = _fetch_page_extract(page_title)

        # Fetch categories
        try:
            cat_params = {
                "action":  "query",
                "titles":  page_title,
                "prop":    "categories",
                "format":  "json",
                "redirects": 1,
            }
            cat_response = requests.get(SEARCH_URL, headers=HEADERS, params=cat_params, timeout=10)
            cat_response.raise_for_status()
            cat_pages    = cat_response.json().get("query", {}).get("pages", {})
            cat_page     = next(iter(cat_pages.values()), {})
            categories   = cat_page.get("categories", [])
            category_names = [
                c.get("title", "").replace("Category:", "")
                for c in categories
                if any(t in c.get("title", "").lower() for t in ["snake", "serpent", "viper", "cobra", "reptile"])
            ]
        except Exception:
            category_names = []

        # Get location ecology info
        location_ecology = None
        if location_term:
            location_ecology = _get_location_ecology(location_term)

        # Build description
        description = summary_data.get("extract", "")
        if not description and full_extract:
            description = full_extract[:600]

        if not description:
            return None

        thumbnail = summary_data.get("thumbnail", {})
        image_url = thumbnail.get("source") if thumbnail else None

        return {
            "source":           "Wikipedia",
            "title":            summary_data.get("title", page_title),
            "description":      description,
            "full_extract":     full_extract[:1500] if full_extract else description,
            "image_url":        image_url,
            "categories":       category_names[:5],
            "location_ecology": location_ecology,
            "url":              summary_data.get("content_urls", {}).get("desktop", {}).get("page", f"https://en.wikipedia.org/wiki/{page_title.replace(' ', '_')}"),
            "lang":             "en",
        }

    except requests.exceptions.Timeout:
        raise Exception("Wikipedia request timed out")
    except requests.exceptions.ConnectionError:
        raise Exception("Could not connect to Wikipedia API")
    except requests.exceptions.HTTPError as e:
        raise Exception(f"Wikipedia HTTP error: {str(e)}")
    except Exception as e:
        raise Exception(f"Wikipedia error: {str(e)}")