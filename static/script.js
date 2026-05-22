const state = {
    currentPlaylist: JSON.parse(localStorage.getItem('dora_queue')) || [],
    currentTrackIndex: parseInt(localStorage.getItem('dora_queue_index')) || -1,
    favorites: JSON.parse(localStorage.getItem('dora_favorites')) || [],
    playlists: JSON.parse(localStorage.getItem('dora_playlists')) || {},
    quality: localStorage.getItem('dora_quality') || '320kbps',
    isPlaying: false,
    searchResults: null,
    activeSearchFilter: 'all',
    shuffle: JSON.parse(localStorage.getItem('dora_shuffle')) || false,
    repeatMode: localStorage.getItem('dora_repeat') || 'off', // 'off', 'one', 'all'
    crossfadeEnabled: JSON.parse(localStorage.getItem('dora_crossfade')) || false
};

// DOM Elements
const views = {
    home: document.getElementById('homeView'),
    search: document.getElementById('searchView'),
    favorites: document.getElementById('favoritesView'),
    playlists: document.getElementById('playlistsView'),
    queue: document.getElementById('queueView'),
    artist: document.getElementById('artistView')
};

const nav = {
    home: document.getElementById('navHome'),
    search: document.getElementById('navSearch'),
    favorites: document.getElementById('navFavorites'),
    playlists: document.getElementById('navPlaylists'),
    queue: document.getElementById('navQueue'),
    settings: document.getElementById('navSettings')
};

const player = {
    container: document.getElementById('musicPlayer'),
    audio: document.getElementById('audioPlayer'),
    image: document.getElementById('playerImage'),
    trackName: document.getElementById('playerTrackName'),
    artistName: document.getElementById('playerArtistName'),
    playPauseBtn: document.getElementById('playPauseButton'),
    prevBtn: document.getElementById('prevButton'),
    nextBtn: document.getElementById('nextButton'),
    likeBtn: document.getElementById('playerLikeBtn'),
    addBtn: document.getElementById('playerAddBtn'),
    progressFill: document.getElementById('progress'),
    seekSlider: document.getElementById('seekSlider'),
    currentTime: document.getElementById('currentTime'),
    duration: document.getElementById('duration'),
    volumeSlider: document.getElementById('volumeSlider')
};

const searchInput = document.getElementById('searchInput'); // Keep for potential enter key listener
// Note: Input in new HTML is inside .search-box, let's target accurately
const searchBoxInput = document.querySelector('.search-box input');
const resultsContainer = document.getElementById('resultsContainer');
const favoritesContainer = document.getElementById('favoritesContainer');
const queueContainer = document.getElementById('queueContainer');
const playlistsContainer = document.getElementById('playlistsContainer');
const playlistTracksContainer = document.getElementById('playlistTracksContainer');
const loading = document.getElementById('loading');
const settingsModal = document.getElementById('settingsModal');
const addToPlaylistModal = document.getElementById('addToPlaylistModal');
const playlistList = document.getElementById('playlistList');
const newPlaylistName = document.getElementById('newPlaylistName');
const confirmCreatePlaylist = document.getElementById('confirmCreatePlaylist');
const closePlaylistModal = document.getElementById('closePlaylistModal');

// Download Modal
const downloadConfirmModal = document.getElementById('downloadConfirmModal');
const closeDownloadModal = document.getElementById('closeDownloadModal');
const cancelDownloadBtn = document.getElementById('cancelDownloadBtn');
const confirmDownloadBtn = document.getElementById('confirmDownloadBtn');
const downloadCountSpan = document.getElementById('downloadCount');

// --- Initialization ---

function init() {
    setupNavigation();
    setupPlayerListeners();
    setupSearchListeners();
    setupSettings();
    setupPlaylists();
    setupKeyboardShortcuts();
    setupExpandablePlayer();
    renderFavorites();
    restorePlayerState();

    // Populate the home page with unified discover dashboard
    loadDiscoverPage();

    // Extra advanced feature initializations
    setupTheme();
    setupAutocompleteSearch();
    setupPlaylistImportExport();
    setupSleepTimer();
    setupLyrics();
    setupCrossfade();
    setupLanguageTabs();

    // Load recent and continue rows
    renderContinueListening();
    renderRecentlyPlayed();
}

// --- Navigation ---

function setupNavigation() {
    console.log("Setting up navigation with delegation...");

    // Remove individual listeners if they existed (optional, but delegation supersedes)

    // Delegation on Document body
    document.body.addEventListener('click', (e) => {
        const btn = e.target.closest('button') || e.target.closest('.nav-btn') || e.target.closest('.close-modal');
        const modalOverlay = e.target.closest('.modal');

        // Handle Modal Close (outside click)
        if (e.target.classList.contains('modal')) {
            e.target.classList.remove('active');
            return;
        }

        if (!btn) return;

        // Navigation Buttons
        if (btn.id === 'navHome' || btn.closest('#navHome')) {
            switchView('home');
        } else if (btn.id === 'navSearch' || btn.closest('#navSearch')) {
            switchView('search');
        } else if (btn.id === 'navFavorites' || btn.closest('#navFavorites')) {
            switchView('favorites');
        } else if (btn.id === 'navQueue' || btn.closest('#navQueue')) {
            console.log("Delegated: Queue Clicked");
            switchView('queue');
        } else if (btn.id === 'navPlaylists' || btn.closest('#navPlaylists')) {
            switchView('playlists');
        }
        // Settings / Quality
        else if (btn.id === 'navSettings' || btn.closest('#navSettings')) {
            console.log("Delegated: Settings Clicked");
            const modal = document.getElementById('settingsModal');
            if (modal) {
                modal.classList.add('active');
                modal.style.setProperty('display', 'flex', 'important');
            } else {
                console.warn("Dynamic lookup: Settings Modal NOT FOUND");
            }
        }
        // Modal Close Buttons
        else if (btn.classList.contains('close-modal')) {
            const modal = btn.closest('.modal');
            if (modal) {
                modal.classList.remove('active');
                modal.style.setProperty('display', 'none', 'important');
            }

            const dynSettings = document.getElementById('settingsModal');
            if (dynSettings) {
                dynSettings.classList.remove('active');
                dynSettings.style.setProperty('display', 'none', 'important');
            }
        }
        // Player Buttons (Delegated)
        else if (btn.id === 'playerLikeBtn' || btn.closest('#playerLikeBtn')) {
            console.log("Delegated: Like Clicked");
            if (!state.currentPlaylist[state.currentTrackIndex]) {
                showToast("Play a track first!", 'play-circle');
            } else {
                toggleLike();
            }
        }
        else if (btn.id === 'playerAddBtn' || btn.closest('#playerAddBtn')) {
            console.log("Delegated: Add Clicked");
            const currentTrack = state.currentPlaylist[state.currentTrackIndex];
            if (currentTrack) {
                showAddToPlaylistModal(currentTrack);
            } else {
                showToast("Play a track first!", 'play-circle');
            }
        }
    });
}

function switchView(viewName) {
    console.log(`Switching to view: ${viewName}`);

    // Update Nav
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    const activeNav = document.getElementById(`nav${viewName.charAt(0).toUpperCase() + viewName.slice(1)}`);
    if (activeNav) activeNav.classList.add('active');

    // Update View
    document.querySelectorAll('.view-section').forEach(view => {
        view.classList.remove('active');
        view.style.setProperty('display', 'none', 'important');
    });

    // Dynamic Select
    const activeView = document.getElementById(`${viewName}View`);
    if (activeView) {
        activeView.classList.add('active');
        activeView.style.setProperty('display', 'block', 'important');
        console.log(`View ${viewName} activated`);
    } else {
        console.error(`View element #${viewName}View not found!`);
    }

    if (viewName === 'favorites') {
        renderFavorites();
    } else if (viewName === 'queue') {
        renderQueue();
    } else if (viewName === 'search') {
        if (typeof renderRecentSearches === 'function') {
            renderRecentSearches();
        }
    }
}

// --- Search & Unified Discovery Dashboard ---

const searchIcon = document.querySelector('.search-box i');
const searchInputById = document.getElementById('searchInput');

function triggerArtistSearch(artistName) {
    if (!artistName || artistName === '-') return;
    console.log("Routing artist click to Artist Page:", artistName);
    openArtistPage(artistName, true);
}

function setupSearchListeners() {
    console.log("Setting up search listeners and pills...");

    const handleSearch = (inputElement) => {
        const query = inputElement.value.trim();
        console.log("Search triggered with query:", query);
        if (query) {
            searchTracks(query);
            inputElement.blur();
        } else {
            restoreDiscoverView();
        }
    };

    // Enter Key
    if (searchInputById) {
        searchInputById.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch(searchInputById);
        });
        // Clear search when empty
        searchInputById.addEventListener('input', (e) => {
            if (e.target.value.trim() === '') {
                restoreDiscoverView();
            }
        });
    }

    if (searchBoxInput && searchBoxInput !== searchInputById) {
        searchBoxInput.addEventListener('keypress', (e) => {
            if (e.key === 'Enter') handleSearch(searchBoxInput);
        });
        searchBoxInput.addEventListener('input', (e) => {
            if (e.target.value.trim() === '') {
                restoreDiscoverView();
            }
        });
    }

    // Click Icon
    if (searchIcon) {
        searchIcon.style.cursor = 'pointer';
        searchIcon.addEventListener('click', () => {
            const input = searchInputById || searchBoxInput;
            if (input) handleSearch(input);
        });
    }

    // Filter Pills Click Handler
    const pillsContainer = document.getElementById('searchFilterPills');
    if (pillsContainer) {
        pillsContainer.addEventListener('click', (e) => {
            const pill = e.target.closest('.filter-pill');
            if (!pill) return;

            // Remove active class from all pills
            pillsContainer.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
            pill.classList.add('active');

            // Update state & render
            state.activeSearchFilter = pill.dataset.filter;
            console.log("Active search filter:", state.activeSearchFilter);
            renderSearchResults();
        });
    }

    // Setup mood cards click handler
    document.querySelectorAll('.mood-card').forEach(card => {
        card.addEventListener('click', () => {
            const query = card.dataset.query;
            const input = document.getElementById('searchInput');
            if (input && query) {
                input.value = query;
                searchTracks(query);
            }
        });
    });
}

function restoreDiscoverView() {
    state.searchResults = null;
    const input = searchInputById || searchBoxInput;
    if (input) input.value = '';

    // Hide search details, show landing
    const pills = document.getElementById('searchFilterPills');
    if (pills) pills.style.display = 'none';

    const title = document.getElementById('resultsTitle');
    if (title) title.style.display = 'none';

    resultsContainer.innerHTML = '';
    
    const landing = document.getElementById('searchLandingSection');
    if (landing) landing.style.display = 'block';
    
    renderRecentSearches();
}

// --- Recent Searches Logic ---
function getRecentSearches() {
    try {
        const saved = localStorage.getItem('dora_recent_searches');
        return saved ? JSON.parse(saved) : [];
    } catch (e) {
        return [];
    }
}

function addRecentSearch(query) {
    if (!query) return;
    let searches = getRecentSearches();
    searches = searches.filter(s => s.toLowerCase() !== query.toLowerCase());
    searches.unshift(query);
    if (searches.length > 8) searches.pop();
    localStorage.setItem('dora_recent_searches', JSON.stringify(searches));
    renderRecentSearches();
}

function removeRecentSearch(query) {
    let searches = getRecentSearches();
    searches = searches.filter(s => s !== query);
    localStorage.setItem('dora_recent_searches', JSON.stringify(searches));
    renderRecentSearches();
}

function renderRecentSearches() {
    const container = document.getElementById('recentSearchesContainer');
    const list = document.getElementById('recentSearchesList');
    if (!container || !list) return;

    const searches = getRecentSearches();
    if (searches.length === 0) {
        container.style.display = 'none';
        return;
    }

    container.style.display = 'block';
    list.innerHTML = '';
    searches.forEach(query => {
        const item = document.createElement('div');
        item.className = 'recent-search-item';
        
        const textSpan = document.createElement('span');
        textSpan.textContent = query;
        textSpan.style.cursor = 'pointer';
        textSpan.onclick = () => {
            const input = document.getElementById('searchInput');
            if (input) {
                input.value = query;
                searchTracks(query);
            }
        };

        const removeIcon = document.createElement('span');
        removeIcon.className = 'remove-search';
        removeIcon.innerHTML = '<i class="fas fa-times"></i>';
        removeIcon.onclick = (e) => {
            e.stopPropagation();
            removeRecentSearch(query);
        };

        item.appendChild(textSpan);
        item.appendChild(removeIcon);
        list.appendChild(item);
    });
}

