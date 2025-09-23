from flask import Flask, render_template, jsonify, request, Response
from music_api import search_tracks, get_recommendations
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
        if track_data.get('downloadUrl'):
            download_url = next((url['url'] for url in reversed(track_data.get('downloadUrl', []))), '')
        
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