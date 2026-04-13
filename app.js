// ══════════════════════════════════════
// BOSEMAN — app.js
// Urban Snake Displacement Search Engine
// ══════════════════════════════════════

const API_BASE_URL = 'http://127.0.0.1:5000';
const RECENT_KEY   = 'boseman_recent';
const CARDS_PER_PAGE = 8;

const VENOMOUS_TERMS = [
    'cobra','mamba','viper','adder','rattlesnake','krait',
    'boomslang','puff adder','king cobra','taipan','death adder',
    'bushmaster','fer-de-lance','water moccasin','copperhead'
];

// ── DOM refs ──
const searchPage       = document.getElementById('searchPage');
const resultPage       = document.getElementById('resultPage');
const searchInput      = document.getElementById('searchInput');
const searchBtn        = document.getElementById('searchBtn');
const autocompleteList = document.getElementById('autocompleteList');
const recentChips      = document.getElementById('recentChips');
const recentSearches   = document.getElementById('recentSearches');

const backBtn          = document.getElementById('backBtn');
const topbarInput      = document.getElementById('topbarInput');
const topbarSearchBtn  = document.getElementById('topbarSearchBtn');

const resultCard       = document.getElementById('resultCard');
const cardHandle       = document.getElementById('cardHandle');
const cardCollapsed    = document.getElementById('cardCollapsed');
const cardExpanded     = document.getElementById('cardExpanded');
const cardLocationName = document.getElementById('cardLocationName');
const cardVerdict      = document.getElementById('cardVerdict');
const cardSummary      = document.getElementById('cardSummary');

const viewScoreBtn     = document.getElementById('viewScoreBtn');
const viewMapBtn       = document.getElementById('viewMapBtn');
const compareBtn       = document.getElementById('compareBtn');
const shareBtn         = document.getElementById('shareBtn');
const collapseBtn      = document.getElementById('collapseBtn');

const scoreNum         = document.getElementById('scoreNum');
const scoreLabelEl     = document.getElementById('scoreLabel');
const scoreInterpretation = document.getElementById('scoreInterpretation');
const gaugeFill        = document.getElementById('gaugeFill');
const subScores        = document.getElementById('subScores');
const statsRow         = document.getElementById('statsRow');
const sightingsList    = document.getElementById('sightingsList');
const sightingsCount   = document.getElementById('sightingsCount');
const speciesSection   = document.getElementById('speciesSection');
const speciesBody      = document.getElementById('speciesBody');

const comparePanel     = document.getElementById('comparePanel');
const closeCompare     = document.getElementById('closeCompare');
const compareTabs      = document.querySelectorAll('.compare-tab');
const compareColA      = document.getElementById('compareColA');
const compareColB      = document.getElementById('compareColB');
const compareInputA    = document.getElementById('compareInputA');
const compareInputB    = document.getElementById('compareInputB');
const compareResultA   = document.getElementById('compareResultA');
const compareResultB   = document.getElementById('compareResultB');

const loadingOverlay   = document.getElementById('loadingOverlay');

// ── State ──
let map            = null;
let markersLayer   = null;
let currentData    = null;
let currentQuery   = '';
let cardIsExpanded = false;
let autocompleteTimer = null;

// ══════════════════════════════════════
// RECENT SEARCHES
// ══════════════════════════════════════

function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; }
    catch { return []; }
}

function saveRecent(query) {
    let recents = getRecent().filter(r => r.toLowerCase() !== query.toLowerCase());
    recents.unshift(query);
    recents = recents.slice(0, 6);
    localStorage.setItem(RECENT_KEY, JSON.stringify(recents));
}

function renderRecent() {
    const recents = getRecent();
    if (recents.length === 0) {
        recentSearches.style.display = 'none';
        return;
    }
    recentSearches.style.display = 'flex';
    recentChips.innerHTML = '';
    recents.forEach(r => {
        const chip = document.createElement('button');
        chip.className = 'recent-chip';
        chip.innerHTML = `<svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>${r}`;
        chip.addEventListener('click', () => triggerSearch(r));
        recentChips.appendChild(chip);
    });
}

