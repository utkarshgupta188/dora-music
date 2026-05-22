from flask import Flask, render_template, jsonify, request, Response
from music_api import search_tracks, get_recommendations, search_all, get_discover_data, get_album_tracks, get_playlist_tracks, get_artist_details, search_artists, get_song_details
import requests
import re
import os

app = Flask(__name__)
app.config['TEMPLATES_AUTO_RELOAD'] = True

@app.route('/')
def index():
    return render_template('index.html')

@app.route('/api/search')
def search():
    query = request.args.get('query', '')
    if not query:
        return jsonify({'error': 'Query parameter is required'}), 400
    
    try:
        tracks = search_tracks(query)
        return jsonify(tracks)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/discover')
def discover():
    try:
        language = request.args.get('language', '')
        data = get_discover_data(language)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

def clean_metadata(text):
    if not text:
        return ""
    # Remove text in parentheses or brackets (like (feat. ...), (From "..."), [Official Video], etc.)
    text = re.sub(r'\(feat\..*?\)', '', text, flags=re.IGNORECASE)
    text = re.sub(r'\[.*?\]', '', text)
    text = re.sub(r'\(.*?\)', '', text)
    text = re.sub(r'-.*?mix', '', text, flags=re.IGNORECASE)
    text = re.sub(r'remix', '', text, flags=re.IGNORECASE)
    # Remove extra spaces
    text = re.sub(r'\s+', ' ', text).strip()
    return text

@app.route('/api/lyrics')
def get_lyrics():
    artist = request.args.get('artist', '')
    title = request.args.get('title', '')
    if not artist or not title:
        return jsonify({'error': 'Artist and title parameters are required'}), 400
    
    # Pre-clean metadata
    clean_artist = clean_metadata(artist)
    clean_title = clean_metadata(title)
    
    if not clean_artist:
        clean_artist = artist
    if not clean_title:
        clean_title = title

    headers = {
        "User-Agent": "DoraMusic/1.0.0 (https://github.com/utkarshgupta188/dora-music)"
    }
    
    lyrics_text = None
    
    # Attempt 1: LRCLib API
    try:
        # Step A: Direct metadata matching on LRCLib Search
        lrclib_url = "https://lrclib.net/api/search"
        params_specific = {
            "track_name": clean_title,
            "artist_name": clean_artist
        }
        response = requests.get(lrclib_url, params=params_specific, headers=headers, timeout=5)
        
        if response.status_code == 200:
            results = response.json()
            if results:
                for res in results:
                    if res.get('plainLyrics'):
                        lyrics_text = res['plainLyrics']
                        break
                    elif res.get('syncedLyrics'):
                        # Convert synced LRC format to clean readable lines
                        synced = res['syncedLyrics']
                        cleaned = re.sub(r'\[\d{2}:\d{2}\.\d{2,3}\]', '', synced)
                        cleaned_lines = []
                        for line in cleaned.split('\n'):
                            line = line.strip()
                            if line and not re.match(r'^\[[a-zA-Z]+:.*?\]$', line):
                                cleaned_lines.append(line)
                        lyrics_text = '\n'.join(cleaned_lines)
                        break

        # Step B: Fallback to a broader search query if specific fields didn't match
        if not lyrics_text:
            params_q = {
                "q": f"{clean_artist} {clean_title}"
            }
            response = requests.get(lrclib_url, params=params_q, headers=headers, timeout=5)
            if response.status_code == 200:
                results = response.json()
                if results:
                    for res in results:
                        if res.get('plainLyrics'):
                            lyrics_text = res['plainLyrics']
                            break
                        elif res.get('syncedLyrics'):
                            synced = res['syncedLyrics']
                            cleaned = re.sub(r'\[\d{2}:\d{2}\.\d{2,3}\]', '', synced)
                            cleaned_lines = []
                            for line in cleaned.split('\n'):
                                line = line.strip()
                                if line and not re.match(r'^\[[a-zA-Z]+:.*?\]$', line):
                                    cleaned_lines.append(line)
                            lyrics_text = '\n'.join(cleaned_lines)
                            break

        # Step C: Fallback to searching title only and screening the top 5 results for artist
        if not lyrics_text:
            params_title = {
                "q": clean_title
            }
            response = requests.get(lrclib_url, params=params_title, headers=headers, timeout=5)
            if response.status_code == 200:
                results = response.json()
                if results:
                    artist_keywords = [w.lower() for w in re.split(r'[\s,&-]+', clean_artist) if len(w) > 2]
                    for res in results[:5]:
                        res_artist = res.get('artistName', '').lower()
                        match_found = False
                        if clean_artist.lower() in res_artist or res_artist in clean_artist.lower():
                            match_found = True
                        elif artist_keywords and any(kw in res_artist for kw in artist_keywords):
                            match_found = True
                        
                        if match_found:
                            if res.get('plainLyrics'):
                                lyrics_text = res['plainLyrics']
                                break
                            elif res.get('syncedLyrics'):
                                synced = res['syncedLyrics']
                                cleaned = re.sub(r'\[\d{2}:\d{2}\.\d{2,3}\]', '', synced)
                                cleaned_lines = []
                                for line in cleaned.split('\n'):
                                    line = line.strip()
                                    if line and not re.match(r'^\[[a-zA-Z]+:.*?\]$', line):
                                        cleaned_lines.append(line)
                                lyrics_text = '\n'.join(cleaned_lines)
                                break

        if lyrics_text:
            return jsonify({'success': True, 'lyrics': lyrics_text})

    except Exception as e:
        print(f"Error searching LRCLib: {e}")

    # Attempt 2: Fallback to lyrics.ovh with clean metadata
    try:
        url = f"https://api.lyrics.ovh/v1/{clean_artist}/{clean_title}"
        response = requests.get(url, timeout=5)
        if response.status_code == 200:
            lyrics_data = response.json()
            if lyrics_data.get('lyrics'):
                return jsonify({'success': True, 'lyrics': lyrics_data.get('lyrics', '')})
    except Exception as e:
        print(f"Error fetching from lyrics.ovh with cleaned params: {e}")

    # Attempt 3: Final fallback to lyrics.ovh with original metadata
    if clean_artist != artist or clean_title != title:
        try:
            url = f"https://api.lyrics.ovh/v1/{artist}/{title}"
            response = requests.get(url, timeout=5)
            if response.status_code == 200:
                lyrics_data = response.json()
                if lyrics_data.get('lyrics'):
                    return jsonify({'success': True, 'lyrics': lyrics_data.get('lyrics', '')})
        except Exception as e:
            print(f"Error fetching from lyrics.ovh with original params: {e}")

    return jsonify({'success': False, 'error': 'Lyrics not found'}), 404

