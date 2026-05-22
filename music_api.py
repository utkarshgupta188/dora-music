import requests

# API Configuration
MUSIC_API_BASE = "https://hehe-jet-beta.vercel.app/api"

def _clean_image_url(url):
    if not url or not isinstance(url, str):
        return '/static/default-album.png'
    url = url.strip()
    if (url.startswith('http://') or url.startswith('https://') or url.startswith('/')) and not url.startswith('<!doctype') and not 'html' in url.lower():
        return url
    return '/static/default-album.png'

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
                image_url = _clean_image_url(next((img['url'] for img in reversed(track.get('image', [])) if isinstance(img, dict) and img.get('url')), ''))
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

def _parse_song_payload(track):
    """Common helper to parse song payload into a standard track dictionary"""
    try:
        # Get highest quality media URLs
        download_url = next((u['url'] for u in reversed(track.get('downloadUrl', []))
                           if isinstance(u, dict) and u.get('url')), '')
        
        image_url = _clean_image_url(next((img['url'] for img in reversed(track.get('image', []))
                        if isinstance(img, dict) and img.get('url')), ''))

        # Get artist names
        artists = track.get('artists', {})
        primary_artists = artists.get('primary', []) if isinstance(artists, dict) else []
        artist_names = [a['name'].replace('&amp;', '&') for a in primary_artists
                      if isinstance(a, dict) and a.get('name')]
        
        if not artist_names:
            if track.get('primaryArtists'):
                artist_str = str(track.get('primaryArtists')).replace('&amp;', '&')
            elif track.get('singers'):
                artist_str = str(track.get('singers')).replace('&amp;', '&')
            else:
                artist_str = 'Unknown Artist'
        else:
            artist_str = ', '.join(artist_names)

        # Get album name
        album = track.get('album', {})
        album_name = album.get('name', 'N/A') if isinstance(album, dict) else (album or 'N/A')

        # Extract both ID formats that might be present
        song_id = track.get('id', '')
        song_token = track.get('song', {}).get('token', '') if isinstance(track.get('song'), dict) else ''
        
        song_name = track.get('name') or track.get('title') or 'Unknown Song'
        
        # Unescape HTML entities
        import html
        if isinstance(song_name, str):
            song_name = html.unescape(song_name)
        if isinstance(album_name, str):
            album_name = html.unescape(album_name)
        if isinstance(artist_str, str):
            artist_str = html.unescape(artist_str)

        return {
            'id': str(song_token or song_id),
            'name': str(song_name),
            'artist': str(artist_str),
            'album': str(album_name),
            'duration': str(track.get('duration', '')),
            'play_url': str(download_url),
            'downloadUrls': track.get('downloadUrl', []),
            'image': str(image_url or '/static/default-album.png'),
            'language': str(track.get('language', '')),
            'url': str(track.get('url', '')),
            'mood': detect_mood(str(song_name), str(album_name))
        }
    except Exception as e:
        print(f"Error parsing song payload: {e}")
        return None

