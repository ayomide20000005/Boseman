// ── Boseman app.js ──

const html         = document.documentElement;
const modeToggle   = document.getElementById('modeToggle');
const modeLabel    = document.getElementById('modeLabel');
const modeThumb    = document.querySelector('.mode-thumb');
const searchBtn    = document.getElementById('searchBtn');
const searchInput  = document.getElementById('searchInput');
const toolsToggle  = document.getElementById('toolsToggle');
const chipsRow     = document.getElementById('chipsRow');
const imageUpload  = document.getElementById('imageUpload');

// ── Theme toggle (starts light) ──
let isDark = false;

modeToggle.addEventListener('click', () => {
  isDark = !isDark;
  html.setAttribute('data-theme', isDark ? 'dark' : 'light');
  modeLabel.textContent = isDark ? 'Light mode' : 'Dark mode';
});

// ── Tools toggle ──
let toolsOpen = false;

toolsToggle.addEventListener('click', () => {
  toolsOpen = !toolsOpen;
  chipsRow.classList.toggle('open', toolsOpen);
  toolsToggle.classList.toggle('open', toolsOpen);
});

// ── Chip select / deselect ──
const activeFilters = new Set();

document.querySelectorAll('.chip[data-filter]').forEach(chip => {
  chip.addEventListener('click', () => {
    const filter = chip.dataset.filter;
    if (activeFilters.has(filter)) {
      activeFilters.delete(filter);
      chip.classList.remove('active');
    } else {
      activeFilters.add(filter);
      chip.classList.add('active');
    }
  });
});

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

  console.log('Boseman search:', payload);

  // Uncomment when backend is ready:
  // fetch('http://localhost:5000/search', {
  //   method: 'POST',
  //   headers: { 'Content-Type': 'application/json' },
  //   body: JSON.stringify(payload)
  // })
  // .then(res => res.json())
  // .then(data => renderResults(data))
  // .catch(err => console.error(err));
}

searchBtn.addEventListener('click', triggerSearch);
searchInput.addEventListener('keydown', e => {
  if (e.key === 'Enter') triggerSearch();
});

// ── Image upload ──
imageUpload.addEventListener('change', e => {
  const file = e.target.files[0];
  if (!file) return;
  console.log('Image for species ID:', file.name);
  // TODO: send to backend
});