var allGenres = []; // all available genres
var selectedGenres = []; // selected genres to display in table
var tracks = []; // array of all track objects
var apiUrl = '/api/';
var appTitle = 'Multigenre';

async function appInit(cached=true) {
    startWait();
    resetUI();
    // get tracks from api
    let data = [];
    let result = await fetch(apiUrl + (cached ? 'scan/cached' : 'scan'));
    data = await result.json();
    setTrackCount(data.length);
    for (let i=0; i<data.length; i++) {
        let track = data[i];
        if (track.title === '') {
            track.title = track.file;
        }
        let genres = track.genres;
        genres.forEach(genre => {
            if (!allGenres.includes(genre) && genre !== '') {
                allGenres.push(genre);
            }
        });
        addTrack(track);
    }
    allGenres.sort();
    // setup app screen 
    setupGenres();
    resetFilters();
    // filter event listeners
    document.getElementById('filter_button').addEventListener('click', updateFilters);
    document.getElementById('filter_reset').addEventListener('click', resetFilters);
    document.getElementById('clear_cache').addEventListener('click', clearCache);
    document.getElementById('toggle_settings').addEventListener('click', toggleSettings);
    // sort event listeners
    document.getElementById('tracks').getElementsByTagName('thead')[0].addEventListener('click', tableSort);
    Array.from(document.getElementsByClassName('nosort')).forEach((el) => {el.removeEventListener('click', tableSort)});
    endWait();
}
appInit();

function resetUI() {
    let tracks = document.getElementById('tracks');
    let tbody = tracks.getElementsByTagName('tbody')[0];
    tbody.textContent = '';
    let selectors = document.getElementById('selectedGenres');
    selectors.textContent = '';
    document.getElementById('track_count').textContent = 'Loading tracks...';
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}

function setTrackCount(count) { 
    document.getElementById('track_count').textContent = numberWithCommas(count) + ' tracks';
}

// Shows/hides the settings block
function toggleSettings() {
    let settings = document.getElementById('settings');
    let btn = document.getElementById('toggle_settings');
    if (settings.style.display === 'none') {
        settings.style.display = 'block';
        btn.textContent = 'Hide Grenres';
    } else {
        settings.style.display = 'none';
        btn.textContent = 'Show Genres';
    }
}

// Reloads the page without using cached data
function clearCache() {
    appInit(false);
}

// Adds a track to the table
function addTrack(track) {
    tracks.push(track);
    let tbl = document.getElementById('tracks');
    let row = tbl.getElementsByTagName('tbody')[0].insertRow();
    row.setAttribute('id', 'track_' + track.id);
    let artist = row.insertCell();
    artist.setHTMLUnsafe(track.artist);
    let album = row.insertCell();
    album.setHTMLUnsafe(track.album);
    let trackNumber = row.insertCell();
    trackNumber.textContent = track.trackNumber;
    let title = row.insertCell();
    let titleLink = document.createElement('a');
    titleLink.setAttribute('href', "javascript:play('" + track.id + "')");
    titleLink.setHTMLUnsafe(track.title);
    title.appendChild(titleLink);
    let year = row.insertCell();
    year.textContent = track.year;
    let genre = row.insertCell();
    genre.setAttribute('class', 'track-genres');
    genre.setAttribute('title', track.genres.join(', '));
}

async function startWait() {
    document.title = 'Loading...';
    document.getElementsByTagName('body')[0].style.cursor = 'wait';
    await document.onwaiting
}
async function endWait() {
    document.title = appTitle;
    document.getElementsByTagName('body')[0].style.cursor = 'default';
}

// Creates/recreates selected genre checkboxes in each track's genre cell
async function toggleSelectableGenre(ev) {
    await startWait();
    let genre = ev.target.value;
    let selected = ev.target.checked;
    let genreCells = Array.from(document.getElementsByClassName('track-genres'));
    genreCells.forEach(cell => {
        let genreBox = cell.querySelector('input[value="' + genre + '"]');
        if (genreBox && !selected) {
            genreBox.parentElement.remove();
        } else if (!genreBox && selected) {
            // add genre box
            let trackId = cell.parentElement.getAttribute('id').split('_')[1];
            let track = tracks.find(t => t.id === trackId);
            let label = document.createElement('label');
            let box = document.createElement("input");
            box.setAttribute('type', 'checkbox');
            box.setAttribute('data-trackid', track.id);
            box.value = genre;
            box.checked = track.genres.includes(genre);
            label.appendChild(box);
            label.appendChild(document.createTextNode(genre));
            cell.appendChild(label);
            box.addEventListener('change', function() {
                let trackId = box.getAttribute('data-trackid');
                let genre = box.value;
                toggleTrackGenre(trackId, genre, box.checked);
            });
        }
    });
    endWait();
}

