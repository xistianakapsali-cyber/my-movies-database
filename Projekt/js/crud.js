import { YIOIO_CONFIG } from './config.js';
import { 
    getMoviesData, setMoviesData, saveToLocalStorage, 
    updateRecentMoviesList, getMovieRequests, addMovieRequest, 
    deleteMovieRequest, updateMovieRequest,
    getPosterCache, getActorImageCache 
} from './storage.js';
import { showToast, escapeHtml, closeDetails, openDetailsById, getCurrentModalMovieId } from './ui.js';
import { initFilters, initFuseSearch, applyFilters } from './filters.js';
import { isLoggedIn, getCurrentUserName } from './auth.js';
import { fetchMovieDetailsFromTMDB, getTempPoster, setTempPoster, clearTempPoster } from './tmdb.js';

// ============ ADD MOVIE FORM ============
export function showAddMovieForm() {
    if (!isLoggedIn()) { 
        showToast('Πρέπει να συνδεθείτε για να προσθέσετε ταινία!', '#e50914'); 
        return; 
    }
    
    const modalHtml = `<div class="add-movie-modal" id="addMovieModal"><h2>➕ Προσθήκη Νέας Ταινίας/Σειράς</h2>
        <div class="auto-fill-row" style="display: flex; gap: 10px; margin-bottom: 15px;">
            <input type="text" id="autoTitle" placeholder="Τίτλος για αυτόματη συμπλήρωση" style="flex: 2;">
            <button id="searchTmdbBtn" class="btn-tmdb" style="flex:1;">🎬 Αναζήτηση Ταινίας</button>
            <button id="searchTvBtn" class="btn-tmdb" style="flex:1; background:#9b59b6;">📺 Αναζήτηση Σειράς</button>
        </div>
        <div id="searchResults" class="results-list" style="display: none; max-height: 200px; overflow-y: auto; border: 1px solid var(--border); border-radius: 8px; margin-bottom: 15px;"></div>
        <div style="margin: 15px 0; text-align: center; font-size: 12px; opacity: 0.7;">— ή συμπλήρωσε χειροκίνητα —</div>
        <div class="form-row">
            <div class="form-group"><label>Τίτλος *</label><input type="text" id="newTitle" placeholder="Ο τίτλος της ταινίας/σειράς"></div>
            <div class="form-group"><label>Έτος *</label><input type="number" id="newYear" placeholder="π.χ. 2024"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Τύπος</label><select id="newType">
                <option value="Movie">Ταινία (Movie)</option>
                <option value="Series">Σειρά (Series)</option>
            </select></div>
            <div class="form-group"><label>Ποιότητα</label><select id="newQuality">
                <option value="HD">HD</option>
                <option value="SD">SD</option>
                <option value="4K">4K</option>
            </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Χώρα</label><input type="text" id="newCountry" placeholder="π.χ. United States, Greece"></div>
            <div class="form-group"><label>Είδος (Genre)</label><input type="text" id="newGenre" placeholder="π.χ. Δράμα, Θρίλερ"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Βαθμολογία (0-10)</label><input type="number" step="0.1" id="newRating" placeholder="π.χ. 8.5"></div>
            <div class="form-group"><label>Πλατφόρμα (Studio)</label><input type="text" id="newStudio" placeholder="π.χ. Netflix, Disney+"></div>
        </div>
        <div class="form-group"><label>Σκηνοθέτης</label><input type="text" id="newDirector" placeholder="Ονόματα σκηνοθετών"></div>
        <div class="form-group"><label>Σεναριογράφος</label><input type="text" id="newWriter" placeholder="Ονόματα σεναριογράφων"></div>
        <div class="form-group"><label>Ηθοποιοί</label><input type="text" id="newActors" placeholder="Ονόματα ηθοποιών (διαχώρισε με κόμματα)"></div>
        <div class="form-group"><label>Link Προβολής</label><input type="url" id="newLink" placeholder="https://..."></div>
        <div class="form-row">
            <div class="form-group"><label>IMDB Link</label><input type="url" id="newImdb" placeholder="https://www.imdb.com/..."></div>
            <div class="form-group"><label>TMDB Link</label><input type="url" id="newTmdb" placeholder="https://www.themoviedb.org/..."></div>
        </div>
        <div class="form-group"><label>Περιγραφή</label><textarea id="newDesc" rows="3" placeholder="Περιγραφή της ταινίας/σειράς..."></textarea></div>
        <div class="modal-buttons"><button id="saveMovieBtn" class="btn-save">💾 Αποθήκευση</button><button id="cancelAddMovieBtn" class="btn-cancel">❌ Ακύρωση</button></div>
    </div>`;
    
    const existing = document.getElementById('addMovieModal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    // Import tmdb functions dynamically to avoid circular dependency
    import('./tmdb.js').then(tmdb => {
        document.getElementById('searchTmdbBtn')?.addEventListener('click', () => {
            tmdb.searchTMDBForAdd('movie', 'autoTitle', 'searchResults', selectTMDBResultForAdd);
        });
        document.getElementById('searchTvBtn')?.addEventListener('click', () => {
            tmdb.searchTMDBForAdd('tv', 'autoTitle', 'searchResults', selectTMDBResultForAdd);
        });
    });
    
    document.getElementById('saveMovieBtn')?.addEventListener('click', () => saveNewMovie());
    document.getElementById('cancelAddMovieBtn')?.addEventListener('click', () => closeAddMovieForm());
}

function selectTMDBResultForAdd(id, title, year, posterPath, type) {
    import('./tmdb.js').then(async (tmdb) => {
        const data = await tmdb.fetchMovieDetailsFromTMDB(id, type);
        if (data) {
            document.getElementById('newTitle').value = data.title || data.name || title;
            const yearVal = (data.release_date || data.first_air_date || '').substring(0, 4) || year;
            document.getElementById('newYear').value = yearVal;
            document.getElementById('newCountry').value = data.production_countries?.[0]?.name || 'N/A';
            document.getElementById('newGenre').value = data.genres?.map(g => g.name).join(', ') || 'N/A';
            document.getElementById('newRating').value = (data.vote_average || 0).toFixed(1);
            document.getElementById('newStudio').value = data.production_companies?.[0]?.name || 'N/A';
            
            let director = 'N/A';
            if (data.credits?.crew) {
                const dir = data.credits.crew.find(p => p.job === 'Director');
                if (dir) director = dir.name;
            }
            document.getElementById('newDirector').value = director;
            
            let writer = 'N/A';
            if (data.credits?.crew) {
                const wr = data.credits.crew.find(p => p.job === 'Writer' || p.department === 'Writing');
                if (wr) writer = wr.name;
            }
            document.getElementById('newWriter').value = writer;
            
            let actors = 'N/A';
            if (data.credits?.cast) {
                actors = data.credits.cast.slice(0, 5).map(a => a.name).join(', ');
            }
            document.getElementById('newActors').value = actors;
            document.getElementById('newDesc').value = data.overview || 'Δεν υπάρχει περιγραφή.';
            document.getElementById('newType').value = type === 'tv' ? 'Series' : 'Movie';
            document.getElementById('newTmdb').value = `https://www.themoviedb.org/${type}/${id}`;
            
            if (posterPath || data.poster_path) {
                setTempPoster(`https://image.tmdb.org/t/p/w500${posterPath || data.poster_path}`);
            }
            
            document.getElementById('searchResults').style.display = 'none';
            showToast(`✅ Φορτώθηκαν στοιχεία`, '#2ecc71');
        }
    });
}

function closeAddMovieForm() { 
    document.getElementById('addMovieModal')?.remove(); 
    clearTempPoster();
}

function isDuplicateMovie(title, year, excludeId = null) {
    const moviesData = getMoviesData();
    return moviesData.some(m => m.title.toLowerCase() === title.toLowerCase() && m.year === year && m.id !== excludeId);
}

function saveNewMovie() {
    if (!isLoggedIn()) {
        showToast('Πρέπει να συνδεθείτε για να προσθέσετε ταινία!', '#e50914');
        return;
    }
    
    const moviesData = getMoviesData();
    const title = document.getElementById('newTitle').value.trim();
    const year = parseInt(document.getElementById('newYear').value);
    
    if (!title || !year) { 
        showToast('Συμπλήρωσε τίτλο και έτος', '#e50914'); 
        return; 
    }
    
    if (isDuplicateMovie(title, year)) { 
        showToast('Υπάρχει ήδη!', '#e50914'); 
        return; 
    }
    
    const newId = moviesData.length ? Math.max(...moviesData.map(m => m.id)) + 1 : 4;
    const tempPoster = getTempPoster();
    
    const newMovie = { 
        id: newId, 
        title, 
        year, 
        type: document.getElementById('newType').value, 
        quality: document.getElementById('newQuality').value,
        actors: document.getElementById('newActors').value || 'N/A', 
        link: document.getElementById('newLink').value || '',
        dateAdded: new Date().toISOString().split('T')[0], 
        studio: document.getElementById('newStudio').value || 'Κανάλι',
        rating: parseFloat(document.getElementById('newRating').value) || 0, 
        country: document.getElementById('newCountry').value || 'N/A',
        genre: document.getElementById('newGenre').value || 'N/A', 
        director: document.getElementById('newDirector').value || 'N/A',
        writer: document.getElementById('newWriter').value || 'N/A', 
        imdb: document.getElementById('newImdb').value || '',
        tmdb: document.getElementById('newTmdb').value || '', 
        desc: document.getElementById('newDesc').value || '',
        posterOverride: tempPoster || null, 
        createdBy: getCurrentUserName() || 'Χρήστης',
        status: 'active'
    };
    
    moviesData.push(newMovie);
    setMoviesData(moviesData);
    saveToLocalStorage();
    
    getPosterCache()?.clear();
    getActorImageCache()?.clear();
    updateRecentMoviesList();
    initFilters(moviesData);
    initFuseSearch(moviesData);
    applyFilters();
    closeAddMovieForm();
    clearTempPoster();
    showToast(`✅ Προστέθηκε: ${title}`, '#2ecc71');
}

// ============ EDIT MOVIE ============
let currentEditingMovieId = null;

export function editCurrentMovie() {
    if (!isLoggedIn()) { 
        showToast('Συνδεθείτε για επεξεργασία', '#e50914'); 
        return; 
    }
    
    const moviesData = getMoviesData();
    const movie = moviesData.find(m => m.id === getCurrentModalMovieId());
    if (!movie) return;
    
    currentEditingMovieId = movie.id;
    closeDetails();
    
    const modalHtml = `<div class="edit-movie-modal" id="editMovieModal"><h2>✏️ Επεξεργασία: ${escapeHtml(movie.title)}</h2>
        <div class="form-row">
            <div class="form-group"><label>Τίτλος</label><input type="text" id="editTitle" value="${escapeHtml(movie.title)}"></div>
            <div class="form-group"><label>Έτος</label><input type="number" id="editYear" value="${movie.year}"></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Τύπος</label><select id="editType">
                <option value="Movie" ${movie.type === 'Movie' ? 'selected' : ''}>Ταινία</option>
                <option value="Series" ${movie.type === 'Series' ? 'selected' : ''}>Σειρά</option>
            </select></div>
            <div class="form-group"><label>Ποιότητα</label><select id="editQuality">
                <option ${movie.quality === 'HD' ? 'selected' : ''}>HD</option>
                <option ${movie.quality === 'SD' ? 'selected' : ''}>SD</option>
                <option ${movie.quality === '4K' ? 'selected' : ''}>4K</option>
            </select></div>
        </div>
        <div class="form-row">
            <div class="form-group"><label>Βαθμολογία (0-10)</label><input type="number" step="0.1" id="editRating" value="${movie.rating}"></div>
            <div class="form-group"><label>Ηθοποιοί</label><input type="text" id="editActors" value="${escapeHtml(movie.actors || '')}"></div>
        </div>
        <div class="form-group"><label>Link Προβολής</label><input type="url" id="editLink" value="${escapeHtml(movie.link || '')}" placeholder="https://..."></div>
        <div class="form-group">
            <label>📅 Ημερομηνία Προσθήκης</label>
            <input type="date" id="editDateAdded" value="${movie.dateAdded || new Date().toISOString().split('T')[0]}">
            <small>Άλλαξε την ημερομηνία για να εμφανίζεται στις "Πρόσφατες Προσθήκες"</small>
        </div>
        <div class="modal-buttons"><button id="saveEditBtn" class="btn-save">💾 Αποθήκευση</button><button id="cancelEditBtn" class="btn-cancel">❌ Ακύρωση</button></div>
    </div>`;
    
    const existing = document.getElementById('editMovieModal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('saveEditBtn')?.addEventListener('click', () => saveEditedMovie());
    document.getElementById('cancelEditBtn')?.addEventListener('click', () => closeEditForm());
}

function closeEditForm() { 
    document.getElementById('editMovieModal')?.remove(); 
    currentEditingMovieId = null; 
}

function saveEditedMovie() {
    const moviesData = getMoviesData();
    const idx = moviesData.findIndex(m => m.id === currentEditingMovieId);
    if (idx === -1) return;
    
    const title = document.getElementById('editTitle').value.trim();
    const year = parseInt(document.getElementById('editYear').value);
    const rating = parseFloat(document.getElementById('editRating').value) || 0;
    const newLink = document.getElementById('editLink').value || '';
    const oldLink = moviesData[idx].link;
    const newDateAdded = document.getElementById('editDateAdded').value;
    
    if (isDuplicateMovie(title, year, currentEditingMovieId)) { 
        showToast('Υπάρχει ήδη!', '#e50914'); 
        return; 
    }
    
    const wasPending = moviesData[idx].status === 'pending';
    const hasNewLink = newLink && newLink !== '';
    const hadNoLink = !oldLink || oldLink === '';
    
    moviesData[idx] = { 
        ...moviesData[idx], 
        title, 
        year, 
        type: document.getElementById('editType').value, 
        quality: document.getElementById('editQuality').value, 
        rating,
        actors: document.getElementById('editActors').value || 'N/A', 
        link: newLink,
        dateAdded: newDateAdded
    };
    
    if (wasPending && hasNewLink && hadNoLink) {
        moviesData[idx].status = 'active';
        moviesData[idx].approvedDate = new Date().toISOString().split('T')[0];
        moviesData[idx].approvedBy = getCurrentUserName() || 'Διαχειριστής';
        showToast(`✅ Η ταινία "${title}" εγκρίθηκε και είναι πλέον διαθέσιμη!`, '#2ecc71');
        initFuseSearch(moviesData);
    }
    
    setMoviesData(moviesData);
    saveToLocalStorage();
    getPosterCache()?.clear();
    getActorImageCache()?.clear();
    updateRecentMoviesList();
    initFilters(moviesData);
    applyFilters();
    closeEditForm();
    showToast('✅ Αποθηκεύτηκε', '#2ecc71');
    setTimeout(() => openDetailsById(moviesData[idx].id), 300);
}

// ============ DELETE MOVIE ============
export function deleteMovieById(id) {
    if (!isLoggedIn()) { 
        showToast('Συνδεθείτε για διαγραφή', '#e50914'); 
        return false; 
    }
    
    if (!confirm('Μόνιμη διαγραφή;')) return false;
    
    let moviesData = getMoviesData();
    const title = moviesData.find(m => m.id === id)?.title;
    moviesData = moviesData.filter(m => m.id !== id);
    moviesData.forEach((m, i) => m.id = i + 1);
    
    setMoviesData(moviesData);
    saveToLocalStorage();
    getPosterCache()?.clear();
    getActorImageCache()?.clear();
    updateRecentMoviesList();
    initFilters(moviesData);
    initFuseSearch(moviesData);
    applyFilters();
    closeDetails();
    showToast(`Διαγράφηκε: ${title}`, '#2ecc71');
    return true;
}

export function deleteMovieFromModal() { 
    const id = getCurrentModalMovieId();
    if (id) deleteMovieById(id); 
}

// ============ REQUEST SYSTEM ============
export function showRequestForm(title = '', year = '') {
    const modalHtml = `
        <div id="requestModal" style="position:fixed; top:0; left:0; width:100%; height:100%; background:rgba(0,0,0,0.95); z-index:20000; display:flex; align-items:center; justify-content:center;">
            <div style="background: var(--card); border-radius: 20px; max-width: 600px; width: 90%; padding: 30px; border: 1px solid var(--primary); max-height: 85vh; overflow-y: auto;">
                <h3 style="color: var(--primary); margin-bottom: 20px;">📢 Αίτημα Προσθήκης Νέας Ταινίας/Σειράς</h3>
                <div class="form-group">
                    <label>Τίτλος *</label>
                    <input type="text" id="reqTitle" placeholder="π.χ. Oppenheimer, Poor Things" value="${escapeHtml(title)}">
                </div>
                <div class="form-group">
                    <label>Έτος *</label>
                    <input type="number" id="reqYear" placeholder="π.χ. 2023" value="${year}">
                </div>
                <div class="form-group">
                    <label>Το όνομα σου (προαιρετικό)</label>
                    <input type="text" id="reqRequester" placeholder="π.χ. ${getCurrentUserName() || 'Χρήστης'}">
                </div>
                <div class="form-group">
                    <label>Σημείωση (προαιρετική)</label>
                    <textarea id="reqNote" rows="3" placeholder="Πρόσθετες πληροφορίες..."></textarea>
                </div>
                <div class="modal-buttons" style="margin-top: 20px;">
                    <button id="submitRequestBtn" class="btn-save">✉️ Υποβολή Αιτήματος</button>
                    <button id="cancelRequestBtn" class="btn-cancel">❌ Ακύρωση</button>
                </div>
            </div>
        </div>
    `;
    
    const existing = document.getElementById('requestModal');
    if (existing) existing.remove();
    document.body.insertAdjacentHTML('beforeend', modalHtml);
    
    document.getElementById('submitRequestBtn')?.addEventListener('click', () => submitRequest());
    document.getElementById('cancelRequestBtn')?.addEventListener('click', () => {
        document.getElementById('requestModal')?.remove();
    });
}

async function submitRequest() {
    const title = document.getElementById('reqTitle').value.trim();
    const year = parseInt(document.getElementById('reqYear').value);
    const requester = document.getElementById('reqRequester').value.trim() || getCurrentUserName() || 'Ανώνυμος';
    const note = document.getElementById('reqNote').value.trim();
    const moviesData = getMoviesData();
    
    if (!title || !year || isNaN(year)) {
        showToast('❌ Παρακαλώ συμπληρώστε τίτλο και έτος', '#e50914');
        return;
    }
    
    const existingMovie = moviesData.find(m => m.title.toLowerCase() === title.toLowerCase() && m.year === year);
    if (existingMovie) {
        showToast(`⚠️ Η ταινία "${title}" (${year}) υπάρχει ήδη!`, '#e67e22');
        return;
    }
    
    addMovieRequest({
        id: Date.now(),
        title: title,
        year: year,
        requester: requester,
        note: note,
        dateRequested: new Date().toISOString().split('T')[0],
        status: 'pending'
    });
    
    showToast(`✅ Το αίτημα για "${title}" καταχωρήθηκε!`, '#2ecc71');
    document.getElementById('requestModal')?.remove();
}

// ============ EXPORT/IMPORT ============
export function exportToJSON() {
    const moviesData = getMoviesData();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(moviesData, null, 2)], { type: 'application/json' }));
    a.download = 'movies_data.json';
    a.click();
}

export function importFromJSON(event) {
    const file = event.target.files[0];
    if (!file) return;
    
    const reader = new FileReader();
    reader.onload = e => {
        try { 
            const imported = JSON.parse(e.target.result);
            imported.forEach(m => { if (!m.status) m.status = 'active'; });
            setMoviesData(imported);
            saveToLocalStorage();
            getPosterCache()?.clear();
            getActorImageCache()?.clear();
            updateRecentMoviesList();
            initFilters(imported);
            initFuseSearch(imported);
            applyFilters();
            showToast(`Εισήχθησαν ${imported.length} τίτλοι`, '#2ecc71');
        } catch(err) { 
            showToast('Λάθος αρχείο', '#e50914');
        }
        event.target.value = '';
    };
    reader.readAsText(file);
}