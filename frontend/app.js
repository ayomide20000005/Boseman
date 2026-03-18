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

const activeFilters = new Set();
let toolsOpen = false;
let plusOpen  = false;

// ── Tools toggle ──
toolsBtn.addEventListener('click', () => {
  toolsOpen = !toolsOpen;
  toolsStrip.classList.toggle('open', toolsOpen);
  searchBar.classList.toggle('tools-open', toolsOpen);
  toolsBtn.classList.toggle('open', toolsOpen);
});

// ── Plus button toggle ──
plusBtn.addEventListener('click', (e) => {
  e.stopPropagation();
  plusOpen = !plusOpen;
  uploadDropdown.classList.toggle('open', plusOpen);
  plusBtn.classList.toggle('open', plusOpen);
});

// ── Close plus dropdown when clicking outside ──
document.addEventListener('click', (e) => {
  if (!plusBtn.contains(e.target) && !uploadDropdown.contains(e.target)) {
    plusOpen = false;
    uploadDropdown.classList.remove('open');
    plusBtn.classList.remove('open');
  }
});

// ── Image upload ──
imageUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  console.log('Image uploaded:', file.name);
  closePlus();
  // TODO: send to backend
});

// ── File upload ──
fileUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) return;
  console.log('File uploaded:', file.name);
  closePlus();
  // TODO: send to backend
});

function closePlus() {
  plusOpen = false;
  uploadDropdown.classList.remove('open');
  plusBtn.classList.remove('open');
}

// ── Tool chip select/deselect ──
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

// ── Render active tags below bar ──
function renderActiveTags() {
  activeBar.innerHTML = '';
  const labels = {
    species:   'Species',
    location:  'Location',
    hospitals: 'Hospitals',
    habitat:   'Habitat Loss',
    urban:     'Urban Sprawl'
  };
  activeFilters.forEach(filter => {
    const tag = document.createElement('span');
    tag.className = 'active-tag';
    tag.textContent = labels[filter] || filter;
    activeBar.appendChild(tag);
  });
}

// ── Rolling b search ──
function triggerSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  searchBtn.classList.remove('rolling');
  void searchBtn.offsetWidth;
  searchBtn.classList.add('rolling');
  setTimeout(() => searchBtn.classList.remove('rolling'), 600);

  const payload = {
    query,
    filters: Array.from(activeFilters)
  };

  console.log('Boseman search payload:', payload);

  // ── Uncomment when backend is ready ──
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
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') triggerSearch();
});