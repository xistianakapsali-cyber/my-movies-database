import { getMoviesData, setFilteredMovies as setStorageFiltered, updateRecentMoviesList } from './storage.js';
import { showToast, setFilteredMovies as setUIFiltered, getFilteredMovies, updateDashboardStats, escapeHtml } from './ui.js';
import { openDetailsById } from './ui.js';

// ============ FUSE.JS SEARCH ENGINE ============
let fuseSearch = null;
let lastSearchTerm = '';
let lastSearchResults = [];
let currentTypeFilter = 'all';

// ============ HELPER FUNCTIONS ============
function removeGreekAccents(text) {
    if (!text) return '';
    const accents = {
        'ά': 'α', 'έ': 'ε', 'ή': 'η', 'ί': 'ι', 'ό': 'ο', 'ύ': 'υ', 'ώ': 'ω',
        'Ά': 'Α', 'Έ': 'Ε', 'Ή': 'Η', 'Ί': 'Ι', 'Ό': 'Ο', 'Ύ': 'Υ', 'Ώ': 'Ω'
    };
    return text.replace(/[άέήίόύώΆΈΉΊΌΎΏ]/g, match => accents[match]);
}

export function initFuseSearch(moviesData) {
    const options = {
        keys: [
            { name: 'title', weight: 0.5 },
            { name: 'actors', weight: 0.2 },
            { name: 'director', weight: 0.15 },
            { name: 'writer', weight: 0.1 },
            { name: 'genre', weight: 0.05 }
        ],
        threshold: 0.35,
        distance: 100,
        includeScore: true,
        ignoreLocation: false,
        minMatchCharLength: 2,
        ignoreDiacritics: true
    };
    
    fuseSearch = new Fuse(moviesData, options);
    console.log('🔍 Fuse.js initialized with', moviesData.length, 'movies');
}

function searchMoviesWithFuse(searchTerm, moviesData) {
    if (!searchTerm || searchTerm.length < 2) {
        return moviesData;
    }
    
    if (lastSearchTerm === searchTerm && lastSearchResults.length > 0) {
        return lastSearchResults;
    }
    
    const results = fuseSearch.search(searchTerm);
    lastSearchTerm = searchTerm;
    lastSearchResults = results.map(r => r.item);
    
    return lastSearchResults;
}

// ============ SEARCH BY ACTOR ============
export function searchMoviesByActor(actorName) {
    const moviesData = getMoviesData();
    const searchInput = document.getElementById('movieSearch');
    if (searchInput) searchInput.value = actorName;
    toggleClearButton();
    
    const searchTerm = actorName.toLowerCase();
    
    let results = moviesData.filter(movie => {
        if (!movie.actors || movie.actors === 'N/A') return false;
        const actorsLower = movie.actors.toLowerCase();
        return actorsLower.includes(searchTerm);
    });
    
    if (currentTypeFilter !== 'all') {
        results = results.filter(m => m.type === currentTypeFilter);
    }
    
    const genre = document.getElementById('genreFilter')?.value;
    if (genre && genre !== 'All') {
        results = results.filter(m => m.genre?.includes(genre));
    }
    
    const year = document.getElementById('yearFilter')?.value;
    if (year && year !== 'All') {
        results = results.filter(m => m.year == year);
    }
    
    const country = document.getElementById('countryFilter')?.value;
    if (country && country !== 'All') {
        results = results.filter(m => m.country === country);
    }
    
    const studio = document.getElementById('studioFilter')?.value;
    if (studio && studio !== 'All') {
        results = results.filter(m => m.studio === studio);
    }
    
    setUIFiltered(results);
    
    const detailModal = document.getElementById('detailModal');
    if (detailModal) detailModal.style.display = 'none';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    
    if (results.length === 0) {
        showToast(`Δεν βρέθηκαν ταινίες με τον ηθοποιό: ${actorName}`, '#e67e22');
    } else {
        showToast(`Αναζήτηση για ηθοποιό: ${actorName} - ${results.length} ταινίες`, '#2ecc71');
    }
}

// ============ SEARCH BY DIRECTOR/WRITER ============
export function searchMoviesByDirectorOrWriter(value, type) {
    const moviesData = getMoviesData();
    const searchInput = document.getElementById('movieSearch');
    if (searchInput) searchInput.value = value;
    toggleClearButton();
    
    let results = moviesData.filter(m => 
        m.director?.toLowerCase().includes(value.toLowerCase()) || 
        m.writer?.toLowerCase().includes(value.toLowerCase())
    );
    
    if (currentTypeFilter !== 'all') {
        results = results.filter(m => m.type === currentTypeFilter);
    }
    
    const genre = document.getElementById('genreFilter')?.value;
    if (genre && genre !== 'All') {
        results = results.filter(m => m.genre?.includes(genre));
    }
    
    const year = document.getElementById('yearFilter')?.value;
    if (year && year !== 'All') {
        results = results.filter(m => m.year == year);
    }
    
    const country = document.getElementById('countryFilter')?.value;
    if (country && country !== 'All') {
        results = results.filter(m => m.country === country);
    }
    
    const studio = document.getElementById('studioFilter')?.value;
    if (studio && studio !== 'All') {
        results = results.filter(m => m.studio === studio);
    }
    
    setUIFiltered(results);
    
    const detailModal = document.getElementById('detailModal');
    if (detailModal) detailModal.style.display = 'none';
    
    window.scrollTo({ top: 0, behavior: 'smooth' });
    showToast(`Αναζήτηση για: ${value}`, '#2196f3');
}