def search_albums(query, limit=6):
    """Search for albums using the Music API"""
    try:
        url = f"{MUSIC_API_BASE}/search/albums"
        params = {
            'query': query,
            'limit': limit
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        albums = []
        if data.get('success') and data.get('data', {}).get('results'):
            for album in data['data']['results']:
                image_url = _clean_image_url(next((img['url'] for img in reversed(album.get('image', [])) if isinstance(img, dict) and img.get('url')), ''))
                
                # Retrieve artist name robustly
                artists_data = album.get('artists', {})
                if isinstance(artists_data, dict) and artists_data.get('primary'):
                    artist_name = ', '.join(a['name'] for a in artists_data['primary'] if isinstance(a, dict) and a.get('name'))
                else:
                    artist_name = str(album.get('artist') or 'Various Artists')
                
                album_info = {
                    'id': str(album.get('id', '')),
                    'name': str(album.get('name') or album.get('title') or 'Unknown Album'),
                    'artist': artist_name,
                    'image': str(image_url or '/static/default-album.png'),
                    'year': str(album.get('year') or ''),
                    'type': 'album'
                }
                albums.append(album_info)
        return albums
    except Exception as e:
        print(f"Error searching albums: {str(e)}")
        return []

def search_playlists(query, limit=6):
    """Search for playlists using the Music API"""
    try:
        url = f"{MUSIC_API_BASE}/search/playlists"
        params = {
            'query': query,
            'limit': limit
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        playlists = []
        if data.get('success') and data.get('data', {}).get('results'):
            for pl in data['data']['results']:
                image_url = _clean_image_url(next((img['url'] for img in reversed(pl.get('image', [])) if isinstance(img, dict) and img.get('url')), ''))
                
                desc_val = pl.get('description') or (f"{pl.get('songCount')} songs" if pl.get('songCount') else '')
                
                pl_info = {
                    'id': str(pl.get('id', '')),
                    'name': str(pl.get('name') or pl.get('title') or 'Unknown Playlist'),
                    'description': str(desc_val or 'Playlist'),
                    'image': str(image_url or '/static/default-album.png'),
                    'type': 'playlist'
                }
                playlists.append(pl_info)
        return playlists
    except Exception as e:
        print(f"Error searching playlists: {str(e)}")
        return []

def get_album_tracks(album_id):
    """Get all songs in an album"""
    try:
        url = f"{MUSIC_API_BASE}/albums"
        params = {
            'id': album_id
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        tracks = []
        if data.get('success') and data.get('data', {}).get('songs'):
            for track in data['data']['songs']:
                parsed = _parse_song_payload(track)
                if parsed:
                    tracks.append(parsed)
        return tracks
    except Exception as e:
        print(f"Error fetching album tracks: {str(e)}")
        return []

def get_playlist_tracks(playlist_id):
    """Get all songs in a playlist"""
    try:
        url = f"{MUSIC_API_BASE}/playlists"
        params = {
            'id': playlist_id
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        tracks = []
        if data.get('success') and data.get('data', {}).get('songs'):
            for track in data['data']['songs']:
                parsed = _parse_song_payload(track)
                if parsed:
                    tracks.append(parsed)
        return tracks
    except Exception as e:
        print(f"Error fetching playlist tracks: {str(e)}")
        return []

def get_discover_data(language=None):
    """Get unified discovery dashboard data, optionally filtered by language"""
    lang_prefix = ""
    if language and language.strip().lower() != 'all':
        lang_prefix = f"{language.strip().capitalize()} "

    # 1. Fetch trending songs (Top Hits)
    trending_songs = search_tracks(f"{lang_prefix}Top Hits", limit=8)
    
    # 2. Fetch featured albums (New Releases)
    featured_albums = search_albums(f"{lang_prefix}New Releases", limit=6)
    
    # 3. Fetch featured playlists (Curated Playlists)
    featured_playlists = search_playlists(f"{lang_prefix}Hits", limit=6)
    
    # 4. Fetch new releases specifically (Phase 2c)
    new_releases = search_tracks(f"{lang_prefix}New 2025", limit=8)
    if not new_releases:
        new_releases = search_tracks(f"{lang_prefix}Latest", limit=8)
    
    # 5. Return curated popular artists (real API IDs + fresh high-res images)
    top_artists = [
        {'id': '459320', 'name': 'Arijit Singh', 'image': 'https://c.saavncdn.com/artists/Arijit_Singh_004_20241118063717_500x500.jpg'},
        {'id': '455130', 'name': 'Shreya Ghoshal', 'image': 'https://c.saavncdn.com/artists/Shreya_Ghoshal_007_20241101074144_500x500.jpg'},
        {'id': '21718089', 'name': 'Atif Aslam', 'image': 'https://cdn-images.dzcdn.net/images/artist/0ea90444148fff9c11d77f06a344724e/500x500-000000-80-0-0.jpg'},
        {'id': '464932', 'name': 'Neha Kakkar', 'image': 'https://c.saavncdn.com/artists/Neha_Kakkar_007_20241212115832_500x500.jpg'},
        {'id': '464656', 'name': 'Armaan Malik', 'image': 'https://c.saavncdn.com/artists/Armaan_Malik_005_20240819091627_500x500.jpg'},
        {'id': '456863', 'name': 'Badshah', 'image': 'https://c.saavncdn.com/artists/Badshah_006_20241118064015_500x500.jpg'}
    ]
    
    return {
        'trending_songs': trending_songs,
        'featured_albums': featured_albums,
        'featured_playlists': featured_playlists,
        'new_releases': new_releases,
        'top_artists': top_artists
    }

def search_artists(query, limit=6):
    """Search for artists using the Music API"""
    try:
        url = f"{MUSIC_API_BASE}/search/artists"
        params = {
            'query': query,
            'limit': limit
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        artists = []
        if data.get('success') and data.get('data', {}).get('results'):
            for artist in data['data']['results']:
                image_url = _clean_image_url(next((img['url'] for img in reversed(artist.get('image', [])) if isinstance(img, dict) and img.get('url')), ''))
                artist_info = {
                    'id': str(artist.get('id', '')),
                    'name': str(artist.get('title', artist.get('name', ''))),
                    'image': str(image_url or '/static/default-album.png'),
                    'type': 'artist'
                }
                artists.append(artist_info)
        return artists
    except Exception as e:
        print(f"Error searching artists: {str(e)}")
        return []

def search_all(query):
    """Perform a global unified search across songs, albums, playlists, and artists"""
    try:
        url = f"{MUSIC_API_BASE}/search"
        params = {
            'query': query
        }
        response = requests.get(url, params=params)
        response.raise_for_status()
        data = response.json()
        
        results = {
            'songs': [],
            'albums': [],
            'playlists': [],
            'artists': [],
            'topQuery': [],
            'sectionsOrder': []
        }
        
        if data.get('success') and data.get('data'):
            payload = data['data']
            
            # Songs
            if payload.get('songs', {}).get('results'):
                for track in payload['songs']['results']:
                    parsed = _parse_song_payload(track)
                    if parsed:
                        results['songs'].append(parsed)
            # Albums
            if payload.get('albums', {}).get('results'):
                for album in payload['albums']['results']:
                    image_url = _clean_image_url(next((img['url'] for img in reversed(album.get('image', [])) if isinstance(img, dict) and img.get('url')), ''))
                    results['albums'].append({
                        'id': str(album.get('id', '')),
                        'name': str(album.get('name') or album.get('title') or 'Unknown Album'),
                        'artist': str(album.get('artist') or 'Various Artists'),
                        'image': str(image_url),
                        'year': str(album.get('year', '')),
                        'type': 'album'
                    })
            # Playlists
            if payload.get('playlists', {}).get('results'):
                for pl in payload['playlists']['results']:
                    image_url = _clean_image_url(next((img['url'] for img in reversed(pl.get('image', [])) if isinstance(img, dict) and img.get('url')), ''))
                    results['playlists'].append({
                        'id': str(pl.get('id', '')),
                        'name': str(pl.get('name') or pl.get('title') or 'Unknown Playlist'),
                        'description': str(pl.get('description') or ''),
                        'image': str(image_url),
                        'type': 'playlist'
                    })
            # Artists
            if payload.get('artists', {}).get('results'):
                for artist in payload['artists']['results']:
                    image_url = _clean_image_url(next((img['url'] for img in reversed(artist.get('image', [])) if isinstance(img, dict) and img.get('url')), ''))
                    results['artists'].append({
                        'id': str(artist.get('id', '')),
                        'name': str(artist.get('title', artist.get('name', ''))),
                        'image': str(image_url),
                        'type': 'artist'
                    })
            
            # Top Query
            if payload.get('topQuery', {}).get('results'):
                for item in payload['topQuery']['results']:
                    item_type = item.get('type')
                    if item_type == 'song':
                        parsed = _parse_song_payload(item)
                        if parsed:
                            parsed['type'] = 'song'
                            results['topQuery'].append(parsed)
                    elif item_type == 'artist':
                        image_url = _clean_image_url(next((img['url'] for img in reversed(item.get('image', [])) if isinstance(img, dict) and img.get('url')), ''))
                        results['topQuery'].append({
                            'id': str(item.get('id', '')),
                            'name': str(item.get('title', item.get('name', ''))),
                            'image': str(image_url),
                            'description': str(item.get('description', 'Artist')),
                            'type': 'artist'
                        })
                    elif item_type == 'album':
                        image_url = _clean_image_url(next((img['url'] for img in reversed(item.get('image', [])) if isinstance(img, dict) and img.get('url')), ''))
                        results['topQuery'].append({
                            'id': str(item.get('id', '')),
                            'name': str(item.get('title', item.get('name', ''))),
                            'artist': str(item.get('artist') or item.get('description') or 'Various Artists'),
                            'image': str(image_url),
                            'description': str(item.get('description', 'Album')),
                            'type': 'album'
                        })
                    elif item_type == 'playlist':
                        image_url = _clean_image_url(next((img['url'] for img in reversed(item.get('image', [])) if isinstance(img, dict) and img.get('url')), ''))
                        results['topQuery'].append({
                            'id': str(item.get('id', '')),
                            'name': str(item.get('title', item.get('name', ''))),
                            'image': str(image_url),
                            'description': str(item.get('description', 'Playlist')),
                            'type': 'playlist'
                        })
                    else:
                        image_url = _clean_image_url(next((img['url'] for img in reversed(item.get('image', [])) if isinstance(img, dict) and img.get('url')), ''))
                        results['topQuery'].append({
                            'id': str(item.get('id', '')),
                            'name': str(item.get('title', item.get('name', ''))),
                            'image': str(image_url),
                            'description': str(item.get('description') or item_type or ''),
                            'type': str(item_type or 'unknown')
                        })
            
            # Calculate dynamic sectionsOrder
            positions = {}
            for key in ['topQuery', 'songs', 'albums', 'artists', 'playlists']:
                if key in payload and isinstance(payload[key], dict) and 'position' in payload[key]:
                    positions[key] = payload[key]['position']
            
            # Sort keys by position in ascending order
            sorted_keys = sorted(positions.keys(), key=lambda k: positions[k])
            
            # Filter to include only sections that have results
            results['sectionsOrder'] = [k for k in sorted_keys if len(results.get(k, [])) > 0]
            
        return results
    except Exception as e:
        print(f"Error in unified search: {str(e)}")
        return {
            'songs': [],
            'albums': [],
            'playlists': [],
            'artists': [],
            'topQuery': [],
            'sectionsOrder': []
        }

def _parse_bio(bio_data):
    """Helper to cleanly parse and format the bio from JioSaavn API"""
    if not bio_data:
        return ""
    if isinstance(bio_data, list):
        try:
            sorted_bio = sorted(bio_data, key=lambda x: x.get('sequence', 0) if isinstance(x, dict) else 0)
        except Exception:
            sorted_bio = bio_data
        paragraphs = []
        for section in sorted_bio:
            if isinstance(section, dict):
                text = section.get('text', '').strip()
                title = section.get('title', '').strip()
                if text:
                    # Clean up standard line breaks
                    text = text.replace('\r\n', '\n').replace('\r', '\n')
                    if title and title.lower() != 'introduction':
                        paragraphs.append(f"{title}: {text}")
                    else:
                        paragraphs.append(text)
            elif isinstance(section, str):
                paragraphs.append(section.strip())
        return "\n\n".join(paragraphs)
    elif isinstance(bio_data, str):
        return bio_data.strip()
    return str(bio_data)

def get_artist_details(artist_id):
    """Retrieve full details of an artist, including standard songs and albums"""
    try:
        url = f"{MUSIC_API_BASE}/artists?id={artist_id}"
        response = requests.get(url)
        response.raise_for_status()
        res_data = response.json()
        
        if res_data.get('success') and res_data.get('data'):
            data = res_data['data']
            
            # Extract high-res image
            image_url = _clean_image_url(next((img['url'] for img in reversed(data.get('image', []))
                            if isinstance(img, dict) and img.get('url')), ''))
            
            # Top songs parsing
            top_songs = []
            for track in data.get('topSongs', []):
                parsed = _parse_song_payload(track)
                if parsed:
                    top_songs.append(parsed)
                    
            # Top albums parsing
            top_albums = []
            for album in data.get('topAlbums', []):
                album_img = _clean_image_url(next((img['url'] for img in reversed(album.get('image', []))
                                if isinstance(img, dict) and img.get('url')), ''))
                top_albums.append({
                    'id': str(album.get('id', '')),
                    'name': str(album.get('name') or album.get('title') or 'Unknown Album'),
                    'artist': str(data.get('name', 'Various Artists')),
                    'image': str(album_img),
                    'year': str(album.get('year', '')),
                    'type': 'album'
                })
                
            return {
                'id': str(data.get('id', artist_id)),
                'name': str(data.get('name', 'Unknown Artist')),
                'image': str(image_url),
                'follower_count': str(data.get('followerCount', data.get('fanCount', '0'))),
                'bio': _parse_bio(data.get('bio')),
                'top_songs': top_songs,
                'top_albums': top_albums
            }
        return None
    except Exception as e:
        print(f"Error in get_artist_details: {str(e)}")
        return None

def get_song_details(track_id):
    """Retrieve full details for a single song"""
    try:
        url = f"{MUSIC_API_BASE}/songs/{track_id}"
        response = requests.get(url)
        response.raise_for_status()
        res_data = response.json()
        
        if res_data.get('success') and res_data.get('data'):
            tracks_list = res_data['data']
            if isinstance(tracks_list, list) and len(tracks_list) > 0:
                return _parse_song_payload(tracks_list[0])
        return None
    except Exception as e:
        print(f"Error in get_song_details: {str(e)}")
        return None