
const API_BASE_URL = 'https://boseman-backend.onrender.com';
const RECENT_KEY    = 'boseman_recent';
const SAVED_KEY     = 'boseman_saved';
const CARDS_PER_PAGE = 12;

const VENOMOUS_TERMS = [
    'cobra','mamba','viper','adder','rattlesnake','krait',
    'boomslang','puff adder','king cobra','taipan','death adder',
    'bushmaster','fer-de-lance','water moccasin','copperhead'
];

const SAFETY_TIPS = {
    low:      'Stay on marked trails and observe from a safe distance',
    moderate: 'Wear closed shoes outdoors — keep yard clear of debris',
    high:     'Avoid tall grass — know your nearest treatment centre',
    critical: 'Restrict outdoor activity — seek help immediately if bitten',
    unknown:  'Exercise general caution in natural areas'
};

// ── DOM refs ──
const searchPage          = document.getElementById('searchPage');
const resultPage          = document.getElementById('resultPage');
const searchInput         = document.getElementById('searchInput');
const searchBtn           = document.getElementById('searchBtn');
const searchDropdown      = document.getElementById('searchDropdown');
const recentSection       = document.getElementById('recentSection');
const recentItems         = document.getElementById('recentItems');
const clearAllBtn         = document.getElementById('clearAllBtn');
const autocompleteSection = document.getElementById('autocompleteSection');
const autocompleteItems   = document.getElementById('autocompleteItems');

const backBtn             = document.getElementById('backBtn');
const topbarInput         = document.getElementById('topbarInput');
const topbarSearchBtn     = document.getElementById('topbarSearchBtn');
const showMapBtn          = document.getElementById('showMapBtn');
const exportBtn           = document.getElementById('exportBtn');
const saveLocationBtn     = document.getElementById('saveLocationBtn');
const openDrawerBtn       = document.getElementById('openDrawerBtn');

const resultTitle         = document.getElementById('resultTitle');
const resultSubtitle      = document.getElementById('resultSubtitle');
const riskBadge           = document.getElementById('riskBadge');
const riskBadgeNum        = document.getElementById('riskBadgeNum');
const riskBadgeLevel      = document.getElementById('riskBadgeLevel');
const safetyRibbon        = document.getElementById('safetyRibbon');
const safetyText          = document.getElementById('safetyText');
const filterChips         = document.getElementById('filterChips');
const trendsSection       = document.getElementById('trendsSection');
const toggleTrendsBtn     = document.getElementById('toggleTrendsBtn');
const trendsContent       = document.getElementById('trendsContent');
const resultSkeletons     = document.getElementById('resultSkeletons');
const speciesCards        = document.getElementById('speciesCards');
const loadMoreWrap        = document.getElementById('loadMoreWrap');
const loadMoreBtn         = document.getElementById('loadMoreBtn');
const showingCount        = document.getElementById('showingCount');

const rightDrawer         = document.getElementById('rightDrawer');
const closeDrawerBtn      = document.getElementById('closeDrawerBtn');
const drawerContent       = document.getElementById('drawerContent');
const drawerOverlay       = document.getElementById('drawerOverlay');

const mapPanel            = document.getElementById('mapPanel');
const closeMapBtn         = document.getElementById('closeMapBtn');
const comparePanel        = document.getElementById('comparePanel');
const closeCompare        = document.getElementById('closeCompare');
const compareColA         = document.getElementById('compareColA');
const compareColB         = document.getElementById('compareColB');
const compareInputA       = document.getElementById('compareInputA');
const compareInputB       = document.getElementById('compareInputB');
const compareResultA      = document.getElementById('compareResultA');
const compareResultB      = document.getElementById('compareResultB');

const scrollTopBtn        = document.getElementById('scrollTopBtn');
const mobNavResults       = document.getElementById('mobNavResults');
const mobNavMap           = document.getElementById('mobNavMap');
const mobNavCompare       = document.getElementById('mobNavCompare');
const mobNavShare         = document.getElementById('mobNavShare');

// ── State ──
let map             = null;
let markersLayer    = null;
let currentData     = null;
let currentQuery    = '';
let allResults      = [];
let filteredResults = [];
let visibleCount    = 0;
let currentFilter   = 'all';
let autocompleteTimer = null;

// ══════════════════════════════════════
// RECENT SEARCHES
// ══════════════════════════════════════

