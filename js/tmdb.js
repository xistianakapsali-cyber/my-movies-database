import { YIOIO_CONFIG } from './config.js';
import { getMoviesData, getPosterCache, setPosterCache, getActorImageCache, setActorImageCache } from './storage.js';
import { showToast } from './ui.js';
import { applyFilters, searchMoviesByActor } from './filters.js';

// ============ TMDB API KEY ============
let TMDB_API_KEY = YIOIO_CONFIG?.tmdb_api_key || null;

// ============ POSTER FUNCTIONS ============
export async function fetchPoster(title, year, type, movieId) {
    const key = `${title}|${year}`;
    const moviesData = getMoviesData();
    const movie = moviesData.find(m => m.id === movieId);
    
    if (movie?.posterOverride) return movie.posterOverride;
    if (getPosterCache().has(key)) return getPosterCache().get(key);
    
    const cachedPoster = localStorage.getItem(`poster_${key}`);
    if (cachedPoster) {
        setPosterCache(key, cachedPoster);
        return cachedPoster;
    }
    
    if (!TMDB_API_KEY) {
        const fallback = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%2334495e'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='white' font-size='14'%3E${encodeURIComponent(title.substring(0,20))}%3C/text%3E%3C/svg%3E`;
        setPosterCache(key, fallback);
        return fallback;
    }
    
    try {
        const searchType = type === 'Series' ? 'tv' : 'movie';
        const url = `https://api.themoviedb.org/3/search/${searchType}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&year=${year}`;
        const res = await fetch(url);
        const data = await res.json();
        if (data.results?.[0]?.poster_path) {
            const poster = `https://image.tmdb.org/t/p/w500${data.results[0].poster_path}`;
            setPosterCache(key, poster);
            localStorage.setItem(`poster_${key}`, poster);
            return poster;
        }
    } catch(e) {
        console.error('Poster fetch error:', e);
    }
    
    const fallback = `data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='300' height='450' viewBox='0 0 300 450'%3E%3Crect width='300' height='450' fill='%2334495e'/%3E%3Ctext x='50%25' y='50%25' text-anchor='middle' fill='white' font-size='14'%3E${encodeURIComponent(title.substring(0,20))}%3C/text%3E%3C/svg%3E`;
    setPosterCache(key, fallback);
    return fallback;
}

// ============ ACTOR IMAGE FUNCTIONS ============
export async function fetchActorImage(actorName) {
    if (!actorName || actorName === 'N/A') return null;
    if (getActorImageCache().has(actorName)) return getActorImageCache().get(actorName);
    if (!TMDB_API_KEY) return null;
    
    try {
        const searchUrl = `https://api.themoviedb.org/3/search/person?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(actorName)}`;
        const response = await fetch(searchUrl);
        const data = await response.json();
        if (data.results && data.results.length > 0 && data.results[0].profile_path) {
            const imageUrl = `https://image.tmdb.org/t/p/w185${data.results[0].profile_path}`;
            setActorImageCache(actorName, imageUrl);
            return imageUrl;
        }
    } catch(e) {
        console.error('Actor image fetch error:', e);
    }
    setActorImageCache(actorName, null);
    return null;
}

export async function renderActorsWithImages(actorsString, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    
    if (!actorsString || actorsString === 'N/A') {
        container.innerHTML = '<span style="opacity:0.7;">N/A</span>';
        return;
    }
    
    const actorNames = actorsString.split(',').map(name => name.trim()).filter(name => name && name !== 'N/A');
    if (actorNames.length === 0) {
        container.innerHTML = '<span style="opacity:0.7;">N/A</span>';
        return;
    }
    
    container.innerHTML = '';
    for (const name of actorNames) {
        const actorDiv = document.createElement('div');
        actorDiv.className = 'actor-item';
        actorDiv.setAttribute('data-actor', name);
        actorDiv.addEventListener('click', () => searchMoviesByActor(name));
        
        const placeholder = document.createElement('div');
        placeholder.className = 'actor-placeholder';
        placeholder.textContent = '🎭';
        
        const nameSpan = document.createElement('span');
        nameSpan.className = 'actor-name';
        nameSpan.textContent = name;
        
        actorDiv.appendChild(placeholder);
        actorDiv.appendChild(nameSpan);
        container.appendChild(actorDiv);
        
        const imgUrl = await fetchActorImage(name);
        if (imgUrl) {
            const img = document.createElement('img');
            img.src = imgUrl;
            img.className = 'actor-avatar';
            img.alt = name;
            img.onerror = () => { img.style.display = 'none'; placeholder.style.display = 'flex'; };
            placeholder.parentNode.replaceChild(img, placeholder);
        }
    }
}

