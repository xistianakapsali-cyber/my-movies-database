import { getMovieRequests, deleteMovieRequest, updateMovieRequest, getMoviesData, setMoviesData, saveToLocalStorage } from './storage.js';
import { showToast, escapeHtml } from './ui.js';
import { initFilters, initFuseSearch, applyFilters } from './filters.js';
import { AdminAuth } from './auth.js';

// ============ ΠΙΝΑΚΑΣ ΔΙΑΧΕΙΡΙΣΗΣ ΑΙΤΗΜΑΤΩΝ ============
export function showRequestsPanel() {
    if (!AdminAuth.isSessionValid()) {
        showToast('Μόνο διαχειριστής!', '#e50914');
        return;
    }
    
    const movieRequests = getMovieRequests();
    const pendingRequests = movieRequests.filter(r => r.status === 'pending');
    const approvedRequests = movieRequests.filter(r => r.status === 'approved');
    const rejectedRequests = movieRequests.filter(r => r.status === 'rejected');
    
    let html = `
        <div id="requestsPanel" style="position:fixed; top:50%; left:50%; transform:translate(-50%,-50%); background: var(--card); border-radius: 20px; width: 95%; max-width: 1200px; max-height: 85vh; overflow-y: auto; z-index: 20000; padding: 20px; border: 2px solid var(--primary);">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; flex-wrap: wrap; gap: 10px;">
                <h2 style="color: var(--primary);">📋 Διαχείριση Αιτημάτων Ταινιών</h2>
                <div>
                    <button id="closeRequestsBtn" style="background: none; border: none; color: var(--text); font-size: 24px; cursor: pointer;">✕</button>
                </div>
            </div>
            
            <div style="display: flex; gap: 10px; margin-bottom: 20px; border-bottom: 1px solid var(--border);">
                <button class="request-tab-btn active" data-tab="pending">⏳ Εκκρεμή (${pendingRequests.length})</button>
                <button class="request-tab-btn" data-tab="approved">✅ Εγκεκριμένα (${approvedRequests.length})</button>
                <button class="request-tab-btn" data-tab="rejected">❌ Απορριφθέντα (${rejectedRequests.length})</button>
            </div>
            
            <div id="pendingTab" class="request-tab">
                ${renderPendingRequestsTable(pendingRequests)}
            </div>
            
            <div id="approvedTab" class="request-tab" style="display:none;">
                ${renderApprovedRequestsTable(approvedRequests)}
            </div>
            
            <div id="rejectedTab" class="request-tab" style="display:none;">
                ${renderRejectedRequestsTable(rejectedRequests)}
            </div>
            
            <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                <button id="clearAllRequestsBtn" style="background:#e67e22; color:white; border:none; padding:8px 16px; border-radius:8px;">🗑️ Εκκαθάριση Ολοκληρωμένων</button>
            </div>
        </div>
    `;
    
    const existing = document.getElementById('requestsPanel');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', html);
    
    document.querySelectorAll('.request-tab-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.request-tab-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const tab = btn.dataset.tab;
            document.getElementById('pendingTab').style.display = tab === 'pending' ? 'block' : 'none';
            document.getElementById('approvedTab').style.display = tab === 'approved' ? 'block' : 'none';
            document.getElementById('rejectedTab').style.display = tab === 'rejected' ? 'block' : 'none';
        });
    });
    
    document.getElementById('closeRequestsBtn').addEventListener('click', () => {
        document.getElementById('requestsPanel').remove();
    });
    
    const clearBtn = document.getElementById('clearAllRequestsBtn');
    if (clearBtn) {
        clearBtn.addEventListener('click', () => {
            if (confirm('Εκκαθάριση όλων των ολοκληρωμένων αιτημάτων (εγκεκριμένων & απορριφθέντων);')) {
                let requests = getMovieRequests();
                requests = requests.filter(r => r.status === 'pending');
                // Save back filtered requests
                const movieRequests = requests;
                localStorage.setItem('yioio_movie_requests', JSON.stringify(movieRequests));
                document.getElementById('requestsPanel').remove();
                showRequestsPanel();
                showToast('Ολοκληρωμένα αιτήματα εκκαθαρίστηκαν', '#2ecc71');
            }
        });
    }
}

function renderPendingRequestsTable(requests) {
    if (requests.length === 0) {
        return '<div style="text-align:center; padding:40px;">✨ Δεν υπάρχουν εκκρεμή αιτήματα</div>';
    }
    
    let html = '<div style="display: grid; gap: 20px;">';
    
    for (const req of requests) {
        const moviesData = getMoviesData();
        const movie = moviesData.find(m => m.title === req.title && m.year === req.year);
        
        html += `
            <div style="border: 1px solid var(--border); border-radius: 12px; padding: 15px; background: var(--input-bg);">
                <div style="display: flex; gap: 20px; flex-wrap: wrap;">
                    <div style="width: 100px; text-align: center;">
                        <div style="width: 100px; height: 150px; background: #2c3e50; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 40px;">🎬</div>
                        <div style="font-size: 10px; margin-top: 5px; color: orange;">⏳ Σε αναμονή</div>
                    </div>
                    
                    <div style="flex: 1;">
                        <h3 style="color: var(--primary); margin: 0 0 5px 0;">${escapeHtml(req.title)} (${req.year})</h3>
                        <div>👤 Από: ${escapeHtml(req.requester)} | 📅 ${req.dateRequested}</div>
                        ${req.note ? `<div>📝 Σημείωση: ${escapeHtml(req.note)}</div>` : ''}
                        ${movie ? `<div style="font-size: 11px; margin-top: 5px;">🆔 ID: ${movie.id}</div>` : ''}
                    </div>
                    
                    <div style="display: flex; flex-direction: column; gap: 8px; min-width: 120px;">
                        <button onclick="window.approveExistingMovie(${req.id})" style="background:#2ecc71; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">✅ Έγκριση</button>
                        <button onclick="window.rejectAndDeleteMovie(${req.id})" style="background:#e74c3c; color:white; border:none; padding:8px 12px; border-radius:8px; cursor:pointer;">🗑️ Απόρριψη & Διαγραφή</button>
                    </div>
                </div>
            </div>
        `;
    }
    
    html += '</div>';
    return html;
}

