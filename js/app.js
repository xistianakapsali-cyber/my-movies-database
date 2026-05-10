// js/app.js - MAIN ENTRY POINT
import { YIOIO_CONFIG } from './config.js';
import { loadMoviesData, loadRequestsFromLocalStorage } from './storage.js';
import { loadTheme, showToast, toggleClearButton, resetAllFilters, filterByType, updateDashboardStats } from './ui.js';
import { loadUserSession, handleAllClick, loadDashboardState, logoutAdmin } from './auth.js';
import { initFilters, initFuseSearch, applyFilters, setCurrentTypeFilter } from './filters.js';
import { checkForGitHubUpdates, loadVersion } from './github.js';
import { showAddMovieForm, editCurrentMovie, deleteMovieFromModal, exportToJSON, importFromJSON, showRequestForm } from './crud.js';
import { addMovieByTMDBId } from './tmdb.js';
import { showRequestsPanel } from './requests.js';

// Make functions global for HTML onclick handlers
window.showAddMovieForm = showAddMovieForm;
window.editCurrentMovie = editCurrentMovie;
window.deleteMovieFromModal = deleteMovieFromModal;
window.exportToJSON = exportToJSON;
window.importFromJSON = importFromJSON;
window.showRequestForm = showRequestForm;
window.addMovieByTMDBId = addMovieByTMDBId;
window.showRequestsPanel = showRequestsPanel;
window.handleAllClick = handleAllClick;
window.filterByType = filterByType;
window.resetAllFilters = resetAllFilters;
window.logoutAdmin = logoutAdmin;

// Dashboard stats update
window.addEventListener('updateDashboard', () => {
    updateDashboardStats();
});

// Initialize app
async function init() {
    if (!YIOIO_CONFIG) {
        showToast('⚠️ Σφάλμα: Δεν βρέθηκε το config.js!', '#e50914');
    }
    
    loadTheme();
    loadRequestsFromLocalStorage();
    await loadMoviesData();
    loadDashboardState();
    loadUserSession();
    loadVersion();
    
    const moviesData = (await import('./storage.js')).getMoviesData();
    initFilters(moviesData);
    initFuseSearch(moviesData);
    applyFilters();
    
    // Event listeners
    attachEventListeners();
    
    setTimeout(() => checkForGitHubUpdates(), 3000);
    
    // Back to top button
    const backBtn = document.getElementById('backToTop');
    window.addEventListener('scroll', () => { 
        if (backBtn) backBtn.style.display = window.scrollY > 300 ? 'block' : 'none'; 
    });
    
    document.addEventListener('keydown', e => { 
        if (e.key === 'Escape') {
            import('./ui.js').then(ui => ui.closeDetails());
        }
    });
}

function attachEventListeners() {
    const logo = document.querySelector('.logo');
    if (logo) logo.addEventListener('click', () => resetAllFilters());
    
    const themeBtn = document.querySelector('.theme-btn');
    if (themeBtn) themeBtn.addEventListener('click', () => {
        import('./ui.js').then(ui => ui.toggleTheme());
    });
    
    const loginBtn = document.getElementById('loginUserBtn');
    if (loginBtn) loginBtn.addEventListener('click', () => {
        import('./auth.js').then(auth => auth.showUserLogin());
    });
    
    const logoutUserBtn = document.getElementById('logoutUserBtn');
    if (logoutUserBtn) logoutUserBtn.addEventListener('click', () => {
        import('./auth.js').then(auth => auth.logoutUser());
    });
    
    const updateBtn = document.querySelector('.update-btn-header');
    if (updateBtn) updateBtn.addEventListener('click', () => checkForGitHubUpdates());
    
    const closeDashBtn = document.querySelector('.close-dash-btn');
    if (closeDashBtn) closeDashBtn.addEventListener('click', () => {
        import('./auth.js').then(auth => auth.hideDashboard());
    });
    
    const clearSearchBtn = document.getElementById('clearSearchBtn');
    if (clearSearchBtn) clearSearchBtn.addEventListener('click', () => {
        import('./ui.js').then(ui => ui.clearSearch());
    });
    
    const loadMoreBtn = document.getElementById('loadMoreBtn');
    if (loadMoreBtn) loadMoreBtn.addEventListener('click', () => {
        import('./ui.js').then(ui => ui.loadNextPage());
    });
    
    const searchInput = document.getElementById('movieSearch');
    if (searchInput) {
        searchInput.addEventListener('input', () => {
            toggleClearButton();
            applyFilters();
        });
        searchInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') applyFilters();
        });
    }
    
    const modal = document.getElementById('detailModal');
    if (modal) {
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                import('./ui.js').then(ui => ui.closeDetails());
            }
        });
    }
    
    const closeModalBtn = document.querySelector('.close-modal');
    if (closeModalBtn) closeModalBtn.addEventListener('click', () => {
        import('./ui.js').then(ui => ui.closeDetails());
    });
    
    const modalDownloadBtn = document.getElementById('modalDownloadBtn');
    if (modalDownloadBtn) modalDownloadBtn.addEventListener('click', () => {
        import('./ui.js').then(ui => ui.handleDownloadClick());
    });
    
    const modalEditBtn = document.getElementById('modalEditBtn');
    if (modalEditBtn) modalEditBtn.addEventListener('click', () => editCurrentMovie());
    
    const modalDeleteBtn = document.getElementById('modalDeleteBtn');
    if (modalDeleteBtn) modalDeleteBtn.addEventListener('click', () => deleteMovieFromModal());
    
    // Filter change listeners
    const genreFilter = document.getElementById('genreFilter');
    if (genreFilter) genreFilter.addEventListener('change', () => applyFilters());
    
    const sortSelect = document.getElementById('sortSelect');
    if (sortSelect) sortSelect.addEventListener('change', () => applyFilters());
    
    const yearFilter = document.getElementById('yearFilter');
    if (yearFilter) yearFilter.addEventListener('change', () => applyFilters());
    
    const countryFilter = document.getElementById('countryFilter');
    if (countryFilter) countryFilter.addEventListener('change', () => applyFilters());
    
    const studioFilter = document.getElementById('studioFilter');
    if (studioFilter) studioFilter.addEventListener('change', () => applyFilters());
}

// Start the app
init();