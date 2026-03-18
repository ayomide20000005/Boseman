// ── Boseman app.js ──

const searchBtn   = document.getElementById('searchBtn');
const searchInput = document.getElementById('searchInput');
const toolsBtn    = document.getElementById('toolsBtn');
const toolsPanel  = document.getElementById('toolsPanel');
const toolsChevron = document.getElementById('toolsChevron');
const imageUpload = document.getElementById('imageUpload');

// ── Active filters ──
const activeFilters = new Set();

// ── Tools panel open/close ──
let toolsOpen = false;

toolsBtn.addEventListener('click', () => {
  toolsOpen = !toolsOpen;
  toolsPanel.classList.toggle('open', toolsOpen);
  toolsBtn.classList.toggle('open', toolsOpen);
  toolsChevron.classList.toggle('open', toolsOpen);
});

// ── Tool card select / deselect ──
document.querySelectorAll('.tool-card[data-tool]').forEach(card => {
  card.addEventListener('click', (e) => {
    // Don't toggle if clicking the file input label internals
    if (e.target === imageUpload) return;

    const tool = card.dataset.tool;

    if (tool === 'image') {
      // Trigger file picker
      imageUpload.click();
      card.classList.add('active');
      activeFilters.add('image');
      return;
    }

    if (activeFilters.has(tool)) {
      activeFilters.delete(tool);
      card.classList.remove('active');
    } else {
      activeFilters.add(tool);
      card.classList.add('active');
    }
  });
});

// ── Image upload handler ──
imageUpload.addEventListener('change', (e) => {
  const file = e.target.files[0];
  if (!file) {
    // If user cancels, deselect image card
    const imageCard = document.querySelector('.tool-card[data-tool="image"]');
    imageCard.classList.remove('active');
    activeFilters.delete('image');
    return;
  }
  console.log('Image selected for species ID:', file.name);
  // TODO: send to backend for species identification
});

// ── Rolling b search ──
function triggerSearch() {
  const query = searchInput.value.trim();
  if (!query) return;

  // Spin the b
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