// ══════════════════════════════════════
// AUTOCOMPLETE (Nominatim)
// ══════════════════════════════════════

function fetchAutocomplete(query) {
    if (!query || query.length < 2) {
        autocompleteList.classList.remove('open');
        return;
    }
    fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`)
        .then(r => r.json())
        .then(results => {
            autocompleteList.innerHTML = '';
            if (!results.length) { autocompleteList.classList.remove('open'); return; }
            results.forEach(item => {
                const div = document.createElement('div');
                div.className = 'autocomplete-item';
                div.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>${item.display_name}`;
                div.addEventListener('click', () => {
                    searchInput.value = item.display_name;
                    autocompleteList.classList.remove('open');
                    triggerSearch(item.display_name);
                });
                autocompleteList.appendChild(div);
            });
            autocompleteList.classList.add('open');
        })
        .catch(() => autocompleteList.classList.remove('open'));
}

searchInput.addEventListener('input', () => {
    clearTimeout(autocompleteTimer);
    autocompleteTimer = setTimeout(() => fetchAutocomplete(searchInput.value.trim()), 300);
});

document.addEventListener('click', e => {
    if (!e.target.closest('.search-wrap')) {
        autocompleteList.classList.remove('open');
    }
});

// ══════════════════════════════════════
// SEARCH TRIGGER
// ══════════════════════════════════════

function triggerSearch(query) {
    if (!query) query = searchInput.value.trim();
    if (!query) return;
    currentQuery = query;
    saveRecent(query);
    showResultPage(query);
    fetchResults(query);
}

searchBtn.addEventListener('click', () => triggerSearch());
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') triggerSearch(); });
topbarSearchBtn.addEventListener('click', () => { const q = topbarInput.value.trim(); if (q) triggerSearch(q); });
topbarInput.addEventListener('keydown', e => { if (e.key === 'Enter') { const q = topbarInput.value.trim(); if (q) triggerSearch(q); } });

// ══════════════════════════════════════
// PAGE TRANSITIONS
// ══════════════════════════════════════

function showResultPage(query) {
    searchPage.classList.add('hidden');
    resultPage.classList.remove('hidden');
    topbarInput.value = query;

    // Reset card
    cardExpanded.classList.add('hidden');
    cardCollapsed.classList.remove('hidden');
    cardIsExpanded = false;
    cardLocationName.textContent = query;
    cardVerdict.textContent = 'Analysing…';
    cardVerdict.className = 'card-verdict';
    cardSummary.textContent = '';

    // Init map
    initMap();
    showLoading(true);
}

backBtn.addEventListener('click', () => {
    resultPage.classList.add('hidden');
    searchPage.classList.remove('hidden');
    searchInput.value = currentQuery;
    renderRecent();
    autocompleteList.classList.remove('open');
});

// ══════════════════════════════════════
// FETCH RESULTS
// ══════════════════════════════════════

function fetchResults(query) {
    fetch(`${API_BASE_URL}/search`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query, filters: [] })
    })
    .then(r => r.json())
    .then(data => {
        currentData = data;
        showLoading(false);
        renderCard(data);
        plotPins(data);
    })
    .catch(() => {
        showLoading(false);
        cardVerdict.textContent = 'Could not connect to server';
        cardVerdict.className = 'card-verdict';
        cardSummary.textContent = 'Make sure the backend is running.';
    });
}

// ══════════════════════════════════════
// RENDER CARD
// ══════════════════════════════════════

