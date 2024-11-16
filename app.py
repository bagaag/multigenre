import glob
import os
import hashlib
import json

from fastapi import FastAPI
from fastapi.responses import JSONResponse, RedirectResponse
from fastapi.staticfiles import StaticFiles
from fastapi.encoders import jsonable_encoder
import mutagen

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
        ret['trackNumber'] = tags['tracknumber'][0] if 'tracknumber' in keys else ''
        ret['genres'] = tags['genre'][0].split(';') if 'genre' in keys else []
    return ret


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
