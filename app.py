import glob
import os
import hashlib
import json
import re

from fastapi import FastAPI
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.encoders import jsonable_encoder
from pydantic import BaseModel
import mutagen

# Pydantic model for updating genres
class Genres(BaseModel):
    track_id: str
    genres: list

# Create FastAPI app
app = FastAPI()
app.mount("/static", StaticFiles(directory="static", follow_symlink=True), name="static")

# This folder must be created or linked to the music files
music_dir = os.path.dirname(__file__) + '/static/music'
cache_file = 'cached.json'

# Recursively collect all music files in the given directory
def collect_track_files(dir, files=[]):
    entries = glob.glob(dir + '/*')
    for entry in entries:
        if os.path.isdir(entry):
            files = collect_track_files(entry, files)
        elif entry.endswith('.mp3') or entry.endswith('.m4a'):
            files.append(entry)
    files.sort()
    return files

# Scan a track file and return its ID3 metadata
def scan_track(file):
    global music_dir
    tags = mutagen.File(file, None, True)
    ret = {'file': os.path.relpath(file, music_dir)}
    ret['id'] = hashlib.md5(file.encode()).hexdigest()
    keys = tags.keys()
    if tags is not None:
        ret['title'] = tags['title'][0] if 'title' in keys else ''
        ret['album'] = tags['album'][0] if 'album' in keys else ''
        ret['artist'] = tags['artist'][0] if 'artist' in keys else ''
        ret['year'] = tags['date'][0][0:4] if 'date' in keys else ''
        if ret['year'] == '':
            real_tags = mutagen.File(file, None, False)
            if 'TXXX:YEAR' in real_tags:
                ret['year'] = real_tags['TXXX:YEAR'][0]
        if ret['year'] == '':
            print(f'Missing year for {ret['file']}')
        ret['trackNumber'] = int(tags['tracknumber'][0].split('/')[0]) if 'tracknumber' in keys else ''
        if 'genre' in keys:
            genres = tags['genre']
            if len(genres) > 1:
                ret['genres'] = genres
            else:
                ret['genres'] = genres[0].split(';')
            # check for invalid genre characters
            fixed = cleanup_genres(ret['genres'])
            if not arrays_are_the_same(genres, fixed):
                print(f'Fix genres: {str(genres)} != {str(fixed)} in {ret['file']}')
        else:
            ret['genres'] = []
    return ret

def cleanup_genres(genres):
    changed = False
    fixes = []
    for i in range(len(genres)):
        genre = genres[i]
        fix = re.sub(r'[^A-Za-z0-9-; &/]', '', genre)
        if fix != genre:
            fixes.append(fix)
            changed = True
        else:
            fixes.append(genre)
    fixes = list(dict.fromkeys(fixes))
    if len(genres) != len(fixes):
        changed = True
    return fixes if changed else genres

def arrays_are_the_same(a, b):
    if len(a) != len(b):
        return False
    for i in range(len(a)):
        if a[i] != b[i]:
            return False
    return True

##
## Request handlers
##

# Home page
@app.get("/")
async def home():
    return RedirectResponse(url='/static/index.html')

# Full scan
@app.get("/api/scan")
async def scan():
    print('Performing full scan')
    track_files = collect_track_files(music_dir, [])
    print('Found ' + str(len(track_files)) + ' track files')
    tracks = list(map(scan_track, track_files))
    # write json response to file
    if os.path.exists(cache_file):
        os.unlink(cache_file)
    with open(cache_file, 'w') as file:
        
        print('Writing cached file with ' + str(len(tracks)) + ' tracks')
        file.write(json.dumps(tracks))
    return JSONResponse(content=jsonable_encoder(tracks))

# Cached scan
@app.get("/api/scan/cached")
async def scan_cached():
    # read cached json response from file if file exists
    try:
        with open(cache_file, 'r') as file:
            print('Reading cached file')
            tracks = json.loads(file.read())
            return JSONResponse(content=tracks)
    except FileNotFoundError:
        return await scan() 

# Update genres for track
@app.post("/api/track/{track_id}/genres")
async def update_genres(track: Genres):
    path = None
    track_id = track.track_id
    genres = track.genres
    try:
        # use cache file to get track file from id
        with open(cache_file, 'r') as file:
            tracks = json.loads(file.read())
            for track in tracks:
                if track['id'] == track_id:
                    track['genres'] = genres
                    path = track['file']
                    break
        if path is not None:
            print('Updating genres for ' + path + ' to ' + str(genres))
            fixed = cleanup_genres(genres)
            if not arrays_are_the_same(genres, fixed):
                print(f'Fixed genres: {str(genres)} => {str(fixed)}')
                genres = fixed
            path = os.path.join(music_dir, path)
            # update cache file
            with open(cache_file, 'w') as file:
                file.write(json.dumps(tracks))
            # update track file
            try:
                tags = mutagen.File(path, None, False)
                if (type(tags) == mutagen.mp3.MP3):
                    tags['TCON'].text = genres
                    tags.save()
                elif (type(tags) == mutagen.mp4.MP4):
                    tags['\xa9gen'] = genres
                    tags.save()
                else:
                    print('Unsupported file type')
                    return JSONResponse(content=jsonable_encoder({'error': 'Unsupported file type'}), status_code=500)
            except Exception as e:
                print('Failed to update genres: ' + str(e))
                return JSONResponse(content=jsonable_encoder({'error': 'Failed to update genres', 'message': str(e)}), status_code=500)
        else:
            return JSONResponse(content=jsonable_encoder({'error': 'Track not found'}), status_code=404)
        return JSONResponse(content=jsonable_encoder(track))
    except FileNotFoundError:
        return JSONResponse(content=jsonable_encoder({'error': 'Cache file not found'}), status_code=500)
    