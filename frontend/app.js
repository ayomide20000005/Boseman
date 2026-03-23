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
const statsBar           = document.getElementById('statsBar');
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
const personaSections    = document.getElementById('personaSections');

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
let habitatLayer    = null;
let urbanLayer      = null;

const CARDS_PER_PAGE = 6;

const VENOMOUS_TERMS = [
  'cobra','mamba','viper','adder','rattlesnake','krait',
  'boomslang','puff adder','king cobra','taipan','death adder',
  'bushmaster','fer-de-lance','water moccasin','copperhead'
];

// ══════════════════════════════
// PERSONA CONFIG
// ══════════════════════════════

const PERSONA_CONFIG = {
  'Researcher': {
    icon: '🔬',
    showComponents: true,
    sections: [
      { id: 'sightings',   icon: '📍', title: 'iNaturalist Sightings',    subtitle: 'Community-verified observations',     type: 'sightings'   },
      { id: 'occurrences', icon: '🗂️', title: 'GBIF Occurrences',          subtitle: 'Scientific occurrence records',        type: 'occurrences' },
      { id: 'species',     icon: '🔬', title: 'Species Taxonomy',           subtitle: 'Scientific classification & info',     type: 'species'     },
      { id: 'risk',        icon: '📊', title: 'USDRI Risk Breakdown',       subtitle: 'Displacement index components',        type: 'riskdetail'  },
    ]
  },
  'Health Worker': {
    icon: '🏥',
    showComponents: true,
    sections: [
      { id: 'venomous',    icon: '⚠️', title: 'Venomous Species Detected',  subtitle: 'Dangerous species in this area',       type: 'venomous'    },
      { id: 'allsight',    icon: '📍', title: 'All Sightings',              subtitle: 'Full sighting list',                   type: 'sightings'   },
      { id: 'risk',        icon: '🩺', title: 'Clinical Risk Assessment',   subtitle: 'USDRI score & interpretation',         type: 'riskdetail'  },
      { id: 'species',     icon: '🐍', title: 'Species Information',        subtitle: 'Identification & danger profile',      type: 'species'     },
    ]
  },
  'Resident': {
    icon: '🏘️',
    showComponents: false,
    sections: [
      { id: 'verdict',     icon: '🏠', title: 'Is My Area Safe?',           subtitle: 'Plain language safety verdict',        type: 'verdict'     },
      { id: 'nearby',      icon: '📍', title: 'Recent Sightings Nearby',    subtitle: 'What has been spotted recently',       type: 'sightings'   },
      { id: 'advice',      icon: '💡', title: 'What Should I Do?',          subtitle: 'Safety tips based on risk level',      type: 'advice'      },
    ]
  },
  'Urban Planner': {
    icon: '🏙️',
    showComponents: true,
    sections: [
      { id: 'displacement',icon: '🏙️', title: 'Displacement Pressure',     subtitle: 'Urban expansion vs habitat data',      type: 'riskdetail'  },
      { id: 'sightings',   icon: '📍', title: 'Sighting Distribution',      subtitle: 'Spatial spread of observations',       type: 'sightings'   },
      { id: 'habitat',     icon: '🌿', title: 'Habitat & Land Use',         subtitle: 'GEE forest loss & Copernicus data',    type: 'habitat'     },
    ]
  },
  'Wildlife Responder': {
    icon: '🐍',
    showComponents: true,
    sections: [
      { id: 'sightings',   icon: '📍', title: 'Sighting Clusters',          subtitle: 'All observations with coordinates',    type: 'sightings'   },
      { id: 'occurrences', icon: '🗂️', title: 'Occurrence Records',         subtitle: 'GBIF field data',                      type: 'occurrences' },
      { id: 'species',     icon: '🐍', title: 'Species Profile',            subtitle: 'Identification & habitat info',        type: 'species'     },
      { id: 'risk',        icon: '📊', title: 'Field Risk Index',           subtitle: 'USDRI displacement score',             type: 'riskdetail'  },
    ]
  },
  'Farmer': {
    icon: '🌾',
    showComponents: false,
    sections: [
      { id: 'verdict',     icon: '🌾', title: 'Threat to My Farm',          subtitle: 'Risk assessment for agricultural areas', type: 'verdict'   },
      { id: 'venomous',    icon: '⚠️', title: 'Dangerous Species Nearby',   subtitle: 'Venomous snakes in this area',          type: 'venomous'   },
      { id: 'sightings',   icon: '📍', title: 'Nearby Sightings',           subtitle: 'Recent observations',                   type: 'sightings'  },
      { id: 'advice',      icon: '💡', title: 'Farm Safety Tips',           subtitle: 'How to protect livestock & workers',    type: 'advice'     },
    ]
  },
  'Journalist': {
    icon: '📰',
    showComponents: true,
    sections: [
      { id: 'headline',    icon: '📰', title: 'Key Story Data',             subtitle: 'Most newsworthy figures & trends',     type: 'headline'    },
      { id: 'risk',        icon: '📊', title: 'Risk Index Breakdown',       subtitle: 'USDRI data for your story',            type: 'riskdetail'  },
      { id: 'sightings',   icon: '📍', title: 'Supporting Evidence',        subtitle: 'Sighting records to cite',             type: 'sightings'   },
    ]
  },
  'Student': {
    icon: '📚',
    showComponents: true,
    sections: [
      { id: 'species',     icon: '📚', title: 'Species Deep Dive',          subtitle: 'Full Wikipedia species information',   type: 'species'     },
      { id: 'sightings',   icon: '📍', title: 'Observation Records',        subtitle: 'Real-world sighting data',             type: 'sightings'   },
      { id: 'risk',        icon: '📊', title: 'Why Is This Happening?',     subtitle: 'Displacement risk explained',          type: 'riskdetail'  },
      { id: 'habitat',     icon: '🌿', title: 'Habitat & Environment',      subtitle: 'Land use and habitat context',         type: 'habitat'     },
    ]
  },
  'Tour Guide': {
    icon: '🗺️',
    showComponents: false,
    sections: [
      { id: 'verdict',     icon: '🗺️', title: 'Is This Area Safe to Visit?', subtitle: 'Safety verdict for your tour',       type: 'verdict'     },
      { id: 'sightings',   icon: '📍', title: 'Active Sighting Zones',      subtitle: 'Where snakes have been spotted',       type: 'sightings'   },
      { id: 'species',     icon: '🐍', title: 'Species in This Area',       subtitle: 'What you might encounter',             type: 'species'     },
      { id: 'advice',      icon: '💡', title: 'Guide Safety Tips',          subtitle: 'How to keep your group safe',          type: 'advice'      },
    ]
  },
  'First Responder': {
    icon: '🚨',
    showComponents: false,
    sections: [
      { id: 'emergency',   icon: '🚨', title: 'Emergency Threat Summary',   subtitle: 'Active threats — act immediately',     type: 'emergency'   },
      { id: 'venomous',    icon: '⚠️', title: 'Venomous Species Active',    subtitle: 'Dangerous species confirmed in area',  type: 'venomous'    },
      { id: 'sightings',   icon: '📍', title: 'All Active Sightings',       subtitle: 'Full location data',                   type: 'sightings'   },
    ]
  },
};

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

