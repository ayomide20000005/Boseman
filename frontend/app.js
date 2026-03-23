// ── Boseman app.js ──

const searchBtn          = document.getElementById('searchBtn');
const searchInput        = document.getElementById('searchInput');
const toolsBtn           = document.getElementById('toolsBtn');
const toolsStrip         = document.getElementById('toolsStrip');
const searchBar          = document.getElementById('searchBar');
const activeBar          = document.getElementById('activeBar');
const plusBtn            = document.getElementById('plusBtn');
const uploadDropdown     = document.getElementById('uploadDropdown');
const imageUpload        = document.getElementById('imageUpload');
const fileUpload         = document.getElementById('fileUpload');
const searchStage        = document.getElementById('searchStage');
const resultsPage        = document.getElementById('resultsPage');
const backBtn            = document.getElementById('backBtn');
const resultsSearchInput = document.getElementById('resultsSearchInput');
const resultsSearchBtn   = document.getElementById('resultsSearchBtn');
const resultsQueryLabel  = document.getElementById('resultsQueryLabel');
const cardsList          = document.getElementById('cardsList');
const loadingState       = document.getElementById('loadingState');
const statsBar           = document.getElementById('statsBar');
const speciesCard        = document.getElementById('speciesCard');
const speciesImg         = document.getElementById('speciesImg');
const speciesTitle       = document.getElementById('speciesTitle');
const speciesDesc        = document.getElementById('speciesDesc');
const speciesLink        = document.getElementById('speciesLink');
const riskHero           = document.getElementById('riskHero');
const riskCircle         = document.getElementById('riskCircle');
const riskNum            = document.getElementById('riskNum');
const riskLabel          = document.getElementById('riskLabel');
const riskInterpretation = document.getElementById('riskInterpretation');
const riskComponents     = document.getElementById('riskComponents');
const aiToggle           = document.getElementById('aiToggle');
const aiChevron          = document.getElementById('aiChevron');
const aiPanel            = document.getElementById('aiPanel');
const aiMessages         = document.getElementById('aiMessages');
const aiInput            = document.getElementById('aiInput');
const aiSendBtn          = document.getElementById('aiSendBtn');
const activePersonaBadge = document.getElementById('activePersonaBadge');
const mapExpandBtn       = document.getElementById('mapExpandBtn');
const mapCollapseBtn     = document.getElementById('mapCollapseBtn');
const resultsBody        = document.getElementById('resultsBody');
const resultsPanel       = document.getElementById('resultsPanel');
const scrollHint         = document.getElementById('scrollHint');
const speciesToggle      = document.getElementById('speciesToggle');
const speciesChevron     = document.getElementById('speciesChevron');
const speciesContent     = document.getElementById('speciesContent');
const cardsToggle        = document.getElementById('cardsToggle');
const cardsChevron       = document.getElementById('cardsChevron');
const cardsContent       = document.getElementById('cardsContent');
const cardsToggleLabel   = document.getElementById('cardsToggleLabel');

const activeFilters = new Set();
let toolsOpen       = false;
let plusOpen        = false;
let mapOpen         = false;
let aiOpen          = false;
let aiHistory       = [];
let currentSearchData = null;
let currentQuery    = '';
let activePersona   = 'Researcher';
let lastResults     = [];
let map             = null;
let markersLayer    = null;

// ══════════════════════════════
// PERSONA CONFIG
// ══════════════════════════════

const PERSONA_CONFIG = {
  'Researcher':        { icon: '🔬', showComponents: true,  cardsLabel: 'Sightings & Occurrences' },
  'Health Worker':     { icon: '🏥', showComponents: true,  cardsLabel: 'Active Sightings'         },
  'Resident':          { icon: '🏘️', showComponents: false, cardsLabel: 'Nearby Sightings'         },
  'Urban Planner':     { icon: '🏙️', showComponents: true,  cardsLabel: 'Displacement Data'        },
  'Wildlife Responder':{ icon: '🐍', showComponents: true,  cardsLabel: 'Sighting Clusters'        },
  'Farmer':            { icon: '🌾', showComponents: false, cardsLabel: 'Nearby Sightings'         },
  'Journalist':        { icon: '📰', showComponents: true,  cardsLabel: 'Key Data Points'          },
  'Student':           { icon: '📚', showComponents: true,  cardsLabel: 'All Sightings'            },
  'Tour Guide':        { icon: '🗺️', showComponents: false, cardsLabel: 'Active Areas'             },
  'First Responder':   { icon: '🚨', showComponents: false, cardsLabel: 'Active Threats'           },
};