function getRecent() {
    try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; }
    catch { return []; }
}

function saveRecent(q) {
    let r = getRecent().filter(x => x.toLowerCase() !== q.toLowerCase());
    r.unshift(q);
    localStorage.setItem(RECENT_KEY, JSON.stringify(r.slice(0, 8)));
}

function removeRecent(q) {
    const r = getRecent().filter(x => x.toLowerCase() !== q.toLowerCase());
    localStorage.setItem(RECENT_KEY, JSON.stringify(r));
    renderDropdown(searchInput.value.trim());
}

function clearAllRecent() {
    localStorage.removeItem(RECENT_KEY);
    renderDropdown(searchInput.value.trim());
}

// ══════════════════════════════════════
// SAVED LOCATIONS
// ══════════════════════════════════════

function getSaved() {
    try { return JSON.parse(localStorage.getItem(SAVED_KEY)) || []; }
    catch { return []; }
}

function isSaved(query) {
    return getSaved().some(s => s.query.toLowerCase() === query.toLowerCase());
}

function toggleSaveLocation() {
    const saved = getSaved();
    const existing = saved.findIndex(s => s.query.toLowerCase() === currentQuery.toLowerCase());
    
    if (existing >= 0) {
        saved.splice(existing, 1);
        saveLocationBtn.classList.remove('active');
        saveLocationBtn.querySelector('svg').style.fill = 'none';
        alert('Location removed from saved');
    } else {
        saved.unshift({
            query: currentQuery,
            date: new Date().toISOString(),
            data: currentData
        });
        saveLocationBtn.classList.add('active');
        saveLocationBtn.querySelector('svg').style.fill = 'currentColor';
        alert('Location saved! Access it from your account page.');
    }
    localStorage.setItem(SAVED_KEY, JSON.stringify(saved.slice(0, 20)));
}


function openDropdown()  { searchDropdown.classList.add('open'); }
function closeDropdown() { searchDropdown.classList.remove('open'); }