imageUpload.addEventListener('change', () => { plusOpen = false; uploadDropdown.classList.remove('open'); plusBtn.classList.remove('open'); });
fileUpload.addEventListener('change',  () => { plusOpen = false; uploadDropdown.classList.remove('open'); plusBtn.classList.remove('open'); });

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
// SCROLL HINT
// ══════════════════════════════

scrollHint.addEventListener('click', () => {
  resultsPanel.scrollBy({ top: 320, behavior: 'smooth' });
});

resultsPanel.addEventListener('scroll', () => {
  const atBottom = resultsPanel.scrollTop + resultsPanel.clientHeight >= resultsPanel.scrollHeight - 60;
  if (atBottom) scrollHint.classList.remove('visible');
  else scrollHint.classList.add('visible');
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

  statsBar.innerHTML    = '';
  riskHero.style.display = 'none';
  personaSections.innerHTML = `<div class="loading-state"><div class="loading-spinner"></div><p>Searching across all sources...</p></div>`;
  aiMessages.innerHTML  = '';
  aiOpen = false;
  aiPanel.classList.remove('open');
  aiChevron.classList.remove('open');
  scrollHint.classList.remove('visible');
  mapOpen = false;
  resultsBody.classList.remove('map-open');

  if (habitatLayer && map) { map.removeLayer(habitatLayer); habitatLayer = null; }
  if (urbanLayer   && map) { map.removeLayer(urbanLayer);   urbanLayer   = null; }
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
    personaSections.innerHTML = `<div class="no-results">Could not connect to backend. Make sure Flask server is running.</div>`;
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

  // Risk score
  if (data.risk_score) renderRiskScore(data.risk_score);

  // Stats
  statsBar.innerHTML = '';
  [{ num: sightings.length, label: 'Sightings' }, { num: occurrences.length, label: 'Occurrences' }, { num: allResults.length, label: 'Total' }]
    .forEach(s => {
      const el = document.createElement('div');
      el.className = 'stat-item';
      el.innerHTML = `<span class="stat-num">${s.num}</span><span class="stat-label">${s.label}</span>`;
      statsBar.appendChild(el);
    });

  // Render persona sections
  renderPersonaSections(data, sightings, occurrences, allResults);

  // Map pins
  plotMapPins(allResults, data.location);

  // Scroll hint
  setTimeout(() => {
    if (resultsPanel.scrollHeight > resultsPanel.clientHeight + 80) {
      scrollHint.classList.add('visible');
    }
  }, 600);

  if (data.errors && data.errors.length > 0) console.warn('API errors:', data.errors);
}

// ══════════════════════════════
// PERSONA SECTIONS RENDERER
// ══════════════════════════════

function renderPersonaSections(data, sightings, occurrences, allResults) {
  const config = PERSONA_CONFIG[activePersona];
  if (!config) return;

  personaSections.innerHTML = '';

  config.sections.forEach((sec, i) => {
    const block = document.createElement('div');
    block.className = 'psection';

    const header = document.createElement('button');
    header.className = 'psection-header';
    header.innerHTML = `
      <div class="psection-icon">${sec.icon}</div>
      <div class="psection-title-wrap">
        <span class="psection-title">${sec.title}</span>
        <span class="psection-subtitle">${sec.subtitle}</span>
      </div>
      <svg class="psection-chevron ${i === 0 ? 'open' : ''}" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
        <polyline points="6 9 12 15 18 9"/>
      </svg>
    `;

    const body = document.createElement('div');
    body.className = `psection-body ${i === 0 ? 'open' : ''}`;

    // Fill body based on section type
    fillSectionBody(body, sec.type, data, sightings, occurrences, allResults);

    header.addEventListener('click', () => {
      const open = body.classList.toggle('open');
      header.querySelector('.psection-chevron').classList.toggle('open', open);
    });

    block.appendChild(header);
    block.appendChild(body);
    personaSections.appendChild(block);
  });
}

function fillSectionBody(body, type, data, sightings, occurrences, allResults) {
  const risk = data.risk_score || {};
  const info = data.species_info || {};

  switch (type) {

    case 'sightings':
      renderCardList(body, sightings.length > 0 ? sightings : allResults, CARDS_PER_PAGE);
      break;

    case 'occurrences':
      renderCardList(body, occurrences, CARDS_PER_PAGE);
      break;

    case 'venomous': {
      const ven = allResults.filter(r =>
        VENOMOUS_TERMS.some(t => (r.common_name || r.species || '').toLowerCase().includes(t))
      );
      if (ven.length === 0) {
        body.innerHTML = `<p class="no-results">No confirmed venomous species detected in results.</p>`;
      } else {
        renderCardList(body, ven, CARDS_PER_PAGE);
      }
      break;
    }

    case 'species': {
      if (!info.title) { body.innerHTML = `<p class="no-results">No species info available.</p>`; break; }
      body.innerHTML = `
        <div class="info-row">
          ${info.image_url ? `<img src="${info.image_url}" style="width:100%;max-height:180px;object-fit:cover;border-radius:10px;margin-bottom:4px;" onerror="this.style.display='none'"/>` : ''}
          <div class="info-item"><span class="info-key">Name</span><span class="info-val">${info.title}</span></div>
          <div class="info-item"><span class="info-key">Description</span><span class="info-val">${info.description || 'N/A'}</span></div>
          ${info.categories && info.categories.length > 0 ? `<div class="info-item"><span class="info-key">Categories</span><span class="info-val">${info.categories.join(', ')}</span></div>` : ''}
          <div class="info-item"><span class="info-key">Source</span><span class="info-val"><a href="${info.url || '#'}" target="_blank" style="color:var(--vib-core);">Wikipedia →</a></span></div>
        </div>
      `;
      break;
    }

    case 'riskdetail': {
      if (!risk.score) { body.innerHTML = `<p class="no-results">Risk score not available.</p>`; break; }
      const slug = (risk.label || 'unknown').toLowerCase();
      let compHtml = '';
      if (risk.components) {
        compHtml = Object.values(risk.components).map(c => {
          const pct = ((c.score / c.max) * 100).toFixed(0);
          return `
            <div class="info-item" style="flex-direction:column;gap:6px;">
              <div style="display:flex;justify-content:space-between;align-items:center;">
                <span class="info-key" style="min-width:unset;">${c.label}</span>
                <span style="font-size:0.78rem;font-weight:600;color:var(--vib-core);">${c.score}/${c.max}</span>
              </div>
              <div class="rc-bar-wrap"><div class="rc-bar" style="width:${pct}%"></div></div>
            </div>
          `;
        }).join('');
      }
      body.innerHTML = `
        <div class="info-row">
          <div class="info-item">
            <span class="info-key">Score</span>
            <span class="info-val" style="font-size:1.1rem;font-weight:700;color:var(--risk-${slug === 'unknown' ? 'moderate' : slug});">${risk.score}/100 — ${risk.label}</span>
          </div>
          <div class="info-item"><span class="info-key">Interpretation</span><span class="info-val">${risk.interpretation || 'N/A'}</span></div>
          ${compHtml}
        </div>
      `;
      break;
    }

    case 'verdict': {
      const slug = (risk.label || 'unknown').toLowerCase();
      const verdictMap = {
        low:      { title: '✅ Your area appears safe',         text: risk.interpretation || 'Low snake displacement pressure detected. Sightings are within natural range.' },
        moderate: { title: '⚠️ Some risk detected',             text: risk.interpretation || 'Moderate displacement signals. Stay alert and take basic precautions.' },
        high:     { title: '🔶 High risk — take precautions',   text: risk.interpretation || 'Significant displacement pressure. Be cautious especially at night.' },
        critical: { title: '🚨 Critical risk — act now',        text: risk.interpretation || 'Active displacement detected. Avoid tall grass, check surroundings carefully.' },
        unknown:  { title: '❓ Risk unknown',                   text: 'Not enough data to determine risk level for this area.' },
      };
      const v = verdictMap[slug] || verdictMap.unknown;
      body.innerHTML = `
        <div class="verdict-block ${slug}">
          <span class="verdict-title ${slug}">${v.title}</span>
          <span class="verdict-text">${v.text}</span>
        </div>
        <div class="info-row">
          <div class="info-item"><span class="info-key">Total Sightings</span><span class="info-val">${allResults.length} recorded in this search</span></div>
          <div class="info-item"><span class="info-key">Risk Score</span><span class="info-val">${risk.score || 'N/A'}/100</span></div>
        </div>
      `;
      break;
    }

    case 'advice': {
      const slug = (risk.label || 'low').toLowerCase();
      const adviceMap = {
        low:      ['Wear closed shoes when walking in grass', 'Keep your yard clear of debris', 'Snakes are generally non-aggressive — give them space'],
        moderate: ['Avoid walking barefoot outdoors at night', 'Check shoes and bedding if living near vegetation', 'Know the number of your nearest hospital'],
        high:     ['Do not walk in tall grass without boots', 'Keep children and pets indoors at dawn and dusk', 'Contact local wildlife authorities if you see a snake', 'Know your nearest snakebite treatment center'],
        critical: ['Restrict outdoor activity especially at night', 'Seal gaps under doors and windows', 'Seek immediate medical help if bitten — do not wait', 'Alert neighbors and local authorities immediately'],
      };
      const tips = adviceMap[slug] || adviceMap.low;
      body.innerHTML = `
        <div class="info-row">
          ${tips.map(tip => `<div class="info-item"><span class="info-val">• ${tip}</span></div>`).join('')}
        </div>
      `;
      break;
    }

    case 'habitat': {
      const ee  = data.earth_engine  || {};
      const cop = data.copernicus    || {};
      body.innerHTML = `
        <div class="info-row">
          <div class="info-item"><span class="info-key">Habitat Loss</span><span class="info-val">${ee.description || 'No GEE data available'}</span></div>
          ${ee.tile_url ? `<div class="info-item"><span class="info-key">GEE Layer</span><span class="info-val">Hansen Forest Change — click Habitat Loss layer on map</span></div>` : ''}
          <div class="info-item"><span class="info-key">Urban Sprawl</span><span class="info-val">${cop.description || 'No Copernicus data available'}</span></div>
          ${cop.total_features ? `<div class="info-item"><span class="info-key">Urban Features</span><span class="info-val">${cop.total_features} urban atlas features found near this area</span></div>` : ''}
        </div>
      `;
      break;
    }

    case 'headline': {
      const venCount = allResults.filter(r =>
        VENOMOUS_TERMS.some(t => (r.common_name || r.species || '').toLowerCase().includes(t))
      ).length;
      body.innerHTML = `
        <div class="info-row">
          <div class="info-item"><span class="info-key">Total Records</span><span class="info-val" style="font-size:1.1rem;font-weight:700;color:var(--vib-core);">${allResults.length} sightings & occurrences</span></div>
          <div class="info-item"><span class="info-key">Venomous</span><span class="info-val">${venCount} confirmed venomous species records</span></div>
          <div class="info-item"><span class="info-key">Risk Level</span><span class="info-val">${risk.label || 'Unknown'} (${risk.score || 'N/A'}/100 USDRI)</span></div>
          <div class="info-item"><span class="info-key">iNaturalist</span><span class="info-val">${(data.sightings || []).length} community observations</span></div>
          <div class="info-item"><span class="info-key">GBIF</span><span class="info-val">${(data.occurrences || []).length} scientific occurrence records</span></div>
          <div class="info-item"><span class="info-key">Key Finding</span><span class="info-val">${risk.interpretation || 'See risk breakdown for details'}</span></div>
        </div>
      `;
      break;
    }

    case 'emergency': {
      const slug = (risk.label || 'unknown').toLowerCase();
      const venomous = allResults.filter(r =>
        VENOMOUS_TERMS.some(t => (r.common_name || r.species || '').toLowerCase().includes(t))
      );
      body.innerHTML = `
        <div class="verdict-block ${slug}">
          <span class="verdict-title ${slug}">Risk Level: ${risk.label || 'Unknown'} (${risk.score || 'N/A'}/100)</span>
          <span class="verdict-text">${risk.interpretation || 'Assess situation and act accordingly.'}</span>
        </div>
        <div class="info-row">
          <div class="info-item"><span class="info-key">Total Sightings</span><span class="info-val">${allResults.length}</span></div>
          <div class="info-item"><span class="info-key">Venomous Active</span><span class="info-val">${venomous.length} venomous species records</span></div>
          <div class="info-item"><span class="info-key">Action</span><span class="info-val">Open map → check active sighting locations → coordinate response</span></div>
        </div>
      `;
      break;
    }

    default:
      body.innerHTML = `<p class="no-results">No data available.</p>`;
  }
}

// ══════════════════════════════
// CARD LIST RENDERER
// ══════════════════════════════

function renderCardList(container, results, limit) {
  if (!results || results.length === 0) {
    container.innerHTML = `<p class="no-results">No records found.</p>`;
    return;
  }

  const showDanger = ['Health Worker', 'First Responder', 'Resident', 'Farmer'].includes(activePersona);
  const showQuality = ['Researcher', 'Wildlife Responder', 'Student'].includes(activePersona);
  const showCoords  = ['Researcher', 'Wildlife Responder'].includes(activePersona);

  const visible = results.slice(0, limit);
  const remaining = results.length - limit;

  visible.forEach((item, index) => {
    const card = document.createElement('div');
    card.className = 'sighting-card';
    card.style.animationDelay = `${index * 0.04}s`;

    const photoUrl    = item.photo_url || '';
    const source      = item.source === 'iNaturalist' ? 'inaturalist' : 'gbif';
    const sourceLabel = item.source || 'Unknown';
    const isVenomous  = VENOMOUS_TERMS.some(t => (item.common_name || item.species || '').toLowerCase().includes(t));
    const dangerBadge = (isVenomous && showDanger) ? `<span class="card-danger">⚠️ Venomous</span>` : '';
    const qualityBadge = (showQuality && item.quality_grade) ? `<span class="card-quality">${item.quality_grade}</span>` : '';
    const coordsLine  = showCoords && item.latitude ? `<span class="card-extra">📌 ${Number(item.latitude).toFixed(4)}, ${Number(item.longitude).toFixed(4)}</span>` : '';
    const scientificLine = item.species && item.common_name && item.species !== item.common_name
      ? `<span class="card-scientific">${item.species}</span>` : '';
    const institutionLine = item.institution ? `<span class="card-extra">🏛 ${item.institution}</span>` : '';
    const observerLine = item.observer ? `<span class="card-extra">👤 ${item.observer}</span>` : '';

    card.innerHTML = `
      ${photoUrl ? `<img class="card-photo" src="${photoUrl}" alt="${item.species}" onerror="this.style.display='none'"/>` : `<div class="card-photo"></div>`}
      <div class="card-info">
        <span class="card-species">${item.common_name || item.species || 'Unknown species'}</span>
        ${scientificLine}
        <span class="card-location">📍 ${item.location || 'Unknown location'}</span>
        <span class="card-date">🗓 ${item.date || 'Unknown date'}</span>
        ${coordsLine}
        ${institutionLine}
        ${observerLine}
        <div class="card-badges">
          <span class="card-source ${source}">${sourceLabel}</span>
          ${dangerBadge}
          ${qualityBadge}
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
          if (map) { map.invalidateSize(); map.flyTo([item.latitude, item.longitude], 12, { animate: true, duration: 1 }); }
        }, 400);
      }
    });

    container.appendChild(card);
  });

  if (remaining > 0) {
    const btn = document.createElement('button');
    btn.className = 'show-more-btn';
    btn.textContent = `Show ${remaining} more`;
    btn.addEventListener('click', () => {
      btn.remove();
      renderCardList(container, results.slice(limit), results.length);
    });
    container.appendChild(btn);
  }
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
  riskLabel.className   = `risk-label ${label}`;
  riskCircle.className  = `risk-score-circle ${label}`;
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

// ── Layer toggles ──
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
        } else { btn.classList.remove('active'); }
      } else {
        if (habitatLayer) { map.removeLayer(habitatLayer); habitatLayer = null; }
      }
    }

    if (layer === 'urban') {
      const cop = currentSearchData && currentSearchData.copernicus;
      if (active) {
        if (cop && cop.wms_url && cop.wms_layer) {
          urbanLayer = L.tileLayer.wms(cop.wms_url, {
            layers: cop.wms_layer, format: 'image/png',
            transparent: true, opacity: 0.6,
            attribution: 'Copernicus Urban Atlas', version: '1.3.0',
          });
          urbanLayer.addTo(map);
        } else { btn.classList.remove('active'); }
      } else {
        if (urbanLayer) { map.removeLayer(urbanLayer); urbanLayer = null; }
      }
    }

    if (layer === 'sightings') {
      if (active) markersLayer.addTo(map);
      else map.removeLayer(markersLayer);
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
  if (userMessage) { aiHistory.push({ role: 'user', content: userMessage }); appendAIMessage('user', userMessage); }

  const loadingEl = document.createElement('div');
  loadingEl.className = 'ai-loading';
  loadingEl.innerHTML = `<div class="loading-spinner" style="width:16px;height:16px;border-width:2px;"></div><span>Thinking...</span>`;
  aiMessages.appendChild(loadingEl);
  aiMessages.scrollTop = aiMessages.scrollHeight;
  aiSendBtn.disabled = true;

  fetch('http://127.0.0.1:5000/ai-insight', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query: userMessage || currentQuery, persona: activePersona, search_data: currentSearchData, history: aiHistory.slice(0, -1) })
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