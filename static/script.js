// State Management
const state = {
    currentPlaylist: [],
    currentTrackIndex: -1,
    favorites: JSON.parse(localStorage.getItem('dora_favorites')) || [],
    quality: localStorage.getItem('dora_quality') || '320kbps',
    isPlaying: false
};

// DOM Elements
const views = {
    search: document.getElementById('searchView'),
    favorites: document.getElementById('favoritesView'),
    queue: document.getElementById('queueView')
};

const nav = {
    search: document.getElementById('navSearch'),
    favorites: document.getElementById('navFavorites'),
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
const loading = document.getElementById('loading');
const settingsModal = document.getElementById('settingsModal');

// --- Initialization ---

function init() {
    setupNavigation();
    setupPlayerListeners();
    setupSearchListeners();
    setupSettings();
    renderFavorites();
}

// --- Navigation ---

function setupNavigation() {
    nav.search.addEventListener('click', () => switchView('search'));
    nav.favorites.addEventListener('click', () => switchView('favorites'));
    nav.queue.addEventListener('click', () => switchView('queue'));

    // Settings Modal
    nav.settings.addEventListener('click', () => settingsModal.classList.add('active'));
    document.querySelector('.close-modal').addEventListener('click', () => settingsModal.classList.remove('active'));
    settingsModal.addEventListener('click', (e) => {
        if (e.target === settingsModal) settingsModal.classList.remove('active');
    });
}

function switchView(viewName) {
    // Update Nav
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    if (nav[viewName]) nav[viewName].classList.add('active');

    // Update View
    document.querySelectorAll('.view-section').forEach(view => view.classList.remove('active'));
    views[viewName].classList.add('active');

    if (viewName === 'favorites') {
        renderFavorites();
    } else if (viewName === 'queue') {
        renderQueue();
    }
}

// --- Search ---

function setupSearchListeners() {
    searchBoxInput.addEventListener('keypress', (e) => {
        if (e.key === 'Enter') {
            const query = searchBoxInput.value.trim();
            if (query) searchTracks(query);
        }
    });
}

async function searchTracks(query) {
    showLoading(true);
    resultsContainer.innerHTML = '';

    try {
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();

        if (response.ok) {
            displayResults(data, resultsContainer);
        } else {
            showError('Failed to search tracks');
        }
    } catch (error) {
        showError(error.message);
    } finally {
        showLoading(false);
    }
}

function displayResults(tracks, container) {
    container.innerHTML = '';
    if (!tracks || tracks.length === 0) {
        container.innerHTML = '<p style="text-align: center; color: var(--text-secondary); grid-column: 1/-1;">No results found</p>';
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
                <p>${track.artist}</p>
            </div>
            <button class="download-btn" title="Download">
                <i class="fas fa-download"></i>
            </button>
        `;

        // Click on card plays track (excluding download button)
        card.addEventListener('click', (e) => {
            if (!e.target.closest('.download-btn')) {
                playTrack(track);
            }
        });

        const downloadBtn = card.querySelector('.download-btn');
        downloadBtn.addEventListener('click', (e) => {
            e.stopPropagation();
            downloadTrack(track);
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
                <p>${track.artist}</p>
            </div>
            ${index === state.currentTrackIndex ?
                '<div style="position: absolute; top: 10px; right: 10px; color: var(--primary-color); background: rgba(0,0,0,0.5); padding: 2px 8px; border-radius: 4px; font-size: 0.8rem;">Playing</div>'
                : ''}
        `;

        card.addEventListener('click', () => {
            // Jump to that track in queue
            state.currentTrackIndex = index;
            playTrack(track, false);
        });
        queueContainer.appendChild(card);
    });
}

