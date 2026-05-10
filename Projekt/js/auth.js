import { YIOIO_CONFIG } from './config.js';
import { getMoviesData, setMoviesData } from './storage.js';
import { showToast } from './ui.js';
import { checkForGitHubUpdates } from './github.js';

// ============ AUTH STATE ============
let currentUserName = '';
let isUserLoggedIn = false;

// ============ HELPER FUNCTIONS ============
export async function hashPassword(password) {
    const encoder = new TextEncoder();
    const data = encoder.encode(password);
    const hash = await crypto.subtle.digest('SHA-256', data);
    return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ============ USER AUTH ============
export async function showUserLogin() {
    const password = prompt('🔐 Εισάγετε κωδικό χρήστη:');
    if (!password) return;
    
    const hashed = await hashPassword(password);
    
    if (YIOIO_CONFIG && YIOIO_CONFIG.users && YIOIO_CONFIG.users[hashed]) {
        currentUserName = YIOIO_CONFIG.users[hashed];
        isUserLoggedIn = true;
        sessionStorage.setItem('userLoggedIn', 'true');
        sessionStorage.setItem('userName', currentUserName);
        
        // Update UI elements
        const loginBtn = document.getElementById('loginUserBtn');
        const logoutBtn = document.getElementById('logoutUserBtn');
        const userNameDisplay = document.getElementById('userNameDisplay');
        
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (userNameDisplay) userNameDisplay.innerText = `👤 ${currentUserName}`;
        
        showToast(`Καλώς ήρθες ${currentUserName}!`, '#2ecc71');
        
        const currentVersion = localStorage.getItem('app_version') || '1.0.0';
        const versionBadge = document.getElementById('versionBadge');
        if (versionBadge) versionBadge.innerHTML = `Έκδοση: ${currentVersion} 🔒`;
        
        showToast('🔒 Έλεγχος για links...', '#9b59b6');
        setTimeout(() => checkForGitHubUpdates(), 500);
        
        // Update modal download button if open
        const modalDownloadBtn = document.getElementById('modalDownloadBtn');
        const currentMovieLink = window.currentMovieLink;
        if (modalDownloadBtn && document.getElementById('detailModal')?.style.display === 'flex' && currentMovieLink) {
            modalDownloadBtn.style.display = 'block';
        }
    } else {
        showToast('Λάθος κωδικός!', '#e50914');
    }
}

export function logoutUser() {
    isUserLoggedIn = false;
    currentUserName = '';
    sessionStorage.removeItem('userLoggedIn');
    sessionStorage.removeItem('userName');
    
    const loginBtn = document.getElementById('loginUserBtn');
    const logoutBtn = document.getElementById('logoutUserBtn');
    const userNameDisplay = document.getElementById('userNameDisplay');
    
    if (loginBtn) loginBtn.style.display = 'inline-block';
    if (logoutBtn) logoutBtn.style.display = 'none';
    if (userNameDisplay) userNameDisplay.innerText = '';
    
    const currentVersion = localStorage.getItem('app_version') || '1.0.0';
    const versionBadge = document.getElementById('versionBadge');
    if (versionBadge) versionBadge.innerHTML = `Έκδοση: ${currentVersion}`;
    
    showToast('Αποσυνδεθήκατε', '#e67e22');
    
    const modalDownloadBtn = document.getElementById('modalDownloadBtn');
    if (modalDownloadBtn) modalDownloadBtn.style.display = 'none';
}

export function loadUserSession() {
    if (sessionStorage.getItem('userLoggedIn') === 'true') {
        isUserLoggedIn = true;
        currentUserName = sessionStorage.getItem('userName') || 'Χρήστης';
        
        const loginBtn = document.getElementById('loginUserBtn');
        const logoutBtn = document.getElementById('logoutUserBtn');
        const userNameDisplay = document.getElementById('userNameDisplay');
        
        if (loginBtn) loginBtn.style.display = 'none';
        if (logoutBtn) logoutBtn.style.display = 'inline-block';
        if (userNameDisplay) userNameDisplay.innerText = `👤 ${currentUserName}`;
        
        const currentVersion = localStorage.getItem('app_version') || '1.0.0';
        const versionBadge = document.getElementById('versionBadge');
        if (versionBadge) versionBadge.innerHTML = `Έκδοση: ${currentVersion} 🔒`;
    }
}

export function isLoggedIn() { return isUserLoggedIn; }
export function getCurrentUserName() { return currentUserName; }

// ============ ADMIN AUTH ============
const AdminAuth = {
    startSession: () => { 
        sessionStorage.setItem('adminToken', 'valid'); 
        sessionStorage.setItem('adminExpires', (Date.now() + 86400000).toString()); 
    },
    isSessionValid: () => sessionStorage.getItem('adminToken') === 'valid' && parseInt(sessionStorage.getItem('adminExpires')) > Date.now(),
    endSession: () => { 
        sessionStorage.removeItem('adminToken'); 
        sessionStorage.removeItem('adminExpires'); 
    }
};

export { AdminAuth };

// ============ ADMIN DASHBOARD ============
let allClickCount = 0;
let allClickTimer = null;

export function handleAllClick() {
    allClickCount++;
    const allBtn = document.getElementById('allMoviesBtn');
    if (allBtn) {
        allBtn.style.transform = 'scale(0.95)';
        setTimeout(() => { if(allBtn) allBtn.style.transform = 'scale(1)'; }, 150);
    }
    if (allClickTimer) clearTimeout(allClickTimer);
    if (allClickCount >= 5) {
        allClickCount = 0;
        const password = prompt('🔐 Εισάγετε κωδικό διαχειριστή για εμφάνιση dashboard:');
        if (password) {
            hashPassword(password).then(hashed => {
                if (YIOIO_CONFIG && hashed === YIOIO_CONFIG.admin_dashboard_hash) {
                    AdminAuth.startSession();
                    showDashboard();
                } else {
                    showToast('Λάθος κωδικός!', '#e50914');
                }
            });
        }
    }
    allClickTimer = setTimeout(() => { allClickCount = 0; }, 2000);
}

export function showDashboard() { 
    const dashboard = document.getElementById('dashboard');
    const movieGrid = document.getElementById('movieGrid');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (dashboard) dashboard.style.display = 'block';
    if (movieGrid) movieGrid.classList.remove('dashboard-hidden');
    if (logoutBtn) logoutBtn.style.display = 'block';
    
    localStorage.setItem('dashboardVisible', 'true');
}

export function hideDashboard() {
    const dashboard = document.getElementById('dashboard');
    const movieGrid = document.getElementById('movieGrid');
    const logoutBtn = document.getElementById('logoutBtn');
    
    if (dashboard) dashboard.style.display = 'none';
    if (movieGrid) movieGrid.classList.add('dashboard-hidden');
    if (logoutBtn) logoutBtn.style.display = 'none';
    
    localStorage.setItem('dashboardVisible', 'false');
}

export function logoutAdmin() { 
    AdminAuth.endSession(); 
    hideDashboard(); 
    showToast('Αποσυνδεθήκατε', '#e74c3c'); 
}

export function loadDashboardState() { 
    const auth = AdminAuth.isSessionValid(); 
    const visible = localStorage.getItem('dashboardVisible') === 'true'; 
    if (auth && visible) {
        showDashboard();
    } else {
        hideDashboard();
    }
}