async function loadDiscoverPage(language = '') {
    showLoading(true);
    const discoverSection = document.getElementById('discoverSection');
    if (discoverSection) discoverSection.style.display = 'block';
    
    const pills = document.getElementById('searchFilterPills');
    if (pills) pills.style.display = 'none';

    const title = document.getElementById('resultsTitle');
    if (title) title.style.display = 'none';

    resultsContainer.innerHTML = '';

    try {
        const url = language && language !== 'all' ? `/api/discover?language=${encodeURIComponent(language)}` : '/api/discover';
        const response = await fetch(url);
        const data = await response.json();

        if (response.ok) {
            renderDiscoverArtists(data.top_artists);
            renderDiscoverSongs(data.trending_songs);
            renderDiscoverAlbums(data.featured_albums);
            renderDiscoverPlaylists(data.featured_playlists);
            
            // Phase 2c - Render New Releases
            if (data.new_releases) {
                renderDiscoverNewReleases(data.new_releases);
            }
        } else {
            showError('Failed to load discovery data');
        }
    } catch (error) {
        console.error("Discover error:", error);
        showError('Network error loading discovery dashboard');
    } finally {
        showLoading(false);
    }
}

function renderDiscoverNewReleases(songs) {
    const container = document.getElementById('discoverNewReleases');
    if (!container) return;
    displayResults(songs, container);
}

function renderDiscoverArtists(artists) {
    const container = document.getElementById('discoverArtists');
    if (!container) return;
    container.innerHTML = '';

    if (!artists || artists.length === 0) {
        container.innerHTML = '<p style="color: var(--text-secondary); padding: 1rem;">No artists available</p>';
        return;
    }

    artists.forEach(artist => {
        const card = document.createElement('div');
        card.className = 'artist-circle-card';
        card.innerHTML = `
            <div class="artist-image-container">
                <img src="${artist.image}" alt="${artist.name}" class="artist-image" onerror="this.src='/static/default-album.png'">
            </div>
            <span class="artist-name">${artist.name}</span>
        `;

        
        card.addEventListener('click', () => {
            if (artist.id && /^\d+$/.test(artist.id)) {
                openArtistPage(artist.id, false);
            } else {
                openArtistPage(artist.name, true);
            }
        });

        container.appendChild(card);
    });
}

function renderDiscoverSongs(songs) {
    const container = document.getElementById('discoverSongs');
    if (!container) return;
    displayResults(songs, container);
}

function renderDiscoverAlbums(albums) {
    const container = document.getElementById('discoverAlbums');
    if (!container) return;
    renderCompilationGrid(albums, container, 'album');
}

function renderDiscoverPlaylists(playlists) {
    const container = document.getElementById('discoverPlaylists');
    if (!container) return;
    renderCompilationGrid(playlists, container, 'playlist');
}

function renderCompilationGrid(items, container, type) {
    container.innerHTML = '';
    if (!items || items.length === 0) {
        container.innerHTML = `<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary); padding: 1rem;">No ${type}s found</p>`;
        return;
    }

    items.forEach(item => {
        const card = document.createElement('div');
        card.className = `${type}-card`;
        
        const subtitleHtml = item.artist 
            ? `<p class="artist-link">${item.artist}</p>` 
            : `<p>${item.description || ''}</p>`;

        card.innerHTML = `
            <div class="card-image-container">
                <span class="${type}-badge">${type}</span>
                <img src="${item.image}" alt="${item.name}" class="card-image">
                <div class="play-overlay">
                    <i class="fas fa-play-circle"></i>
                </div>
                <button class="queue-compilation-btn" title="Queue all tracks" style="position: absolute; top: 0.5rem; right: 0.5rem; background: rgba(0,0,0,0.7); border: none; color: var(--primary-color); width: 30px; height: 30px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 5; opacity: 0; transition: all 0.3s ease; transform: translateY(-5px);">
                    <i class="fas fa-list-ul"></i>
                </button>
            </div>
            <div class="card-info">
                <h3>${item.name}</h3>
                ${subtitleHtml}
            </div>
        `;

        card.addEventListener('click', (e) => {
            if (e.target.closest('.artist-link')) {
                e.stopPropagation();
                triggerArtistSearch(item.artist);
                return;
            }
            if (!e.target.closest('.queue-compilation-btn')) {
                playAlbumOrPlaylist(item.id, type, item.name);
            }
        });

        const queueCompBtn = card.querySelector('.queue-compilation-btn');
        if (queueCompBtn) {
            queueCompBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                queueAlbumOrPlaylist(item.id, type, item.name);
            });
        }

        container.appendChild(card);
    });
}

async function playAlbumOrPlaylist(id, type, name) {
    showToast(`Loading ${type}: ${name}...`, 'circle-notch');
    try {
        const endpoint = type === 'album' ? `/api/albums/${id}` : `/api/playlists/${id}`;
        const response = await fetch(endpoint);
        const tracks = await response.json();

        if (response.ok && tracks.length > 0) {
            showToast(`Queued ${tracks.length} tracks!`, 'list-ol');
            playPlaylist(tracks, 0);
        } else {
            showToast(`Could not fetch tracks for this ${type}`, 'times');
        }
    } catch (error) {
        console.error(`Error loading compilation:`, error);
        showToast('Connection error playing compilation', 'exclamation-triangle');
    }
}

