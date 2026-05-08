Here it is:
Boseman is an urban snake displacement search engine that lets researchers, conservationists, and public health workers search for snake sightings and understand why they're appearing in urban areas.
What it does
You type in a location, and Boseman pulls live snake sighting data from iNaturalist and GBIF, overlays satellite-derived habitat loss from Global Forest Watch and urban density data from OpenStreetMap, and returns a risk score telling you how likely snakes in that area are being displaced by urban expansion.
The USDRI
The core of Boseman is the Urban Snake Displacement Risk Index (USDRI) — an original composite scoring framework developed as part of published research. It scores any location from 0 to 100 by combining four equal components: sighting density, habitat loss rate, urban expansion pressure, and proximity to city centres. The result is a single number that tells you how severe urban snake displacement risk is in a given area, with four risk bands — Low (0–25), Moderate (26–50), High (51–75), and Critical (76–100). The research behind USDRI is published and peer reviewed. You can read the full paper here: https://doi.org/10.5281/zenodo.19245787
Data sources
iNaturalist — live snake sighting observations. GBIF — global biodiversity occurrence records. Global Forest Watch — satellite-derived habitat and forest loss data. OpenStreetMap Overpass — global urban land use and building density data. OpenStreetMap Nominatim — geocoding and location resolution. Wikipedia — species information.
Tech stack
Backend: Python, Flask, Flask-CORS, concurrent API calls. Frontend: Vanilla HTML, CSS, JavaScript. Maps: Leaflet.js. Deployment: Vercel.
Author
Built by Alameen Shuaib. Research published at https://doi.org/10.5281/zenodo.19245787