function renderApprovedRequestsTable(requests) {
    if (requests.length === 0) {
        return '<div style="text-align:center; padding:40px;">📭 Δεν υπάρχουν εγκεκριμένα αιτήματα</div>';
    }
    
    let html = '<div style="display: grid; gap: 15px;">';
    for (const req of requests) {
        html += `
            <div style="border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                <div>
                    <strong>${escapeHtml(req.title)} (${req.year})</strong>
                    <span style="font-size: 12px; opacity: 0.7;"> - Από: ${escapeHtml(req.requester)}</span>
                </div>
                <span style="background:#2ecc71; padding:2px 8px; border-radius:12px; font-size:11px;">✅ Εγκεκριμένο</span>
            </div>
        `;
    }
    html += '</div>';
    return html;
}

function renderRejectedRequestsTable(requests) {
    if (requests.length === 0) {
        return '<div style="text-align:center; padding:40px;">📭 Δεν υπάρχουν απορριφθέντα αιτήματα</div>';
    }
    
    let html = '<div style="display: grid; gap: 15px;">';
    for (const req of requests) {
        html += `
            <div style="border: 1px solid var(--border); border-radius: 8px; padding: 12px; display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap;">
                <div>
                    <strong>${escapeHtml(req.title)} (${req.year})</strong>
                    <span style="font-size: 12px; opacity: 0.7;"> - Από: ${escapeHtml(req.requester)}</span>
                </div>
                <span style="background:#e74c3c; padding:2px 8px; border-radius:12px; font-size:11px;">❌ Απορρίφθηκε</span>
            </div>
        `;
    }
    html += '</div>';
    return html;
}

// ============ APPROVE/REJECT FUNCTIONS ============
export function approveExistingMovie(requestId) {
    const movieRequests = getMovieRequests();
    const request = movieRequests.find(r => r.id === requestId);
    if (!request) {
        showToast('Δεν βρέθηκε το αίτημα', '#e50914');
        return;
    }
    
    const moviesData = getMoviesData();
    const existingMovie = moviesData.find(m => m.title === request.title && m.year === request.year);
    
    if (existingMovie) {
        existingMovie.status = 'active';
        setMoviesData(moviesData);
        saveToLocalStorage();
        showToast(`✅ Η ταινία "${request.title}" εγκρίθηκε!`, '#2ecc71');
    } else {
        showToast(`❌ Δεν βρέθηκε η ταινία "${request.title}" στη βάση`, '#e50914');
    }
    
    request.status = 'approved';
    request.approvedDate = new Date().toISOString().split('T')[0];
    updateMovieRequest(requestId, request);
    
    showRequestsPanel();
    initFuseSearch(moviesData);
    applyFilters();
}

export function rejectAndDeleteMovie(requestId) {
    const movieRequests = getMovieRequests();
    const request = movieRequests.find(r => r.id === requestId);
    if (!request) {
        showToast('Δεν βρέθηκε το αίτημα', '#e50914');
        return;
    }
    
    if (!confirm(`❌ Σίγουρα θέλεις να ΑΠΟΡΡΙΨΕΙΣ και να ΔΙΑΓΡΑΨΕΙΣ την ταινία "${request.title}" (${request.year});`)) {
        return;
    }
    
    let moviesData = getMoviesData();
    const movieIndex = moviesData.findIndex(m => m.title === request.title && m.year === request.year);
    
    if (movieIndex !== -1) {
        moviesData.splice(movieIndex, 1);
        moviesData.forEach((m, i) => m.id = i + 1);
        setMoviesData(moviesData);
        saveToLocalStorage();
        showToast(`🗑️ Η ταινία "${request.title}" διαγράφηκε`, '#e74c3c');
    } else {
        showToast(`⚠️ Δεν βρέθηκε η ταινία "${request.title}"`, '#e67e22');
    }
    
    deleteMovieRequest(requestId);
    
    // Clear caches and refresh
    import('./storage.js').then(s => {
        s.getPosterCache()?.clear();
        s.getActorImageCache()?.clear();
    });
    import('./storage.js').then(s => s.updateRecentMoviesList());
    initFilters(moviesData);
    initFuseSearch(moviesData);
    applyFilters();
    
    const panel = document.getElementById('requestsPanel');
    if (panel) panel.remove();
    showRequestsPanel();
    
    showToast(`✅ Το αίτημα απορρίφθηκε και η ταινία διαγράφηκε`, '#2ecc71');
}

// Make functions global for HTML onclick
window.approveExistingMovie = approveExistingMovie;
window.rejectAndDeleteMovie = rejectAndDeleteMovie;