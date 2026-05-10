import { getMoviesData, isNewMovie, getPosterCache, setPosterCache } from './storage.js';
import { fetchPoster, renderActorsWithImages } from './tmdb.js';
import { isLoggedIn, getCurrentUserName } from './auth.js';
import { showRequestForm } from './crud.js';
import { searchMoviesByDirectorOrWriter, applyFilters } from './filters.js';

// ============ ΜΕΤΑΒΛΗΤΕΣ ============
let filteredMovies = [];
let currentPage = 1;
let itemsPerPage = 25;
let currentModalMovieId = null;
let currentMovieLink = null;
const LOADING_POSTER = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%231a1a1a'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='%23666' font-size='14'%3EΦΟΡΤΩΣΗ...%3C/text%3E%3C/svg%3E";

// ============ TOAST MESSAGES ============
export function showToast(msg, bg) {
    const t = document.createElement('div');
    t.className = 'toast-message';
    t.textContent = msg;
    t.style.background = bg;
    t.style.color = 'white';
    document.body.appendChild(t);
    setTimeout(() => t.remove(), 3000);
}

// ============ STAR RATINGS ============
export function getStars(r) { 
    let s = ''; 
    for(let i = 0; i < Math.floor(r); i++) s += '★'; 
    if(r % 1 >= 0.5) s += '½'; 
    for(let i = 0; i < 5 - Math.ceil(r); i++) s += '☆'; 
    return s; 
}

export function getStarsHtml(rating) {
    const fullStars = Math.floor(rating);
    const hasHalf = rating % 1 >= 0.5;
    let stars = '';
    for (let i = 0; i < fullStars; i++) stars += '★';
    if (hasHalf) stars += '½';
    for (let i = 0; i < 5 - Math.ceil(rating); i++) stars += '☆';
    return stars;
}

// ============ RENDER MOVIES GRID ============
export async function renderMovies() {
    const grid = document.getElementById('movieGrid');
    const end = currentPage * itemsPerPage;
    const page = filteredMovies.slice(0, end);
    
    if (!page.length) { 
        grid.innerHTML = '<div style="text-align:center;padding:50px;">Δεν βρέθηκαν αποτελέσματα</div>'; 
        const loadMoreBtn = document.getElementById('loadMoreBtn');
        if (loadMoreBtn) loadMoreBtn.style.display = 'none';
        return; 
    }
    
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) loadMoreBtn.style.display = end >= filteredMovies.length ? 'none' : 'block';
    
    grid.innerHTML = '';
    for (const m of page) {
        const card = document.createElement('div');
        card.className = 'movie-card';
        card.setAttribute('data-id', m.id);
        card.addEventListener('click', () => openDetailsById(m.id));
        
        card.innerHTML = `
            <div class="img-container">
                <div class="quality-tag ${m.quality === 'SD' ? 'sd-blue' : ''}">${m.quality || 'HD'}</div>
                ${isNewMovie(m.dateAdded, m.id) ? '<div class="new-badge-poster">ΝΕΟ</div>' : ''}
                ${m.status === 'pending' ? '<div class="pending-badge">ΣΕ ΑΝΑΜΟΝΗ</div>' : ''}
                <img src="${LOADING_POSTER}" data-title="${escapeHtml(m.title)}" data-year="${m.year}" data-type="${m.type === 'Series' ? 'tv' : 'movie'}" data-id="${m.id}" class="poster-load" loading="lazy">
            </div>
            <div class="info">
                <h3>${escapeHtml(m.title)}</h3>
                <div class="stars">${getStars(m.rating)} <span class="rating-number">${m.rating.toFixed(1)}</span></div>
                <div class="play-btn">ΛΕΠΤΟΜΕΡΕΙΕΣ</div>
            </div>
        `;
        grid.appendChild(card);
    }
    
    // Load posters asynchronously
    const promises = Array.from(grid.querySelectorAll('.poster-load')).map(img => 
        fetchPoster(img.dataset.title, img.dataset.year, img.dataset.type, parseInt(img.dataset.id))
            .then(p => img.src = p)
    );
    await Promise.all(promises);
}

export function loadNextPage() { 
    currentPage++; 
    renderMovies(); 
}

export function setFilteredMovies(movies) {
    filteredMovies = movies;
    currentPage = 1;
    const movieCountEl = document.getElementById('movieCount');
    if (movieCountEl) movieCountEl.innerText = `${filteredMovies.length} τίτλοι`;
    renderMovies();
}

export function getFilteredMovies() { return filteredMovies; }