async function downloadTrack(track) {
    const selectedUrl = getUrlForQuality(track);
    if (!selectedUrl) {
        showError('Download URL not available');
        return;
    }

    // Create a temporary link to trigger download directly if possible
    // Or use the backend proxy if CORS is an issue. The old app used /api/download/<id>
    // Let's use the backend proxy to be safe and consistent with previous app, 
    // but we need to pass the quality URL or letting backend decide?
    // The backend /api/download/<id> fetches fresh details. 
    // If we want to use the *exact* quality we selected in frontend, we should probably pass the URL to backend?
    // Or just pass the quality preference to backend.

    // Simplest approach: Update backend to accept quality query param
    // Frontend:
    const quality = state.quality;

    // Create hidden link
    const link = document.createElement('a');
    link.href = `/api/download/${track.id}?quality=${quality}`;
    link.download = `${track.name}.mp3`; // Backend handles content-disposition usually
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// --- Player Logic ---

async function playTrack(track, fromPlaylist = true) {
    // If it's a new track from search (not next/prev), update playlist context
    if (fromPlaylist) {
        // We aren't maintaining a full queue efficiently yet, just single playback from click
        // For infinite radio, 'currentPlaylist' matters less than 'currentTrack'
        state.currentPlaylist = [track];
        state.currentTrackIndex = 0;
    }

    // Update UI
    player.trackName.textContent = track.name;
    player.artistName.textContent = track.artist;
    player.image.src = track.image;
    player.container.style.display = 'flex'; // Ensure visible

    // Select Audio Quality
    const selectedUrl = getUrlForQuality(track);

    if (!selectedUrl) {
        showError('Audio URL not available for this track');
        return;
    }

    player.audio.src = selectedUrl;

    // Play
    try {
        await player.audio.play();
        state.isPlaying = true;
        updatePlayPauseIcon();
        player.image.classList.add('playing');
        updateLikeButton(track.id);
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

function setupPlayerListeners() {
    player.playPauseBtn.addEventListener('click', togglePlay);

    player.audio.addEventListener('timeupdate', updateProgress);
    player.audio.addEventListener('ended', handleTrackEnd); // Handle "Next" automatically
    player.seekSlider.addEventListener('input', seek);
    player.volumeSlider.addEventListener('input', updateVolume);

    player.nextBtn.addEventListener('click', () => handleTrackEnd()); // Manual Next
    player.prevBtn.addEventListener('click', () => {
        player.audio.currentTime = 0; // Simple prev for now
    });

    player.likeBtn.addEventListener('click', toggleLike);
}

function togglePlay() {
    if (player.audio.paused) {
        player.audio.play();
        state.isPlaying = true;
        player.image.classList.add('playing');
    } else {
        player.audio.pause();
        state.isPlaying = false;
        player.image.classList.remove('playing');
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
            // Strategy 1: Find completely new tracks (never played in this session)
            let candidates = data.filter(rec =>
                !state.currentPlaylist.some(played => played.id === rec.id)
            );

            // Strategy 2: If we ran out of new tracks, avoid the last 10 played tracks
            // This prevents A -> B -> A loops and local circles
            if (candidates.length === 0) {
                console.log("No new tracks found, relaxing filter...");
                const recentHistoryIds = state.currentPlaylist.slice(-10).map(t => t.id);
                candidates = data.filter(rec => !recentHistoryIds.includes(rec.id));
            }

            // Strategy 3: Last resort - just avoid the current track logic
            if (candidates.length === 0) {
                console.log("History full, avoiding current track only...");
                candidates = data.filter(rec => rec.id !== currentTrack.id);
            }

            // Pick a random track from the top 5 candidates to add variety
            const poolSize = Math.min(candidates.length, 5);
            const randomIndex = Math.floor(Math.random() * poolSize);
            const nextTrack = candidates[randomIndex] || candidates[0];

            if (nextTrack) {
                console.log(`Playing next: ${nextTrack.name} (Strategy: ${candidates.length === data.length ? 'Fallback' : 'Filtered'})`);
                // Add to current playlist state
                state.currentPlaylist.push(nextTrack);
                state.currentTrackIndex++;

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
}

// --- Settings ---

function setupSettings() {
    const inputs = document.querySelectorAll('input[name="quality"]');

    // Set initial
    inputs.forEach(input => {
        if (input.value === state.quality) input.checked = true;

        input.addEventListener('change', (e) => {
            state.quality = e.target.value;
            localStorage.setItem('dora_quality', state.quality);
        });
    });
}

// --- Helpers ---

function showLoading(show) {
    if (show) loading.classList.add('active');
    else loading.classList.remove('active');
}

function showError(msg) {
    console.error(msg);
    // Could add toast notification here
}

// initialize
document.addEventListener('DOMContentLoaded', init);