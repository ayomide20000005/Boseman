// ── Boseman app.js ──

const searchBtn      = document.getElementById('searchBtn');
const searchInput    = document.getElementById('searchInput');
const toolsBtn       = document.getElementById('toolsBtn');
const toolsStrip     = document.getElementById('toolsStrip');
const searchBar      = document.getElementById('searchBar');
const activeBar      = document.getElementById('activeBar');
const plusBtn        = document.getElementById('plusBtn');
const uploadDropdown = document.getElementById('uploadDropdown');
const imageUpload    = document.getElementById('imageUpload');
const fileUpload     = document.getElementById('fileUpload');
const searchStage    = document.getElementById('searchStage');
const resultsPage    = document.getElementById('resultsPage');
const backBtn        = document.getElementById('backBtn');
const resultsSearchInput = document.getElementById('resultsSearchInput');
const resultsSearchBtn   = document.getElementById('resultsSearchBtn');
const resultsQueryLabel  = document.getElementById('resultsQueryLabel');
const cardsList      = document.getElementById('cardsList');
const loadingState   = document.getElementById('loadingState');
const statsBar       = document.getElementById('statsBar');
const speciesCard    = document.getElementById('speciesCard');
const speciesImg     = document.getElementById('speciesImg');
const speciesTitle   = document.getElementById('speciesTitle');
const speciesDesc    = document.getElementById('speciesDesc');
const speciesLink    = document.getElementById('speciesLink');

const activeFilters = new Set();
let toolsOpen = false;
let plusOpen  = false;
let map       = null;
let markersLayer = null;

// ══════════════════════════════
// SEARCH PAGE LOGIC
// ══════════════════════════════

// Tools toggle
toolsBtn.addEventListener('click', () => {
  toolsOpen = !toolsOpen;
  toolsStrip.classList.toggle('open', toolsOpen);
  searchBar.classList.toggle('tools-open', toolsOpen);
  toolsBtn.classList.toggle('open', toolsOpen);
});

// Plus button
plusBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  plusOpen = !plusOpen;
  uploadDropdown.classList.toggle('open', plusOpen);
  plusBtn.classList.toggle('open', plusOpen);
});

document.addEventListener('click', (e) => {
  if (!plusBtn.contains(e.target) && !uploadDropdown.contains(e.target)) {
    plusOpen = false;
    uploadDropdown.classList.remove('open');
    plusBtn.classList.remove('open');
  }
});

// Image upload
imageUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  console.log('Image uploaded:', file.name);
  plusOpen = false;
  uploadDropdown.classList.remove('open');
  plusBtn.classList.remove('open');
});

// File upload
fileUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  console.log('File uploaded:', file.name);
  plusOpen = false;
  uploadDropdown.classList.remove('open');
  plusBtn.classList.remove('open');
});

// Tool chips
document.querySelectorAll('.tool-chip[data-tool]').forEach(chip => {
  chip.addEventListener('click', () => {
    const tool = chip.dataset.tool;
    if (activeFilters.has(tool)) {
      activeFilters.delete(tool);
      chip.classList.remove('active');
    } else {
      activeFilters.add(tool);
      chip.classList.add('active');
    }
    renderActiveTags();
  });
});

function renderActiveTags() {
  activeBar.innerHTML = '';
  const labels = {
    species: 'Species', location: 'Location', hospitals: 'Hospitals',
    habitat: 'Habitat Loss', urban: 'Urban Sprawl'
  };
  activeFilters.forEach(filter => {
    const tag = document.createElement('span');
    tag.className = 'active-tag';
    tag.textContent = labels[filter] || filter;
    activeBar.appendChild(tag);
  });
}

// ══════════════════════════════
// SEARCH TRIGGER
// ══════════════════════════════

function triggerSearch(query) {
  if (!query) query = searchInput.value.trim();
  if (!query) return;

  // Spin b
  searchBtn.classList.remove('rolling');
  void searchBtn.offsetWidth;
  searchBtn.classList.add('rolling');
  setTimeout(() => searchBtn.classList.remove('rolling'), 600);

  // Show results page
  showResultsPage(query);

  // Call backend
  fetchResults(query, Array.from(activeFilters));
}

searchBtn.addEventListener('click', () => triggerSearch());
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') triggerSearch();
});

// Results page search bar
resultsSearchBtn.addEventListener('click', () => {
  const q = resultsSearchInput.value.trim();
  if (q) triggerSearch(q);
});

resultsSearchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') {
    const q = resultsSearchInput.value.trim();
    if (q) triggerSearch(q);
  }
});

// Back button
backBtn.addEventListener('click', () => {
  resultsPage.classList.remove('visible');
  searchStage.classList.remove('hidden');
});

// ══════════════════════════════
// SHOW RESULTS PAGE
// ══════════════════════════════

function showResultsPage(query) {
  searchStage.classList.add('hidden');
  resultsPage.classList.add('visible');
  resultsQueryLabel.textContent = `"${query}"`;
  resultsSearchInput.value = query;

  // Show loading
  cardsList.innerHTML = '';
  cardsList.appendChild(loadingState);
  loadingState.style.display = 'flex';

  // Reset species card
  speciesCard.classList.remove('visible');
  statsBar.innerHTML = '';

  // Init map if not already
  initMap();
}

