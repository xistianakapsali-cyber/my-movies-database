import { YIOIO_CONFIG } from './config.js';
import { getMoviesData, setMoviesData, saveToLocalStorage, updateRecentMoviesList, getPosterCache, getActorImageCache } from './storage.js';
import { showToast } from './ui.js';
import { initFilters, initFuseSearch, applyFilters } from './filters.js';
import { isLoggedIn } from './auth.js';

// ============ VARIABLES ============
let GITHUB_CONFIG = YIOIO_CONFIG?.github || null;
let CURRENT_VERSION = "1.0.0";

// ============ CHECK FOR UPDATES FROM GITHUB ============
export async function checkForGitHubUpdates() {
    if (!GITHUB_CONFIG) {
        showToast('⚠️ GitHub settings not configured', '#e50914');
        return;
    }
    
    const baseUrl = `https://raw.githubusercontent.com/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${GITHUB_CONFIG.path}`;
    showToast(`🔍 Έλεγχος ενημέρωσης...`, '#2196f3');
    
    try {
        const versionUrl = `${baseUrl}/version.json`;
        console.log('📦 Checking:', versionUrl);
        const versionRes = await fetch(versionUrl);
        
        if (!versionRes.ok) {
            throw new Error(`HTTP ${versionRes.status}: version.json not found`);
        }
        
        const remote = await versionRes.json();
        
        if (remote.version !== CURRENT_VERSION) {
            const shouldUpdate = confirm(`Νέα έκδοση ${remote.version}!\n\nΤρέχουσα: ${CURRENT_VERSION}\n\nΘέλετε ενημέρωση;`);
            
            if (shouldUpdate) {
                await performUpdate(baseUrl, remote.version);
            }
        } else {
            showToast('✅ Τελευταία έκδοση', '#2ecc71');
        }
    } catch(e) {
        console.error('Update error:', e);
        showToast(`❌ Σφάλμα: ${e.message}`, '#e50914');
    }
}

// ============ PERFORM UPDATE ============
async function performUpdate(baseUrl, newVersion) {
    showToast('📥 Λήψη δεδομένων...', '#2196f3');
    
    try {
        const dataUrl = `${baseUrl}/movies.json`;
        const dataRes = await fetch(dataUrl);
        
        if (!dataRes.ok) {
            throw new Error(`HTTP ${dataRes.status}: movies.json not found`);
        }
        
        const newData = await dataRes.json();
        
        if (!Array.isArray(newData)) {
            throw new Error('Invalid JSON format');
        }
        
        // Update movies data
        const updatedMovies = newData.map((m, i) => ({
            ...m,
            id: i + 1,
            status: m.status || 'active'
        }));
        
        setMoviesData(updatedMovies);
        saveToLocalStorage();
        
        // Update version
        CURRENT_VERSION = newVersion;
        localStorage.setItem('app_version', CURRENT_VERSION);
        
        // Update UI
        const versionBadge = document.getElementById('versionBadge');
        const isLoggedInUser = isLoggedIn();
        if (versionBadge) {
            versionBadge.innerHTML = `Έκδοση: ${CURRENT_VERSION}${isLoggedInUser ? ' 🔒' : ''}`;
        }
        
        // Clear caches
        const posterCache = getPosterCache();
        const actorImageCache = getActorImageCache();
        if (posterCache) posterCache.clear();
        if (actorImageCache) actorImageCache.clear();
        
        // Refresh UI
        updateRecentMoviesList();
        initFilters(getMoviesData());
        initFuseSearch(getMoviesData());
        applyFilters();
        
        showToast(`✅ Ενημέρωση! ${updatedMovies.length} τίτλοι`, '#2ecc71');
        
    } catch(e) {
        console.error('Update error:', e);
        showToast(`❌ Σφάλμα κατά την ενημέρωση: ${e.message}`, '#e50914');
    }
}

// ============ LOAD VERSION ============
export function loadVersion() {
    const savedVersion = localStorage.getItem('app_version');
    if (savedVersion) {
        CURRENT_VERSION = savedVersion;
    }
    
    const versionBadge = document.getElementById('versionBadge');
    const isLoggedInUser = isLoggedIn();
    if (versionBadge) {
        versionBadge.innerHTML = `Έκδοση: ${CURRENT_VERSION}${isLoggedInUser ? ' 🔒' : ''}`;
    }
    
    return CURRENT_VERSION;
}

// ============ GET CURRENT VERSION ============
export function getCurrentVersion() {
    return CURRENT_VERSION;
}

// ============ SET VERSION ============
export function setCurrentVersion(version) {
    CURRENT_VERSION = version;
    localStorage.setItem('app_version', version);
}

// ============= MANUAL SYNC WITH REMOTE ============
export async function syncWithRemote() {
    if (!GITHUB_CONFIG) {
        showToast('⚠️ GitHub settings not configured', '#e50914');
        return false;
    }
    
    const baseUrl = `https://raw.githubusercontent.com/${GITHUB_CONFIG.username}/${GITHUB_CONFIG.repo}/${GITHUB_CONFIG.branch}/${GITHUB_CONFIG.path}`;
    
    try {
        const dataUrl = `${baseUrl}/movies.json`;
        const response = await fetch(dataUrl);
        
        if (!response.ok) {
            throw new Error(`HTTP ${response.status}`);
        }
        
        const remoteData = await response.json();
        
        if (!Array.isArray(remoteData)) {
            throw new Error('Invalid data format');
        }
        
        const mergedData = mergeMoviesData(getMoviesData(), remoteData);
        setMoviesData(mergedData);
        saveToLocalStorage();
        
        updateRecentMoviesList();
        initFilters(getMoviesData());
        initFuseSearch(getMoviesData());
        applyFilters();
        
        showToast(`✅ Συγχρονίστηκε! ${mergedData.length} τίτλοι`, '#2ecc71');
        return true;
        
    } catch(e) {
        console.error('Sync error:', e);
        showToast(`❌ Σφάλμα συγχρονισμού: ${e.message}`, '#e50914');
        return false;
    }
}

// ============ MERGE DATA (keep local changes for existing movies) ============
function mergeMoviesData(localData, remoteData) {
    const merged = [...remoteData];
    
    for (const localMovie of localData) {
        const existingIndex = merged.findIndex(m => 
            m.title === localMovie.title && m.year === localMovie.year
        );
        
        if (existingIndex !== -1) {
            // Keep local link and status if they exist
            if (localMovie.link && localMovie.link !== '') {
                merged[existingIndex].link = localMovie.link;
            }
            if (localMovie.status) {
                merged[existingIndex].status = localMovie.status;
            }
            if (localMovie.posterOverride) {
                merged[existingIndex].posterOverride = localMovie.posterOverride;
            }
        } else {
            // Add new local movie that doesn't exist in remote
            merged.push(localMovie);
        }
    }
    
    // Re-index
    return merged.map((m, i) => ({ ...m, id: i + 1 }));
}

// ============ UPLOAD TO GITHUB (requires backend) ============
export async function uploadToGitHub(data, filename, commitMessage) {
    if (!GITHUB_CONFIG) {
        showToast('⚠️ GitHub settings not configured', '#e50914');
        return false;
    }
    
    // Note: This requires a backend API or GitHub token
    // For security, this should be done through a backend service
    showToast('⚠️ Απαιτείται backend για upload στο GitHub', '#e67e22');
    console.warn('GitHub upload requires backend API with token');
    
    return false;
}