function renderCard(data) {
    const risk     = data.risk_score || {};
    const sightings   = data.sightings   || [];
    const occurrences = data.occurrences || [];
    const allResults  = [...sightings, ...occurrences];
    const info        = data.species_info || {};
    const location    = data.location || {};

    // Location name
    const locName = location.display_name
        ? location.display_name.split(',').slice(0, 2).join(',').trim()
        : currentQuery;
    cardLocationName.textContent = locName;

    // Verdict
    const slug = (risk.label || 'unknown').toLowerCase();
    const verdictText = {
        low:      'Low displacement risk detected',
        moderate: 'Moderate displacement pressure',
        high:     'High displacement risk — take note',
        critical: 'Critical risk — significant activity',
        unknown:  'Insufficient data for this area'
    };
    cardVerdict.textContent = verdictText[slug] || verdictText.unknown;
    cardVerdict.className   = `card-verdict ${slug}`;
    cardSummary.textContent = risk.interpretation || '';

    // Score gauge
    const score = risk.score || 0;
    scoreNum.textContent = score;
    scoreLabelEl.textContent = risk.label || '—';
    scoreLabelEl.className   = `score-label ${slug}`;
    scoreInterpretation.textContent = risk.interpretation || '';

    // Arc: total arc length ≈ 173 (half circle)
    const arc = Math.round((score / 100) * 173);
    gaugeFill.style.strokeDasharray = `${arc} 173`;
    gaugeFill.className = `gauge-fill ${slug}`;

    // Sub-scores
    subScores.innerHTML = '';
    if (risk.components) {
        Object.values(risk.components).forEach(comp => {
            const pct = Math.round((comp.score / comp.max) * 100);
            const el  = document.createElement('div');
            el.className = 'sub-score-item';
            el.innerHTML = `
                <div class="sub-score-header">
                    <span class="sub-score-label">${comp.label}</span>
                    <span class="sub-score-val">${comp.score}/${comp.max}</span>
                </div>
                <div class="sub-score-track">
                    <div class="sub-score-fill" style="width:${pct}%"></div>
                </div>
            `;
            subScores.appendChild(el);
        });
    }

    // Stats
    statsRow.innerHTML = '';
    [
        { num: sightings.length,   label: 'Sightings' },
        { num: occurrences.length, label: 'Occurrences' },
        { num: allResults.length,  label: 'Total' }
    ].forEach(s => {
        const el = document.createElement('div');
        el.className = 'stat-item';
        el.innerHTML = `<span class="stat-num">${s.num}</span><span class="stat-label">${s.label}</span>`;
        statsRow.appendChild(el);
    });

    // Sightings list
    sightingsCount.textContent = `${allResults.length} records`;
    renderSightings(allResults, 0);

    // Species
    if (info.title) {
        speciesSection.classList.remove('hidden');
        speciesBody.innerHTML = `
            ${info.image_url ? `<img class="species-img" src="${info.image_url}" onerror="this.style.display='none'" alt="${info.title}">` : ''}
            <div class="species-row"><span class="species-key">Name</span><span class="species-val">${info.title}</span></div>
            <div class="species-row"><span class="species-key">Description</span><span class="species-val">${info.description || 'N/A'}</span></div>
            ${info.url ? `<div class="species-row"><span class="species-key">Source</span><span class="species-val"><a href="${info.url}" target="_blank">Wikipedia →</a></span></div>` : ''}
        `;
    } else {
        speciesSection.classList.add('hidden');
    }
}