// ============ ESCAPE HTML ============
export function escapeHtml(s) { 
    return String(s).replace(/[&<>]/g, m => ({ '&':'&amp;', '<':'&lt;', '>':'&gt;' }[m])); 
}

// ============ MODAL FUNCTIONS ============
export async function openDetailsById(id) {
    const moviesData = (await import('./storage.js')).getMoviesData();
    const movie = moviesData.find(m => m.id === id);
    if (!movie) {
        showToast('Σφάλμα: Δεν βρέθηκε η ταινία', '#e50914');
        return;
    }
    
    currentModalMovieId = movie.id;
    currentMovieLink = movie.link;
    window.currentMovieLink = currentMovieLink;
    
    const modalAddBtn = document.getElementById('modalAddBtn');
    if (modalAddBtn) modalAddBtn.style.display = isLoggedIn() ? 'inline-flex' : 'none';
    
    const modalTitle = document.getElementById('modalTitle');
    const modalYear = document.getElementById('modalYear');
    const modalDesc = document.getElementById('modalDesc');
    const modalDirector = document.getElementById('modalDirector');
    const modalWriter = document.getElementById('modalWriter');
    const modalStudio = document.getElementById('modalStudio');
    const modalQualityText = document.getElementById('modalQualityText');
    const modalQualityBadge = document.getElementById('modalQualityBadge');
    const modalTypeBadge = document.getElementById('modalTypeBadge');
    const modalCountryBadge = document.getElementById('modalCountryBadge');
    const modalGenreBadge = document.getElementById('modalGenreBadge');
    const modalRatingValue = document.getElementById('modalRatingValue');
    const modalStarsBig = document.getElementById('modalStarsBig');
    const modalImdb = document.getElementById('modalImdb');
    const modalTmdb = document.getElementById('modalTmdb');
    const modalEditBtn = document.getElementById('modalEditBtn');
    const modalDeleteBtn = document.getElementById('modalDeleteBtn');
    const modalRequestBtn = document.getElementById('modalRequestBtn');
    const modalDownloadBtn = document.getElementById('modalDownloadBtn');
    
    if (modalTitle) modalTitle.innerHTML = escapeHtml(movie.title);
    if (modalYear) modalYear.innerHTML = movie.year;
    if (modalDesc) modalDesc.innerHTML = movie.desc || 'Δεν υπάρχει περιγραφή.';
    
    if (modalDirector) {
        modalDirector.innerHTML = movie.director || 'N/A';
        modalDirector.onclick = null;
        if (movie.director && movie.director !== 'N/A') {
            modalDirector.addEventListener('click', () => searchMoviesByDirectorOrWriter(movie.director, 'director'));
        }
    }
    
    if (modalWriter) {
        modalWriter.innerHTML = movie.writer || 'N/A';
        modalWriter.onclick = null;
        if (movie.writer && movie.writer !== 'N/A') {
            modalWriter.addEventListener('click', () => searchMoviesByDirectorOrWriter(movie.writer, 'writer'));
        }
    }
    
    if (modalStudio) modalStudio.innerHTML = movie.studio || 'Κανάλι';
    if (modalQualityText) modalQualityText.innerHTML = movie.quality || 'HD';
    if (modalQualityBadge) modalQualityBadge.innerHTML = `${movie.quality || 'HD'}`;
    if (modalTypeBadge) modalTypeBadge.innerHTML = movie.type === 'Series' ? '📺 Σειρά' : '🎬 Ταινία';
    if (modalCountryBadge) modalCountryBadge.innerHTML = movie.country || 'N/A';
    if (modalGenreBadge) modalGenreBadge.innerHTML = movie.genre || 'N/A';
    if (modalRatingValue) modalRatingValue.innerHTML = movie.rating.toFixed(1);
    if (modalStarsBig) modalStarsBig.innerHTML = getStarsHtml(movie.rating);
    
    // Meta bar status badge
    const metaBar = document.getElementById('modalMetaBar');
    const existingStatusBadge = document.getElementById('modalStatusBadge');
    if (existingStatusBadge) existingStatusBadge.remove();
    
    if (movie.status === 'pending') {
        const statusBadge = document.createElement('span');
        statusBadge.id = 'modalStatusBadge';
        statusBadge.className = 'pending-status-badge';
        statusBadge.innerHTML = ' ΣΕ ΑΝΑΜΟΝΗ';
        if (metaBar) metaBar.appendChild(statusBadge);
    }
    
    if (modalImdb) {
        modalImdb.href = movie.imdb || '#';
        modalImdb.style.display = movie.imdb ? 'inline-flex' : 'none';
    }
    
    if (modalTmdb) {
        modalTmdb.href = movie.tmdb || '#';
        modalTmdb.style.display = movie.tmdb ? 'inline-flex' : 'none';
    }
    
    if (modalEditBtn) modalEditBtn.style.display = isLoggedIn() ? 'inline-flex' : 'none';
    if (modalDeleteBtn) modalDeleteBtn.style.display = isLoggedIn() ? 'inline-flex' : 'none';
    
    if (modalRequestBtn) {
        modalRequestBtn.style.display = 'inline-flex';
        modalRequestBtn.onclick = () => showRequestForm(movie.title, movie.year);
    }
    
    if (modalDownloadBtn) {
        if (isLoggedIn() && movie.link && movie.link !== '') {
            modalDownloadBtn.style.display = 'block';
        } else {
            modalDownloadBtn.style.display = 'none';
        }
    }
    
    const modalImg = document.getElementById('modalImg');
    if (modalImg) {
        modalImg.src = LOADING_POSTER;
        const poster = await fetchPoster(movie.title, movie.year, movie.type === 'Series' ? 'tv' : 'movie', movie.id);
        modalImg.src = poster;
    }
    
    renderActorsWithImages(movie.actors, 'modalActorsContainer');
    
    const detailModal = document.getElementById('detailModal');
    if (detailModal) detailModal.style.display = 'flex';
}

