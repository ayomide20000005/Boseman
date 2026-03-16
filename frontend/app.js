// ── Boseman Frontend JS ──

const searchBtn    = document.getElementById('searchBtn');
const searchInput  = document.getElementById('searchInput');
const bLetter      = document.getElementById('bLetter');
const toolsToggle  = document.getElementById('toolsToggle');
const toolsPanel   = document.getElementById('toolsPanel');
const chevron      = document.getElementById('chevron');
const addAllBtn    = document.getElementById('addAllBtn');
const removeAllBtn = document.getElementById('removeAllBtn');
const imageUpload  = document.getElementById('imageUpload');

// ── Active filters state ──
const activeFilters = new Set();

// ── Tools Panel Toggle ──
toolsToggle.addEventListener('click', () => {
  const isOpen = toolsPanel.classList.toggle('open');
  chevron.classList.toggle('open', isOpen);
});

// ── Individual Tool Toggle ──
document.querySelectorAll('.tool-toggle-btn').forEach(btn => {
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    const tool = btn.dataset.tool;
    const item = btn.closest('.tool-item');
    toggleTool(tool, item);
  });
});

// Also allow clicking the whole row (except upload row)
document.querySelectorAll('.tool-item:not(.upload-item)').forEach(item => {
  item.addEventListener('click', () => {
    const tool = item.dataset.tool;
    toggleTool(tool, item);
  });
});

function toggleTool(tool, item) {
  if (activeFilters.has(tool)) {
    activeFilters.delete(tool);
    item.classList.remove('active');
  } else {
    activeFilters.add(tool);
    item.classList.add('active');
  }
}

// ── Add All ──
addAllBtn.addEventListener('click', () => {
  document.querySelectorAll('.tool-item:not(.upload-item)').forEach(item => {
    const tool = item.dataset.tool;
    activeFilters.add(tool);
    item.classList.add('active');
  });
});

// ── Remove All ──
removeAllBtn.addEventListener('click', () => {
  activeFilters.clear();
  document.querySelectorAll('.tool-item').forEach(item => {
    item.classList.remove('active');
  });
});

// ── Rolling b Search ──
function triggerSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  // Roll the b
  searchBtn.classList.remove('rolling');
  void searchBtn.offsetWidth; // reflow to restart animation
  searchBtn.classList.add('rolling');

  setTimeout(() => {
    searchBtn.classList.remove('rolling');
  }, 650);

  // Build search payload
  const payload = {
    query,
    filters: Array.from(activeFilters)
  };

  console.log('Boseman search payload:', payload);

  // TODO: Send to backend
  // fetch('http://localhost:5000/search', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payload)
  // })
  // .then(res => res.json())
  // .then(data => renderResults(data))
  // .catch(err => console.error('Search error:', err));
}

searchBtn.addEventListener('click', triggerSearch);

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') triggerSearch();
});

// ── Image Upload ──
imageUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  console.log('Image uploaded for species ID:', file.name);
  // TODO: Send image to backend for species identification
});