const VENOMOUS_TERMS = [
  'cobra','mamba','viper','adder','rattlesnake','krait',
  'boomslang','puff adder','king cobra','taipan','death adder',
  'bushmaster','fer-de-lance','water moccasin','copperhead'
];

// ══════════════════════════════
// PERSONA LIST
// ══════════════════════════════

document.querySelectorAll('.persona-item').forEach(item => {
  item.addEventListener('click', () => {
    document.querySelectorAll('.persona-item').forEach(i => i.classList.remove('active'));
    item.classList.add('active');
    activePersona = item.dataset.persona;
  });
});

// ══════════════════════════════
// TOOLS & UPLOAD
// ══════════════════════════════

toolsBtn.addEventListener('click', () => {
  toolsOpen = !toolsOpen;
  toolsStrip.classList.toggle('open', toolsOpen);
  searchBar.classList.toggle('tools-open', toolsOpen);
  toolsBtn.classList.toggle('open', toolsOpen);
});

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

imageUpload.addEventListener('change', () => {
  plusOpen = false;
  uploadDropdown.classList.remove('open');
  plusBtn.classList.remove('open');
});

fileUpload.addEventListener('change', () => {
  plusOpen = false;
  uploadDropdown.classList.remove('open');
  plusBtn.classList.remove('open');
});

document.querySelectorAll('.tool-chip[data-tool]').forEach(chip => {
  chip.addEventListener('click', () => {
    const tool = chip.dataset.tool;
    if (activeFilters.has(tool)) { activeFilters.delete(tool); chip.classList.remove('active'); }
    else { activeFilters.add(tool); chip.classList.add('active'); }
    renderActiveTags();
  });
});

function renderActiveTags() {
  activeBar.innerHTML = '';
  const labels = { species:'Species', location:'Location', hospitals:'Hospitals', habitat:'Habitat Loss', urban:'Urban Sprawl' };
  activeFilters.forEach(filter => {
    const tag = document.createElement('span');
    tag.className = 'active-tag';
    tag.textContent = labels[filter] || filter;
    activeBar.appendChild(tag);
  });
}

// ══════════════════════════════
// COLLAPSIBLE SECTIONS
// ══════════════════════════════

speciesToggle.addEventListener('click', () => {
  const open = speciesContent.classList.toggle('open');
  speciesChevron.classList.toggle('open', open);
});

cardsToggle.addEventListener('click', () => {
  const open = cardsContent.classList.toggle('open');
  cardsChevron.classList.toggle('open', open);
});

// Scroll hint click scrolls panel down
scrollHint.addEventListener('click', () => {
  resultsPanel.scrollBy({ top: 300, behavior: 'smooth' });
});

// Show/hide scroll hint based on scroll position
resultsPanel.addEventListener('scroll', () => {
  const atBottom = resultsPanel.scrollTop + resultsPanel.clientHeight >= resultsPanel.scrollHeight - 40;
  if (atBottom) {
    scrollHint.classList.remove('visible');
  }
});

// ══════════════════════════════
// MAP EXPAND / COLLAPSE
// ══════════════════════════════

mapExpandBtn.addEventListener('click', () => {
  mapOpen = true;
  resultsBody.classList.add('map-open');
  initMap();
  setTimeout(() => { if (map) map.invalidateSize(); }, 380);
});

mapCollapseBtn.addEventListener('click', () => {
  mapOpen = false;
  resultsBody.classList.remove('map-open');
  setTimeout(() => { if (map) map.invalidateSize(); }, 380);
});

// ══════════════════════════════
// SEARCH TRIGGER
// ══════════════════════════════

function triggerSearch(query) {
  if (!query) query = searchInput.value.trim();
  if (!query) return;

  currentQuery = query;
  aiHistory    = [];

  searchBtn.classList.remove('rolling');
  void searchBtn.offsetWidth;
  searchBtn.classList.add('rolling');
  setTimeout(() => searchBtn.classList.remove('rolling'), 600);

  showResultsPage(query);
  fetchResults(query, Array.from(activeFilters));
}

searchBtn.addEventListener('click', () => triggerSearch());
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') triggerSearch(); });
resultsSearchBtn.addEventListener('click', () => { const q = resultsSearchInput.value.trim(); if (q) triggerSearch(q); });
resultsSearchInput.addEventListener('keydown', e => { if (e.key === 'Enter') { const q = resultsSearchInput.value.trim(); if (q) triggerSearch(q); } });

