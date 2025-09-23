const searchInput = document.getElementById('searchInput');
const searchButton = document.getElementById('searchButton');
const resultsContainer = document.getElementById('resultsContainer');
const loadingElement = document.getElementById('loading');
const errorElement = document.getElementById('error');
const recommendationsContainer = document.getElementById('recommendations');

async function searchTracks(query) {
    try {
        showLoading();
        const response = await fetch(`/api/search?query=${encodeURIComponent(query)}`);
        const data = await response.json();
        hideLoading();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to search tracks');
        }
        
        displayResults(data);
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

async function getRecommendations(trackId) {
    try {
        showLoading();
        const response = await fetch(`/api/recommendations/${trackId}`);
        const data = await response.json();
        hideLoading();
        
        if (!response.ok) {
            throw new Error(data.message || 'Failed to get recommendations');
        }
        
        displayRecommendations(data);
    } catch (error) {
        hideLoading();
        showError(error.message);
    }
}

function displayResults(tracks) {
    resultsContainer.innerHTML = '';
    recommendationsContainer.innerHTML = '';
    
    // Reset playlist with new search results
    currentPlaylist = tracks;
    currentTrackIndex = -1;
    
    tracks.forEach(track => {
        const trackElement = createTrackElement(track);
        resultsContainer.appendChild(trackElement);
    });
}

function displayRecommendations(tracks) {
    recommendationsContainer.innerHTML = '<h2>Recommended Tracks</h2>';
    const recommendedTracksContainer = document.createElement('div');
    recommendedTracksContainer.className = 'results-container';
    
    // Add recommended tracks to the playlist
    currentPlaylist = [...currentPlaylist, ...tracks.filter(track => 
        !currentPlaylist.some(t => t.id === track.id)
    )];
    
    tracks.forEach(track => {
        const trackElement = createTrackElement(track);
        recommendedTracksContainer.appendChild(trackElement);
    });
    
    recommendationsContainer.appendChild(recommendedTracksContainer);
    recommendationsContainer.scrollIntoView({ behavior: 'smooth' });
}

// Player Elements
const audioPlayer = document.getElementById('audioPlayer');
const playPauseButton = document.getElementById('playPauseButton');
const prevButton = document.getElementById('prevButton');
const nextButton = document.getElementById('nextButton');
const progress = document.getElementById('progress');
const progressBar = document.querySelector('.progress-bar');
const currentTimeElement = document.getElementById('currentTime');
const durationElement = document.getElementById('duration');
const volumeSlider = document.getElementById('volumeSlider');
const playerImage = document.getElementById('playerImage');
const playerTrackName = document.getElementById('playerTrackName');
const playerArtistName = document.getElementById('playerArtistName');

let currentPlaylist = [];
let currentTrackIndex = -1;
let allTracks = new Map(); // Store all track data by ID

// Player visibility functions
function showPlayer() {
    const musicPlayer = document.getElementById('musicPlayer');
    musicPlayer.classList.add('active');
    document.body.classList.add('player-active');
}

function hidePlayer() {
    const musicPlayer = document.getElementById('musicPlayer');
    musicPlayer.classList.remove('active');
    document.body.classList.remove('player-active');
}

function resetPlayer() {
    hidePlayer();
    audioPlayer.src = '';
    playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
    playerTrackName.textContent = 'No track selected';
    playerArtistName.textContent = '-';
    playerImage.src = '/static/default-album.png';
    progress.style.width = '0%';
    currentTimeElement.textContent = '0:00';
    durationElement.textContent = '0:00';
}

// Player Event Listeners
playPauseButton.addEventListener('click', togglePlay);
prevButton.addEventListener('click', playPrevious);
nextButton.addEventListener('click', playNext);
audioPlayer.addEventListener('timeupdate', updateProgress);
audioPlayer.addEventListener('ended', async () => {
    await playNext();
});
progressBar.addEventListener('click', seek);
volumeSlider.addEventListener('input', updateVolume);

function createTrackElement(track) {
    // Store track data for later reference
    allTracks.set(track.id, track);
    
    const trackCard = document.createElement('div');
    trackCard.className = 'track-card';
    
    trackCard.innerHTML = `
        <img src="${track.image || '/static/default-album.png'}" alt="${track.name}" class="track-image">
        <div class="track-info">
            <h3>${track.name}</h3>
            <p>${track.artist}</p>
            <p>${track.album}</p>
            <p>${formatDuration(track.duration)}</p>
        </div>
        <div class="track-controls">
            <button onclick="playTrack(${JSON.stringify(track).replace(/"/g, '&quot;')})" class="button play-button">
                <i class="fas fa-play"></i> Play
            </button>
            <button onclick="getRecommendations('${track.id}')" class="button recommend-button">
                <i class="fas fa-random"></i> Similar
            </button>
            <button onclick="downloadTrack('${track.id}')" class="button download-button">
                <i class="fas fa-download"></i> Download
            </button>
        </div>
    `;
    
    return trackCard;
}

function playTrack(track) {
    // Update playlist if it's a new search result
    if (!currentPlaylist.find(t => t.id === track.id)) {
        currentPlaylist = [track];
        currentTrackIndex = 0;
    } else {
        currentTrackIndex = currentPlaylist.findIndex(t => t.id === track.id);
    }
    
    loadAndPlayTrack(track);
}

function downloadTrack(trackId) {
    try {
        const track = allTracks.get(trackId);
        if (!track) {
            showError('Track not found. Please refresh and try again.');
            return;
        }
        
        // Clean filename by removing special characters
        const cleanArtist = track.artist.replace(/[^\w\s-]/g, '');
        const cleanTrackName = track.name.replace(/[^\w\s-]/g, '');
        const filename = `${cleanArtist} - ${cleanTrackName}.mp3`;
        
        // Create a temporary link to trigger download
        const link = document.createElement('a');
        link.href = `/api/download/${trackId}`;
        link.download = filename;
        link.style.display = 'none';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Show user feedback
        showError(`Downloading: ${cleanArtist} - ${cleanTrackName}`);
        setTimeout(() => {
            const errorElement = document.getElementById('error');
            errorElement.classList.remove('active');
        }, 3000);
    } catch (error) {
        console.error('Download error:', error);
        showError('Failed to download track. Please try again.');
    }
}

function loadAndPlayTrack(track) {
    audioPlayer.src = track.play_url;
    playerImage.src = track.image || '/static/default-album.png';
    playerTrackName.textContent = track.name;
    playerArtistName.textContent = track.artist;
    
    // Show the player when a track is loaded
    showPlayer();
    
    audioPlayer.play()
        .then(() => {
            playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
        })
        .catch(error => {
            console.error('Error playing track:', error);
            showError('Error playing track. Please try again.');
        });
}

function togglePlay() {
    if (audioPlayer.src) {
        if (audioPlayer.paused) {
            audioPlayer.play();
            playPauseButton.innerHTML = '<i class="fas fa-pause"></i>';
        } else {
            audioPlayer.pause();
            playPauseButton.innerHTML = '<i class="fas fa-play"></i>';
        }
    }
}

function playPrevious() {
    if (currentPlaylist.length > 0 && currentTrackIndex > 0) {
        currentTrackIndex--;
        loadAndPlayTrack(currentPlaylist[currentTrackIndex]);
    }
}

async function playNext() {
    if (currentPlaylist.length > 0 && currentTrackIndex < currentPlaylist.length - 1) {
        currentTrackIndex++;
        loadAndPlayTrack(currentPlaylist[currentTrackIndex]);
    } else if (currentPlaylist.length > 0 && currentTrackIndex >= 0) {
        // Reached end of playlist, try to get recommendations for the current track
        const currentTrack = currentPlaylist[currentTrackIndex];
        if (currentTrack && currentTrack.id) {
            try {
                const response = await fetch(`/api/recommendations/${currentTrack.id}`);
                const recommendations = await response.json();
                
                if (response.ok && recommendations.length > 0) {
                    // Add recommendations to playlist and play the first one
                    const newTracks = recommendations.filter(track => 
                        !currentPlaylist.some(t => t.id === track.id)
                    );
                    
                    if (newTracks.length > 0) {
                        currentPlaylist.push(...newTracks);
                        currentTrackIndex++;
                        loadAndPlayTrack(currentPlaylist[currentTrackIndex]);
                        return;
                    }
                }
            } catch (error) {
                console.error('Error fetching recommendations:', error);
            }
        }
        // If no recommendations or error, reset the player
        resetPlayer();
    } else {
        // No tracks available, reset the player
        resetPlayer();
    }
}

function updateProgress() {
    const { currentTime, duration } = audioPlayer;
    if (duration) {
        const progressPercent = (currentTime / duration) * 100;
        progress.style.width = `${progressPercent}%`;
        currentTimeElement.textContent = formatTime(currentTime);
        durationElement.textContent = formatTime(duration);
    }
}

function seek(e) {
    if (audioPlayer.src) {
        const percent = e.offsetX / progressBar.offsetWidth;
        audioPlayer.currentTime = percent * audioPlayer.duration;
    }
}

function updateVolume() {
    audioPlayer.volume = volumeSlider.value / 100;
}

function formatTime(seconds) {
    const minutes = Math.floor(seconds / 60);
    const remainingSeconds = Math.floor(seconds % 60);
    return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}

function formatDuration(duration) {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

function showLoading() {
    loadingElement.classList.add('active');
    errorElement.classList.remove('active');
}

function hideLoading() {
    loadingElement.classList.remove('active');
}

function showError(message) {
    errorElement.textContent = message;
    errorElement.classList.add('active');
}

searchButton.addEventListener('click', () => {
    const query = searchInput.value.trim();
    if (query) {
        searchTracks(query);
    }
});

searchInput.addEventListener('keypress', (event) => {
    if (event.key === 'Enter') {
        const query = searchInput.value.trim();
        if (query) {
            searchTracks(query);
        }
    }
});