// ══════════════════════════════
// FETCH RESULTS FROM BACKEND
// ══════════════════════════════

function fetchResults(query, filters) {
  fetch('http://127.0.0.1:5000/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, filters })
  })
  .then(res => res.json())
  .then(data => renderResults(data))
  .catch(err => {
    console.error('Search error:', err);
    showError('Could not connect to backend. Make sure Flask server is running.');
  });
}

// ══════════════════════════════
// RENDER RESULTS
// ══════════════════════════════

function renderResults(data) {
  const sightings   = data.sightings   || [];
  const occurrences = data.occurrences || [];
  const allResults  = [...sightings, ...occurrences];

  // ── Stats bar ──
  statsBar.innerHTML = '';
  const stats = [
    { num: sightings.length,   label: 'Sightings' },
    { num: occurrences.length, label: 'Occurrences' },
    { num: allResults.length,  label: 'Total' },
  ];
  stats.forEach(s => {
    const el = document.createElement('div');
    el.className = 'stat-item';
    el.innerHTML = `<span class="stat-num">${s.num}</span><span class="stat-label">${s.label}</span>`;
    statsBar.appendChild(el);
  });

  // ── Species info ──
  if (data.species_info) {
    const info = data.species_info;
    speciesTitle.textContent = info.title || '';
    speciesDesc.textContent  = info.description || '';
    speciesLink.href         = info.url || '#';
    if (info.image_url) {
      speciesImg.src = info.image_url;
      speciesImg.style.display = 'block';
    } else {
      speciesImg.style.display = 'none';
    }
    speciesCard.classList.add('visible');
  }

  // ── Cards list ──
  cardsList.innerHTML = '';

  if (allResults.length === 0) {
    cardsList.innerHTML = `<div class="no-results">No results found.<br>Try a different species or location.</div>`;
    return;
  }

  allResults.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'sighting-card';
    card.style.animationDelay = `${index * 0.03}s`;

    const photoUrl = item.photo_url || '';
    const source   = item.source === 'iNaturalist' ? 'inaturalist' : 'gbif';
    const sourceLabel = item.source || 'Unknown';

    card.innerHTML = `
      ${photoUrl
        ? `<img class="card-photo" src="${photoUrl}" alt="${item.species}" onerror="this.style.display='none'"/>`
        : `<div class="card-photo"></div>`
      }
      <div class="card-info">
        <span class="card-species">${item.common_name || item.species || 'Unknown species'}</span>
        <span class="card-location">📍 ${item.location || 'Unknown location'}</span>
        <span class="card-date">${item.date || ''}</span>
        <span class="card-source ${source}">${sourceLabel}</span>
      </div>
    `;

    // Click to fly to on map
    card.addEventListener('click', () => {
      if (map && item.latitude && item.longitude) {
        map.flyTo([item.latitude, item.longitude], 12, { animate: true, duration: 1 });
      }
    });

    cardsList.appendChild(card);
  });

  // ── Map pins ──
  plotMapPins(allResults, data.location);

  // ── Log any errors ──
  if (data.errors && data.errors.length > 0) {
    console.warn('Some API errors:', data.errors);
  }
}

function showError(msg) {
  cardsList.innerHTML = `<div class="no-results">${msg}</div>`;
}

// ══════════════════════════════
// MAP
// ══════════════════════════════

function initMap() {
  if (map) return;

  map = L.map('map').setView([20, 0], 2);

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  markersLayer = L.layerGroup().addTo(map);
}

function plotMapPins(results, location) {
  if (!map) return;

  // Clear existing markers
  markersLayer.clearLayers();

  // Center map on location if available
  if (location && location.latitude && location.longitude) {
    map.flyTo([location.latitude, location.longitude], 8, { animate: true, duration: 1.5 });
  }

  // Plot pins
  results.forEach(item => {
    if (!item.latitude || !item.longitude) return;

    const color = item.source === 'iNaturalist' ? '#6a3db8' : '#007850';

    const icon = L.divIcon({
      className: '',
      html: `<div style="
        width: 12px; height: 12px;
        background: ${color};
        border: 2px solid white;
        border-radius: 50%;
        box-shadow: 0 2px 6px rgba(0,0,0,0.3);
      "></div>`,
      iconSize: [12, 12],
      iconAnchor: [6, 6],
    });

    const marker = L.marker([item.latitude, item.longitude], { icon });

    marker.bindPopup(`
      <div style="font-family: Sora, sans-serif; font-size: 13px; min-width: 160px;">
        <strong>${item.common_name || item.species || 'Unknown'}</strong><br>
        <span style="color:#888; font-size:11px;">📍 ${item.location || ''}</span><br>
        <span style="color:#888; font-size:11px;">${item.date || ''}</span><br>
        <span style="font-size:11px; color:${color};">${item.source}</span>
        ${item.url ? `<br><a href="${item.url}" target="_blank" style="font-size:11px; color:${color};">View →</a>` : ''}
      </div>
    `);

    markersLayer.addLayer(marker);
  });
}

// ══════════════════════════════
// LAYER TOGGLES
// ══════════════════════════════

document.querySelectorAll('.layer-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    btn.classList.toggle('active');
    const layer = btn.dataset.layer;
    console.log('Layer toggled:', layer, btn.classList.contains('active'));
    // TODO: connect GEE and Copernicus tile layers here
  });
});