@app.route('/api/search/all')
def search_all_route():
    query = request.args.get('query', '')
    if not query:
        return jsonify({'error': 'Query parameter is required'}), 400
    try:
        data = search_all(query)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/albums/<album_id>')
def album_tracks(album_id):
    try:
        tracks = get_album_tracks(album_id)
        return jsonify(tracks)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/playlists/<playlist_id>')
def playlist_tracks(playlist_id):
    try:
        tracks = get_playlist_tracks(playlist_id)
        return jsonify(tracks)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/artists/<artist_id>')
def artist_details(artist_id):
    try:
        data = get_artist_details(artist_id)
        if data:
            return jsonify(data)
        else:
            return jsonify({'error': 'Artist not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/search/artists')
def search_artists_route():
    query = request.args.get('query', '')
    if not query:
        return jsonify({'error': 'Query parameter is required'}), 400
    try:
        data = search_artists(query)
        return jsonify(data)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/songs/<song_id>')
def song_details_route(song_id):
    try:
        data = get_song_details(song_id)
        if data:
            return jsonify(data)
        else:
            return jsonify({'error': 'Song not found'}), 404
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/recommendations/<track_id>')
def recommendations(track_id):
    if not track_id:
        return jsonify({'error': 'Track ID is required'}), 400
    
    try:
        tracks = get_recommendations(track_id)
        return jsonify(tracks)
    except Exception as e:
        return jsonify({'error': str(e)}), 500

@app.route('/api/download/<track_id>')
def download_track(track_id):
    if not track_id:
        return jsonify({'error': 'Track ID is required'}), 400
    
    try:
        # Get track details directly from the API using the track ID
        url = f"https://hehe-jet-beta.vercel.app/api/songs/{track_id}"
        response = requests.get(url)
        response.raise_for_status()
        data = response.json()
        
        if not data.get('success'):
            return jsonify({'error': 'Track not found'}), 404
        
        track_data = data.get('data', [{}])[0] if isinstance(data.get('data'), list) else data.get('data', {})
        
        # Get the highest quality download URL
        download_url = None
        requested_quality = request.args.get('quality', '320kbps')
        quality_map = {
            '320kbps': 320,
            '160kbps': 160,
            '96kbps': 96,
            '48kbps': 48,
            '12kbps': 12
        }
        target_bitrate = quality_map.get(requested_quality, 320)

        if track_data.get('downloadUrl'):
            urls = track_data.get('downloadUrl', [])
            # Sort by bitrate
            def get_bitrate(u):
                try:
                    return int(u.get('quality', '0').replace('kbps', ''))
                except:
                    return 0
            
            sorted_urls = sorted(urls, key=get_bitrate)
            
            # Find closest match
            chosen = None
            for u in sorted_urls:
                if str(target_bitrate) in u.get('quality', ''):
                    chosen = u
                    break
            
            # Fallback to highest if no exact match or just pick last
            if not chosen and sorted_urls:
                 chosen = sorted_urls[-1]
                 
            if chosen:
                download_url = chosen.get('url')
        
        if not download_url:
            return jsonify({'error': 'Download URL not available'}), 404
        
        # Extract artist and track name for filename
        artist_names = [artist['name'] for artist in track_data.get('artists', {}).get('primary', [])]
        artist = ', '.join(artist_names) if artist_names else 'Unknown'
        name = track_data.get('name', 'Unknown')
        
        # Debug logging
        print(f"Download request for track ID: {track_id}")
        print(f"Track name: {name}")
        print(f"Artist: {artist}")
        print(f"Download URL: {download_url}")
        
        # Clean filename for download
        artist = re.sub(r'[^\w\s-]', '', artist)
        name = re.sub(r'[^\w\s-]', '', name)
        filename = f"{artist} - {name}.mp3"
        
        # Stream the file from the original URL
        def generate():
            try:
                response = requests.get(download_url, stream=True)
                response.raise_for_status()
                for chunk in response.iter_content(chunk_size=8192):
                    if chunk:
                        yield chunk
            except Exception as e:
                print(f"Error streaming file: {e}")
                
        return Response(
            generate(),
            mimetype='audio/mpeg',
            headers={
                'Content-Disposition': f'attachment; filename="{filename}"',
                'Content-Type': 'audio/mpeg'
            }
        )
    except Exception as e:
        return jsonify({'error': str(e)}), 500

if __name__ == '__main__':
    app.run(debug=True)