async function searchTracks(query) {
    showLoading(true);
    resultsContainer.innerHTML = '';

    // Save to recent searches
    addRecentSearch(query);

    const landingSection = document.getElementById('searchLandingSection');
    if (landingSection) landingSection.style.display = 'none';

    const title = document.getElementById('resultsTitle');
    if (title) {
        title.innerHTML = `<i class="fas fa-search"></i> Search Results for "${query}"`;
        title.style.display = 'flex';
    }

    const pills = document.getElementById('searchFilterPills');
    if (pills) {
        pills.style.display = 'flex';
        // Reset filter tab to 'all' on new searches
        pills.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
        const allPill = pills.querySelector('[data-filter="all"]');
        if (allPill) allPill.classList.add('active');
    }
    state.activeSearchFilter = 'all';

    try {
        const response = await fetch(`/api/search/all?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (response.ok) {
            state.searchResults = data;
            renderSearchResults();
        } else {
            showError('Failed to retrieve search results');
        }
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

function renderSearchResults() {
    resultsContainer.innerHTML = '';
    
    if (!state.searchResults) {
        resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1;">Type a keyword to begin searching.</p>';
        return;
    }

    const { songs, albums, playlists, artists } = state.searchResults;
    const filter = state.activeSearchFilter;

    // Helper to display category header
    const createCategoryHeader = (titleText, filterKey) => {
        const header = document.createElement('div');
        header.className = 'category-header';
        header.innerHTML = `
            <h3>${titleText}</h3>
            <button class="view-all-link" data-target="${filterKey}">See All</button>
        `;
        
        header.querySelector('.view-all-link').addEventListener('click', () => {
            const pills = document.getElementById('searchFilterPills');
            if (pills) {
                pills.querySelectorAll('.filter-pill').forEach(p => p.classList.remove('active'));
                const targetPill = pills.querySelector(`[data-filter="${filterKey}"]`);
                if (targetPill) targetPill.classList.add('active');
            }
            state.activeSearchFilter = filterKey;
            renderSearchResults();
        });
        
        return header;
    };

    if (filter === 'all') {
        let hasResults = false;

        const sectionsOrder = state.searchResults.sectionsOrder || ['topQuery', 'songs', 'artists', 'albums', 'playlists'];

        sectionsOrder.forEach(section => {
            if (section === 'topQuery') {
                const topItems = state.searchResults.topQuery;
                if (topItems && topItems.length > 0) {
                    hasResults = true;
                    const item = topItems[0];
                    const sec = document.createElement('div');
                    sec.className = 'search-category-section';
                    
                    const header = document.createElement('div');
                    header.className = 'category-header';
                    header.innerHTML = `<h3><i class="fas fa-crown" style="color: gold; margin-right: 0.5rem;"></i> Top Result</h3>`;
                    sec.appendChild(header);

                    const card = document.createElement('div');
                    card.className = 'top-result-card';
                    
                    const isArtist = item.type === 'artist';
                    const imgClass = isArtist ? 'top-result-image artist-type' : 'top-result-image';
                    
                    let actionsHtml = '';
                    if (item.type === 'song') {
                        actionsHtml = `
                            <div class="top-result-actions">
                                <button class="top-result-play-btn">
                                    <i class="fas fa-play"></i> Play Now
                                </button>
                                <button class="top-result-icon-btn queue-btn-top" title="Add to Queue">
                                    <i class="fas fa-list-ul"></i>
                                </button>
                                <button class="top-result-icon-btn download-btn-top" title="Download">
                                    <i class="fas fa-download"></i>
                                </button>
                            </div>
                        `;
                    } else if (isArtist) {
                        actionsHtml = `
                            <div class="top-result-actions">
                                <button class="top-result-play-btn view-artist-btn-top">
                                    <i class="fas fa-user"></i> View Profile
                                </button>
                            </div>
                        `;
                    } else {
                        actionsHtml = `
                            <div class="top-result-actions">
                                <button class="top-result-play-btn play-compilation-btn-top">
                                    <i class="fas fa-play"></i> Play Compilation
                                </button>
                                <button class="top-result-icon-btn queue-compilation-btn-top" title="Queue All">
                                    <i class="fas fa-list-ul"></i>
                                </button>
                            </div>
                        `;
                    }

                    const badgeText = item.type.toUpperCase();
                    const subtitle = item.artist || item.description || (item.type === 'artist' ? 'Artist' : '');

                    card.innerHTML = `
                        <img src="${item.image}" alt="${item.name}" class="${imgClass}">
                        <div class="top-result-info">
                            <span class="top-result-badge"><i class="fas fa-sparkles"></i> ${badgeText} MATCH</span>
                            <h2 class="top-result-title">${item.name}</h2>
                            <p class="top-result-subtitle">${subtitle}</p>
                            ${actionsHtml}
                        </div>
                    `;

                    // Event handlers
                    card.addEventListener('click', (e) => {
                        if (e.target.closest('.top-result-actions')) return;
                        if (item.type === 'song') {
                            playTrack(item);
                        } else if (item.type === 'artist') {
                            if (item.id && /^\d+$/.test(item.id)) {
                                openArtistPage(item.id, false);
                            } else {
                                openArtistPage(item.name, true);
                            }
                        } else {
                            playAlbumOrPlaylist(item.id, item.type, item.name);
                        }
                    });

                    if (item.type === 'song') {
                        card.querySelector('.top-result-play-btn').addEventListener('click', () => {
                            playTrack(item);
                        });
                        card.querySelector('.queue-btn-top').addEventListener('click', (e) => {
                            e.stopPropagation();
                            addToQueue(item);
                        });
                        card.querySelector('.download-btn-top').addEventListener('click', (e) => {
                            e.stopPropagation();
                            downloadTrack(item);
                        });
                    } else if (isArtist) {
                        card.querySelector('.view-artist-btn-top').addEventListener('click', () => {
                            if (item.id && /^\d+$/.test(item.id)) {
                                openArtistPage(item.id, false);
                            } else {
                                openArtistPage(item.name, true);
                            }
                        });
                    } else {
                        card.querySelector('.play-compilation-btn-top').addEventListener('click', () => {
                            playAlbumOrPlaylist(item.id, item.type, item.name);
                        });
                        card.querySelector('.queue-compilation-btn-top').addEventListener('click', (e) => {
                            e.stopPropagation();
                            queueAlbumOrPlaylist(item.id, item.type, item.name);
                        });
                    }

                    sec.appendChild(card);
                    resultsContainer.appendChild(sec);
                }
            } else if (section === 'songs') {
                if (songs && songs.length > 0) {
                    hasResults = true;
                    const sec = document.createElement('div');
                    sec.className = 'search-category-section';
                    sec.appendChild(createCategoryHeader('Songs', 'songs'));
                    
                    const grid = document.createElement('div');
                    grid.className = 'results-grid';
                    displayResults(songs.slice(0, 5), grid);
                    sec.appendChild(grid);
                    resultsContainer.appendChild(sec);
                }
            } else if (section === 'artists') {
                if (artists && artists.length > 0) {
                    hasResults = true;
                    const sec = document.createElement('div');
                    sec.className = 'search-category-section';
                    sec.appendChild(createCategoryHeader('Artists', 'artists'));
                    
                    const grid = document.createElement('div');
                    grid.className = 'results-grid';
                    
                    artists.slice(0, 6).forEach(artist => {
                        const card = document.createElement('div');
                        card.className = 'artist-circle-card';
                        card.innerHTML = `
                            <div class="artist-image-container">
                                <img src="${artist.image}" alt="${artist.name}" class="artist-image">
                            </div>
                            <span class="artist-name">${artist.name}</span>
                        `;
                        card.addEventListener('click', () => {
                            if (artist.id && /^\d+$/.test(artist.id)) {
                                openArtistPage(artist.id, false);
                            } else {
                                openArtistPage(artist.name, true);
                            }
                        });
                        grid.appendChild(card);
                    });
                    
                    sec.appendChild(grid);
                    resultsContainer.appendChild(sec);
                }
            } else if (section === 'albums') {
                if (albums && albums.length > 0) {
                    hasResults = true;
                    const sec = document.createElement('div');
                    sec.className = 'search-category-section';
                    sec.appendChild(createCategoryHeader('Albums', 'albums'));
                    
                    const grid = document.createElement('div');
                    grid.className = 'results-grid';
                    renderCompilationGrid(albums.slice(0, 6), grid, 'album');
                    sec.appendChild(grid);
                    resultsContainer.appendChild(sec);
                }
            } else if (section === 'playlists') {
                if (playlists && playlists.length > 0) {
                    hasResults = true;
                    const sec = document.createElement('div');
                    sec.className = 'search-category-section';
                    sec.appendChild(createCategoryHeader('Playlists', 'playlists'));
                    
                    const grid = document.createElement('div');
                    grid.className = 'results-grid';
                    renderCompilationGrid(playlists.slice(0, 6), grid, 'playlist');
                    sec.appendChild(grid);
                    resultsContainer.appendChild(sec);
                }
            }
        });

        if (!hasResults) {
            resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1; padding: 2rem 0;">No results found across any category.</p>';
        }
    } else {
        // Specific view
        if (filter === 'songs') {
            displayResults(songs, resultsContainer);
        } else if (filter === 'albums') {
            renderCompilationGrid(albums, resultsContainer, 'album');
        } else if (filter === 'playlists') {
            renderCompilationGrid(playlists, resultsContainer, 'playlist');
        } else if (filter === 'artists') {
            if (!artists || artists.length === 0) {
                resultsContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1; padding: 2rem 0;">No matching artists found.</p>';
                return;
            }
            artists.forEach(artist => {
                const card = document.createElement('div');
                card.className = 'artist-circle-card';
                card.innerHTML = `
                    <div class="artist-image-container">
                        <img src="${artist.image}" alt="${artist.name}" class="artist-image">
                    </div>
                    <span class="artist-name">${artist.name}</span>
                `;
                card.addEventListener('click', () => {
                    if (artist.id && /^\d+$/.test(artist.id)) {
                        openArtistPage(artist.id, false);
                    } else {
                        openArtistPage(artist.name, true);
                    }
                });
                resultsContainer.appendChild(card);
            });
        }
    }
}

function displayResults(tracks, container) {
    container.innerHTML = '';
    if (!tracks || tracks.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1; padding: 1rem 0;">No results found</p>';
        return;
    }

    tracks.forEach(track => {
        const card = document.createElement('div');
        card.className = 'track-card';
        card.innerHTML = `
            <div class="track-image-container">
                <img src="${track.image}" alt="${track.name}" class="track-image">
                <div class="play-overlay">
                    <i class="fas fa-play-circle"></i>
                </div>
            </div>
            <div class="track-info">
                <h3>${track.name}</h3>
                <p class="artist-link">${track.artist}</p>
            </div>
            <button class="download-btn" title="Download">
                <i class="fas fa-download"></i>
            </button>
            <button class="queue-btn" title="Add to Queue">
                <i class="fas fa-list-ul"></i>
            </button>
            <button class="add-playlist-btn" title="Add to Playlist" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); border: none; color: #fff; width: 30px; height: 30px; border-radius: 50%; cursor: pointer;">
                <i class="fas fa-plus"></i>
            </button>
        `;

        // Click on card plays track (excluding buttons)
        card.addEventListener('click', (e) => {
            if (e.target.closest('.artist-link')) {
                e.stopPropagation();
                triggerArtistSearch(track.artist);
                return;
            }
            if (!e.target.closest('.download-btn') && !e.target.closest('.queue-btn') && !e.target.closest('.add-playlist-btn')) {
                playTrack(track);
            }
        });

        const downloadBtn = card.querySelector('.download-btn');
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            downloadTrack(track);
        });

        const queueBtn = card.querySelector('.queue-btn');
        if (queueBtn) {
            queueBtn.addEventListener('click', (e) => {
                e.stopPropagation();
                addToQueue(track);
            });
        }

        const addPlaylistBtn = card.querySelector('.add-playlist-btn');
        addPlaylistBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            showAddToPlaylistModal(track);
        });

        container.appendChild(card);
    });
}

function renderQueue() {
    queueContainer.innerHTML = '';
    if (state.currentPlaylist.length === 0) {
        queueContainer.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1;">Queue is empty</p>';
        return;
    }

    // Use similar logic to displayResults but for queue items
    state.currentPlaylist.forEach((track, index) => {
        const card = document.createElement('div');
        card.className = 'track-card';
        if (index === state.currentTrackIndex) {
            card.style.border = '1px solid var(--primary-color)';
            card.style.background = 'rgba(255, 255, 255, 0.2)';
        }

        card.innerHTML = `
            <div class="track-image-container">
                <img src="${track.image}" alt="${track.name}" class="track-image">
                <div class="play-overlay">
                    <i class="fas fa-play-circle"></i>
                </div>
            </div>
            <div class="track-info">
                <h3>${track.name}</h3>
                <p class="artist-link">${track.artist}</p>
            </div>
            <button class="delete-queue-btn" title="Remove from Queue" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); border: none; color: #ff5555; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center; z-index: 5;">
                <i class="fas fa-trash"></i>
            </button>
            ${index === state.currentTrackIndex ?
                '<div style="position: absolute; bottom: 10px; right: 10px; color: var(--primary-color); background: rgba(0,0,0,0.6); padding: 4px 10px; border-radius: 6px; font-size: 0.8rem; font-weight: 600; border: 1px solid var(--primary-color); z-index: 3;"><i class="fas fa-volume-up"></i> Playing</div>'
                : ''}
        `;

        card.addEventListener('click', (e) => {
            if (e.target.closest('.artist-link')) {
                e.stopPropagation();
                triggerArtistSearch(track.artist);
                return;
            }
            if (!e.target.closest('.delete-queue-btn')) {
                // Jump to that track in queue
                state.currentTrackIndex = index;
                playTrack(track, false);
            }
        });

        card.querySelector('.delete-queue-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            removeFromQueue(index);
        });

        queueContainer.appendChild(card);
    });
}

async function downloadTrack(track) {
    console.log("Attempting download for:", track.name, "ID:", track.id);
    if (!track.id) {
        console.error("Invalid track ID for download");
        showToast('Invalid track ID', 'times');
        return;
    }

    showToast(`Downloading: ${track.name}`, 'download');

    const quality = state.quality || '320kbps';

    // Create hidden link
    const link = document.createElement('a');
    link.href = `/api/download/${track.id}?quality=${quality}`;
    link.download = `${track.name}.mp3`;
    document.body.appendChild(link);
    console.log("Clicking download link:", link.href);
    link.click();
    document.body.removeChild(link);
}

// --- Player Logic ---

function playPlaylist(playlist, startIndex = 0) {
    // Clone to avoid reference issues if original playlist is modified later
    state.currentPlaylist = [...playlist];
    state.currentTrackIndex = startIndex;
    saveQueue(); // Persist the new queue

    // Play the specific track, but tell playTrack NOT to reset the queue (fromPlaylist=false)
    playTrack(state.currentPlaylist[state.currentTrackIndex], false);
}

async function playTrack(track, fromPlaylist = true) {
    let fullTrack = track;
    if (!track.play_url && (!track.downloadUrls || track.downloadUrls.length === 0)) {
        console.log(`Lazy-loading stream details for track: "${track.name}" (ID: ${track.id})`);
        try {
            const response = await fetch(`/api/songs/${track.id}`);
            const data = await response.json();
            if (response.ok && data) {
                fullTrack = data;
                if (fromPlaylist) {
                    state.currentPlaylist = [fullTrack];
                    state.currentTrackIndex = 0;
                } else {
                    const idx = state.currentPlaylist.findIndex(t => t.id === track.id);
                    if (idx !== -1) {
                        state.currentPlaylist[idx] = fullTrack;
                    }
                }
            } else {
                showToast('Failed to fetch stream details', 'exclamation-triangle');
                return;
            }
        } catch (error) {
            console.error("Error lazy loading track details:", error);
            showToast('Network error loading streams', 'exclamation-triangle');
            return;
        }
    }

    if (fromPlaylist) {
        state.currentPlaylist = [fullTrack];
        state.currentTrackIndex = 0;
    }

    saveQueue(); // Save state

    // Update UI
    player.trackName.textContent = fullTrack.name;
    player.artistName.textContent = fullTrack.artist;
    player.image.src = fullTrack.image;
    player.container.style.display = 'flex'; // Ensure visible

    // Update dynamic vibe badge
    const badge = document.getElementById('playerVibeBadge');
    if (badge) {
        if (fullTrack.mood && fullTrack.mood !== 'general') {
            let emoji = '🎵';
            if (fullTrack.mood === 'romantic') emoji = '💖';
            else if (fullTrack.mood === 'sad') emoji = '😢';
            else if (fullTrack.mood === 'dance') emoji = '🔥';
            
            badge.innerHTML = `<i class="fas fa-magic"></i> ${emoji} ${fullTrack.mood} Vibe`;
            badge.className = `vibe-badge ${fullTrack.mood}`;
            badge.style.display = 'inline-flex';
        } else {
            badge.style.display = 'none';
        }
    }

    // Select Audio Quality
    const selectedUrl = getUrlForQuality(fullTrack);

    if (!selectedUrl) {
        showError('Audio URL not available for this track');
        return;
    }

    // Apply recently played and continue listening history
    addToRecentlyPlayed(fullTrack);
    updateContinueListening(fullTrack);

    player.audio.crossOrigin = "anonymous";
    player.audio.src = selectedUrl;

    // Play
    try {
        if (state.crossfadeEnabled) {
            fadeIn(3);
        }
        await player.audio.play();
        state.isPlaying = true;
        updatePlayPauseIcon();
        player.image.classList.add('playing');
        updateLikeButton(fullTrack.id);

        // Sync visualizer
        setupVisualizer();

        // Sync lyrics
        loadLyricsForTrack(fullTrack);

        // Sync Now Playing Overlay
        syncNowPlayingOverlay(fullTrack);
    } catch (error) {
        console.error("Playback error", error);
    }
}

function getUrlForQuality(track) {
    // If backend provides downloadUrls (list), find best match
    if (track.downloadUrls && track.downloadUrls.length > 0) {
        // Simplify quality mapping: map preference to minimal bitrate
        const qualityMap = {
            '320kbps': 320,
            '160kbps': 160,
            '96kbps': 96,
            '48kbps': 48,
            '12kbps': 12
        };
        const targetBitrate = qualityMap[state.quality] || 320;

        // Find closest match or exact match
        // Available often: 12, 48, 96, 160, 320
        // We want the highest quality that is <= preference, OR just the specific one? 
        // Usually people want "At least X" or "Max X". Let's try to match exactly, then fallback.

        // Sort urls by bitrate (assuming quality string contains bitrate)
        // Format of quality in API often: "320kbps"
        const sortedUrls = track.downloadUrls.sort((a, b) => {
            const bitA = parseInt(a.quality) || 0;
            const bitB = parseInt(b.quality) || 0;
            return bitA - bitB;
        });

        // Find match
        let chosen = sortedUrls.find(u => u.quality.includes(String(targetBitrate)));

        if (!chosen) {
            // Fallback: Pick highest available
            chosen = sortedUrls[sortedUrls.length - 1];
        }

        return chosen ? chosen.url : track.play_url;
    }

    return track.play_url; // Fallback to safe default
}



let playbackHistory = [];

function playNextTrack() {
    if (state.repeatMode === 'one') {
        player.audio.currentTime = 0;
        player.audio.play();
        return;
    }

    if (state.shuffle && state.currentPlaylist.length > 1) {
        if (playbackHistory.length >= state.currentPlaylist.length) {
            playbackHistory = [];
        }
        
        let availableIndices = [];
        for (let i = 0; i < state.currentPlaylist.length; i++) {
            if (!playbackHistory.includes(i) && i !== state.currentTrackIndex) {
                availableIndices.push(i);
            }
        }
        
        if (availableIndices.length > 0) {
            const randomIndex = availableIndices[Math.floor(Math.random() * availableIndices.length)];
            playbackHistory.push(randomIndex);
            state.currentTrackIndex = randomIndex;
            playTrack(state.currentPlaylist[state.currentTrackIndex], false);
            return;
        }
    }

    if (state.currentTrackIndex < state.currentPlaylist.length - 1) {
        state.currentTrackIndex++;
        playbackHistory.push(state.currentTrackIndex);
        playTrack(state.currentPlaylist[state.currentTrackIndex], false);
    } else {
        if (state.repeatMode === 'all' && state.currentPlaylist.length > 0) {
            state.currentTrackIndex = 0;
            playbackHistory = [0];
            playTrack(state.currentPlaylist[0], false);
        } else {
            handleTrackEnd();
        }
    }
}

function playPrevTrack() {
    if (player.audio.currentTime > 2) {
        player.audio.currentTime = 0;
        return;
    }

    if (state.shuffle && playbackHistory.length > 1) {
        playbackHistory.pop();
        const prevIndex = playbackHistory.pop();
        if (prevIndex !== undefined) {
            state.currentTrackIndex = prevIndex;
            playbackHistory.push(prevIndex);
            playTrack(state.currentPlaylist[state.currentTrackIndex], false);
            return;
        }
    }

    if (state.currentTrackIndex > 0) {
        state.currentTrackIndex--;
        playTrack(state.currentPlaylist[state.currentTrackIndex], false);
    } else {
        player.audio.currentTime = 0;
    }
}

function setupPlayerListeners() {
    player.playPauseBtn.addEventListener('click', togglePlay);

    player.audio.addEventListener('timeupdate', updateProgress);
    player.audio.addEventListener('ended', () => {
        if (state.repeatMode === 'one') {
            player.audio.currentTime = 0;
            player.audio.play();
        } else {
            playNextTrack();
        }
    });
    player.seekSlider.addEventListener('input', seek);
    player.volumeSlider.addEventListener('input', updateVolume);

    player.nextBtn.addEventListener('click', playNextTrack);
    player.prevBtn.addEventListener('click', playPrevTrack);

    if (player.artistName) {
        player.artistName.addEventListener('click', () => {
            const artist = player.artistName.textContent.trim();
            if (artist && artist !== '-') {
                triggerArtistSearch(artist);
            }
        });
    }

    setupPlayerControlsAndOverlay();
}

function togglePlay() {
    if (player.audio.paused) {
        player.audio.play();
        state.isPlaying = true;
        player.image.classList.add('playing');
        toggleVisualizerCanvas(true);
    } else {
        player.audio.pause();
        state.isPlaying = false;
        player.image.classList.remove('playing');
        toggleVisualizerCanvas(false);
    }
    updatePlayPauseIcon();
}

function updatePlayPauseIcon() {
    player.playPauseBtn.innerHTML = state.isPlaying ?
        '<i class="fas fa-pause"></i>' :
        '<i class="fas fa-play"></i>';
}

function updateProgress() {
    const { currentTime, duration } = player.audio;
    if (isNaN(duration)) return;

    const progressPercent = (currentTime / duration) * 100;
    player.progressFill.style.width = `${progressPercent}%`;
    player.seekSlider.value = progressPercent;

    player.currentTime.textContent = formatTime(currentTime);
    player.duration.textContent = formatTime(duration);

    // Sync Now Playing Overlay progress elements
    const npSeekSlider = document.getElementById('npSeekSlider');
    const npProgress = document.getElementById('npProgress');
    const npCurrentTime = document.getElementById('npCurrentTime');
    const npDuration = document.getElementById('npDuration');
    
    if (npProgress) npProgress.style.width = `${progressPercent}%`;
    if (npSeekSlider) npSeekSlider.value = progressPercent;
    if (npCurrentTime) npCurrentTime.textContent = formatTime(currentTime);
    if (npDuration) npDuration.textContent = formatTime(duration);

    // Crossfade trigger
    if (state.crossfadeEnabled && !state.crossfadeTriggered && duration > 10 && (duration - currentTime) <= 3.5) {
        state.crossfadeTriggered = true;
        fadeOut(3, () => {
            playNextTrack();
        });
    }
}

function seek(e) {
    const percent = e.target.value;
    const duration = player.audio.duration;
    player.audio.currentTime = (percent / 100) * duration;
}

function updateVolume(e) {
    player.audio.volume = e.target.value / 100;
}

function formatTime(seconds) {
    const min = Math.floor(seconds / 60);
    const sec = Math.floor(seconds % 60);
    return `${min}:${sec.toString().padStart(2, '0')}`;
}

// --- Infinite Radio Logic (Next Track) ---

async function handleTrackEnd() {
    // Logic: Fetch Recommendations -> Play Smart
    const currentTrack = state.currentPlaylist[state.currentTrackIndex];
    if (!currentTrack) return;

    try {
        console.log("Fetching recommendations for radio...");
        const response = await fetch(`/api/recommendations/${currentTrack.id}`);
        const data = await response.json();

        if (response.ok && data.length > 0) {
            const currentMood = currentTrack.mood;
            console.log(`Infinite Radio: Current seed mood is '${currentMood}'`);

            // Strategy 1: Find completely new tracks (never played in this session)
            let candidates = data.filter(rec =>
                !state.currentPlaylist.some(played => played.id === rec.id)
            );

            // Strict Vibe/Mood Continuity Filter
            if (currentMood && currentMood !== 'general') {
                const moodCandidates = candidates.filter(rec => rec.mood === currentMood);
                if (moodCandidates.length > 0) {
                    console.log(`Infinite Radio Vibe Lock: Filtering to ${moodCandidates.length} new tracks matching '${currentMood}'`);
                    candidates = moodCandidates;
                } else {
                    // Try relaxing the session history but keep the mood
                    console.log(`Infinite Radio Vibe Lock: No unplayed mood matches. Checking all recommended tracks matching '${currentMood}'`);
                    const anyMoodMatches = data.filter(rec => rec.mood === currentMood && rec.id !== currentTrack.id);
                    if (anyMoodMatches.length > 0) {
                        candidates = anyMoodMatches;
                    } else {
                        console.log(`Infinite Radio Vibe Lock: No matching mood tracks found in recommendations. Falling back to general.`);
                    }
                }
            }

            // Strategy 2: If we ran out of candidates under current filters, relax filter using recent history
            if (candidates.length === 0) {
                console.log("No tracks found, relaxing history filter...");
                const recentHistoryIds = state.currentPlaylist.slice(-10).map(t => t.id);
                candidates = data.filter(rec => !recentHistoryIds.includes(rec.id));
                
                // Re-apply mood check on standard fallback if mood is active
                if (currentMood && currentMood !== 'general') {
                    const fallbackMoodMatches = candidates.filter(rec => rec.mood === currentMood);
                    if (fallbackMoodMatches.length > 0) {
                        candidates = fallbackMoodMatches;
                    }
                }
            }

            // Strategy 3: Last resort - just avoid the current track logic
            if (candidates.length === 0) {
                console.log("History full, avoiding current track only...");
                candidates = data.filter(rec => rec.id !== currentTrack.id);
            }

            // Pick a random track from the top 10 candidates to add variety
            const poolSize = Math.min(candidates.length, 10);
            const randomIndex = Math.floor(Math.random() * poolSize);
            const nextTrack = candidates[randomIndex] || candidates[0];

            if (nextTrack) {
                console.log(`Playing next: ${nextTrack.name} (Vibe: ${nextTrack.mood || 'general'})`);
                // Add to current playlist state
                state.currentPlaylist.push(nextTrack);
                state.currentTrackIndex++;
                saveQueue(); // Persist

                // Play it
                playTrack(nextTrack, false);
            }
        } else {
            console.log("No recommendations found.");
        }
    } catch (e) {
        console.error("Error fetching next track:", e);
    }
}

// --- Favorites ---

function toggleLike() {
    const currentTrack = state.currentPlaylist[state.currentTrackIndex];
    if (!currentTrack) return;

    const index = state.favorites.findIndex(t => t.id === currentTrack.id);

    if (index === -1) {
        state.favorites.push(currentTrack);
        player.likeBtn.classList.add('active');
        player.likeBtn.innerHTML = '<i class="fas fa-heart"></i>'; // Solid
    } else {
        state.favorites.splice(index, 1);
        player.likeBtn.classList.remove('active');
        player.likeBtn.innerHTML = '<i class="far fa-heart"></i>'; // Outline
    }

    localStorage.setItem('dora_favorites', JSON.stringify(state.favorites));
    if (views.favorites.classList.contains('active')) renderFavorites();
}

function updateLikeButton(trackId) {
    const isLiked = state.favorites.some(t => t.id === trackId);
    if (isLiked) {
        player.likeBtn.classList.add('active');
        player.likeBtn.innerHTML = '<i class="fas fa-heart"></i>';
    } else {
        player.likeBtn.classList.remove('active');
        player.likeBtn.innerHTML = '<i class="far fa-heart"></i>';
    }
}

function renderFavorites() {
    displayResults(state.favorites, favoritesContainer);

    // Toggle Download All Button
    const dlBtn = document.getElementById('downloadFavoritesBtn');
    if (dlBtn) {
        if (state.favorites.length > 0) {
            dlBtn.style.display = 'flex';
        } else {
            dlBtn.style.display = 'none';
        }
    }
}

// Setup Download Favorites Listener
const downloadFavoritesBtn = document.getElementById('downloadFavoritesBtn');
if (downloadFavoritesBtn) {
    downloadFavoritesBtn.addEventListener('click', () => {
        if (state.favorites.length === 0) return;

        // Reuse existing modal logic (similar to playlist download)
        downloadCountSpan.textContent = state.favorites.length;
        downloadConfirmModal.classList.add('active');

        const handleConfirm = () => {
            showToast(`Starting download of ${state.favorites.length} favorites...`, 'layer-group');
            downloadAll(state.favorites);
            downloadConfirmModal.classList.remove('active');
            cleanup();
        };

        const handleClose = () => {
            downloadConfirmModal.classList.remove('active');
            cleanup();
        }

        const cleanup = () => {
            confirmDownloadBtn.removeEventListener('click', handleConfirm);
            cancelDownloadBtn.removeEventListener('click', handleClose);
            closeDownloadModal.removeEventListener('click', handleClose);
            downloadConfirmModal.removeEventListener('click', outsideClick);
        }

        const outsideClick = (e) => {
            if (e.target === downloadConfirmModal) handleClose();
        };

        confirmDownloadBtn.addEventListener('click', handleConfirm);
        cancelDownloadBtn.addEventListener('click', handleClose);
        closeDownloadModal.addEventListener('click', handleClose);
        downloadConfirmModal.addEventListener('click', outsideClick);
    });
}

// --- Settings ---


function setupSettings() {
    const cards = document.querySelectorAll('.quality-card');

    // Init active state
    cards.forEach(card => {
        if (card.dataset.value === state.quality) {
            card.classList.add('active');
        } else {
            card.classList.remove('active');
        }

        // Click listener
        card.addEventListener('click', () => {
            // Update state
            state.quality = card.dataset.value;
            localStorage.setItem('dora_quality', state.quality);
            showToast(`Quality set to ${state.quality}`, 'sliders-h');

            // Update UI
            cards.forEach(c => c.classList.remove('active'));
            card.classList.add('active');
        });
    });
}

// --- Playlists Logic ---

let trackToAddToPlaylist = null;

function setupPlaylists() {
    // Nav
    nav.playlists.addEventListener('click', () => {
        switchView('playlists');
        renderPlaylists();
    });

    // Create New from Playlists View
    document.getElementById('createPlaylistBtn').addEventListener('click', () => {
        const name = prompt("Enter playlist name:");
        if (name) createPlaylist(name);
    });

    // Create New from Modal
    confirmCreatePlaylist.addEventListener('click', () => {
        const name = newPlaylistName.value.trim();
        if (name) {
            createPlaylist(name);
            newPlaylistName.value = '';
            renderPlaylistOptions(); // Refresh list in modal
        }
    });

    // Close Modal listeners
    closePlaylistModal.addEventListener('click', () => addToPlaylistModal.classList.remove('active'));
    window.addEventListener('click', (e) => {
        if (e.target === addToPlaylistModal) addToPlaylistModal.classList.remove('active');
    });
}

function createPlaylist(name) {
    if (state.playlists[name]) {
        showToast("Playlist already exists!", 'exclamation-triangle');
        return;
    }
    state.playlists[name] = [];
    savePlaylists();
    renderPlaylists();
    showToast(`Playlist "${name}" created`, 'check');
}

function savePlaylists() {
    localStorage.setItem('dora_playlists', JSON.stringify(state.playlists));
}

function renderPlaylists() {
    playlistsContainer.innerHTML = '';
    playlistTracksContainer.style.display = 'none';
    playlistsContainer.style.display = 'grid';

    // Render smart mood-based playlists at the top of playlists view
    renderSmartPlaylists();

    const names = Object.keys(state.playlists);
    if (names.length === 0) {
        playlistsContainer.innerHTML = '<p style="grid-column: 1/-1; text-align: center; color: var(--text-secondary);">No playlists yet. Create one!</p>';
        return;
    }

    names.forEach(name => {
        const folder = document.createElement('div');
        folder.className = 'track-card'; // Reuse style

        const trackCount = state.playlists[name].length;
        const firstTrack = trackCount > 0 ? state.playlists[name][0] : null;

        let imageHtml = `
            <div class="track-image-container" style="background: rgba(255,255,255,0.1); display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-music" style="font-size: 3rem; color: var(--text-secondary);"></i>
            </div>
        `;

        if (firstTrack && firstTrack.image) {
            imageHtml = `
                 <div class="track-image-container">
                    <img src="${firstTrack.image}" alt="${name}" class="track-image playlist-mosaic-img">
                    <div class="play-overlay">
                        <i class="fas fa-play-circle"></i>
                    </div>
                </div>
            `;
        }

        folder.innerHTML = `
            ${imageHtml}
            <div class="track-info">
                <h3>${name}</h3>
                <p>${trackCount} tracks</p>
            </div>
            <button class="delete-btn" title="Delete Playlist" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); border: none; color: #ff5555; width: 30px; height: 30px; border-radius: 50%; cursor: pointer; display: flex; align-items: center; justify-content: center;">
                <i class="fas fa-trash"></i>
            </button>
        `;

        // Generate Playlist Mosaic Cover if 4 or more tracks
        if (trackCount >= 4) {
            createPlaylistMosaic(state.playlists[name], (dataUrl) => {
                const imgElem = folder.querySelector('.playlist-mosaic-img');
                if (imgElem && dataUrl) {
                    imgElem.src = dataUrl;
                }
            });
        }

        // Open Playlist
        folder.addEventListener('click', (e) => {
            if (!e.target.closest('.delete-btn')) {
                openPlaylist(name);
            }
        });

        // Delete Playlist
        folder.querySelector('.delete-btn').addEventListener('click', (e) => {
            e.stopPropagation();
            if (confirm(`Delete playlist "${name}"?`)) {
                delete state.playlists[name];
                savePlaylists();
                renderPlaylists();
            }
        });

        playlistsContainer.appendChild(folder);
    });
}

function openPlaylist(name) {
    playlistsContainer.style.display = 'none';
    playlistTracksContainer.style.display = 'grid';

    // Create Header for Playlist View
    const header = document.createElement('div');
    header.style.gridColumn = '1/-1';
    header.style.display = 'flex';
    header.style.justifyContent = 'space-between';
    header.style.alignItems = 'center';
    header.style.marginBottom = '1rem';

    header.innerHTML = `
        <div style="display: flex; align-items: center; gap: 1rem;">
            <button id="backToPlaylists" class="nav-btn active" style="padding: 0.5rem 1rem;">
                <i class="fas fa-arrow-left"></i> Back
            </button>
            <h2 style="margin: 0;">${name}</h2>
        </div>
        <div style="display: flex; gap: 0.75rem;">
            <button id="exportPlaylistBtn" class="nav-btn" style="padding: 0.5rem 1rem;" title="Export playlist to JSON">
                <i class="fas fa-file-export"></i> Export
            </button>
            <button id="downloadAllBtn" class="primary-action-btn">
                <i class="fas fa-download"></i> Download All
            </button>
        </div>
    `;

    // Clear previous content but adding header first
    playlistTracksContainer.innerHTML = '';
    playlistTracksContainer.appendChild(header);

    // Logic for Back Button
    header.querySelector('#backToPlaylists').addEventListener('click', () => {
        renderPlaylists();
    });

    // Logic for Export Playlist
    header.querySelector('#exportPlaylistBtn').addEventListener('click', () => {
        exportPlaylistData(name, state.playlists[name]);
    });

    // Logic for Download All
    const tracks = state.playlists[name];
    header.querySelector('#downloadAllBtn').addEventListener('click', () => {
        if (tracks.length === 0) return;

        // Show Custom Modal
        downloadCountSpan.textContent = tracks.length;
        downloadConfirmModal.classList.add('active');

        // Setup One-time listener for confirm
        const handleConfirm = () => {
            showToast(`Starting download of ${tracks.length} tracks...`, 'layer-group');
            downloadAll(tracks);
            downloadConfirmModal.classList.remove('active');
            cleanup();
        };

        const handleClose = () => {
            downloadConfirmModal.classList.remove('active');
            cleanup();
        };

        const cleanup = () => {
            confirmDownloadBtn.removeEventListener('click', handleConfirm);
            cancelDownloadBtn.removeEventListener('click', handleClose);
            closeDownloadModal.removeEventListener('click', handleClose);
            downloadConfirmModal.removeEventListener('click', outsideClick);
        };

        const outsideClick = (e) => {
            if (e.target === downloadConfirmModal) handleClose();
        };

        confirmDownloadBtn.addEventListener('click', handleConfirm);
        cancelDownloadBtn.addEventListener('click', handleClose);
        closeDownloadModal.addEventListener('click', handleClose);
        downloadConfirmModal.addEventListener('click', outsideClick);
    });

    // Display Tracks (Append after header)
    if (tracks.length === 0) {
        const msg = document.createElement('p');
        msg.style.gridColumn = '1/-1';
        msg.style.textAlign = 'center';
        msg.style.color = 'var(--text-secondary)';
        msg.textContent = 'Empty playlist';
        playlistTracksContainer.appendChild(msg);
    } else {
        // We can't use displayResults directly because it clears innerHTML
        // So we reuse the card creation logic manually or modify displayResults to append
        // Let's iterate and append manually to be safe and simple
        tracks.forEach(track => {
            const card = document.createElement('div');
            card.className = 'track-card';
            card.innerHTML = `
                <div class="track-image-container">
                    <img src="${track.image}" alt="${track.name}" class="track-image">
                    <div class="play-overlay">
                        <i class="fas fa-play-circle"></i>
                    </div>
                </div>
                <div class="track-info">
                    <h3>${track.name}</h3>
                    <p class="artist-link">${track.artist}</p>
                </div>
                <!-- Buttons same as usual -->
                <button class="download-btn" title="Download">
                    <i class="fas fa-download"></i>
                </button>
                <button class="queue-btn" title="Add to Queue">
                    <i class="fas fa-list-ul"></i>
                </button>
                <button class="delete-from-playlist-btn" title="Remove" style="position: absolute; top: 10px; right: 10px; background: rgba(0,0,0,0.6); border: none; color: #ff5555; width: 30px; height: 30px; border-radius: 50%; cursor: pointer;">
                    <i class="fas fa-times"></i>
                </button>
            `;

            card.addEventListener('click', (e) => {
                if (e.target.closest('.artist-link')) {
                    e.stopPropagation();
                    triggerArtistSearch(track.artist);
                    return;
                }
                if (!e.target.closest('button')) {
                    // Play this playlist starting from this track
                    const startIdx = tracks.findIndex(t => t.id === track.id);
                    if (startIdx !== -1) {
                        playPlaylist(tracks, startIdx);
                    }
                }
            });

            card.querySelector('.download-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                downloadTrack(track);
            });

            card.querySelector('.queue-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                addToQueue(track);
            });

            // Remove from playlist
            card.querySelector('.delete-from-playlist-btn').addEventListener('click', (e) => {
                e.stopPropagation();
                removeFromPlaylist(name, track);
            });

            playlistTracksContainer.appendChild(card);
        });
    }
}

function removeFromPlaylist(playlistName, track) {
    const idx = state.playlists[playlistName].findIndex(t => t.id === track.id);
    if (idx !== -1) {
        state.playlists[playlistName].splice(idx, 1);
        savePlaylists();
        openPlaylist(playlistName); // Re-render
    }
}

async function downloadAll(tracks) {
    let delay = 0;
    for (const track of tracks) {
        // Stagger downloads to prevent browser blocking or freezing
        setTimeout(() => {
            downloadTrack(track);
        }, delay);
        delay += 1500; // 1.5s delay between starts
    }
}

function showAddToPlaylistModal(track) {
    trackToAddToPlaylist = track;

    // Smart Add: Check if only 1 playlist exists
    const playlistNames = Object.keys(state.playlists);
    if (playlistNames.length === 1) {
        const onlyPlaylist = playlistNames[0];
        console.log(`Smart Add: Automatically adding to "${onlyPlaylist}"`);
        addToPlaylist(onlyPlaylist, track);
        return;
    }

    renderPlaylistOptions();
    addToPlaylistModal.classList.add('active');
}

function renderPlaylistOptions() {
    playlistList.innerHTML = '';
    const names = Object.keys(state.playlists);

    if (names.length === 0) {
        playlistList.innerHTML = '<p style="text-align:center; padding: 10px; color: var(--text-secondary);">No playlists found</p>';
        return;
    }

    names.forEach(name => {
        const li = document.createElement('li');

        // Icon
        const icon = document.createElement('i');
        icon.className = 'fas fa-music';

        // Name
        const text = document.createElement('span');
        text.textContent = name;

        // Count
        const count = document.createElement('small');
        count.style.marginLeft = 'auto';
        count.style.color = 'var(--text-secondary)';
        count.textContent = `${state.playlists[name].length} songs`;

        li.appendChild(icon);
        li.appendChild(text);
        li.appendChild(count);

        // Event Listener
        li.addEventListener('click', () => {
            addToPlaylist(name, trackToAddToPlaylist);
            // addToPlaylistModal.classList.remove('active') is handled in addToPlaylist
        });

        playlistList.appendChild(li);
    });
}

function addToPlaylist(playlistName, track) {
    if (!state.playlists[playlistName].some(t => t.id === track.id)) {
        state.playlists[playlistName].push(track);
        savePlaylists();
        showToast(`Added to ${playlistName}`, 'check');
        addToPlaylistModal.classList.remove('active');
    } else {
        showToast('Track already in playlist', 'exclamation-circle');
    }
}

// --- Queue Controls ---

function addToQueue(track) {
    state.currentPlaylist.push(track);
    saveQueue();
    showToast(`"${track.name}" added to queue`, 'list-ul');
    
    // Playback Idle Smart-Start: If player is idle or queue was empty, start playing
    if (state.currentTrackIndex === -1 || state.currentPlaylist.length === 1) {
        state.currentTrackIndex = state.currentPlaylist.length - 1;
        playTrack(track, false);
    } else if (views.queue.classList.contains('active')) {
        renderQueue();
    }
}

async function queueAlbumOrPlaylist(id, type, name) {
    showToast(`Queueing ${type}: ${name}...`, 'circle-notch');
    try {
        const endpoint = type === 'album' ? `/api/albums/${id}` : `/api/playlists/${id}`;
        const response = await fetch(endpoint);
        const tracks = await response.json();

        if (response.ok && tracks.length > 0) {
            const wasIdle = (state.currentTrackIndex === -1 || state.currentPlaylist.length === 0);
            
            tracks.forEach(track => {
                state.currentPlaylist.push(track);
            });
            saveQueue();
            
            showToast(`Queued ${tracks.length} tracks from "${name}"`, 'list-ul');
            
            if (wasIdle) {
                state.currentTrackIndex = state.currentPlaylist.length - tracks.length;
                playTrack(state.currentPlaylist[state.currentTrackIndex], false);
            } else if (views.queue.classList.contains('active')) {
                renderQueue();
            }
        } else {
            showToast(`Could not fetch tracks for this ${type}`, 'times');
        }
    } catch (error) {
        console.error(`Error queueing compilation:`, error);
        showToast('Connection error queueing compilation', 'exclamation-triangle');
    }
}

function removeFromQueue(index) {
    if (index < 0 || index >= state.currentPlaylist.length) return;
    
    const wasPlaying = (index === state.currentTrackIndex);
    
    state.currentPlaylist.splice(index, 1);
    
    if (state.currentPlaylist.length === 0) {
        state.currentTrackIndex = -1;
        player.audio.pause();
        state.isPlaying = false;
        player.container.style.display = 'none';
    } else {
        if (wasPlaying) {
            if (state.currentTrackIndex >= state.currentPlaylist.length) {
                state.currentTrackIndex = state.currentPlaylist.length - 1;
            }
            playTrack(state.currentPlaylist[state.currentTrackIndex], false);
        } else if (index < state.currentTrackIndex) {
            state.currentTrackIndex--;
        }
    }
    
    saveQueue();
    renderQueue();
    showToast('Removed from Queue', 'trash');
}

// --- Dedicated Artist Profile Controller ---

async function openArtistPage(artistIdOrName, isName = false) {
    showLoading(true);
    switchView('artist');

    try {
        let artistId = artistIdOrName;
        
        if (isName) {
            console.log(`Resolving artist name: "${artistIdOrName}"`);
            const resSearch = await fetch(`/api/search/artists?query=${encodeURIComponent(artistIdOrName)}`);
            const searchResults = await resSearch.json();
            
            if (resSearch.ok && searchResults.length > 0) {
                artistId = searchResults[0].id;
                console.log(`Resolved "${artistIdOrName}" to ID: ${artistId}`);
            } else {
                showToast(`Could not find artist profile for "${artistIdOrName}"`, 'exclamation-triangle');
                switchView('search');
                return;
            }
        }

        console.log(`Fetching profile for artist ID: ${artistId}`);
        const response = await fetch(`/api/artists/${artistId}`);
        const artist = await response.json();

        if (response.ok && artist) {
            document.getElementById('artistAvatar').src = artist.image || '/static/default-album.png';
            document.getElementById('artistHeaderName').textContent = artist.name;
            
            let followers = parseInt(artist.follower_count) || 0;
            let formattedFollowers = followers > 1000000 
                ? (followers / 1000000).toFixed(1) + 'M' 
                : followers > 1000 
                    ? (followers / 1000).toFixed(1) + 'K' 
                    : followers;
            document.getElementById('artistFollowers').innerHTML = `<i class="fas fa-users"></i> ${formattedFollowers} Followers`;
            
            document.getElementById('artistBio').textContent = artist.bio || 'Verified artist on Dora Music. Explore their absolute top tracks and albums below.';

            const songsContainer = document.getElementById('artistSongs');
            const albumsContainer = document.getElementById('artistAlbums');
            
            displayResults(artist.top_songs, songsContainer);
            renderCompilationGrid(artist.top_albums, albumsContainer, 'album');

            // Setup Artist Radio Button
            const radioBtn = document.getElementById('artistRadioBtn');
            if (radioBtn) {
                radioBtn.onclick = () => {
                    if (artist.top_songs && artist.top_songs.length > 0) {
                        showToast(`🎵 Artist Radio started for ${artist.name}`, 'broadcast-tower');
                        playPlaylist(artist.top_songs, 0);
                    } else {
                        showToast('No tracks found to start Artist Radio', 'exclamation-triangle');
                    }
                };
            }
        } else {
            showToast('Failed to load artist details', 'times');
            switchView('search');
        }
    } catch (error) {
        console.error("Error opening artist profile:", error);
        showToast('Network error loading artist profile', 'exclamation-triangle');
        switchView('search');
    } finally {
        showLoading(false);
    }
}

// --- Persistence ---

function saveQueue() {
    localStorage.setItem('dora_queue', JSON.stringify(state.currentPlaylist));
    localStorage.setItem('dora_queue_index', state.currentTrackIndex);
}

function restorePlayerState() {
    if (state.currentPlaylist.length > 0 && state.currentTrackIndex >= 0 && state.currentTrackIndex < state.currentPlaylist.length) {
        const track = state.currentPlaylist[state.currentTrackIndex];

        player.trackName.textContent = track.name;
        player.artistName.textContent = track.artist;
        player.image.src = track.image;
        player.container.style.display = 'flex';

        const selectedUrl = getUrlForQuality(track);
        if (selectedUrl) {
            player.audio.crossOrigin = "anonymous";
            player.audio.src = selectedUrl;
        }

        updateLikeButton(track.id);
        console.log("Player state restored:", track.name);
    }
}

// --- Helpers ---
const toastContainer = document.getElementById('toast-container');

function showToast(message, icon = 'info-circle') {
    const toast = document.createElement('div');
    toast.className = 'toast';
    toast.innerHTML = `<i class="fas fa-${icon}"></i> ${message}`;

    toastContainer.appendChild(toast);

    // Trigger animation
    requestAnimationFrame(() => {
        toast.classList.add('show');
    });

    // Remove after 3s
    setTimeout(() => {
        toast.classList.remove('show');
        setTimeout(() => toast.remove(), 300);
    }, 3000);
}

function showLoading(show) {
    if (show) loading.classList.add('active');
    else loading.classList.remove('active');
}

function showError(msg) {
    console.error(msg);
    // Could add toast notification here
}

// --- Keyboard Shortcuts ---

function setupKeyboardShortcuts() {
    const hintBtn = document.getElementById('shortcutsHintBtn');
    const modal = document.getElementById('shortcutsModal');
    const closeBtn = document.getElementById('closeShortcutsModal');
    
    if (hintBtn && modal) {
        hintBtn.addEventListener('click', () => {
            modal.classList.add('active');
            modal.style.setProperty('display', 'flex', 'important');
        });
    }
    if (closeBtn && modal) {
        closeBtn.addEventListener('click', () => {
            modal.classList.remove('active');
            modal.style.setProperty('display', 'none', 'important');
        });
    }

    document.addEventListener('keydown', (e) => {
        // Ignore if typing in an input
        if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

        // Space: Play/Pause
        if (e.code === 'Space') {
            e.preventDefault(); // Prevent scroll
            togglePlay();
        }

        // Left: Seek -5s
        if (e.code === 'ArrowLeft') {
            e.preventDefault();
            if (player.audio.duration) {
                player.audio.currentTime = Math.max(0, player.audio.currentTime - 5);
            }
        }

        // Right: Seek +5s
        if (e.code === 'ArrowRight') {
            e.preventDefault();
            if (player.audio.duration) {
                player.audio.currentTime = Math.min(player.audio.duration, player.audio.currentTime + 5);
            }
        }

        // Up: Volume +10%
        if (e.code === 'ArrowUp') {
            e.preventDefault();
            const newVol = Math.min(1, player.audio.volume + 0.1);
            player.audio.volume = newVol;
            player.volumeSlider.value = newVol * 100;
        }

        // Down: Volume -10%
        if (e.code === 'ArrowDown') {
            e.preventDefault();
            const newVol = Math.max(0, player.audio.volume - 0.1);
            player.audio.volume = newVol;
            player.volumeSlider.value = newVol * 100;
        }

        // L: Like
        if (e.key === 'l' || e.key === 'L') {
            toggleLike();
        }

        // S: Shuffle
        if (e.key === 's' || e.key === 'S') {
            const shuffleBtn = document.getElementById('shuffleButton') || document.getElementById('npShuffleBtn');
            if (shuffleBtn) shuffleBtn.click();
        }

        // R: Repeat
        if (e.key === 'r' || e.key === 'R') {
            const repeatBtn = document.getElementById('repeatButton') || document.getElementById('npRepeatBtn');
            if (repeatBtn) repeatBtn.click();
        }

        // N: Next
        if (e.key === 'n' || e.key === 'N') {
            playNextTrack();
        }

        // P: Prev
        if (e.key === 'p' || e.key === 'P') {
            playPrevTrack();
        }

        // T: Cycle sleep timer
        if (e.key === 't' || e.key === 'T') {
            cycleSleepTimer();
        }

        // ?: Open shortcuts modal
        if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
            if (modal) {
                modal.classList.add('active');
                modal.style.setProperty('display', 'flex', 'important');
            }
        }

        // Esc: Close active modals/panels
        if (e.key === 'Escape') {
            if (modal) {
                modal.classList.remove('active');
                modal.style.setProperty('display', 'none', 'important');
            }
            closeNowPlayingOverlay();
            const lyricsPanel = document.getElementById('lyricsPanel');
            if (lyricsPanel) {
                lyricsPanel.classList.remove('active');
                const lyricsBtn = document.getElementById('lyricsBtn');
                if (lyricsBtn) lyricsBtn.classList.remove('active');
            }
        }
    });
}

// --- Expandable Player ---
function setupExpandablePlayer() {
    const player = document.getElementById('musicPlayer');

    player.addEventListener('click', (e) => {
        // Only toggle if window is small (mobile)
        if (window.innerWidth > 768) return;

        // Prevent expansion if clicking controls or sliders
        const isControl = e.target.closest('button') || e.target.closest('input') || e.target.closest('.close-expand-btn');
        if (isControl) return;

        player.classList.toggle('expanded');

        // Add/Remove close button if expanded
        if (player.classList.contains('expanded')) {
            if (!document.querySelector('.close-expand-btn')) {
                const closeBtn = document.createElement('button');
                closeBtn.className = 'close-expand-btn';
                closeBtn.innerHTML = '<i class="fas fa-chevron-down"></i>';
                closeBtn.onclick = (ev) => {
                    ev.stopPropagation();
                    player.classList.remove('expanded');
                    closeBtn.remove();
                };
                // Prepend to be at top
                player.insertBefore(closeBtn, player.firstChild);
            }
        } else {
            const btn = document.querySelector('.close-expand-btn');
            if (btn) btn.remove();
        }
    });
}

// --- Web Audio, Crossfade, Theme, Visualizer, Sleep Timer, Lyrics, suggestions & Premium Layout Functions ---

// --- Web Audio Context & Crossfade Transition Nodes ---
let audioCtx = null;
let analyser = null;
let source = null;
let gainNode = null;

function initAudioContext() {
    if (audioCtx) return;
    try {
        const AudioContextClass = window.AudioContext || window.webkitAudioContext;
        audioCtx = new AudioContextClass();
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 256;
        
        // Connect to HTML5 audio element
        source = audioCtx.createMediaElementSource(player.audio);
        gainNode = audioCtx.createGain();
        
        source.connect(gainNode);
        gainNode.connect(analyser);
        analyser.connect(audioCtx.destination);
    } catch (e) {
        console.error("Web Audio API not supported or blocked:", e);
    }
}

function fadeIn(duration = 3) {
    initAudioContext();
    if (gainNode && audioCtx) {
        const now = audioCtx.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(0, now);
        gainNode.gain.linearRampToValueAtTime(1, now + duration);
    } else {
        // Fallback if Web Audio API fails
        player.audio.volume = 0;
        let vol = 0;
        const interval = setInterval(() => {
            vol += 0.05;
            if (vol >= 1) {
                player.audio.volume = 1;
                clearInterval(interval);
            } else {
                player.audio.volume = vol;
            }
        }, (duration * 1000) / 20);
    }
}

function fadeOut(duration = 3, callback) {
    initAudioContext();
    if (gainNode && audioCtx) {
        const now = audioCtx.currentTime;
        gainNode.gain.cancelScheduledValues(now);
        gainNode.gain.setValueAtTime(gainNode.gain.value, now);
        gainNode.gain.linearRampToValueAtTime(0, now + duration);
        setTimeout(() => {
            if (callback) callback();
        }, duration * 1000);
    } else {
        // Fallback
        let vol = player.audio.volume;
        const interval = setInterval(() => {
            vol -= 0.05;
            if (vol <= 0) {
                player.audio.volume = 0;
                clearInterval(interval);
                if (callback) callback();
            } else {
                player.audio.volume = vol;
            }
        }, (duration * 1000) / 20);
    }
}

// --- Symmetric Audio Visualizer ---
let visualizerAnimationId = null;

function setupVisualizer() {
    const canvas = document.getElementById('visualizerCanvas');
    if (!canvas) return;
    
    initAudioContext();
    if (!analyser) return;

    toggleVisualizerCanvas(true);
    const ctx = canvas.getContext('2d');
    
    // Resize handler
    function resizeCanvas() {
        canvas.width = window.innerWidth;
        canvas.height = 80; // Keep space elegant
    }
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    
    if (visualizerAnimationId) {
        cancelAnimationFrame(visualizerAnimationId);
    }
    
    function draw() {
        visualizerAnimationId = requestAnimationFrame(draw);
        
        if (!state.isPlaying) {
            ctx.clearRect(0, 0, canvas.width, canvas.height);
            return;
        }
        
        analyser.getByteFrequencyData(dataArray);
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        
        // Get dynamically loaded theme colors
        const style = getComputedStyle(document.documentElement);
        const primaryColor = style.getPropertyValue('--primary-color').trim() || '#f6d365';
        
        const barWidth = 6;
        const barGap = 4;
        const totalBarWidth = barWidth + barGap;
        const numBars = Math.min(Math.floor(canvas.width / totalBarWidth), 120);
        
        const centerX = canvas.width / 2;
        
        for (let i = 0; i < numBars; i++) {
            // Symmetry: draw from center outwards
            const freqIndex = Math.floor((i / numBars) * (bufferLength * 0.6));
            const val = dataArray[freqIndex] || 0;
            const percent = val / 255;
            const barHeight = percent * canvas.height * 0.8;
            
            ctx.fillStyle = primaryColor;
            
            const xRight = centerX + (i * totalBarWidth);
            const xLeft = centerX - (i * totalBarWidth) - barWidth;
            const y = canvas.height - barHeight;
            
            drawRoundedRect(ctx, xRight, y, barWidth, barHeight, 3);
            drawRoundedRect(ctx, xLeft, y, barWidth, barHeight, 3);
        }
    }
    
    draw();
}

function drawRoundedRect(ctx, x, y, width, height, radius) {
    if (height < 2) return;
    ctx.beginPath();
    ctx.moveTo(x + radius, y);
    ctx.lineTo(x + width - radius, y);
    ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
    ctx.lineTo(x + width, y + height);
    ctx.lineTo(x, y + height);
    ctx.lineTo(x, y + radius);
    ctx.quadraticCurveTo(x, y, x + radius, y);
    ctx.closePath();
    ctx.fill();
}

function toggleVisualizerCanvas(show) {
    const canvas = document.getElementById('visualizerCanvas');
    if (canvas) {
        canvas.style.display = show ? 'block' : 'none';
    }
}

// --- Player Controls & Now-Playing Overlay Desktop ---

function setupPlayerControlsAndOverlay() {
    console.log("Setting up player controls and overlay...");

    const shuffleBtns = [document.getElementById('shuffleButton'), document.getElementById('npShuffleBtn')];
    const repeatBtns = [document.getElementById('repeatButton'), document.getElementById('npRepeatBtn')];

    // Initialize toggle states
    updateShuffleUI();
    updateRepeatUI();

    shuffleBtns.forEach(btn => {
        if (!btn) return;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            state.shuffle = !state.shuffle;
            localStorage.setItem('dora_shuffle', state.shuffle);
            updateShuffleUI();
            showToast(state.shuffle ? "Shuffle Enabled" : "Shuffle Disabled", "random");
        });
    });

    repeatBtns.forEach(btn => {
        if (!btn) return;
        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            cycleRepeatMode();
        });
    });

    const npPlayPauseBtn = document.getElementById('npPlayPauseBtn');
    if (npPlayPauseBtn) {
        npPlayPauseBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePlay();
        });
    }

    const npPrevBtn = document.getElementById('npPrevBtn');
    if (npPrevBtn) {
        npPrevBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            playPrevTrack();
        });
    }

    const npNextBtn = document.getElementById('npNextBtn');
    if (npNextBtn) {
        npNextBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            playNextTrack();
        });
    }

    const npLikeBtn = document.getElementById('npLikeBtn');
    if (npLikeBtn) {
        npLikeBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            toggleLike();
            const currentTrack = state.currentPlaylist[state.currentTrackIndex];
            if (currentTrack) syncNowPlayingOverlay(currentTrack);
        });
    }

    const npAddBtn = document.getElementById('npAddBtn');
    if (npAddBtn) {
        npAddBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            const track = state.currentPlaylist[state.currentTrackIndex];
            if (track) {
                showAddToPlaylistModal(track);
            }
        });
    }

    // Now Playing click image handler to expand overlay on desktop
    const playerImage = document.getElementById('playerImage');
    if (playerImage) {
        playerImage.addEventListener('click', (e) => {
            if (window.innerWidth > 768) {
                openNowPlayingOverlay();
            }
        });
    }

    const closeNowPlaying = document.getElementById('closeNowPlaying');
    if (closeNowPlaying) {
        closeNowPlaying.addEventListener('click', () => {
            closeNowPlayingOverlay();
        });
    }

    const npSeekSlider = document.getElementById('npSeekSlider');
    if (npSeekSlider) {
        npSeekSlider.addEventListener('input', seek);
    }
}

function updateShuffleUI() {
    const shuffleBtns = [document.getElementById('shuffleButton'), document.getElementById('npShuffleBtn')];
    shuffleBtns.forEach(btn => {
        if (!btn) return;
        if (state.shuffle) {
            btn.classList.add('active');
        } else {
            btn.classList.remove('active');
        }
    });
}

function cycleRepeatMode() {
    if (state.repeatMode === 'off') {
        state.repeatMode = 'all';
    } else if (state.repeatMode === 'all') {
        state.repeatMode = 'one';
    } else {
        state.repeatMode = 'off';
    }
    localStorage.setItem('dora_repeat', state.repeatMode);
    updateRepeatUI();
    showToast(`Repeat Mode: ${state.repeatMode.toUpperCase()}`, "redo");
}

function updateRepeatUI() {
    const repeatBtns = [document.getElementById('repeatButton'), document.getElementById('npRepeatBtn')];
    repeatBtns.forEach(btn => {
        if (!btn) return;
        btn.classList.remove('active', 'repeat-one', 'repeat-all');
        
        const icon = btn.querySelector('i');
        if (icon) {
            icon.className = 'fas fa-redo';
        }
        
        if (state.repeatMode === 'one') {
            btn.classList.add('active', 'repeat-one');
            if (icon) icon.className = 'fas fa-redo-alt';
            btn.title = "Repeat One (R)";
        } else if (state.repeatMode === 'all') {
            btn.classList.add('active', 'repeat-all');
            btn.title = "Repeat All (R)";
        } else {
            btn.title = "Repeat Off (R)";
        }
    });
}

function openNowPlayingOverlay() {
    const overlay = document.getElementById('nowPlayingOverlay');
    if (overlay) {
        overlay.classList.add('active');
        const track = state.currentPlaylist[state.currentTrackIndex];
        if (track) {
            syncNowPlayingOverlay(track);
        }
    }
}

function closeNowPlayingOverlay() {
    const overlay = document.getElementById('nowPlayingOverlay');
    if (overlay) {
        overlay.classList.remove('active');
    }
}

function syncNowPlayingOverlay(track) {
    const npAlbumArt = document.getElementById('npAlbumArt');
    const npTrackName = document.getElementById('npTrackName');
    const npArtistName = document.getElementById('npArtistName');
    const nowPlayingBg = document.getElementById('nowPlayingBg');
    const npLikeBtn = document.getElementById('npLikeBtn');
    
    if (npAlbumArt) npAlbumArt.src = track.image || '/static/default-album.png';
    if (npTrackName) npTrackName.textContent = track.name;
    if (npArtistName) npArtistName.textContent = track.artist;
    
    if (nowPlayingBg) {
        nowPlayingBg.style.backgroundImage = `url('${track.image || '/static/default-album.png'}')`;
    }
    
    if (npLikeBtn) {
        const isLiked = state.favorites.some(t => t.id === track.id);
        if (isLiked) {
            npLikeBtn.classList.add('active');
            npLikeBtn.innerHTML = '<i class="fas fa-heart"></i>';
        } else {
            npLikeBtn.classList.remove('active');
            npLikeBtn.innerHTML = '<i class="far fa-heart"></i>';
        }
    }
}

// --- Autocomplete Search Suggestions ---

function setupAutocompleteSearch() {
    const searchInput = document.getElementById('searchInput') || document.querySelector('.search-box input');
    const autocompleteDropdown = document.getElementById('autocompleteDropdown');
    
    if (!searchInput || !autocompleteDropdown) return;
    
    let debounceTimeout = null;
    
    searchInput.addEventListener('input', (e) => {
        const query = e.target.value.trim();
        
        if (debounceTimeout) clearTimeout(debounceTimeout);
        
        if (!query) {
            autocompleteDropdown.style.display = 'none';
            autocompleteDropdown.innerHTML = '';
            return;
        }
        
        debounceTimeout = setTimeout(async () => {
            try {
                const response = await fetch(`/api/search/all?query=${encodeURIComponent(query)}`);
                const data = await response.json();
                
                if (response.ok && data) {
                    renderAutocompleteDropdown(data);
                }
            } catch (err) {
                console.error("Autocomplete search error:", err);
            }
        }, 300);
    });
    
    document.addEventListener('click', (e) => {
        if (!searchInput.contains(e.target) && !autocompleteDropdown.contains(e.target)) {
            autocompleteDropdown.style.display = 'none';
        }
    });
    
    searchInput.addEventListener('keydown', (e) => {
        if (e.key === 'Escape') {
            autocompleteDropdown.style.display = 'none';
        }
    });
}

function renderAutocompleteDropdown(data) {
    const autocompleteDropdown = document.getElementById('autocompleteDropdown');
    if (!autocompleteDropdown) return;
    
    autocompleteDropdown.innerHTML = '';
    
    const songs = data.songs || [];
    const artists = data.artists || [];
    
    const items = [];
    songs.slice(0, 3).forEach(s => items.push({ ...s, type: 'song' }));
    artists.slice(0, 3).forEach(a => items.push({ ...a, type: 'artist' }));
    
    if (items.length === 0) {
        autocompleteDropdown.style.display = 'none';
        return;
    }
    
    autocompleteDropdown.style.display = 'block';
    
    items.forEach(item => {
        const row = document.createElement('div');
        row.className = 'autocomplete-item';
        
        const img = document.createElement('img');
        img.src = item.image || '/static/default-album.png';
        img.onerror = () => img.src = '/static/default-album.png';
        if (item.type === 'artist') img.style.borderRadius = '50%';
        
        const details = document.createElement('div');
        details.className = 'autocomplete-info';
        
        const title = document.createElement('span');
        title.className = 'autocomplete-name';
        title.textContent = item.name;
        
        const meta = document.createElement('span');
        meta.className = 'autocomplete-meta';
        meta.textContent = item.type === 'song' ? `Song • ${item.artist}` : 'Artist';
        
        details.appendChild(title);
        details.appendChild(meta);
        row.appendChild(img);
        row.appendChild(details);
        
        row.addEventListener('click', () => {
            autocompleteDropdown.style.display = 'none';
            const searchInput = document.getElementById('searchInput') || document.querySelector('.search-box input');
            if (searchInput) searchInput.value = '';
            
            if (item.type === 'song') {
                playTrack(item);
            } else {
                if (item.id && /^\d+$/.test(item.id)) {
                    openArtistPage(item.id, false);
                } else {
                    openArtistPage(item.name, true);
                }
            }
        });
        
        autocompleteDropdown.appendChild(row);
    });
}

// --- Sleep Timer Badge & Cycles ---
let sleepTimerInterval = null;
let sleepTimeRemaining = 0;

function setupSleepTimer() {
    const sleepTimerBtn = document.getElementById('sleepTimerBtn');
    if (sleepTimerBtn) {
        sleepTimerBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            cycleSleepTimer();
        });
    }
}

function cycleSleepTimer() {
    if (sleepTimeRemaining === 0) {
        startSleepTimer(15 * 60);
    } else if (sleepTimeRemaining === 15 * 60) {
        startSleepTimer(30 * 60);
    } else if (sleepTimeRemaining === 30 * 60) {
        startSleepTimer(60 * 60);
    } else {
        stopSleepTimer();
    }
}

function startSleepTimer(durationSeconds) {
    stopSleepTimer();
    sleepTimeRemaining = durationSeconds;
    
    showToast(`Sleep timer set for ${durationSeconds / 60} minutes`, "moon");
    updateSleepTimerBadge();
    
    sleepTimerInterval = setInterval(() => {
        sleepTimeRemaining--;
        updateSleepTimerBadge();
        if (sleepTimeRemaining <= 0) {
            triggerSleepTimerEnd();
        }
    }, 1000);
}

function stopSleepTimer() {
    if (sleepTimerInterval) {
        clearInterval(sleepTimerInterval);
        sleepTimerInterval = null;
    }
    sleepTimeRemaining = 0;
    updateSleepTimerBadge();
}

function updateSleepTimerBadge() {
    const badge = document.getElementById('sleepTimerBadge');
    const sleepTimerBtn = document.getElementById('sleepTimerBtn');
    
    if (!badge) return;
    
    if (sleepTimeRemaining > 0) {
        const mins = Math.floor(sleepTimeRemaining / 60);
        const secs = sleepTimeRemaining % 60;
        badge.textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
        badge.style.display = 'inline-flex';
        if (sleepTimerBtn) sleepTimerBtn.classList.add('active');
    } else {
        badge.style.display = 'none';
        if (sleepTimerBtn) sleepTimerBtn.classList.remove('active');
    }
}

function triggerSleepTimerEnd() {
    stopSleepTimer();
    if (state.isPlaying) {
        togglePlay();
    }
    showToast("🎵 Sleep timer expired. Sweet Dreams!", "moon");
}

// --- Lyrics Sliding Panel ---

function cleanSongTitle(title) {
    if (!title) return '';
    return title
        .replace(/\(feat\..*?\)/gi, '')
        .replace(/\[.*?\]/g, '')
        .replace(/\(.*?\)/g, '')
        .replace(/-.*?mix/gi, '')
        .replace(/remix/gi, '')
        .replace(/\s+/g, ' ')
        .trim();
}

function setupLyrics() {
    const lyricsBtn = document.getElementById('lyricsBtn');
    const lyricsPanel = document.getElementById('lyricsPanel');
    const closeLyricsBtn = document.getElementById('closeLyricsBtn');
    
    if (lyricsBtn && lyricsPanel) {
        lyricsBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            lyricsPanel.classList.toggle('active');
            lyricsBtn.classList.toggle('active');
            
            const currentTrack = state.currentPlaylist[state.currentTrackIndex];
            if (lyricsPanel.classList.contains('active') && currentTrack) {
                loadLyricsForTrack(currentTrack);
            }
        });
    }
    
    if (closeLyricsBtn && lyricsPanel) {
        closeLyricsBtn.addEventListener('click', () => {
            lyricsPanel.classList.remove('active');
            if (lyricsBtn) lyricsBtn.classList.remove('active');
        });
    }
}

async function loadLyricsForTrack(track) {
    const lyricsContent = document.getElementById('lyricsContent');
    const npLyricsContent = document.getElementById('npLyricsContent');
    
    if (!lyricsContent && !npLyricsContent) return;
    
    const placeholder = `<p class="lyrics-placeholder"><i class="fas fa-sync fa-spin"></i> Loading lyrics...</p>`;
    if (lyricsContent) lyricsContent.innerHTML = placeholder;
    if (npLyricsContent) npLyricsContent.innerHTML = placeholder;
    
    try {
        const cleanTitle = cleanSongTitle(track.name);
        const cleanArtist = track.artist.split(',')[0].trim();
        
        console.log(`Fetching lyrics for: "${cleanArtist}" - "${cleanTitle}"`);
        const response = await fetch(`/api/lyrics?artist=${encodeURIComponent(cleanArtist)}&title=${encodeURIComponent(cleanTitle)}`);
        const data = await response.json();
        
        if (response.ok && data.success && data.lyrics) {
            const formattedLyrics = data.lyrics.replace(/\n/g, '<br>');
            const lyricsHtml = `<div class="lyrics-text">${formattedLyrics}</div>`;
            
            if (lyricsContent) lyricsContent.innerHTML = lyricsHtml;
            if (npLyricsContent) npLyricsContent.innerHTML = lyricsHtml;
        } else {
            const noLyrics = `<p class="lyrics-placeholder"><i class="fas fa-comment-slash"></i> Lyrics not available for this track.</p>`;
            if (lyricsContent) lyricsContent.innerHTML = noLyrics;
            if (npLyricsContent) npLyricsContent.innerHTML = noLyrics;
        }
    } catch (e) {
        console.error("Error loading lyrics:", e);
        const errorHtml = `<p class="lyrics-placeholder"><i class="fas fa-exclamation-triangle"></i> Error loading lyrics.</p>`;
        if (lyricsContent) lyricsContent.innerHTML = errorHtml;
        if (npLyricsContent) npLyricsContent.innerHTML = errorHtml;
    }
}

// --- Recently Played & Continue Listening rows ---

function addToRecentlyPlayed(track) {
    if (!track) return;
    try {
        let recentlyPlayed = JSON.parse(localStorage.getItem('dora_recently_played')) || [];
        recentlyPlayed = recentlyPlayed.filter(t => t.id !== track.id);
        recentlyPlayed.unshift(track);
        
        if (recentlyPlayed.length > 20) {
            recentlyPlayed.pop();
        }
        
        localStorage.setItem('dora_recently_played', JSON.stringify(recentlyPlayed));
        renderRecentlyPlayed();
    } catch (e) {
        console.error("Error saving recently played:", e);
    }
}

function renderRecentlyPlayed() {
    const container = document.getElementById('recentlyPlayedContainer');
    const section = document.getElementById('recentlyPlayedSection');
    
    if (!container || !section) return;
    
    const recentlyPlayed = JSON.parse(localStorage.getItem('dora_recently_played')) || [];
    
    if (recentlyPlayed.length === 0) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    container.innerHTML = '';
    
    recentlyPlayed.forEach(track => {
        const card = document.createElement('div');
        card.className = 'track-card recent-track-card';
        card.style.flex = '0 0 auto';
        card.style.width = '160px';
        
        card.innerHTML = `
            <div class="track-image-container">
                <img src="${track.image}" alt="${track.name}" class="track-image" onerror="this.src='/static/default-album.png'">
                <div class="play-overlay">
                    <i class="fas fa-play-circle"></i>
                </div>
            </div>
            <div class="track-info">
                <h3 style="font-size:0.9rem">${track.name}</h3>
                <p style="font-size:0.75rem" class="artist-link">${track.artist}</p>
            </div>
        `;
        
        card.addEventListener('click', (e) => {
            if (e.target.closest('.artist-link')) {
                e.stopPropagation();
                triggerArtistSearch(track.artist);
                return;
            }
            playTrack(track);
        });
        
        container.appendChild(card);
    });
}

function updateContinueListening(track) {
    if (!track) return;
    try {
        localStorage.setItem('dora_continue_track', JSON.stringify(track));
        renderContinueListening();
    } catch (e) {
        console.error("Error saving continue listening track:", e);
    }
}

function renderContinueListening() {
    const container = document.getElementById('continueListeningContainer');
    const section = document.getElementById('continueListeningSection');
    
    if (!container || !section) return;
    
    const continueTrack = JSON.parse(localStorage.getItem('dora_continue_track'));
    
    if (!continueTrack) {
        section.style.display = 'none';
        return;
    }
    
    section.style.display = 'block';
    container.innerHTML = '';
    
    const card = document.createElement('div');
    card.className = 'track-card recent-track-card continue-card';
    card.style.display = 'flex';
    card.style.alignItems = 'center';
    card.style.gap = '1rem';
    card.style.width = '100%';
    card.style.maxWidth = '450px';
    card.style.padding = '0.75rem';
    
    card.innerHTML = `
        <img src="${continueTrack.image}" alt="${continueTrack.name}" style="width: 50px; height: 50px; border-radius: 8px; object-fit: cover;">
        <div class="track-info" style="flex:1">
            <h3 style="font-size:0.95rem;margin:0">${continueTrack.name}</h3>
            <p style="font-size:0.8rem;margin:0" class="artist-link">${continueTrack.artist}</p>
        </div>
        <button class="primary-action-btn resume-listening-btn" style="padding: 0.4rem 1rem; font-size: 0.8rem; width: auto;">
            <i class="fas fa-play"></i> Resume
        </button>
    `;
    
    card.querySelector('.resume-listening-btn').addEventListener('click', (e) => {
        e.stopPropagation();
        playTrack(continueTrack);
    });
    
    card.addEventListener('click', (e) => {
        if (e.target.closest('.artist-link')) {
            e.stopPropagation();
            triggerArtistSearch(continueTrack.artist);
            return;
        }
        playTrack(continueTrack);
    });
    
    container.appendChild(card);
}

// --- Theme Switcher & Accents ---

function setupTheme() {
    const dots = document.querySelectorAll('.theme-dot');
    const savedTheme = localStorage.getItem('dora_theme') || 'gold';
    
    document.documentElement.setAttribute('data-theme', savedTheme);
    
    dots.forEach(dot => {
        const theme = dot.dataset.theme;
        if (theme === savedTheme) {
            dot.classList.add('active');
        } else {
            dot.classList.remove('active');
        }
        
        dot.addEventListener('click', (e) => {
            e.stopPropagation();
            const targetTheme = dot.dataset.theme;
            document.documentElement.setAttribute('data-theme', targetTheme);
            localStorage.setItem('dora_theme', targetTheme);
            
            dots.forEach(d => d.classList.remove('active'));
            dot.classList.add('active');
            
            showToast(`Theme changed to ${targetTheme.toUpperCase()}`, "palette");
            
            if (state.isPlaying) {
                setupVisualizer();
            }
        });
    });
}

// --- Language Switcher ---

function setupLanguageTabs() {
    const languageTabs = document.getElementById('languageTabs');
    if (!languageTabs) return;
    
    languageTabs.addEventListener('click', (e) => {
        const tab = e.target.closest('.lang-tab');
        if (!tab) return;
        
        languageTabs.querySelectorAll('.lang-tab').forEach(t => t.classList.remove('active'));
        tab.classList.add('active');
        
        const lang = tab.dataset.lang;
        console.log(`Language selected: ${lang}`);
        loadDiscoverPage(lang);
    });
}

// --- Import / Export Playlists ---

function setupPlaylistImportExport() {
    const importBtn = document.getElementById('importPlaylistBtn');
    const importInput = document.getElementById('importPlaylistInput');
    
    if (importBtn && importInput) {
        importBtn.addEventListener('click', () => {
            importInput.click();
        });
        
        importInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;
            
            const reader = new FileReader();
            reader.onload = (event) => {
                try {
                    const data = JSON.parse(event.target.result);
                    if (data && data.name && Array.isArray(data.tracks)) {
                        importPlaylistData(data.name, data.tracks);
                    } else {
                        showToast("Invalid playlist JSON format", "exclamation-triangle");
                    }
                } catch (err) {
                    console.error("Import error:", err);
                    showToast("Failed to parse playlist file", "exclamation-triangle");
                }
                importInput.value = '';
            };
            reader.readAsText(file);
        });
    }
}

function importPlaylistData(name, tracks) {
    if (!state.playlists[name]) {
        state.playlists[name] = [];
    }
    
    let addedCount = 0;
    tracks.forEach(track => {
        if (!state.playlists[name].some(t => t.id === track.id)) {
            state.playlists[name].push(track);
            addedCount++;
        }
    });
    
    savePlaylists();
    renderPlaylists();
    showToast(`Imported "${name}": added ${addedCount} new songs`, "check");
}

function exportPlaylistData(name, tracks) {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify({ name, tracks }));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", `${name.replace(/\s+/g, '_')}_playlist.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
    showToast(`Exported "${name}" successfully`, "check");
}

