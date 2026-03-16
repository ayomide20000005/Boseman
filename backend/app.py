from flask import Flask, request, jsonify
from flask_cors import CORS
from dotenv import load_dotenv
import os

from apis.inaturalist import get_inaturalist_data
from apis.gbif import get_gbif_data
from apis.wikipedia import get_wiki_info
from apis.nominatim import get_coords
from apis.earth_engine import get_gee_layer

load_dotenv()

app = Flask(__name__)
CORS(app)

@app.route('/search', methods=['POST'])
def search():
    data = request.json
    query = data.get('query', '')
    location = data.get('location', '')

    coords = get_coords(location)
    inat = get_inaturalist_data(query)
    gbif = get_gbif_data(query)
    wiki = get_wiki_info(query)
    gee_url = get_gee_layer()

    return jsonify({
        "center": coords,
        "observations": inat,
        "occurrences": gbif,
        "wiki": wiki,
        "layers": {
            "gee": gee_url,
            "copernicus": "https://tiles.maps.eox.at/wms?service=wms&request=getmap"
        }
    })

if __name__ == '__main__':
    app.run(debug=True, port=5000)