// Adds or removes a genre for a specified track
async function toggleTrackGenre(trackId, genre, checked) {
    startWait();
    // find track by id
    let track = tracks.find(t => t.id === trackId);
    // update genres
    if (checked) {
        if (!track.genres.includes(genre)) {
            track.genres.push(genre);
        }
    } else {
        track.genres = track.genres.filter(g => g !== genre);
        console.info('Removed ' + genre + ' from ' + track.title);
    }
    console.info('Setting genres for ' + track.title + ' to [' + track.genres.join(', ') + ']');
    // send update to api
    const response = await fetch(apiUrl + `track/${trackId}/genres`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json'
        },
        body: JSON.stringify({"track_id": trackId, "genres": track.genres})
    });
    // see if we got a 200 response
    if (!response.ok) {
        alert('Failed to update genres for ' + track.title);
        console.error('Failed to update genres for ' + track.title);
        console.error(response);
    } else {
        // update genre cell title
        let genreCell = document.getElementById('track_' + trackId).querySelector('.track-genres');
        genreCell.setAttribute('title', track.genres.join(', '));
    }
    endWait();
}

// Creates global genre selection checkbox for each genre
function setupGenres() {
    let selectors = document.getElementById('selectedGenres');
    selectors.textContent = '';
    allGenres.forEach(genre => {
        // genre selector
        let label = document.createElement('label');
        let box = document.createElement("input");
        box.setAttribute('type', 'checkbox');
        box.value = genre;
        box.addEventListener('change', toggleSelectableGenre);
        label.appendChild(box);
        label.appendChild(document.createTextNode(genre));
        selectors.appendChild(label);
    });
    // link to add new genre
    let newGenre = document.createElement('button');
    newGenre.textContent = 'Add New Genre';
    newGenre.setAttribute('class', 'btn-link');
    newGenre.addEventListener('click', addNewGenre);
    selectors.appendChild(newGenre);
}

// Prompts user for new genre and adds it to allGenres
function addNewGenre() {
    let genre = prompt('Enter new genre:');
    if (genre) {
        allGenres.push(genre);
        setupGenres();
    }
}

// Play a track
function play(trackId) {
    let audio = document.getElementById('audio');
    let track = tracks.find(t => t.id === trackId);
    document.title = 'Multigenre - ' + track.title + ' by ' + track.artist;
    audio.src = '/static/music/' + track.file;
    audio.play();
}

// Clear filter form and reset search results
function resetFilters() {
    document.getElementById('filter_search').value = 'any';
    document.getElementById('filter_keyword').value = '';
    updateFilters();
}

// Update table rows based on filter form values
function updateFilters() {
    startWait();
    let search = document.getElementById('filter_search').value;
    let keyword = document.getElementById('filter_keyword').value.toLowerCase();
    let tbl = document.getElementById('tracks');
    let rows = tbl.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
    let count = 0;
    for (let i=0; i<rows.length; i++) {
        let row = rows[i];
        let artist = row.cells[0].textContent.toLowerCase();
        let album = row.cells[1].textContent.toLowerCase();;
        let title = row.cells[3].textContent.toLowerCase();;
        let year = row.cells[4].textContent.toLowerCase();;
        let genres = row.cells[5].getAttribute('title').toLowerCase();
        let show = false;
        if (keyword == '') {
            show = true
        } else if (search == 'any') {
            show = artist.includes(keyword) || album.includes(keyword) || 
                   title.includes(keyword) || year.includes(keyword) || 
                   genres.includes(keyword);
        } else if (search == 'artist') {
            show = artist.includes(keyword);
        } else if (search == 'album') {
            show = album.includes(keyword);
        } else if (search == 'title') {
            show = title.includes(keyword);
        } else if (search == 'year') {
            if (keyword.includes('-')) {
                let range = keyword.split('-');
                show = year >= range[0] && year <= range[1];
            } else {            
                show = year.includes(keyword);
            }
        } else if (search == 'genre') {
            show = genres.includes(keyword);
        }
        if (show) {
            count++;
            row.style.display = 'table-row';
        } else {
            row.style.display = 'none';
        }
        setTrackCount(count);
    }
    endWait();
}

// Sort table rows by column
async function tableSort(ev) {
    startWait();
    let target = ev.target;
    let col = target.cellIndex;
    let tbl = document.getElementById('tracks');
    let numeric = Array.from(tbl.getElementsByClassName('numbersort')).includes(target);
    let rows = Array.from(tbl.getElementsByTagName('tbody')[0].getElementsByTagName('tr'));
    let sorted = rows.sort((a, b) => {
        let aVal = numeric ? Number(a.cells[col].textContent) : a.cells[col].textContent;
        let bVal = numeric ? Number(b.cells[col].textContent) : b.cells[col].textContent;
        if (aVal < bVal) return -1;
        if (aVal > bVal) return 1;
        return 0;
    });
    rows.forEach(row => row.remove());
    sorted.forEach(row => tbl.getElementsByTagName('tbody')[0].appendChild(row));
    endWait();
}