backBtn.addEventListener('click', () => {
  resultsPage.classList.remove('visible');
  searchStage.classList.remove('hidden');
  mapOpen = false;
  resultsBody.classList.remove('map-open');
});

// ══════════════════════════════
// SHOW RESULTS PAGE
// ══════════════════════════════

function showResultsPage(query) {
  searchStage.classList.add('hidden');
  resultsPage.classList.add('visible');
  resultsQueryLabel.textContent = `"${query}"`;
  resultsSearchInput.value = query;

  applyPersona(activePersona);

  // Reset
  cardsList.innerHTML = '';
  cardsList.appendChild(loadingState);
  loadingState.style.display = 'flex';
  statsBar.innerHTML = '';
  riskHero.style.display = 'none';
  speciesCard.style.display = 'none';
  aiMessages.innerHTML = '';
  aiOpen = false;
  aiPanel.classList.remove('open');
  aiChevron.classList.remove('open');
  speciesContent.classList.remove('open');
  speciesChevron.classList.remove('open');
  cardsContent.classList.add('open');
  cardsChevron.classList.add('open');
  scrollHint.classList.remove('visible');

  // Collapse map on new search
  mapOpen = false;
  resultsBody.classList.remove('map-open');

  // Reset tile layers
  if (habitatLayer && map) { map.removeLayer(habitatLayer); habitatLayer = null; }
  if (urbanLayer   && map) { map.removeLayer(urbanLayer);   urbanLayer   = null; }
  if (ndviLayer    && map) { map.removeLayer(ndviLayer);    ndviLayer    = null; }
  document.querySelectorAll('.layer-btn').forEach(b => {
    if (b.dataset.layer !== 'sightings') b.classList.remove('active');
  });
}

function applyPersona(persona) {
  document.body.className = document.body.className
    .split(' ').filter(c => !c.startsWith('persona-')).join(' ');
  document.body.classList.add(`persona-${persona.toLowerCase().replace(/\s+/g, '-')}`);

  const config = PERSONA_CONFIG[persona] || {};
  activePersonaBadge.innerHTML = `<span>${config.icon || ''}</span><span>${persona}</span>`;
  if (cardsToggleLabel) cardsToggleLabel.textContent = config.cardsLabel || 'Sightings';
}

// ══════════════════════════════
// FETCH
// ══════════════════════════════

function fetchResults(query, filters) {
  fetch('http://127.0.0.1:5000/search', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, filters })
  })
  .then(res => res.json())
  .then(data => { currentSearchData = data; renderResults(data); })
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
  lastResults = allResults;

  if (data.risk_score) renderRiskScore(data.risk_score);

  statsBar.innerHTML = '';
  [{ num: sightings.length, label: 'Sightings' }, { num: occurrences.length, label: 'Occurrences' }, { num: allResults.length, label: 'Total' }]
    .forEach(s => {
      const el = document.createElement('div');
      el.className = 'stat-item';
      el.innerHTML = `<span class="stat-num">${s.num}</span><span class="stat-label">${s.label}</span>`;
      statsBar.appendChild(el);
    });

  if (data.species_info) {
    const info = data.species_info;
    speciesTitle.textContent = info.title || '';
    speciesDesc.textContent  = info.description || '';
    speciesLink.href         = info.url || '#';
    speciesImg.src           = info.image_url || '';
    speciesImg.style.display = info.image_url ? 'block' : 'none';
    speciesCard.style.display = '';
  }

  cardsList.innerHTML = '';

  if (allResults.length === 0) {
    cardsList.innerHTML = `<div class="no-results">No results found.<br>Try a different species or location.</div>`;
    return;
  }

  const showDanger = ['Health Worker', 'First Responder', 'Resident'].includes(activePersona);

  allResults.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'sighting-card';
    card.style.animationDelay = `${index * 0.03}s`;

    const photoUrl    = item.photo_url || '';
    const source      = item.source === 'iNaturalist' ? 'inaturalist' : 'gbif';
    const sourceLabel = item.source || 'Unknown';
    const isVenomous  = VENOMOUS_TERMS.some(t => (item.common_name || item.species || '').toLowerCase().includes(t));
    const dangerBadge = (isVenomous && showDanger) ? `<span class="card-danger">⚠️ Venomous</span>` : '';

    card.innerHTML = `
      ${photoUrl ? `<img class="card-photo" src="${photoUrl}" alt="${item.species}" onerror="this.style.display='none'"/>` : `<div class="card-photo"></div>`}
      <div class="card-info">
        <span class="card-species">${item.common_name || item.species || 'Unknown species'}</span>
        <span class="card-location">📍 ${item.location || 'Unknown location'}</span>
        <span class="card-date">${item.date || ''}</span>
        <div class="card-badges">
          <span class="card-source ${source}">${sourceLabel}</span>
          ${dangerBadge}
        </div>
      </div>
    `;

    card.addEventListener('click', () => {
      if (item.latitude && item.longitude) {
        if (!mapOpen) {
          mapOpen = true;
          resultsBody.classList.add('map-open');
          initMap();
        }
        setTimeout(() => {
          if (map) {
            map.invalidateSize();
            map.flyTo([item.latitude, item.longitude], 12, { animate: true, duration: 1 });
          }
        }, 400);
      }
    });

    cardsList.appendChild(card);
  });

  // Show scroll hint if content is tall
  setTimeout(() => {
    if (resultsPanel.scrollHeight > resultsPanel.clientHeight + 80) {
      scrollHint.classList.add('visible');
    }
  }, 500);

  plotMapPins(allResults, data.location);

  if (data.errors && data.errors.length > 0) console.warn('API errors:', data.errors);
}

