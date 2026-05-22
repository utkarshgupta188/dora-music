import requests

# API Configuration
MUSIC_API_BASE = "https://hehe-jet-beta.vercel.app/api"

def search_tracks(query, page=0, limit=5):
    """Search for tracks using Music API"""
    try:
        url = f"{MUSIC_API_BASE}/search/songs"
        params = {
            'query': query,
            'page': page,
            'limit': limit
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        tracks = []
        if data.get('success') and data.get('data', {}).get('results'):
            for track in data['data']['results']:
                # Get the highest quality image and download URL
                image_url = next((img['url'] for img in reversed(track.get('image', []))), '')
                download_url = next((url['url'] for url in reversed(track.get('downloadUrl', []))), '')
                
                # Extract both ID formats that might be present
                song_id = track.get('id', '')
                song_token = track.get('song', {}).get('token', '') if isinstance(track.get('song'), dict) else ''
                
                track_info = {
                    'id': song_token or song_id,
                    'name': track.get('name', ''),
                    'artist': ', '.join(artist['name'] for artist in track.get('artists', {}).get('primary', [])),
                    'album': track.get('album', {}).get('name', 'N/A'),
                    'duration': track.get('duration', ''),
                    'play_url': download_url,
                    'downloadUrls': track.get('downloadUrl', []),
                    'image': image_url,
                    'language': track.get('language', ''),
                    'url': track.get('url', ''),
                    'mood': detect_mood(track.get('name', ''), track.get('album', {}).get('name', 'N/A') if isinstance(track.get('album'), dict) else 'N/A')
                }
                tracks.append(track_info)
        return tracks
    except Exception as e:
        print(f"Error searching tracks: {str(e)}")
        return []

def detect_mood(name, album=""):
    """Detect mood of a song based on title and album keywords"""
    text = f"{name} {album}".lower()
    
    romantic_keywords = [
        'love', 'romantic', 'romance', 'dil', 'pyar', 'pyaar', 'ishq', 'dhadkan', 'chahat', 
        'humsafar', 'sanam', 'jaan', 'jaana', 'jaane', 'heart', 'forever', 'together', 'sweetheart', 
        'tum hi ho', 'mohabat', 'mohabbat', 'sajna', 'sajhna', 'dildara', 'akhiyaan', 
        'yaara', 'yaari', 'yara', 'sajni', 'deewana', 'deewani', 'kesariya', 'zaalima',
        'khairiyat', 'tum se hi', 'humsafar', 'dildara', 'sanam', 'lofi flip', 'lofi mix', 
        'unplugged', 'darasal', 'piya', 'saiyaan', 'saiyyan', 'heeriye', 'ranjha', 'heer', 
        'laila', 'majnu', 'aashiqui', 'aashiq', 'lofi', 'acoustic', 'rehna', 'tumhi', 
        'dilbar', 'mehboob', 'mehbooba', 'ghazal', 'baahon', 'bahon', 'dua', 'sajda', 
        'ibadat', 'jannat', 'rooh', 'dhadkanein', 'tu hi', 'meri jaan', 'haye', 
        'muskurahat', 'naina', 'nayan', 'aankhen', 'khwab', 'dunya', 'duniya', 'jahan', 'sapna'
    ]
    
    sad_keywords = [
        'sad', 'dard', 'alone', 'aloneness', 'judai', 'breakup', 'cry', 'emotional',
        'tanha', 'bewafa', 'judaa', 'aansu', 'separation', 'gum', 'maula', 'tujhe bhula diya',
        'tanhai', 'rona', 'judaiyaan', 'ashear', 'mushkil', 'khamoshi', 'udaas', 'udaasi',
        'ghalat', 'zakhm', 'dard-e-dil', 'tadap', 'aansoo'
    ]
    
    dance_keywords = [
        'party', 'dance', 'club', 'remix', 'dj', 'groove', 'beat', 'beats', 'nasha', 
        'sharaab', 'hangover', 'dhamaka', 'masti', 'nacho', 'thumka', 'hip hop', 'rap',
        'edm', 'disco', 'dhol', 'bhangra', 'machayenge', 'swag', 'apna time aayega',
        'party all night', 'peene', 'daru', 'daaru', 'beer', 'whiskey', 'vodka', 'nashe',
        'bass', 'remixed'
    ]
    
    if any(kw in text for kw in romantic_keywords):
        return 'romantic'
    elif any(kw in text for kw in sad_keywords):
        return 'sad'
    elif any(kw in text for kw in dance_keywords):
        return 'dance'
    return 'general'

def get_recommendations(track_id, limit=20):
    """Get song recommendations based on a track ID with smart mood filter"""
    try:
        # 1. Fetch seed track details to detect mood and artist
        seed_url = f"{MUSIC_API_BASE}/songs/{track_id}"
        seed_r = requests.get(seed_url)
        seed_data = seed_r.json()
        
        seed_name = ""
        seed_album = ""
        seed_artists = []
        seed_mood = "general"
        
        if seed_data.get('success') and seed_data.get('data'):
            seed_track = seed_data['data'][0] if isinstance(seed_data['data'], list) else seed_data['data']
            seed_name = seed_track.get('name', '')
            seed_album = seed_track.get('album', {}).get('name', '') if isinstance(seed_track.get('album'), dict) else ''
            seed_artists = [a.get('name', '') for a in seed_track.get('artists', {}).get('primary', []) if isinstance(a, dict)]
            
            # Detect mood of the current track
            seed_mood = detect_mood(seed_name, seed_album)
            print(f"Infinite Radio: Seed song '{seed_name}' mood detected as '{seed_mood}'")

        # 2. Get standard recommendations from Vercel API
        url = f"{MUSIC_API_BASE}/songs/{track_id}/suggestions"
        params = {
            'limit': limit
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        if not isinstance(data, dict) or not data.get('success'):
            print("Invalid API response format")
            return []
        
        raw_recs = []
        for track in data.get('data', []):
            if not isinstance(track, dict):
                continue

            # Get highest quality media URLs
            download_url = next((url['url'] for url in reversed(track.get('downloadUrl', []))
                               if isinstance(url, dict) and url.get('url')), '')
            
            image_url = next((img['url'] for img in reversed(track.get('image', []))
                            if isinstance(img, dict) and img.get('url')), '')

            # Get artist names
            artist_names = [artist['name'].replace('&amp;', '&') 
                          for artist in track.get('artists', {}).get('primary', [])
                          if isinstance(artist, dict) and artist.get('name')]
            
            track_info = {
                'id': str(track.get('id', '')),
                'name': str(track.get('name', '')),
                'artist': ', '.join(artist_names),
                'album': str(track.get('album', {}).get('name', 'N/A') if isinstance(track.get('album'), dict) else 'N/A'),
                'duration': str(track.get('duration', '')),
                'play_url': str(download_url),
                'downloadUrls': track.get('downloadUrl', []),
                'image': str(image_url),
                'language': str(track.get('language', '')),
                'url': str(track.get('url', '')),
                'mood': detect_mood(str(track.get('name', '')), str(track.get('album', {}).get('name', 'N/A') if isinstance(track.get('album'), dict) else 'N/A'))
            }
            raw_recs.append(track_info)
            
        # 3. Hybrid fallback: If there are too few recommendations matching the seed mood,
        # fetch search results for the primary artist + mood and merge them to add variety!
        if seed_mood != 'general':
            matching_count = sum(1 for r in raw_recs if r.get('mood', 'general') == seed_mood)
            if matching_count < 6 and seed_artists:
                primary_artist = seed_artists[0]
                mood_query = f"{primary_artist} {seed_mood}"
                print(f"Infinite Radio: High-continuity fallback triggered. Fetching '{mood_query}' songs...")
                
                # Fetch up to 10 additional search matches
                fallback_tracks = search_tracks(mood_query, limit=10)
                for ft in fallback_tracks:
                    # Avoid duplicates of seed track or already suggested tracks
                    if ft['id'] != track_id and not any(r['id'] == ft['id'] for r in raw_recs):
                        raw_recs.append(ft)
            
            # Layer 2 fallback: If still low on matching mood tracks, search general mood playlists
            matching_count = sum(1 for r in raw_recs if r.get('mood', 'general') == seed_mood)
            if matching_count < 6:
                mood_terms = {
                    'romantic': ['romantic hits', 'love songs', 'best romantic songs', 'lofi romantic'],
                    'sad': ['sad songs', 'emotional hits', 'dard bhare geet'],
                    'dance': ['party dance hits', 'dj remix songs', 'dance beats']
                }
                import random
                term = random.choice(mood_terms.get(seed_mood, [seed_mood]))
                print(f"Infinite Radio: Layer 2 fallback triggered. Fetching '{term}' songs...")
                fallback_tracks = search_tracks(term, limit=12)
                for ft in fallback_tracks:
                    if ft['id'] != track_id and not any(r['id'] == ft['id'] for r in raw_recs):
                        raw_recs.append(ft)

        # 4. Score and Rank recommendations
        scored_recs = []
        for index, track in enumerate(raw_recs):
            # Baseline score: respect JioSaavn's original suggestions ranking (index-driven)
            score = 30 - index
            
            track_mood = track.get('mood', 'general')
            
            # Huge boost if mood matches perfectly!
            if seed_mood != 'general' and track_mood == seed_mood:
                score += 25
            
            # Support boost if it features the same artist
            if seed_artists and any(artist.lower() in track['artist'].lower() for artist in seed_artists):
                score += 8
                
            scored_recs.append((score, track))
            
        # Sort by score in descending order
        scored_recs.sort(key=lambda x: x[0], reverse=True)
        
        # Take the top `limit` results
        final_recs = [item[1] for item in scored_recs[:limit]]
        print(f"Infinite Radio: Sorted {len(final_recs)} songs. Top suggestion: '{final_recs[0]['name'] if final_recs else 'N/A'}'")
        return final_recs
        
    except Exception as e:
        print(f"Error getting recommendations: {str(e)}")
        return []