function renderDropdown(query) {
    const recents = getRecent();
    if (!query) {
        autocompleteSection.style.display = 'none';
        if (!recents.length) { closeDropdown(); return; }
        recentSection.style.display = 'block';
        recentItems.innerHTML = '';
        recents.forEach(r => {
            const el = document.createElement('div');
            el.className = 'dropdown-item';
            el.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg><span class="dropdown-item-text">${r}</span><button class="dropdown-item-remove" data-q="${r}">✕</button>`;
            el.addEventListener('click', e => {
                if (e.target.closest('.dropdown-item-remove')) return;
                closeDropdown(); triggerSearch(r);
            });
            el.querySelector('.dropdown-item-remove').addEventListener('click', e => {
                e.stopPropagation(); removeRecent(r);
            });
            recentItems.appendChild(el);
        });
        openDropdown();
    } else {
        recentSection.style.display = 'none';
        autocompleteSection.style.display = 'block';
        fetchAutocomplete(query);
    }
}

clearAllBtn.addEventListener('click', clearAllRecent);

function fetchAutocomplete(query) {
    clearTimeout(autocompleteTimer);
    autocompleteTimer = setTimeout(() => {
        if (query.length < 2) { closeDropdown(); return; }
        fetch(`https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(query)}&format=json&limit=5`)
            .then(r => r.json())
            .then(results => {
                autocompleteItems.innerHTML = '';
                if (!results.length) { closeDropdown(); return; }
                results.forEach(item => {
                    const div = document.createElement('div');
                    div.className = 'dropdown-item';
                    div.innerHTML = `<svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg><span class="dropdown-item-text">${item.display_name}</span>`;
                    div.addEventListener('click', () => {
                        searchInput.value = item.display_name;
                        closeDropdown();
                        triggerSearch(item.display_name);
                    });
                    autocompleteItems.appendChild(div);
                });
                openDropdown();
            })
            .catch(() => closeDropdown());
    }, 300);
}

searchInput.addEventListener('focus', () => renderDropdown(searchInput.value.trim()));
searchInput.addEventListener('input', () => renderDropdown(searchInput.value.trim()));
document.addEventListener('click', e => { if (!e.target.closest('.search-wrap')) closeDropdown(); });

function triggerSearch(query) {
    if (!query) query = searchInput.value.trim();
    if (!query) return;
    currentQuery = query;
    saveRecent(query);
    closeDropdown();
    showResultPage(query);
    fetchResults(query);
}

searchBtn.addEventListener('click', () => triggerSearch());
searchInput.addEventListener('keydown', e => { if (e.key === 'Enter') triggerSearch(); });
topbarSearchBtn.addEventListener('click', () => { const q = topbarInput.value.trim(); if (q) triggerSearch(q); });
topbarInput.addEventListener('keydown', e => { if (e.key === 'Enter') { const q = topbarInput.value.trim(); if (q) triggerSearch(q); } });

function showResultPage(query) {
    searchPage.classList.add('hidden');
    resultPage.classList.remove('hidden');
    topbarInput.value = query;

    resultTitle.textContent = query;
    resultSubtitle.textContent = '';
    riskBadge.classList.add('hidden');
    safetyRibbon.classList.add('hidden');
    filterChips.classList.add('hidden');
    trendsSection.classList.add('hidden');
    trendsContent.classList.add('hidden');
    toggleTrendsBtn.classList.remove('open');
    resultSkeletons.style.display = 'grid';
    speciesCards.classList.add('hidden');
    speciesCards.innerHTML = '';
    loadMoreWrap.classList.add('hidden');
    rightDrawer.classList.add('hidden');
    drawerOverlay.classList.add('hidden');
    allResults = [];
    filteredResults = [];
    visibleCount = 0;
    currentFilter = 'all';
    updateFilterChips();

    // Reset panels
    mapPanel.classList.add('hidden');
    comparePanel.classList.add('hidden');
    setMobNav('results');

    // Update save button state
    if (isSaved(query)) {
        saveLocationBtn.classList.add('active');
        saveLocationBtn.querySelector('svg').style.fill = 'currentColor';
    } else {
        saveLocationBtn.classList.remove('active');
        saveLocationBtn.querySelector('svg').style.fill = 'none';
    }

    initMap();
}

backBtn.addEventListener('click', () => {
    resultPage.classList.add('hidden');
    searchPage.classList.remove('hidden');
    searchInput.value = currentQuery;
});

// ══════════════════════════════════════
// FETCH
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
        renderResults(data);
        plotPins(data);
        populateDrawer(data);
    })
   .catch(() => {
    resultSkeletons.style.display = 'none';
});
}

function updateFilterChips() {
    document.querySelectorAll('.filter-chip').forEach(chip => {
        chip.classList.toggle('active', chip.dataset.filter === currentFilter);
    });
}

filterChips.addEventListener('click', e => {
    if (!e.target.classList.contains('filter-chip')) return;
    currentFilter = e.target.dataset.filter;
    updateFilterChips();
    applyFilter();
});

function applyFilter() {
    if (currentFilter === 'all') {
        filteredResults = [...allResults];
    } else if (currentFilter === 'venomous') {
        filteredResults = allResults.filter(item => 
            VENOMOUS_TERMS.some(t => (item.common_name || item.species || '').toLowerCase().includes(t))
        );
    } else if (currentFilter === 'inat') {
        filteredResults = allResults.filter(item => item.source === 'iNaturalist');
    } else if (currentFilter === 'gbif') {
        filteredResults = allResults.filter(item => item.source === 'GBIF');
    } else if (currentFilter === 'photo') {
        filteredResults = allResults.filter(item => item.photo_url);
    }
    
    visibleCount = 0;
    speciesCards.innerHTML = '';
    const risk = currentData?.risk_score || {};
    renderCards(filteredResults, risk);
}

// ══════════════════════════════════════
// TRENDS TOGGLE
// ══════════════════════════════════════

toggleTrendsBtn.addEventListener('click', () => {
    const isOpen = trendsContent.classList.toggle('hidden');
    toggleTrendsBtn.classList.toggle('open', !isOpen);
    if (!isOpen) {
        // Generate simple trend visualization
        generateTrendsChart();
    }
});

function generateTrendsChart() {
    const chartDiv = document.getElementById('trendsChart');
    const sightings = currentData?.sightings || [];
    const occurrences = currentData?.occurrences || [];
    const total = sightings.length + occurrences.length;
    
    // Simple bar chart by year
    const byYear = {};
    [...sightings, ...occurrences].forEach(item => {
        const year = item.date ? item.date.split('-')[0] : 'Unknown';
        byYear[year] = (byYear[year] || 0) + 1;
    });
    
    const years = Object.keys(byYear).sort().slice(-5);
    const maxCount = Math.max(...Object.values(byYear), 1);
    
    let barsHTML = years.map(year => {
        const count = byYear[year];
        const height = (count / maxCount) * 100;
        return `
            <div style="display:flex;flex-direction:column;align-items:center;gap:6px;flex:1;">
                <div style="width:40px;background:var(--accent);border-radius:4px 4px 0 0;transition:height 0.5s ease;height:${height}px;min-height:4px;"></div>
                <span style="font-size:0.72rem;font-weight:700;color:var(--text-muted);">${year}</span>
                <span style="font-size:0.65rem;font-weight:600;color:var(--text-secondary);">${count}</span>
            </div>
        `;
    }).join('');
    
    chartDiv.innerHTML = `
        <div style="display:flex;align-items:flex-end;gap:16px;height:160px;padding:20px;background:var(--surface);border-radius:12px;border:1px solid var(--border);">
            ${barsHTML || '<p style="color:var(--text-muted);font-size:0.85rem;">No date data available</p>'}
        </div>
        <p style="margin-top:12px;font-size:0.78rem;color:var(--text-muted);text-align:center;">Sightings by year (last 5 years)</p>
    `;
}

// ══════════════════════════════════════
// RENDER RESULTS
// ══════════════════════════════════════

function renderResults(data) {
    const risk      = data.risk_score  || {};
    const sightings = data.sightings   || [];
    const occs      = data.occurrences || [];
    const location  = data.location    || {};
    allResults      = [...sightings, ...occs];
    filteredResults = [...allResults];

    // Title
    const locName = location.display_name
        ? location.display_name.split(',').slice(0, 2).join(',').trim()
        : currentQuery;
    resultTitle.textContent = `Results for ${locName}`;
    resultSubtitle.textContent = `${allResults.length} record${allResults.length !== 1 ? 's' : ''} found`;

    // Risk badge
    const slug = (risk.label || 'unknown').toLowerCase();
    if (risk.score) {
        riskBadge.className = `risk-badge ${slug}`;
        riskBadge.classList.remove('hidden');
        riskBadgeNum.textContent = risk.score;
        riskBadgeLevel.textContent = risk.label || '—';
    }

    // Safety ribbon
    safetyRibbon.className = `safety-ribbon ${slug}`;
    safetyRibbon.classList.remove('hidden');
    safetyText.textContent = SAFETY_TIPS[slug] || SAFETY_TIPS.unknown;

    // Show filters and trends
    filterChips.classList.remove('hidden');
    trendsSection.classList.remove('hidden');

    // Hide skeletons, show cards
    resultSkeletons.style.display = 'none';
    speciesCards.classList.remove('hidden');

    // Render first batch
    visibleCount = 0;
    renderCards(filteredResults, risk);
}

function renderCards(results, risk) {
    const slug = (risk.label || 'unknown').toLowerCase();
    const batch = results.slice(visibleCount, visibleCount + CARDS_PER_PAGE);
    batch.forEach((item, i) => {
        const card = buildCard(item, risk, slug, visibleCount + i);
        speciesCards.appendChild(card);
    });
    visibleCount += batch.length;

    // Load more
    if (visibleCount < results.length) {
        loadMoreWrap.classList.remove('hidden');
        showingCount.textContent = `Showing ${visibleCount} of ${results.length} results`;
    } else {
        showingCount.textContent = `Showing all ${results.length} results`;
        if (results.length > CARDS_PER_PAGE) loadMoreWrap.classList.remove('hidden');
        else loadMoreWrap.classList.add('hidden');
    }
}

function buildCard(item, risk, riskSlug, index) {
    const isVenomous = VENOMOUS_TERMS.some(t => (item.common_name || item.species || '').toLowerCase().includes(t));
    const cardSlug   = riskSlug;
    const score      = risk.score || 0;
    const pct        = score;
    const source     = item.source === 'iNaturalist' ? 'iNat' : 'GBIF';
    const sourceColor = item.source === 'iNaturalist' ? '#3d6b8e' : '#006d42';

    const safetyTip = SAFETY_TIPS[cardSlug] || SAFETY_TIPS.unknown;

    const card = document.createElement('div');
    card.className = 'sp-card';
    card.style.animationDelay = `${(index % CARDS_PER_PAGE) * 0.05}s`;

    card.innerHTML = `
        <div class="sp-card-inner">
            <div class="sp-img-wrap">
                ${item.photo_url
                    ? `<img class="sp-img" src="${item.photo_url}" alt="${item.common_name || ''}" loading="lazy" onerror="this.parentElement.innerHTML='<div class=\\'sp-img-placeholder\\'><svg width=\\'48\\' height=\\'48\\' viewBox=\\'0 0 24 24\\' fill=\\'none\\' stroke=\\'currentColor\\' stroke-width=\\'1\\'><path d=\\'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z\\'></path></svg></div>'">`
                    : `<div class="sp-img-placeholder"><svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path></svg></div>`
                }
                <span class="sp-venom-badge ${isVenomous ? 'venomous' : 'safe'}">${isVenomous ? 'Venomous' : 'Non-Venomous'}</span>
            </div>

            <div class="sp-content">
                <div class="sp-top">
                    <div class="sp-names">
                        <span class="sp-common">${item.common_name || item.species || 'Unknown species'}</span>
                        ${item.species && item.common_name && item.species !== item.common_name
                            ? `<span class="sp-scientific">${item.species}</span>` : ''}
                    </div>
                    <div class="sp-score ${cardSlug}">
                        <span class="sp-score-num">${score}<span style="font-size:0.55em;font-weight:700;margin-left:3px;color:var(--text-muted)">USDRI</span></span>
                        <span class="sp-score-label">Risk Score</span>
                        <span class="sp-score-risk">${risk.label || '—'}</span>
                    </div>
                </div>

                <div class="sp-safety ${cardSlug}">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/></svg>
                    ${safetyTip}
                </div>

                <div class="sp-bar-wrap">
                    <div class="sp-bar-track">
                        <div class="sp-bar-fill ${cardSlug}" style="width:${pct}%"></div>
                    </div>
                </div>

                <p class="sp-desc">${risk.interpretation || 'Displacement data recorded for this location.'}</p>

                <div class="sp-meta">
                    <div class="sp-meta-item">
                        <span class="sp-meta-label">Location</span>
                        <span class="sp-meta-val">${item.location || 'Unknown'}</span>
                    </div>
                    <div class="sp-meta-item">
                        <span class="sp-meta-label">Date</span>
                        <span class="sp-meta-val">${item.date || '—'}</span>
                    </div>
                    <div class="sp-meta-item">
                        <span class="sp-meta-label">Source</span>
                        <span class="sp-meta-val" style="color:${sourceColor};font-weight:700;">${source}</span>
                    </div>
                    ${item.observer ? `<div class="sp-meta-item"><span class="sp-meta-label">Observer</span><span class="sp-meta-val">${item.observer}</span></div>` : ''}
                </div>

                <div class="sp-actions">
                    <div style="display:flex;gap:10px;flex-wrap:wrap;">
                        <button class="sp-btn primary sp-expand-trigger">Expand Metrics</button>
                        ${item.url ? `<a href="${item.url}" target="_blank" class="sp-btn outline">View Record</a>` : ''}
                    </div>
                    <button class="sp-share-btn sp-share-trigger" title="Share">
                        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>
                    </button>
                </div>
            </div>
        </div>

        <div class="sp-metrics">
            <span class="sp-metrics-title">USDRI Breakdown</span>
            ${risk.components ? Object.values(risk.components).map(c => {
                const p = Math.round((c.score / c.max) * 100);
                return `<div class="sp-sub-item">
                    <div class="sp-sub-header">
                        <span class="sp-sub-label">${c.label}</span>
                        <span class="sp-sub-val">${c.score}/${c.max}</span>
                    </div>
                    <div class="sp-sub-track"><div class="sp-sub-fill" style="width:${p}%"></div></div>
                </div>`;
            }).join('') : '<p style="font-size:0.82rem;color:var(--text-muted);">No breakdown available.</p>'}
            ${item.latitude && item.longitude ? `
            <div class="sp-sub-item" style="margin-top:6px;">
                <span class="sp-sub-label" style="font-size:0.72rem;color:var(--text-muted);">Coordinates: ${Number(item.latitude).toFixed(4)}, ${Number(item.longitude).toFixed(4)}</span>
            </div>` : ''}
        </div>
    `;

    const expandBtn  = card.querySelector('.sp-expand-trigger');
    const metricsEl  = card.querySelector('.sp-metrics');
    expandBtn.addEventListener('click', () => {
        const open = metricsEl.classList.toggle('open');
        expandBtn.textContent = open ? 'Collapse' : 'Expand Metrics';
    });

    card.addEventListener('click', e => {
        if (e.target.closest('.sp-btn') || e.target.closest('.sp-share-btn')) return;
        if (item.latitude && item.longitude && map) {
            showMapPanel();
            setTimeout(() => map.flyTo([item.latitude, item.longitude], 14, { animate: true, duration: 1.2 }), 200);
        }
    });

    card.querySelector('.sp-share-trigger').addEventListener('click', e => {
        e.stopPropagation();
        const url = `${location.origin}${location.pathname}?loc=${encodeURIComponent(currentQuery)}`;
        if (navigator.share) { navigator.share({ title: `Boseman — ${item.common_name || item.species}`, url }); }
        else { navigator.clipboard.writeText(url); alert('Link copied to clipboard!'); }
    });

    return card;
}

loadMoreBtn.addEventListener('click', () => {
    if (!currentData) return;
    const risk = currentData.risk_score || {};
    renderCards(filteredResults, risk);
});

// ══════════════════════════════════════
// RIGHT DRAWER (Species List)
// ══════════════════════════════════════

function populateDrawer(data) {
    const sightings = data.sightings || [];
    const occurrences = data.occurrences || [];
    const all = [...sightings, ...occurrences];
    
    // Group by species
    const bySpecies = {};
    all.forEach(item => {
        const name = item.common_name || item.species || 'Unknown';
        if (!bySpecies[name]) {
            bySpecies[name] = {
                name: name,
                scientific: item.species,
                count: 0,
                photo: item.photo_url,
                venomous: VENOMOUS_TERMS.some(t => name.toLowerCase().includes(t))
            };
        }
        bySpecies[name].count++;
    });
    
    const speciesList = Object.values(bySpecies).sort((a, b) => b.count - a.count);
    
    if (speciesList.length === 0) {
        drawerContent.innerHTML = '<p class="drawer-empty">No species found for this location.</p>';
        return;
    }
    
    drawerContent.innerHTML = `
        <div class="drawer-species-list">
            ${speciesList.map(s => `
                <div class="drawer-species-item" data-name="${s.name}">
                    ${s.photo ? `<img class="drawer-species-img" src="${s.photo}" alt="">` : `<div class="drawer-species-img" style="background:var(--border);"></div>`}
                    <div class="drawer-species-info">
                        <div class="drawer-species-name">${s.name} ${s.venomous ? '⚠️' : ''}</div>
                        <div class="drawer-species-count">${s.count} sighting${s.count !== 1 ? 's' : ''}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    // Click to filter
    drawerContent.querySelectorAll('.drawer-species-item').forEach(item => {
        item.addEventListener('click', () => {
            const name = item.dataset.name;
            // Filter cards to show only this species
            const filtered = allResults.filter(r => (r.common_name || r.species) === name);
            filteredResults = filtered;
            visibleCount = 0;
            speciesCards.innerHTML = '';
            const risk = currentData?.risk_score || {};
            renderCards(filteredResults, risk);
            closeDrawer();
            // Reset filter chips visually
            document.querySelectorAll('.filter-chip').forEach(c => c.classList.remove('active'));
        });
    });
}

function openDrawer() {
    rightDrawer.classList.remove('hidden');
    drawerOverlay.classList.remove('hidden');
}

function closeDrawer() {
    rightDrawer.classList.add('hidden');
    drawerOverlay.classList.add('hidden');
}

openDrawerBtn.addEventListener('click', openDrawer);
closeDrawerBtn.addEventListener('click', closeDrawer);
drawerOverlay.addEventListener('click', closeDrawer);

// ══════════════════════════════════════
// MAP
// ══════════════════════════════════════

function initMap() {
    if (map) { setTimeout(() => map.invalidateSize(), 100); return; }
    map = L.map('map', { zoomControl: false }).setView([20, 0], 2);
    L.tileLayer('https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png', {
        attribution: '© OpenStreetMap © CARTO', subdomains: 'abcd', maxZoom: 19
    }).addTo(map);
    L.control.zoom({ position: 'topright' }).addTo(map);
    markersLayer = L.layerGroup().addTo(map);
}

function plotPins(data) {
    if (!map || !markersLayer) return;
    markersLayer.clearLayers();
    const loc = data.location || {};
    if (loc.latitude && loc.longitude) {
        map.flyTo([loc.latitude, loc.longitude], 9, { animate: true, duration: 1.5 });
    }
    const bounds = [];
    allResults.forEach(item => {
        if (!item.latitude || !item.longitude) return;
        const isVenomous = VENOMOUS_TERMS.some(t => (item.common_name || item.species || '').toLowerCase().includes(t));
        const color = isVenomous ? '#b03000' : (item.source === 'iNaturalist' ? '#3d6b8e' : '#006d42');
        const icon = L.divIcon({
            className: '',
            html: `<div style="width:12px;height:12px;background:${color};border:2px solid white;border-radius:50%;box-shadow:0 2px 6px rgba(0,0,0,0.25);"></div>`,
            iconSize: [12, 12], iconAnchor: [6, 6]
        });
        const marker = L.marker([item.latitude, item.longitude], { icon });
        marker.bindPopup(`<div style="font-family:'DM Sans',sans-serif;font-size:13px;min-width:150px;line-height:1.6;"><strong>${item.common_name || item.species || 'Unknown'}</strong><br><span style="color:#888;font-size:11px;">📍 ${item.location || ''}</span><br><span style="color:#888;font-size:11px;">${item.date || ''}</span><br><span style="font-size:11px;color:${color};font-weight:700;">${item.source}</span>${item.url ? ` <a href="${item.url}" target="_blank" style="color:${color};">View →</a>` : ''}</div>`);
        markersLayer.addLayer(marker);
        bounds.push([item.latitude, item.longitude]);
    });
    if (bounds.length > 1) setTimeout(() => map.fitBounds(bounds, { padding: [60, 60] }), 1800);
}

function showMapPanel() {
    mapPanel.classList.remove('hidden');
    comparePanel.classList.add('hidden');
    rightDrawer.classList.add('hidden');
    setMobNav('map');
    setTimeout(() => { if (map) map.invalidateSize(); }, 200);
}

showMapBtn.addEventListener('click', showMapPanel);
closeMapBtn.addEventListener('click', () => { mapPanel.classList.add('hidden'); setMobNav('results'); });

// ══════════════════════════════════════
// EXPORT
// ══════════════════════════════════════

exportBtn.addEventListener('click', () => {
    if (!currentData || !allResults.length) {
        alert('No data to export. Please search first.');
        return;
    }
    
    const risk = currentData.risk_score || {};
    const location = currentData.location || {};
    
    // Create CSV content
    const headers = ['Species', 'Common Name', 'Location', 'Date', 'Source', 'Latitude', 'Longitude', 'Venomous'];
    const rows = allResults.map(item => {
        const isVenomous = VENOMOUS_TERMS.some(t => (item.common_name || item.species || '').toLowerCase().includes(t));
        return [
            `"${item.species || ''}"`,
            `"${item.common_name || ''}"`,
            `"${item.location || ''}"`,
            `"${item.date || ''}"`,
            `"${item.source || ''}"`,
            item.latitude || '',
            item.longitude || '',
            isVenomous ? 'Yes' : 'No'
        ].join(',');
    });
    
    const csv = [headers.join(','), ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `boseman-${currentQuery.replace(/[^a-z0-9]/gi, '_').toLowerCase()}-${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
});

// ══════════════════════════════════════
// SAVE LOCATION
// ══════════════════════════════════════

saveLocationBtn.addEventListener('click', toggleSaveLocation);

// ══════════════════════════════════════
// COMPARE
// ══════════════════════════════════════

function showComparePanel() {
    comparePanel.classList.remove('hidden');
    mapPanel.classList.add('hidden');
    rightDrawer.classList.add('hidden');
    setMobNav('compare');
    compareInputA.value = currentQuery;
    compareResultA.innerHTML = '';
    compareResultB.innerHTML = '';
    if (currentData) renderCompareResult(compareResultA, currentData);
}

closeCompare.addEventListener('click', () => { comparePanel.classList.add('hidden'); setMobNav('results'); });

document.querySelectorAll('.compare-tab').forEach(tab => {
    tab.addEventListener('click', () => {
        document.querySelectorAll('.compare-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        const idx = tab.dataset.tab;
        compareColA.classList.toggle('active', idx === '0');
        compareColB.classList.toggle('active', idx === '1');
    });
});

document.querySelectorAll('.compare-search-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        const col    = btn.dataset.col;
        const input  = col === 'A' ? compareInputA : compareInputB;
        const result = col === 'A' ? compareResultA : compareResultB;
        const query  = input.value.trim();
        if (!query) return;
        result.innerHTML = `<div style="padding:16px;color:var(--text-muted);font-size:0.85rem;">Searching…</div>`;
        fetch(`${API_BASE_URL}/search`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ query, filters: [] })
        })
        .then(r => r.json())
        .then(data => renderCompareResult(result, data))
        .catch(() => { result.innerHTML = `<p style="font-size:0.85rem;color:var(--text-muted);padding:16px;">Could not load.</p>`; });
    });
});