function renderSightings(results, offset) {
    if (offset === 0) sightingsList.innerHTML = '';
    if (!results || results.length === 0) {
        sightingsList.innerHTML = `<p style="font-size:0.82rem;color:var(--text-muted);padding:12px 0;">No records found for this area.</p>`;
        return;
    }

    const slice     = results.slice(offset, offset + CARDS_PER_PAGE);
    const remaining = results.length - (offset + CARDS_PER_PAGE);

    slice.forEach((item, i) => {
        const isVenomous = VENOMOUS_TERMS.some(t => (item.common_name || item.species || '').toLowerCase().includes(t));
        const source = item.source === 'iNaturalist' ? 'inat' : 'gbif';
        const el = document.createElement('div');
        el.className = 'sighting-item';
        el.style.animationDelay = `${i * 0.03}s`;
        el.innerHTML = `
            ${item.photo_url
                ? `<img class="sighting-photo" src="${item.photo_url}" alt="" onerror="this.style.display='none'">`
                : `<div class="sighting-photo"></div>`
            }
            <div class="sighting-info">
                <span class="sighting-species">${item.common_name || item.species || 'Unknown species'}</span>
                ${item.species && item.common_name && item.species !== item.common_name
                    ? `<span class="sighting-scientific">${item.species}</span>` : ''}
                <span class="sighting-loc">📍 ${item.location || 'Unknown location'}</span>
                <span class="sighting-date">${item.date || ''}</span>
                <div class="sighting-badges">
                    <span class="badge badge-source-${source}">${item.source || 'Unknown'}</span>
                    ${isVenomous ? `<span class="badge badge-venomous">⚠ Venomous</span>` : ''}
                </div>
            </div>
        `;
        // Click to fly map to this pin
        el.addEventListener('click', () => {
            if (item.latitude && item.longitude && map) {
                map.flyTo([item.latitude, item.longitude], 13, { animate: true, duration: 1.2 });
            }
        });
        sightingsList.appendChild(el);
    });

    // Remove old show-more if any
    const oldBtn = sightingsList.querySelector('.show-more');
    if (oldBtn) oldBtn.remove();

    if (remaining > 0) {
        const btn = document.createElement('button');
        btn.className = 'show-more';
        btn.textContent = `Show ${Math.min(remaining, CARDS_PER_PAGE)} more`;
        btn.addEventListener('click', () => {
            btn.remove();
            renderSightings(results, offset + CARDS_PER_PAGE);
        });
        sightingsList.appendChild(btn);
    }
}

// ══════════════════════════════════════
// CARD EXPAND / COLLAPSE
// ══════════════════════════════════════

viewScoreBtn.addEventListener('click', expandCard);
cardHandle.addEventListener('click', () => {
    if (cardIsExpanded) collapseCard(); else expandCard();
});
collapseBtn.addEventListener('click', collapseCard);

function expandCard() {
    cardCollapsed.classList.add('hidden');
    cardExpanded.classList.remove('hidden');
    cardIsExpanded = true;
}

function collapseCard() {
    cardExpanded.classList.add('hidden');
    cardCollapsed.classList.remove('hidden');
    cardIsExpanded = false;
}

// ══════════════════════════════════════
// MAP
// ══════════════════════════════════════

function initMap() {
    if (map) { map.invalidateSize(); return; }
    map = L.map('map', { zoomControl: false }).setView([20, 0], 2);

    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO',
        subdomains: 'abcd',
        maxZoom: 19
    }).addTo(map);

    L.control.zoom({ position: 'topright' }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
}

function plotPins(data) {
    if (!map || !markersLayer) return;
    markersLayer.clearLayers();

    const location = data.location || {};
    if (location.latitude && location.longitude) {
        map.flyTo([location.latitude, location.longitude], 9, { animate: true, duration: 1.5 });
    }

    const allResults = [...(data.sightings || []), ...(data.occurrences || [])];
    const bounds = [];

    allResults.forEach(item => {
        if (!item.latitude || !item.longitude) return;
        const isVenomous = VENOMOUS_TERMS.some(t => (item.common_name || item.species || '').toLowerCase().includes(t));
        const color = isVenomous ? '#b03000' : (item.source === 'iNaturalist' ? '#3d6b8e' : '#1a7a45');

        const icon = L.divIcon({
            className: '',
            html: `<div style="width:10px;height:10px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.25);"></div>`,
            iconSize: [10, 10], iconAnchor: [5, 5]
        });

        const marker = L.marker([item.latitude, item.longitude], { icon });
        marker.bindPopup(`
            <div style="font-family:'DM Sans',sans-serif;font-size:13px;min-width:150px;line-height:1.5;">
                <strong>${item.common_name || item.species || 'Unknown'}</strong><br>
                <span style="color:#888;font-size:11px;">📍 ${item.location || ''}</span><br>
                <span style="color:#888;font-size:11px;">${item.date || ''}</span><br>
                <span style="font-size:11px;color:${color};">${item.source}</span>
                ${item.url ? `<a href="${item.url}" target="_blank" style="color:${color};margin-left:6px;">View →</a>` : ''}
            </div>
        `);
        markersLayer.addLayer(marker);
        bounds.push([item.latitude, item.longitude]);
    });

    if (bounds.length > 1) {
        setTimeout(() => map.fitBounds(bounds, { padding: [60, 60] }), 1600);
    }
}

