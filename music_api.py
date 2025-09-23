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
                    'image': image_url,
                    'language': track.get('language', ''),
                    'url': track.get('url', '')
                }
                tracks.append(track_info)
        return tracks
    except Exception as e:
        print(f"Error searching tracks: {str(e)}")
        return []

def get_recommendations(track_id, limit=5):
    """Get song recommendations based on a track ID"""
    try:
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
        
        recommendations = []
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
                'album': str(track.get('album', {}).get('name', 'N/A')),
                'duration': str(track.get('duration', '')),
                'play_url': str(download_url),
                'image': str(image_url),
                'language': str(track.get('language', '')),
                'url': str(track.get('url', ''))
            }
            recommendations.append(track_info)
            
        return recommendations
    except Exception as e:
        print(f"Error getting recommendations: {str(e)}")
        return []