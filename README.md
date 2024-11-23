# Multigenre

Multigenre is a tool for managing tracks with multiple genre tags across a large collection of MP3/M4A files. 

## Features
- Scan a music folder for files and display meta data in a filterable and sortable table.
- Select one or more genres to set or unset with checkboxes for each track.
- Manage tracks in a single list or in small chunks to work through a long list over time.
- Click to play track for preview/identification.

## How to Use

TBD

## Development Setup

Create new environment (only do this once) from the project folder

`python -m venv .`

Activate environment - everything else assumes this has been done

`source ./bin/activate`

Packages installed w/ pip

- mutagen
- fastapi[standard]


## To Do

- Documentation
- Playlists: load playlists from linked directory and allow limiting tracks shown to those in (or not in) one or more selected playlists; select playlist, choose include or exclude and apply, repeat as needed.
- Album mode: sets/unsets all tracks in the same album
- Track mode: sets/unsets all tracks in the same album
- Add or remove a selected genre for all displayed tracks
- Edit other tag values

## Change Log

2024-11-23
- Finish genre and year validation & cleanup

2024-11-17
- Update track genres

2024-11-16
- Rewrite API from PHP to Python. The tag lib from PHP only has "alpha" support for writing tags, while the mutagen lib from Python is used by several desktop tag editor applications.

2024-11-14
- Button to clear cache
- Sort genres
- Read tags from M4A files (quicktime instead of id3v2)
- Show/hide settings

2024-11-13
- Ability to add new genre
- Display loading progress
- Cache server results for performance (currently 10 second page load)

2024-11-12
- API to return folder scan results
- Front-end to display scan results in sortable/filterable table