// ============ TMDB SEARCH FOR ADD FORM ============
let tempPoster = null;

export async function searchTMDBForAdd(type, autoTitleInputId, resultsDivId, fillFormCallback) {
    const title = document.getElementById(autoTitleInputId)?.value.trim();
    const searchType = type;
    
    if (!title) {
        showToast('Παρακαλώ γράψτε έναν τίτλο', '#e67e22');
        return;
    }
    if (!TMDB_API_KEY) {
        showToast('Σφάλμα: Missing TMDB API Key', '#e50914');
        return;
    }
    
    showToast(`🔍 Αναζήτηση ${searchType === 'tv' ? 'σειράς' : 'ταινίας'} στο TMDB...`, '#2196f3');
    
    try {
        const searchEndpoint = searchType === 'tv' ? 'search/tv' : 'search/movie';
        const searchUrl = `https://api.themoviedb.org/3/${searchEndpoint}?api_key=${TMDB_API_KEY}&query=${encodeURIComponent(title)}&language=en-US`;
        const res = await fetch(searchUrl);
        const data = await res.json();
        
        const resultsDiv = document.getElementById(resultsDivId);
        if (!resultsDiv) return;
        
        resultsDiv.innerHTML = '';
        
        if (data.results && data.results.length > 0) {
            const header = document.createElement('div');
            header.style.cssText = 'padding:10px;background:var(--primary);color:white;font-weight:bold;border-radius:8px 8px 0 0;';
            header.textContent = `📽️ Αποτελέσματα ${searchType === 'tv' ? 'Σειρών' : 'Ταινιών'} (${data.results.length})`;
            resultsDiv.appendChild(header);
            
            for (let i = 0; i < Math.min(10, data.results.length); i++) {
                const r = data.results[i];
                const year = searchType === 'tv' 
                    ? (r.first_air_date || '').substring(0, 4) 
                    : (r.release_date || '').substring(0, 4);
                const titleName = searchType === 'tv' ? r.name : r.title;
                const resultItem = document.createElement('div');
                resultItem.className = 'result-item';
                resultItem.setAttribute('data-id', r.id);
                resultItem.style.cssText = 'padding:12px;cursor:pointer;border-bottom:1px solid var(--border);transition:background 0.2s;';
                resultItem.innerHTML = `<strong>${searchType === 'tv' ? '📺' : '🎬'} ${titleName}</strong> <span style="opacity:0.7;">(${year || 'Άγνωστο'})</span>`;
                resultItem.addEventListener('click', () => {
                    if (fillFormCallback) {
                        fillFormCallback(r.id, titleName, year, r.poster_path, searchType);
                    }
                });
                resultItem.addEventListener('mouseenter', () => { resultItem.style.background = 'var(--primary)'; resultItem.style.color = 'white'; });
                resultItem.addEventListener('mouseleave', () => { resultItem.style.background = ''; resultItem.style.color = ''; });
                resultsDiv.appendChild(resultItem);
            }
            resultsDiv.style.display = 'block';
        } else {
            resultsDiv.innerHTML = `<div style="padding:15px;text-align:center;">❌ Δεν βρέθηκε ${searchType === 'tv' ? 'σειρά' : 'ταινία'} με τίτλο "${title}"<br><small>Δοκίμασε με διαφορετική ορθογραφία ή χρησιμοποίησε TMDB ID</small></div>`;
            resultsDiv.style.display = 'block';
        }
    } catch(e) {
        console.error(e);
        showToast('Σφάλμα επικοινωνίας με TMDB', '#e50914');
    }
}

export async function fetchMovieDetailsFromTMDB(movieId, searchType) {
    if (!TMDB_API_KEY) return null;
    
    try {
        const url = `https://api.themoviedb.org/3/${searchType}/${movieId}?api_key=${TMDB_API_KEY}&language=el&append_to_response=credits`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        return data;
    } catch(e) {
        console.error('TMDB fetch error:', e);
        return null;
    }
}