function showError(msg) {
  cardsList.innerHTML = `<div class="no-results">${msg}</div>`;
}

// ══════════════════════════════
// RISK SCORE
// ══════════════════════════════

function renderRiskScore(risk) {
  riskHero.style.display = 'flex';
  const score = risk.score || 0;
  const label = (risk.label || 'unknown').toLowerCase();

  riskNum.textContent = score;
  riskLabel.textContent = risk.label || 'Unknown';
  riskLabel.className  = `risk-label ${label}`;
  riskCircle.className = `risk-score-circle ${label}`;
  riskInterpretation.textContent = risk.interpretation || '';

  riskComponents.innerHTML = '';
  const config = PERSONA_CONFIG[activePersona] || {};
  if (config.showComponents && risk.components) {
    Object.values(risk.components).forEach(comp => {
      const pct = ((comp.score / comp.max) * 100).toFixed(0);
      const el  = document.createElement('div');
      el.className = 'risk-component-item';
      el.innerHTML = `
        <span class="rc-label">${comp.label}</span>
        <div class="rc-bar-wrap"><div class="rc-bar" style="width:${pct}%"></div></div>
        <span class="rc-score">${comp.score} / ${comp.max}</span>
      `;
      riskComponents.appendChild(el);
    });
  }
}

// ══════════════════════════════
// MAP
// ══════════════════════════════

function initMap() {
  if (map) { setTimeout(() => map.invalidateSize(), 100); return; }

  map = L.map('map').setView([20, 0], 2);
  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '© OpenStreetMap contributors', maxZoom: 19,
  }).addTo(map);
  markersLayer = L.layerGroup().addTo(map);

  if (lastResults.length > 0) plotMapPins(lastResults, currentSearchData?.location);
}

function plotMapPins(results, location) {
  if (!map || !markersLayer) return;
  markersLayer.clearLayers();

  if (location && location.latitude && location.longitude) {
    map.flyTo([location.latitude, location.longitude], 8, { animate: true, duration: 1.5 });
  }

  results.forEach(item => {
    if (!item.latitude || !item.longitude) return;
    const color = item.source === 'iNaturalist' ? '#6a3db8' : '#007850';
    const icon = L.divIcon({
      className: '',
      html: `<div style="width:12px;height:12px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.3);"></div>`,
      iconSize: [12,12], iconAnchor: [6,6],
    });
    const marker = L.marker([item.latitude, item.longitude], { icon });
    marker.bindPopup(`
      <div style="font-family:Sora,sans-serif;font-size:13px;min-width:160px;">
        <strong>${item.common_name || item.species || 'Unknown'}</strong><br>
        <span style="color:#888;font-size:11px;">📍 ${item.location || ''}</span><br>
        <span style="color:#888;font-size:11px;">${item.date || ''}</span><br>
        <span style="font-size:11px;color:${color};">${item.source}</span>
        ${item.url ? `<br><a href="${item.url}" target="_blank" style="font-size:11px;color:${color};">View →</a>` : ''}
      </div>
    `);
    markersLayer.addLayer(marker);
  });
}