viewMapBtn.addEventListener('click', () => {
    // Collapse card to see map
    collapseCard();
    if (map) map.invalidateSize();
});

// ══════════════════════════════════════
// SHARE
// ══════════════════════════════════════

shareBtn.addEventListener('click', () => {
    const url = `${location.origin}${location.pathname}?loc=${encodeURIComponent(currentQuery)}`;
    if (navigator.share) {
        navigator.share({ title: `Boseman — ${currentQuery}`, url });
    } else {
        navigator.clipboard.writeText(url).then(() => {
            shareBtn.textContent = 'Copied!';
            setTimeout(() => { shareBtn.textContent = 'Share'; }, 2000);
        });
    }
});

// ══════════════════════════════════════
// COMPARE
// ══════════════════════════════════════

compareBtn.addEventListener('click', () => {
    comparePanel.classList.remove('hidden');
    compareInputA.value = currentQuery;
    compareResultA.innerHTML = '';
    compareResultB.innerHTML = '';
    if (currentData) renderCompareResult(compareResultA, currentData);
});

closeCompare.addEventListener('click', () => comparePanel.classList.add('hidden'));

// Tab switching (mobile)
compareTabs.forEach(tab => {
    tab.addEventListener('click', () => {
        compareTabs.forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const idx = tab.dataset.tab;
        compareColA.classList.toggle('active', idx === '0');
        compareColB.classList.toggle('active', idx === '1');
    });
});

// Compare search buttons
document.querySelectorAll('.compare-search-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const col   = btn.dataset.col;
        const input = col === 'A' ? compareInputA : compareInputB;
        const result = col === 'A' ? compareResultA : compareResultB;
        const query = input.value.trim();
        if (!query) return;
        result.innerHTML = `<div style="padding:12px;color:var(--text-muted);font-size:0.82rem;">Searching…</div>`;
        fetch(`${API_BASE_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, filters: [] })
        })
        .then(r => r.json())
        .then(data => renderCompareResult(result, data))
        .catch(() => {
            result.innerHTML = `<p style="font-size:0.82rem;color:var(--text-muted);">Could not load data.</p>`;
        });
    });
});

function renderCompareResult(container, data) {
    const risk = data.risk_score || {};
    const slug = (risk.label || 'unknown').toLowerCase();
    const all  = [...(data.sightings || []), ...(data.occurrences || [])];
    const location = data.location || {};
    const locName = location.display_name
        ? location.display_name.split(',').slice(0, 2).join(',').trim()
        : '—';

    container.innerHTML = `
        <div class="compare-verdict ${slug}">
            <span class="compare-verdict-label ${slug}">${risk.label || 'Unknown'} — ${risk.score || '—'}/100</span>
            <span class="compare-verdict-text">${risk.interpretation || 'No interpretation available.'}</span>
        </div>
        <div style="display:flex;gap:12px;flex-wrap:wrap;padding:10px 0;">
            <div class="stat-item"><span class="stat-num">${all.length}</span><span class="stat-label">Records</span></div>
            <div class="stat-item"><span class="stat-num">${(data.sightings||[]).length}</span><span class="stat-label">Sightings</span></div>
            <div class="stat-item"><span class="stat-num">${(data.occurrences||[]).length}</span><span class="stat-label">Occurrences</span></div>
        </div>
    `;
}

// ══════════════════════════════════════
// LOADING
// ══════════════════════════════════════

function showLoading(show) {
    loadingOverlay.classList.toggle('hidden', !show);
}

// ══════════════════════════════════════
// URL PARAM — allow direct result links
// ══════════════════════════════════════

function checkUrlParam() {
    const params = new URLSearchParams(window.location.search);
    const loc    = params.get('loc');
    if (loc) triggerSearch(loc);
}

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════

renderRecent();
checkUrlParam();