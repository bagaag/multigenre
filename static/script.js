const apiUrl = '/api/';
const appTitle = 'Multigenre';
const loadingText = 'Loading...';
const statusText = loadingText;
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))
var allGenres = []; // all available genres
var selectedGenres = []; // selected genres to display in table
var tracks = []; // array of all track objects

async function appInit(cached=true) {
    startWait();
    resetUI();
    // get tracks from api
    let data = [];
    let result = await fetch(apiUrl + (cached ? 'scan/cached' : 'scan'));
    data = await result.json();
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
    setupGenreSelectors();
    resetFilters(false);
    initProjectStatus();
    loadSettings();
    // button event listeners
    document.getElementById('filter_button').addEventListener('click', updateFilters);
    document.getElementById('filter_reset').addEventListener('click', resetFilters);
    document.getElementById('clear_cache').addEventListener('click', clearCache);
    document.getElementById('toggle_settings').addEventListener('click', toggleGenreSelectorVisibility);
    document.getElementById('project_toggle').addEventListener('click', toggleProject);
    document.getElementById('project_next').addEventListener('click', nextProjectPage);    
    document.getElementById('project_reset').addEventListener('click', resetProject);
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
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}

// Shows/hides the genres block
function toggleGenreSelectorVisibility(status=null, save=true) {
    let settings = document.getElementById('settings');
    let btn = document.getElementById('toggle_settings');
    if (settings.style.display === 'none') {
        settings.style.display = 'block';
        btn.textContent = 'Hide Grenres';
    } else {
        settings.style.display = 'none';
        btn.textContent = 'Show Genres';
    }
    if (save) {
        saveSettings();
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
    row.classList.add('show');
    row.setAttribute('id', 'track_' + track.id);
    let artist = row.insertCell();
    artist.setHTMLUnsafe(track.artist);
    let album = row.insertCell();
    album.setHTMLUnsafe(track.album);
    let trackNumber = row.insertCell();
    trackNumber.textContent = track.trackNumber;
    let title = row.insertCell();
    title.setAttribute('title', track.file);
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

function startWait() {
    document.title = 'Loading...';
    document.getElementsByTagName('body')[0].style.cursor = 'wait';
    document.getElementById('status').textContent = loadingText;
}
function endWait() {
    let count = document.getElementById('tracks').getElementsByTagName('tbody')[0].querySelectorAll('tr.show').length;
    document.getElementById('status').textContent = numberWithCommas(count) + ' tracks';
    document.title = appTitle;
    document.getElementsByTagName('body')[0].style.cursor = 'default';
}

// For some reason, using startWait with a sleep to force UI refresh causes the page to hang 
// after a few calls to toggleSelectableGenre. This is a workaround.
async function saveSettingsAndReload() {
    saveSettings();
    window.location.reload();
}

// Creates/recreates selected genre checkboxes in each track's genre cell
function toggleSelectableGenre(ev, save=true) {
    let genre = ev.target.value;
    let selected = ev.target.checked;
    let genreCells = Array.from(document.getElementsByClassName('track-genres'));
    for (let i=0; i<genreCells.length; i++) {
        let cell = genreCells[i];
        let genreBox = cell.querySelector('input[value="' + genre + '"]');
        if (genreBox && !selected) {
            genreBox.parentElement.style.display = 'none';
        } else if (genreBox && selected) {
            genreBox.parentElement.style.display = 'inline';
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
    }
    if (save) {
        saveSettings();
    }
}

// Saves currently selected genres to cookie
function saveSettings() {
    let selectedGenres = Array.from(document.getElementById('selectedGenres').querySelectorAll('input:checked')).map(el => el.value);
    let filterSearch = document.getElementById('filter_search');
    let filterKeyword = document.getElementById('filter_keyword');
    let settings = {
        "selectedGenres": selectedGenres,
        "settingsVisible": document.getElementById('settings').style.display != 'none',
        "filterSearch": filterSearch.value,
        "filterKeyword": filterKeyword.value
    };
    console.log('saving', settings);
    setCookie('multigenre-settings', JSON.stringify(settings), 365);
}

// Loads selected genres from cookie
function loadSettings() {
    let json = getCookie('multigenre-settings');
    console.log('loading', json);
    if (json != null) {
        let settings = JSON.parse(json);
        console.log('loading', settings);
        // load selected genres
        let selectedGenres = settings.selectedGenres;
        let boxes = document.getElementById('selectedGenres').querySelectorAll('input');
        boxes.forEach(box => {
            let genre = box.value;
            if (selectedGenres.includes(genre)) {
                box.checked = true;
                toggleSelectableGenre({target: box}, false);
            }
        });
        // load genre selector UI state
        let settingsDiv = document.getElementById('settings');
        settingsDiv.style.display = settings.settingsVisible ? 'block' : 'none';
        let btn = document.getElementById('toggle_settings');
        btn.textContent = settings.settingsVisible ? 'Hide Genres' : 'Show Genres';
        // load filters
        let filterSearch = document.getElementById('filter_search');
        filterSearch.value = settings.filterSearch;
        let filterKeyword = document.getElementById('filter_keyword');
        filterKeyword.value = settings.filterKeyword;
        updateFilters(false);
    }
}

// Adds or removes a genre for a specified track
async function toggleTrackGenre(trackId, genre, checked) {
    await startWait();
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
function setupGenreSelectors() {
    let selectors = document.getElementById('selectedGenres');
    selectors.textContent = '';
    allGenres.forEach(genre => {
        // genre selector
        let label = document.createElement('label');
        let box = document.createElement("input");
        box.setAttribute('type', 'checkbox');
        box.value = genre;
        box.addEventListener('change', saveSettingsAndReload);
        label.appendChild(box);
        label.appendChild(document.createTextNode(genre));
        selectors.appendChild(label);
    });
    // link to add new genre
    let newGenre = document.createElement('button');
    newGenre.textContent = 'Add New Genre';
    newGenre.addEventListener('click', addNewGenre);
    selectors.appendChild(newGenre);
}

// Prompts user for new genre and adds it to allGenres
function addNewGenre() {
    let genre = prompt('Enter new genre:');
    if (genre) {
        allGenres.push(genre);
        setupGenreSelectors();
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
function resetFilters(save=true) {
    document.getElementById('filter_search').value = 'any';
    document.getElementById('filter_keyword').value = '';
    updateFilters(save);
}

// Update table rows based on filter form values
function updateFilters(save=true) {
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
            row.classList.add('show');
        } else {
            row.classList.remove('show');
        }
    }
    if (save) {
        saveSettings();
    }
    endWait();
}

// Sort table rows by column
async function tableSort(ev) {
    let project = getProject();
    if (project.status) {
        alert('Sorting is disabled when in paging mode.');
        return;
    }
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

function getCookie(name) {
    const cookies = document.cookie.split('; ');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].split('=');
      if (cookie[0] === name) {
        return decodeURIComponent(cookie[1]);
      }
    }
    return null;
}

function setCookie(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value) + ";" + expires + ";path=/;SameSite=Lax";
}

function initProjectStatus() {
    let project = getProject();
    let btnNext = document.getElementById('project_next');
    let pageSize = document.getElementById('project_size');
    if (!project.status) {
        document.getElementById('project_toggle').textContent = 'Start';
        btnNext.style.display = 'none';
        pageSize.removeAttribute('disabled');
    } else {
        document.getElementById('project_toggle').textContent = 'Stop';
        btnNext.style.display = 'inline';
        pageSize.setAttribute('disabled', 'disabled');
        nextProjectPage(false);
    }
}

function toggleProject() {
    let project = getProject();
    let btn = document.getElementById('project_toggle');
    let pageSize = document.getElementById('project_size');
    let btnNext = document.getElementById('project_next');
    if (!project.status) {
        project.status = true;
        project.pageSize = pageSize.value;
        btn.textContent = 'Stop';
        pageSize.setAttribute('disabled', 'disabled');
        btnNext.style.display = 'inline';
        saveProject(project);
        nextProjectPage(false);
    } else {
        project.status = false;
        btn.textContent = 'Start';
        pageSize.removeAttribute('disabled');
        btnNext.style.display = 'none';
        saveProject(project);
        updateFilters(false);
    }
}

function nextProjectPage(increment=true) {
    let project = getProject();
    if (increment) {
        project.page++;
        saveProject(project);
    }
    let tbl = document.getElementById('tracks');
    let rows = tbl.getElementsByTagName('tbody')[0].getElementsByTagName('tr');
    for (let i=0; i<rows.length; i++) {
        let row = rows[i];
        if (i >= project.page * project.pageSize && i < (project.page + 1) * project.pageSize) {
            row.classList.add('show');
        } else {
            row.classList.remove('show');
        }
    }
    document.getElementById('status').textContent = 'Page ' + (project.page + 1) + ' of ' + Math.ceil(rows.length / project.pageSize);
}

// Reads the project from cookie and returns object
function getProject() {
    let pageSize = document.getElementById('project_size').value;
    let project = getCookie('project');
    if (project != null) {
        return JSON.parse(project);
    } 
    return {"pageSize": Number(pageSize), "page": 0, "status": false};
}

function saveProject(project) {
    setCookie('project', JSON.stringify(project), 365);
}

function resetProject() {
    setCookie('project', '', -1);
    initProjectStatus();
    updateFilters();
}