// ── Tile layer references ──
let habitatLayer  = null;
let ndviLayer     = null;
let urbanLayer    = null;

document.querySelectorAll('.layer-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    const layer  = btn.dataset.layer;
    const active = btn.classList.toggle('active');

    if (!map) return;

    if (layer === 'habitat') {
      if (active) {
        const ee = currentSearchData && currentSearchData.earth_engine;
        if (ee && ee.tile_url) {
          habitatLayer = L.tileLayer(ee.tile_url, { opacity: 0.7, attribution: 'GEE Hansen Forest Loss' });
          habitatLayer.addTo(map);
        } else {
          console.warn('No GEE habitat tile URL available');
          btn.classList.remove('active');
        }
      } else {
        if (habitatLayer) { map.removeLayer(habitatLayer); habitatLayer = null; }
      }
    }

    if (layer === 'urban') {
      const cop = currentSearchData && currentSearchData.copernicus;
      if (active) {
        if (cop && cop.wms_url && cop.wms_layer) {
          urbanLayer = L.tileLayer.wms(cop.wms_url, {
            layers:      cop.wms_layer,
            format:      'image/png',
            transparent: true,
            opacity:     0.6,
            attribution: 'Copernicus Urban Atlas',
            version:     '1.3.0',
          });
          urbanLayer.addTo(map);
        } else {
          console.warn('No Copernicus urban tile available');
          btn.classList.remove('active');
        }
      } else {
        if (urbanLayer) { map.removeLayer(urbanLayer); urbanLayer = null; }
      }
    }

    if (layer === 'sightings') {
      if (active) {
        markersLayer.addTo(map);
      } else {
        map.removeLayer(markersLayer);
      }
    }
  });
});

// ══════════════════════════════
// AI STRIP
// ══════════════════════════════

aiToggle.addEventListener('click', () => {
  aiOpen = !aiOpen;
  aiPanel.classList.toggle('open', aiOpen);
  aiChevron.classList.toggle('open', aiOpen);
  if (aiOpen && aiHistory.length === 0 && currentSearchData) triggerAIInsight(null);
});

aiSendBtn.addEventListener('click', sendAIMessage);
aiInput.addEventListener('keydown', e => { if (e.key === 'Enter') sendAIMessage(); });

function sendAIMessage() {
  const msg = aiInput.value.trim();
  if (!msg) return;
  aiInput.value = '';
  triggerAIInsight(msg);
}

function triggerAIInsight(userMessage) {
  if (!currentSearchData) return;

  if (userMessage) {
    aiHistory.push({ role: 'user', content: userMessage });
    appendAIMessage('user', userMessage);
  }

  const loadingEl = document.createElement('div');
  loadingEl.className = 'ai-loading';
  loadingEl.innerHTML = `<div class="loading-spinner" style="width:16px;height:16px;border-width:2px;"></div><span>Thinking...</span>`;
  aiMessages.appendChild(loadingEl);
  aiMessages.scrollTop = aiMessages.scrollHeight;
  aiSendBtn.disabled = true;

  fetch('http://127.0.0.1:5000/ai-insight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query:       userMessage || currentQuery,
      persona:     activePersona,
      search_data: currentSearchData,
      history:     aiHistory.slice(0, -1),
    })
  })
  .then(res => res.json())
  .then(data => {
    loadingEl.remove();
    aiSendBtn.disabled = false;
    if (data.error) { appendAIMessage('ai', `Error: ${data.error}`); return; }
    const reply = data.reply || '';
    aiHistory.push({ role: 'assistant', content: reply });
    appendAIMessage('ai', reply);
    aiMessages.scrollTop = aiMessages.scrollHeight;
  })
  .catch(err => {
    loadingEl.remove();
    aiSendBtn.disabled = false;
    appendAIMessage('ai', 'Could not reach AI service. Make sure backend is running.');
    console.error('AI error:', err);
  });
}

function appendAIMessage(role, text) {
  const el = document.createElement('div');
  el.className = 'ai-message';
  el.innerHTML = `
    <span class="ai-message-role ${role === 'ai' ? 'ai' : ''}">${role === 'ai' ? 'AI' : 'You'}</span>
    <span class="ai-message-text">${text}</span>
  `;
  aiMessages.appendChild(el);
  aiMessages.scrollTop = aiMessages.scrollHeight;
}