function renderCompareResult(container, data) {
    const risk = data.risk_score || {};
    const slug = (risk.label || 'unknown').toLowerCase();
    const all  = [...(data.sightings || []), ...(data.occurrences || [])];
    const loc  = data.location || {};
    const name = loc.display_name ? loc.display_name.split(',').slice(0, 2).join(',').trim() : '—';
    container.innerHTML = `
        <p style="font-size:0.75rem;font-weight:800;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.12em;margin-bottom:8px;">${name}</p>
        <div class="compare-verdict ${slug}">
            <span class="compare-verdict-label ${slug}">${risk.label || 'Unknown'} — ${risk.score || '—'}/100</span>
            <span class="compare-verdict-text">${risk.interpretation || 'No data available.'}</span>
        </div>
        <div class="compare-stat-row">
            <div class="c-stat"><span class="c-stat-num">${all.length}</span><span class="c-stat-label">Total</span></div>
            <div class="c-stat"><span class="c-stat-num">${(data.sightings||[]).length}</span><span class="c-stat-label">Sightings</span></div>
            <div class="c-stat"><span class="c-stat-num">${(data.occurrences||[]).length}</span><span class="c-stat-label">Occurrences</span></div>
        </div>
    `;
}

// ══════════════════════════════════════
// MOBILE NAV
// ══════════════════════════════════════

