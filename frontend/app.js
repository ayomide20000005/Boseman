// ── Boseman app.js ──

const searchBtn   = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const toolsBtn    = document.getElementById('toolsBtn');
const toolsStrip  = document.getElementById('toolsStrip');
const searchBar   = document.getElementById('searchBar');
const activeBar   = document.getElementById('activeBar');
const imageUpload = document.getElementById('imageUpload');

// ── Active filters state ──
const activeFilters = new Set();

// ── Tools strip open/close ──
let toolsOpen = false;

toolsBtn.addEventListener('click', () => {
  toolsOpen = !toolsOpen;
  toolsStrip.classList.toggle('open', toolsOpen);
  searchBar.classList.toggle('tools-open', toolsOpen);
  toolsBtn.classList.toggle('open', toolsOpen);
});

// ── Tool chip select/deselect ──
document.querySelectorAll('.tool-chip[data-tool]').forEach(chip => {
  chip.addEventListener('click', (e) => {
    if (e.target === imageUpload) return;

    const tool = chip.dataset.tool;

    if (tool === 'image') {
      imageUpload.click();
      return;
    }

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

// ── Image upload ──
imageUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  const imageChip = document.querySelector('.tool-chip[data-tool="image"]');

  if (!file) {
    activeFilters.delete('image');
    imageChip.classList.remove('active');
  } else {
    activeFilters.add('image');
    imageChip.classList.add('active');
    console.log('Image selected for species ID:', file.name);
  }

  renderActiveTags();
});

// ── Render active filter tags below bar ──
function renderActiveTags() {
  activeBar.innerHTML = '';

  const labels = {
    species:   'Species',
    location:  'Location',
    hospitals: 'Hospitals',
    habitat:   'Habitat Loss',
    urban:     'Urban Sprawl',
    image:     'Image Upload'
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

searchInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') triggerSearch();
});