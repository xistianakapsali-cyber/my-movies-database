import { YIOIO_CONFIG } from './config.js';

// ============ ΜΕΤΑΒΛΗΤΕΣ ============
let moviesData = [];
let movieRequests = [];
let posterCache = new Map();
let actorImageCache = new Map();

// ============ SAVE/LOAD MOVIES ============
export function saveToLocalStorage() { 
    localStorage.setItem('yioio_movies_data', JSON.stringify(moviesData)); 
}

export async function loadMoviesData() {
    const saved = localStorage.getItem('yioio_movies_data');
    if (saved) {
        try {
            moviesData = JSON.parse(saved);
            if (moviesData.length) {
                updateRecentMoviesList();
                return true;
            }
        } catch(e) {
            console.error('Error loading saved movies:', e);
        }
    }
    
    // Default data if nothing saved
    moviesData = [
        { "id": 1, "title": "1883", "year": 2021, "country": "United States", "genre": "Δράμα, Γουέστερν", "type": "Series", "quality": "HD", "rating": 8.7, "actors": "Sam Elliott, Tim McGraw, Faith Hill, Isabel May", "director": "Taylor Sheridan", "writer": "Taylor Sheridan", "link": "", "imdb": "", "tmdb": "", "desc": "Η ιστορία της οικογένειας Ντάτον καθώς ταξιδεύουν προς τη Δύση.", "dateAdded": new Date().toISOString().split('T')[0], "studio": "Paramount+", "createdBy": "Διαχειριστής", "status": "active" },
        { "id": 2, "title": "1899", "year": 2022, "country": "Germany", "genre": "Μυστηρίου, Δράμα", "type": "Series", "quality": "HD", "rating": 7.3, "actors": "Emily Beecham, Andreas Pietschmann", "director": "Baran bo Odar", "writer": "Baran bo Odar", "link": "", "imdb": "", "tmdb": "", "desc": "Μετανάστες ταξιδεύουν από την Ευρώπη στην Αμερική.", "dateAdded": new Date().toISOString().split('T')[0], "studio": "Netflix", "createdBy": "Διαχειριστής", "status": "active" },
        { "id": 3, "title": "1923", "year": 2022, "country": "United States", "genre": "Δράμα, Γουέστερν", "type": "Series", "quality": "HD", "rating": 8.3, "actors": "Harrison Ford, Helen Mirren", "director": "Taylor Sheridan", "writer": "Taylor Sheridan", "link": "", "imdb": "", "tmdb": "", "desc": "Η συνέχεια του 1883.", "dateAdded": new Date().toISOString().split('T')[0], "studio": "Paramount+", "createdBy": "Διαχειριστής", "status": "active" }
    ];
    saveToLocalStorage();
    updateRecentMoviesList();
    return true;
}

// ============ REQUESTS STORAGE ============
export function saveRequestsToLocalStorage() {
    localStorage.setItem('yioio_movie_requests', JSON.stringify(movieRequests));
}

export function loadRequestsFromLocalStorage() {
    const saved = localStorage.getItem('yioio_movie_requests');
    if (saved) {
        try {
            movieRequests = JSON.parse(saved);
            console.log('📋 Φορτώθηκαν αιτήματα:', movieRequests.length);
        } catch(e) {
            movieRequests = [];
        }
    } else {
        movieRequests = [];
        console.log('📋 Δεν βρέθηκαν αποθηκευμένα αιτήματα');
    }
}

// ============ GETTERS/SETTERS ============
export function getMoviesData() { return moviesData; }
export function setMoviesData(data) { moviesData = data; saveToLocalStorage(); }

export function getMovieRequests() { return movieRequests; }
export function addMovieRequest(request) { 
    movieRequests.push(request); 
    saveRequestsToLocalStorage();
}
export function updateMovieRequest(requestId, updatedRequest) {
    const index = movieRequests.findIndex(r => r.id === requestId);
    if (index !== -1) {
        movieRequests[index] = { ...movieRequests[index], ...updatedRequest };
        saveRequestsToLocalStorage();
    }
}
export function deleteMovieRequest(requestId) {
    movieRequests = movieRequests.filter(r => r.id !== requestId);
    saveRequestsToLocalStorage();
}

export function getPosterCache() { return posterCache; }
export function setPosterCache(key, value) { posterCache.set(key, value); }
export function getActorImageCache() { return actorImageCache; }
export function setActorImageCache(key, value) { actorImageCache.set(key, value); }

// ============ RECENT MOVIES ============
let recentMovieIds = [];

export function updateRecentMoviesList() {
    if (!moviesData || moviesData.length === 0) return;
    const sortedByDate = [...moviesData].sort((a, b) => new Date(b.dateAdded) - new Date(a.dateAdded));
    recentMovieIds = sortedByDate.slice(0, 10).map(m => m.id);
}

export function isNewMovie(dateAdded, movieId) {
    if (!dateAdded || !movieId) return false;
    return recentMovieIds.includes(movieId);
}