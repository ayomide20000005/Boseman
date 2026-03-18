import requests

BASE_URL = "https://en.wikipedia.org/api/rest_v1"
SEARCH_URL = "https://en.wikipedia.org/w/api.php"


def search_wikipedia(query: str) -> dict | None:
    """
    Search Wikipedia for species info matching the query.
    Returns a normalized info object for the frontend species panel.
    """
    try:
        # ── Step 1: Search for the best matching Wikipedia page ──
        search_params = {
            "action":   "query",
            "list":     "search",
            "srsearch": f"{query} snake",
            "format":   "json",
            "srlimit":  1,
        }

        search_response = requests.get(
            SEARCH_URL,
            params=search_params,
            timeout=10
        )
        search_response.raise_for_status()
        search_data = search_response.json()

        search_results = search_data.get("query", {}).get("search", [])
        if not search_results:
            return None

        # ── Step 2: Get the page title ──
        page_title = search_results[0].get("title")
        if not page_title:
            return None

        # ── Step 3: Fetch full page summary ──
        summary_response = requests.get(
            f"{BASE_URL}/page/summary/{page_title.replace(' ', '_')}",
            timeout=10
        )
        summary_response.raise_for_status()
        summary_data = summary_response.json()

        # ── Step 4: Fetch extended info from Wikipedia API ──
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
            params=content_params,
            timeout=10
        )
        content_response.raise_for_status()
        content_data = content_response.json()

        pages = content_data.get("query", {}).get("pages", {})
        page  = next(iter(pages.values()), {})
        full_extract = page.get("extract", "")

        # ── Step 5: Extract thumbnail ──
        thumbnail = summary_data.get("thumbnail", {})
        image_url = thumbnail.get("source") if thumbnail else None

        # ── Step 6: Extract categories ──
        categories = page.get("categories", [])
        category_names = [
            c.get("title", "").replace("Category:", "")
            for c in categories
            if "snake" in c.get("title", "").lower()
            or "serpent" in c.get("title", "").lower()
            or "viper" in c.get("title", "").lower()
            or "cobra" in c.get("title", "").lower()
        ]

        # ── Step 7: Build clean description ──
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