// ============ FILTERS AND SORTING ============
let searchTimeout = null;

export function applyFilters() {
    const moviesData = getMoviesData();
    if (!moviesData.length) return;
    
    if (typeof toggleClearButton === 'function') toggleClearButton();
    
    if (searchTimeout) clearTimeout(searchTimeout);
    
    searchTimeout = setTimeout(() => {
        performSearch(moviesData);
    }, 100);
}

function performSearch(moviesData) {
    let term = document.getElementById('movieSearch')?.value.toLowerCase() || '';
    let results = [];
    
    if (term && term.length >= 2) {
        results = searchMoviesWithFuse(term, moviesData);
    } else if (term && term.length === 1) {
        results = moviesData.filter(m => 
            m.title.toLowerCase().includes(term) || 
            m.actors?.toLowerCase().includes(term) || 
            m.director?.toLowerCase().includes(term)
        );
    } else {
        results = [...moviesData];
    }
    
    if (currentTypeFilter !== 'all') {
        results = results.filter(m => m.type === currentTypeFilter);
    }
    
    const genre = document.getElementById('genreFilter')?.value;
    if (genre && genre !== 'All') {
        results = results.filter(m => m.genre?.includes(genre));
    }
    
    const year = document.getElementById('yearFilter')?.value;
    if (year && year !== 'All') {
        results = results.filter(m => m.year == year);
    }
    
    const country = document.getElementById('countryFilter')?.value;
    if (country && country !== 'All') {
        results = results.filter(m => m.country === country);
    }
    
    const studio = document.getElementById('studioFilter')?.value;
    if (studio && studio !== 'All') {
        results = results.filter(m => m.studio === studio);
    }
    
    const sort = document.getElementById('sortSelect')?.value;
    
    if (sort === 'pendingOnly') {
        results = results.filter(m => m.status === 'pending');
    }
    
    // Apply sorting
    if (sort === 'title') results.sort((a, b) => a.title.localeCompare(b.title));
    else if (sort === 'yearDesc') results.sort((a, b) => b.year - a.year);
    else if (sort === 'ratingDesc') results.sort((a, b) => b.rating - a.rating);
    else if (sort === 'latest') results.sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    else if (sort === 'idDesc') results.sort((a, b) => b.id - a.id);
    else if (sort === 'idAsc') results.sort((a, b) => a.id - b.id);
    else if (sort === 'yearAsc') results.sort((a, b) => a.year - b.year);
    else if (sort === 'qualityHD') results.sort((a, b) => {
        const order = { '4K': 1, 'HD': 2, 'SD': 3 };
        return (order[a.quality] || 99) - (order[b.quality] || 99);
    });
    else if (sort === 'qualitySD') results.sort((a, b) => {
        const order = { 'SD': 1, 'HD': 2, '4K': 3 };
        return (order[a.quality] || 99) - (order[b.quality] || 99);
    });
    
    setUIFiltered(results);
    
    // Trigger dashboard update
    if (typeof updateDashboardStats === 'function') {
        updateDashboardStats();
    } else {
        const event = new CustomEvent('updateDashboard');
        window.dispatchEvent(event);
    }
}

export function setCurrentTypeFilter(type) {
    currentTypeFilter = type;
}

export function getCurrentTypeFilter() {
    return currentTypeFilter;
}

// ============ INITIALIZE FILTER DROPDOWNS ============
export function initFilters(moviesData) {
    if (!moviesData.length) return;
    
    const yearSel = document.getElementById('yearFilter');
    const countrySel = document.getElementById('countryFilter');
    const genreSel = document.getElementById('genreFilter');
    const studioSel = document.getElementById('studioFilter');
    
    if (!yearSel || !countrySel || !genreSel || !studioSel) return;
    
    // Clear existing options (keep first "All" option)
    while(yearSel.options.length > 1) yearSel.remove(1);
    while(countrySel.options.length > 1) countrySel.remove(1);
    while(genreSel.options.length > 1) genreSel.remove(1);
    while(studioSel.options.length > 1) studioSel.remove(1);
    
    // Add years
    [...new Set(moviesData.map(m => m.year))].sort((a, b) => b - a).forEach(y => yearSel.add(new Option(y, y)));
    
    // Add countries
    [...new Set(moviesData.map(m => m.country).filter(c => c && c !== 'N/A'))].sort().forEach(c => countrySel.add(new Option(c, c)));
    
    // Add genres
    const genres = [...new Set(moviesData.flatMap(m => m.genre?.split(',').map(g => g.trim())).filter(g => g && g !== 'N/A'))].sort((a, b) => a.localeCompare(b, 'el'));
    genres.forEach(g => genreSel.add(new Option(g, g)));
    
    // Add studios
    const studios = [...new Set(moviesData.map(m => m.studio).filter(s => s && s !== 'Κανάλι'))].sort();
    studios.forEach(s => studioSel.add(new Option(s, s)));
}

// ============ TOGGLE CLEAR BUTTON (import from ui but avoid circular) ============
function toggleClearButton() {
    const clearBtn = document.getElementById('clearSearchBtn');
    const searchInput = document.getElementById('movieSearch');
    if (clearBtn && searchInput) {
        clearBtn.classList.toggle('hidden', !searchInput.value.length);
    }
}