export function getTempPoster() { return tempPoster; }
export function setTempPoster(poster) { tempPoster = poster; }
export function clearTempPoster() { tempPoster = null; }

// ============ ADD MOVIE BY TMDB ID ============
export async function addMovieByTMDBId(moviesData, saveCallback, updateCallback) {
    if (!TMDB_API_KEY) {
        showToast('Σφάλμα: Missing TMDB API Key', '#e50914');
        return;
    }
    
    const id = prompt('🎬 Εισάγετε το TMDB ID (π.χ. 1041613):');
    if (!id) return;
    
    const isSeries = confirm('Είναι Σειρά (TV); Αν όχι, πατήστε Ακύρωση για Ταινία.');
    const mediaType = isSeries ? 'tv' : 'movie';
    const tmdbUrl = `https://www.themoviedb.org/${mediaType}/${id}`;
    
    const existingByTmdb = moviesData.find(m => m.tmdb === tmdbUrl);
    if (existingByTmdb) {
        showToast(`⚠️ Η ταινία "${existingByTmdb.title}" (${existingByTmdb.year}) υπάρχει ήδη!`, '#e67e22');
        return;
    }
    
    showToast(`🔍 Αναζήτηση σε TMDB...`, '#2196f3');
    
    try {
        const url = `https://api.themoviedb.org/3/${mediaType}/${id}?api_key=${TMDB_API_KEY}&language=el&append_to_response=credits`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        
        const title = data.title || data.name;
        const year = (data.release_date || data.first_air_date || '').substring(0,4);
        
        const existingByTitle = moviesData.find(m => m.title.toLowerCase() === title.toLowerCase() && m.year == year);
        if (existingByTitle) {
            showToast(`⚠️ Υπάρχει ήδη "${existingByTitle.title}" (${existingByTitle.year})`, '#e67e22');
            return;
        }
        
        let director = 'N/A';
        if (data.credits && data.credits.crew) {
            const directorObj = data.credits.crew.find(p => p.job === 'Director');
            if (directorObj) director = directorObj.name;
        }
        
        let writer = 'N/A';
        if (data.credits && data.credits.crew) {
            const writerObj = data.credits.crew.find(p => p.job === 'Writer' || p.department === 'Writing');
            if (writerObj) writer = writerObj.name;
        }
        
        let actors = 'N/A';
        if (data.credits && data.credits.cast && data.credits.cast.length > 0) {
            actors = data.credits.cast.slice(0, 5).map(a => a.name).join(', ');
        }
        
        const newId = moviesData.length ? Math.max(...moviesData.map(m => m.id)) + 1 : 4;
        
        const newMovie = {
            id: newId,
            title,
            year: parseInt(year) || new Date().getFullYear(),
            country: data.production_countries?.[0]?.name || 'N/A',
            genre: data.genres?.map(g => g.name).join(', ') || 'N/A',
            type: mediaType === 'tv' ? 'Series' : 'Movie',
            quality: 'HD',
            rating: data.vote_average || 0,
            actors,
            director,
            writer,
            link: '',
            imdb: data.imdb_id ? `https://www.imdb.com/title/${data.imdb_id}` : '',
            tmdb: tmdbUrl,
            desc: data.overview || 'Δεν υπάρχει περιγραφή.',
            dateAdded: new Date().toISOString().split('T')[0],
            studio: data.production_companies?.[0]?.name || 'N/A',
            createdBy: 'Χρήστης',
            status: 'active'
        };
        
        if (data.poster_path) {
            newMovie.posterOverride = `https://image.tmdb.org/t/p/w500${data.poster_path}`;
        }
        
        if (saveCallback) saveCallback(newMovie);
        if (updateCallback) updateCallback();
        
        showToast(`✅ Προστέθηκε: ${title} (${year})`, '#2ecc71');
        
    } catch(e) {
        console.error(e);
        showToast(`❌ Σφάλμα: Δεν βρέθηκε ${mediaType === 'tv' ? 'σειρά' : 'ταινία'} με ID ${id}`, '#e50914');
    }
}