function setMobNav(active) {
    [mobNavResults, mobNavMap, mobNavCompare, mobNavShare].forEach(b => b.classList.remove('active'));
    if (active === 'results')  mobNavResults.classList.add('active');
    if (active === 'map')      mobNavMap.classList.add('active');
    if (active === 'compare')  mobNavCompare.classList.add('active');
}

mobNavResults.addEventListener('click', () => {
    mapPanel.classList.add('hidden');
    comparePanel.classList.add('hidden');
    rightDrawer.classList.add('hidden');
    setMobNav('results');
});
mobNavMap.addEventListener('click', showMapPanel);
mobNavCompare.addEventListener('click', showComparePanel);
mobNavShare.addEventListener('click', () => {
    const url = `${location.origin}${location.pathname}?loc=${encodeURIComponent(currentQuery)}`;
    if (navigator.share) { navigator.share({ title: `Boseman — ${currentQuery}`, url }); }
    else { navigator.clipboard.writeText(url).then(() => { alert('Link copied!'); }); }
    setMobNav('results');
});

// ══════════════════════════════════════
// SCROLL TO TOP
// ══════════════════════════════════════

function initScrollTop() {
    const resultBody = document.getElementById('resultBody');
    if (!resultBody) return;
    
    resultBody.addEventListener('scroll', () => {
        if (resultBody.scrollTop > 300) {
            scrollTopBtn.classList.remove('hidden');
        } else {
            scrollTopBtn.classList.add('hidden');
        }
    });
    
    scrollTopBtn.addEventListener('click', () => {
        resultBody.scrollTo({ top: 0, behavior: 'smooth' });
    });
}

// ══════════════════════════════════════
// URL PARAM
// ══════════════════════════════════════

function checkUrlParam() {
    const params = new URLSearchParams(window.location.search);
    const loc = params.get('loc');
    if (loc) triggerSearch(loc);
}

// ══════════════════════════════════════
// INIT
// ══════════════════════════════════════

initScrollTop();
checkUrlParam();