export function closeDetails() { 
    const detailModal = document.getElementById('detailModal');
    if (detailModal) detailModal.style.display = 'none'; 
    currentModalMovieId = null;
    currentMovieLink = null;
    window.currentMovieLink = null;
}

export function handleDownloadClick() { 
    if (currentMovieLink && currentMovieLink !== '') {
        window.open(currentMovieLink, '_blank');
    } else {
        showToast('Δεν υπάρχει link προβολής για αυτόν τον τίτλο', '#e67e22');
    }
}

export function getCurrentModalMovieId() { return currentModalMovieId; }
export function setCurrentModalMovieId(id) { currentModalMovieId = id; }

// ============ THEME FUNCTIONS ============
export function toggleTheme() {
    const html = document.documentElement;
    if (html.hasAttribute('data-theme')) {
        html.removeAttribute('data-theme');
        localStorage.setItem('theme', 'dark');
    } else {
        html.setAttribute('data-theme', 'light');
        localStorage.setItem('theme', 'light');
    }
}

export function loadTheme() {
    if (localStorage.getItem('theme') === 'light') {
        document.documentElement.setAttribute('data-theme', 'light');
    }
}

// ============ UTILITIES ============
export function toggleClearButton() { 
    const clearBtn = document.getElementById('clearSearchBtn');
    const searchInput = document.getElementById('movieSearch');
    if (clearBtn && searchInput) {
        clearBtn.classList.toggle('hidden', !searchInput.value.length);
    }
}

export function clearSearch() { 
    const searchInput = document.getElementById('movieSearch');
    if (searchInput) searchInput.value = ''; 
    toggleClearButton(); 
    applyFilters(); 
}

export function filterByType(type) { 
    const currentTypeFilter = type;
    window.currentTypeFilter = currentTypeFilter;
    document.querySelectorAll('.filter-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === type);
    });
    applyFilters(); 
}

export function resetAllFilters() {
    const searchInput = document.getElementById('movieSearch');
    const genreFilter = document.getElementById('genreFilter');
    const yearFilter = document.getElementById('yearFilter');
    const countryFilter = document.getElementById('countryFilter');
    const studioFilter = document.getElementById('studioFilter');
    const sortSelect = document.getElementById('sortSelect');
    
    if (searchInput) searchInput.value = '';
    toggleClearButton();
    if (genreFilter) genreFilter.value = 'All';
    if (yearFilter) yearFilter.value = 'All';
    if (countryFilter) countryFilter.value = 'All';
    if (studioFilter) studioFilter.value = 'All';
    if (sortSelect) sortSelect.value = 'title';
    
    window.currentTypeFilter = 'all';
    document.querySelectorAll('.filter-type-btn').forEach(btn => {
        btn.classList.toggle('active', btn.dataset.type === 'all');
    });
    applyFilters();
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast('🏠 Επιστροφή στην αρχική σελίδα', '#2ecc71');
}

export function updateDashboardStats() {
    // Will be implemented in app.js or filters.js
    const event = new CustomEvent('updateDashboard');
    window.dispatchEvent(event);
}