import requests

BASE_URL = "https://api.gbif.org/v1"

# GBIF taxon key for Serpentes (all snakes)
SERPENTES_KEY = 11592253


def search_gbif(query: str) -> list:
    """
    Search GBIF for snake occurrence records matching the query.
    Returns a list of normalized occurrence objects for the frontend.
    """
    try:
        params = {
            "q":          query,
            "taxonKey":   SERPENTES_KEY,  # restrict to snakes only
            "limit":      50,
            "hasCoordinate": True,        # only results with coordinates
            "hasGeospatialIssue": False,  # exclude records with location issues
        }

        response = requests.get(
            f"{BASE_URL}/occurrence/search",
            params=params,
            timeout=10
        )
        response.raise_for_status()
        data = response.json()

        results = []
        for occ in data.get("results", []):

            # ── Extract coordinates ──
            lat = occ.get("decimalLatitude")
            lng = occ.get("decimalLongitude")

            if lat is None or lng is None:
                continue

            # ── Extract species info ──
            species_name = occ.get("species") or occ.get("scientificName", "Unknown species")
            common_name  = occ.get("vernacularName", species_name)

            # ── Extract location info ──
            country      = occ.get("country", "")
            state        = occ.get("stateProvince", "")
            locality     = occ.get("locality", "")

            location_parts = [p for p in [locality, state, country] if p]
            location = ", ".join(location_parts) if location_parts else "Unknown location"

            # ── Extract date ──
            year  = occ.get("year", "")
            month = occ.get("month", "")
            day   = occ.get("day", "")

            date_parts = [str(p) for p in [year, month, day] if p]
            date = "-".join(date_parts) if date_parts else "Unknown date"

            # ── Extract institution ──
            institution = occ.get("institutionCode", "") or occ.get("datasetName", "Unknown source")

            # ── Extract media/photo ──
            media = occ.get("media", [])
            photo_url = None
            if media:
                photo_url = media[0].get("identifier")

            results.append({
                "source":       "GBIF",
                "id":           occ.get("key"),
                "species":      species_name,
                "common_name":  common_name,
                "location":     location,
                "country":      country,
                "latitude":     lat,
                "longitude":    lng,
                "date":         date,
                "photo_url":    photo_url,
                "institution":  institution,
                "basis":        occ.get("basisOfRecord", "Unknown"),
                "url":          f"https://www.gbif.org/occurrence/{occ.get('key')}",
            })

        return results

    except requests.exceptions.Timeout:
        raise Exception("GBIF request timed out")
    except requests.exceptions.ConnectionError:
        raise Exception("Could not connect to GBIF API")
    except requests.exceptions.HTTPError as e:
        raise Exception(f"GBIF HTTP error: {str(e)}")
    except Exception as e:
        raise Exception(f"GBIF error: {str(e)}")