// --- Playlist Mosaic Covers & Canvas Drawing ---

function createPlaylistMosaic(playlist, callback) {
    if (!playlist || playlist.length < 4) {
        if (callback) callback(null);
        return;
    }
    
    const canvas = document.createElement('canvas');
    canvas.width = 200;
    canvas.height = 200;
    const ctx = canvas.getContext('2d');
    
    const imagesToLoad = playlist.slice(0, 4);
    let loadedCount = 0;
    const canvasImages = [];
    
    imagesToLoad.forEach((track, index) => {
        const img = new Image();
        img.crossOrigin = 'Anonymous';
        img.src = track.image || '/static/default-album.png';
        img.onload = () => {
            canvasImages[index] = img;
            loadedCount++;
            if (loadedCount === 4) {
                ctx.drawImage(canvasImages[0], 0, 0, 100, 100);
                ctx.drawImage(canvasImages[1], 100, 0, 100, 100);
                ctx.drawImage(canvasImages[2], 0, 100, 100, 100);
                ctx.drawImage(canvasImages[3], 100, 100, 100, 100);
                
                try {
                    const dataUrl = canvas.toDataURL('image/png');
                    if (callback) callback(dataUrl);
                } catch (e) {
                    console.error("Canvas mosaic tainted error:", e);
                    if (callback) callback(null);
                }
            }
        };
        img.onerror = () => {
            const fallback = new Image();
            fallback.src = '/static/default-album.png';
            fallback.onload = () => {
                canvasImages[index] = fallback;
                loadedCount++;
                if (loadedCount === 4) {
                    ctx.drawImage(canvasImages[0], 0, 0, 100, 100);
                    ctx.drawImage(canvasImages[1], 100, 0, 100, 100);
                    ctx.drawImage(canvasImages[2], 0, 100, 100, 100);
                    ctx.drawImage(canvasImages[3], 100, 100, 100, 100);
                    const dataUrl = canvas.toDataURL('image/png');
                    if (callback) callback(dataUrl);
                }
            };
        };
    });
}

