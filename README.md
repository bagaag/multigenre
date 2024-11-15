# Multigenre

Multigenre is a tool for managing multiple semicolon-separated genre tags across a large collection of MP3/M4A files. 

## Features
- Scans a music folder for files and displays meta data in a filterable and sortable table.
- Allows the user to select one or more genres to set or unset with checkboxes for each track.

## To Do

- Check/Uncheck all in Genre header
- Project mode: display ~1 page of random tracks, remember processed tracks when reloaded to show next batch, display # processed vs unprocessed.
- Playlists: load playlists from linked directory and allow limiting tracks shown to those in (or not in) one or more selected playlists; select playlist, choose include or exclude and apply, repeat as needed.
- Multiple named project support: Save project with name. Load project by selecting from drop down.
- Album mode: sets/unsets all tracks in the same album
- Track mode: sets/unsets all tracks in the same album

## Change Log

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