// --- Smart Mood-based Playlists ---

function renderSmartPlaylists() {
    const smartContainer = document.getElementById('smartPlaylistsContainer');
    if (!smartContainer) return;
    
    smartContainer.innerHTML = '';
    
    const romanticTracks = state.favorites.filter(t => t.mood === 'romantic');
    const danceTracks = state.favorites.filter(t => t.mood === 'dance');
    const sadTracks = state.favorites.filter(t => t.mood === 'sad');
    
    const smartPlaylists = [
        {
            name: "💖 My Romantic Mix",
            tracks: romanticTracks,
            moodClass: "romantic",
            icon: "fa-heart"
        },
        {
            name: "🔥 Dance Hits",
            tracks: danceTracks,
            moodClass: "dance",
            icon: "fa-fire"
        },
        {
            name: "😢 Feeling Blue",
            tracks: sadTracks,
            moodClass: "sad",
            icon: "fa-tint"
        }
    ];
    
    const activePlaylists = smartPlaylists.filter(sp => sp.tracks.length > 0);
    
    if (activePlaylists.length === 0) {
        smartContainer.style.display = 'none';
        return;
    }
    
    smartContainer.style.display = 'grid';
    
    activePlaylists.forEach(sp => {
        const card = document.createElement('div');
        card.className = `smart-playlist-card ${sp.moodClass}`;
        
        card.innerHTML = `
            <div class="smart-playlist-icon">
                <i class="fas ${sp.icon}"></i>
            </div>
            <div class="smart-playlist-info">
                <span class="smart-playlist-name">${sp.name}</span>
                <span class="smart-playlist-count">${sp.tracks.length} songs</span>
            </div>
        `;
        
        card.addEventListener('click', () => {
            state.playlists[sp.name] = sp.tracks;
            openPlaylist(sp.name);
        });
        
        smartContainer.appendChild(card);
    });
}

// --- Crossfade Controller ---
function setupCrossfade() {
    const crossfadeToggle = document.getElementById('crossfadeToggle');
    if (crossfadeToggle) {
        crossfadeToggle.checked = state.crossfadeEnabled;
        crossfadeToggle.addEventListener('change', (e) => {
            state.crossfadeEnabled = e.target.checked;
            localStorage.setItem('dora_crossfade', JSON.stringify(state.crossfadeEnabled));
            showToast(state.crossfadeEnabled ? "Crossfade Enabled" : "Crossfade Disabled", "sliders-h");
        });
    }
}

document.addEventListener('DOMContentLoaded', init);