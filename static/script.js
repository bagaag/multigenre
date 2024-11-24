const apiUrl = '/api/';
const appTitle = 'Multigenre';
const loadingText = 'Loading...';
const sleep = (delay) => new Promise((resolve) => setTimeout(resolve, delay))
var allGenres = []; // all available genres
var selectedGenres = []; // selected genres to display in table
var tracks = []; // array of all track objects
var filteredTracks = [];
var settings = settingsGet(); // app settings

async function appInit(cached=true) {
    waitStart();
    uiReset();
    // get tracks from api
    let result = await fetch(apiUrl + (cached ? 'scan/cached' : 'scan'));
    tracks = await result.json();
    // setup app screen
    genresCollect();
    genreSelectorsCreate();
    settingsLoad();
    filterApply(save=false);    
    tracksLoad();
    pageNavButtonStateSet();
    // button event listeners
    document.getElementById('filter_button').addEventListener('click', filterApply);
    document.getElementById('filter_reset').addEventListener('click', filterReset);
    document.getElementById('clear_cache').addEventListener('click', cacheClear);
    document.getElementById('toggle_genres').addEventListener('click', genreSelectorVisibilityToggle);
    document.getElementById('page_apply').addEventListener('click', pageSizeApply);    
    document.getElementById('page_prev').addEventListener('click', pagePrev);
    document.getElementById('page_next').addEventListener('click', pageNext);
    document.getElementById('page_reset').addEventListener('click', pagingReset);
    document.getElementById('order_reset').addEventListener('click', tracksOrderReset);
    // sort event listeners
    document.getElementById('tracks').getElementsByTagName('thead')[0].addEventListener('click', tracksOrderEvent);
    waitEnd();
}
appInit();

// Reloads the page without using cached data
function cacheClear() {
    appInit(false);
}

/* ===== UTILITIES ===== */

function cookieGet(name) {
    const cookies = document.cookie.split('; ');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].split('=');
      if (cookie[0] === name) {
        return decodeURIComponent(cookie[1]);
      }
    }
    return null;
}

function cookieSet(name, value, days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    const expires = "expires=" + date.toUTCString();
    document.cookie = name + "=" + encodeURIComponent(value) + ";" + expires + ";path=/;SameSite=Lax";
}

function numberWithCommas(x) {
    return x.toString().replace(/\B(?<!\.\d*)(?=(\d{3})+(?!\d))/g, ",");
}

/* ===== FILTERING ===== */

// Update table rows based on filter form values
function filterApply(save=true) {
    if (save && settings.page > 0) {
        if (!confirm('Changing filters will reset the saved page number to 1. Continue?')) {
            return;
        }
    }
    let search = document.getElementById('filter_search').value;
    let keyword = document.getElementById('filter_keyword').value.toLowerCase();
    filteredTracks = tracks.filter(track => {
        let artist = track.artist.toLowerCase();
        let album = track.album.toLowerCase();
        let title = track.title.toLowerCase();
        let year = track.year.toLowerCase();
        let genres = track.genres.join(', ').toLowerCase();
        let include = false;
        if (keyword == '') {
            include = true
        } else if (search == 'any') {
            include = artist.includes(keyword) || album.includes(keyword) || 
                   title.includes(keyword) || year.includes(keyword) || 
                   genres.includes(keyword);
        } else if (search == 'artist') {
            include = artist.includes(keyword);
        } else if (search == 'album') {
            include = album.includes(keyword);
        } else if (search == 'title') {
            include = title.includes(keyword);
        } else if (search == 'year') {
            if (keyword.includes('-')) {
                let range = keyword.split('-');
                include = year >= range[0] && year <= range[1];
            } else {            
                include = year.includes(keyword);
            }
        } else if (search == 'genre') {
            include = genres.includes(keyword);
        }
        return include;
    });
    if (save) {
        pagingReset();
        settingsSave();
    }
}

// Clear filter form and reset search results
function filterReset(save=true) {
    document.getElementById('filter_search').value = 'any';
    document.getElementById('filter_keyword').value = '';
    filterApply(save);
}

/* ===== GENRES ===== */

// Prompts user for new genre and adds it to allGenres
function genreAdd() {
    let genre = prompt('Enter new genre:');
    if (genre) {
        if (!allGenres.includes(genre)) {
            allGenres.push(genre);
            createGlobalGenreSelectors();
            document.querySelector('#selectedGenres input[value="' + genre + '"]').checked = true;
            settingsSave();
            trackGenreSelectorsCreate();
        } else {
            alert('Genre already exists.');
        }
    }
}

// Shows/hides the genres block
function genreSelectorVisibilityToggle() {
    let settingsDiv = document.getElementById('selectedGenres');
    let btn = document.getElementById('toggle_genres');
    if (settingsDiv.style.display === 'none') {
        settingsDiv.style.display = 'block';
        btn.textContent = 'Hide Grenres';
    } else {
        settingsDiv.style.display = 'none';
        btn.textContent = 'Show Genres';
    }
    settingsSave();
}

// Collects genres from all tracks and populates global list
function genresCollect() {
    tracks.forEach(track => {
        let genres = track.genres;
        genres.forEach(genre => {
            if (!allGenres.includes(genre) && genre !== '') {
                allGenres.push(genre);
            }
        });            
    });
    allGenres.sort();
}

function genresSelectedClear() {
    let selectors = document.getElementById('selectedGenres').lastChild;
    selectors.textContent = '';
}

// Unchecks all genre selector checkboxes
function genresSelectedReset() {
    let boxes = document.getElementById('selectedGenres').querySelectorAll('input');
    boxes.forEach(box => box.checked = false);
    settingsSaveAndReload();
}

// Creates global genre selection checkbox for each genre
function genreSelectorsCreate() {
    let selectors = document.getElementById('selectedGenres');
    selectors.textContent = '';
    allGenres.forEach(genre => {
        // genre selector
        let label = document.createElement('label');
        let box = document.createElement("input");
        box.setAttribute('type', 'checkbox');
        box.value = genre;
        label.appendChild(box);
        label.appendChild(document.createTextNode(genre));
        selectors.appendChild(label);
    });
    // link to apply selected genres
    let apply = document.createElement('button');
    apply.textContent = 'Apply';
    apply.addEventListener('click', settingsSaveAndReload);
    selectors.appendChild(apply);
    // link to add new genre
    let newGenre = document.createElement('button');
    newGenre.textContent = 'Add Genre';
    newGenre.addEventListener('click', genreAdd);
    selectors.appendChild(newGenre);
    // link to remove all selected genres
    let reset = document.createElement('button');
    reset.textContent = 'Reset ';
    reset.setAttribute('class', 'btn-link');
    reset.addEventListener('click', genresSelectedReset);
    selectors.appendChild(reset);
}

/* ===== PAGING ===== */

function pageHasNext() {
    return settings.page < Math.ceil(filteredTracks.length / settings.pageSize) - 1;
}

function pageHasPrev() {
    return settings.page > 0;
}

function pagePrev() {
    if (pageHasPrev()) {
        settings.page--;
        settingsSave();
        tracksLoad();
    }
    pageNavButtonStateSet();
}

function pageNavButtonStateSet() {
    document.getElementById('page_prev').disabled = !pageHasPrev();
    document.getElementById('page_next').disabled = !pageHasNext();
}

function pageNext() {
    if (pageHasNext()) {
        settings.page++;    
        settingsSave();
        tracksLoad();
    }
    pageNavButtonStateSet();
}

function pageSizeApply() {
    let startIx = settings.page * settings.pageSize;
    settings.pageSize = Number(document.getElementById('page_size').value);
    settings.page = Math.floor(startIx / settings.pageSize);
    settingsSave();
    tracksLoad();
}

function pagingReset() {
    settings.page = 0;
    settingsSave();
    tracksLoad();
    pageNavButtonStateSet();
}

/* ===== SETTINGS ===== */

// Loads settings from cookie and returns object
function settingsGet() {
    let json = cookieGet('multigenre-settings');
    if (json != null) {
        let settings = JSON.parse(json);
        return settings;
    }
    return { 
            selectedGenres: [], 
            settingsVisible: false, 
            filterSearch: 'any', 
            filterKeyword: '',
            pageSize: 100,
            page: 0,
            order: []
           };
}

// Loads settings from cookie
function settingsLoad() {
    console.log('loading', settings);
    // load genre selector UI state
    let settingsDiv = document.getElementById('selectedGenres');
    settingsDiv.style.display = settings.genresVisible ? 'block' : 'none';
    let btn = document.getElementById('toggle_genres');
    btn.textContent = settings.genresVisible ? 'Hide Genres' : 'Show Genres';
    // load filters
    let filterSearch = document.getElementById('filter_search');
    filterSearch.value = settings.filterSearch;
    let filterKeyword = document.getElementById('filter_keyword');
    filterKeyword.value = settings.filterKeyword;
    // load page size
    let pageSize = document.getElementById('page_size');
    pageSize.value = settings.pageSize;
}

// Saves currently selected genres to cookie
function settingsSave() {
    settings.selectedGenres = Array.from(document.getElementById('selectedGenres').querySelectorAll('input:checked')).map(el => el.value);
    settings.filterSearch = document.getElementById('filter_search').value;
    settings.filterKeyword = document.getElementById('filter_keyword').value;
    settings.genresVisible = document.getElementById('selectedGenres').style.display != 'none';
    settings.pageSize = Number(document.getElementById('page_size').value);
    cookieSet('multigenre-settings', JSON.stringify(settings), 365);
}

async function settingsSaveAndReload() {
    settingsSave();
    window.location.reload();
}

/* ===== MISC UI ===== */

function statusTextSet(text) {
    let status = document.getElementById('status');
    let trackCountText = numberWithCommas(tracks.length);
    let filteredCountText = numberWithCommas(filteredTracks.length);
    let pageCountText = numberWithCommas(Math.ceil(filteredTracks.length / settings.pageSize));
    if (text) {
        status.textContent = text;
    } else {
        if (filteredTracks.length === tracks.length) {
            status.textContent = trackCountText + ' tracks; ';            
        } else {
            status.textContent = 'Filtered ' + filteredCountText + ' of ' + trackCountText + ' tracks; ';
        }
        status.textContent += 'Page ' + (settings.page + 1) + ' of ' + pageCountText;
    }
    // display order
    if (settings.order.length > 0) {
        document.getElementById('order').textContent = settings.order.flatMap(o => o.field).reverse().join(', ');
    } else {
        document.getElementById('order').textContent = 'Default';
    }
}

function uiReset() {
    tracksClear();
    genresSelectedClear();
}

/* ===== TRACKS ===== */

// Adds a track to the table
function trackAdd(track) {
    let tbl = document.getElementById('tracks');
    let row = tbl.getElementsByTagName('tbody')[0].insertRow();
    row.classList.add('visible-track');
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

// Creates genre checkboxes for every visible track
function trackGenreSelectorsCreate() {
    let selectedGenres = settings.selectedGenres;
    // check selected genres
    let boxes = document.getElementById('selectedGenres').querySelectorAll('input');
    boxes.forEach(box => {
        let genre = box.value;
        if (selectedGenres.includes(genre)) {
            box.checked = true;
        }
    });
    // add genre checkboxes to each track
    let genreCells = Array.from(document.getElementsByClassName('track-genres'));
    for (let i=0; i<genreCells.length; i++) {
        let cell = genreCells[i];
        cell.textContent = '';
        selectedGenres.forEach(genre => {
            let trackId = cell.parentElement.getAttribute('id').split('_')[1];
            let track = tracks.find(t => t.id === trackId);
            // create track row checkbox
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
                trackGenreToggle(trackId, genre, box.checked);
            });
        });
    }
    // create select/unselect all checkbox
    let selectAll = document.getElementById('genre_all');
    selectAll.textContent = '';
    selectedGenres.forEach(genre => {
        let label2 = document.createElement('label');
        let box2 = document.createElement("input");
        box2.setAttribute('type', 'checkbox');
        box2.value = genre;
        label2.appendChild(box2);
        label2.appendChild(document.createTextNode(genre));
        box2.addEventListener('change', function(ev) {
            let genre = ev.target.value;
            trackGenreToggleAll(genre, ev.target.checked);
        });
        selectAll.appendChild(label2);
    });
}

// Adds or removes a genre for a specified track
async function trackGenreToggle(trackId, genre, checked) {
    await waitStart();
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
    waitEnd();
}

// Sets or unsets a genre for all tracks on the current page
async function trackGenreToggleAll(genre, selected) {
    let rows = document.querySelectorAll('#tracks > tbody > tr');
    for (let i=0; i<rows.length; i++) {
        let row = rows[i];
        let trackId = row.id.split('_')[1];
        let box = row.querySelector('input[value="' + genre + '"]');
        if (box && box.checked !== selected) {            
            box.checked = selected;
            await trackGenreToggle(trackId, genre, selected);
        }
    }
}

// Play a track
function trackPlay(trackId) {
    let audio = document.getElementById('audio');
    let track = tracks.find(t => t.id === trackId);
    document.title = 'Multigenre - ' + track.title + ' by ' + track.artist;
    audio.src = '/static/music/' + track.file;
    audio.play();
}

function tracksClear() {
    let table = document.getElementById('tracks');
    let rowCount = table.getElementsByTagName('tbody')[0].getElementsByTagName('tr').length;
    for (let i=0; i<rowCount; i++) {
        table.deleteRow(1);
    }
}

function tracksLoad() {
    tracksClear();
    // uncheck all genre checkboxes
    selectAllBoxes = document.getElementById('genre_all').querySelectorAll('input');
    selectAllBoxes.forEach(box => {
        box.checked = false
    });
    // load tracks
    let startIndex = settings.page * settings.pageSize;
    let endIndex = Math.min(filteredTracks.length, startIndex + settings.pageSize);
    for (let i=startIndex; i<endIndex; i++) {
        let track = filteredTracks[i];
        if (track.title === '') {
            track.title = track.file;
        }
        trackAdd(track);
    }
    trackGenreSelectorsCreate();
    statusTextSet();
}

// Respond to click on table header to change order
function tracksOrderEvent(ev) {
    let target = ev.target;
    if (!target.dataset.field) {
        return;
    }
    if (settings.page > 0) {
        if (!confirm('Changing the order will reset the saved page number to 1. Continue?')) {
            return;
        }
    }
    settings.order.push({
        field: target.dataset.field, 
        type: target.dataset.type, 
        asc: true
    });
    tracksOrder();
}

// Order tracks
function tracksOrder() {
    settings.order.forEach(order => {
        let field = order.field;
        let numeric = order.type === 'int';
        filteredTracks.sort((a, b) => {
            let aVal = numeric ? Number(a[field]) : a[field];
            let bVal = numeric ? Number(b[field]) : b[field];
            if (aVal < bVal) return -1;
            if (aVal > bVal) return 1;
            return 0;
        });
    });
    pagingReset();
}

function tracksOrderReset() {
    if (settings.page > 0 && !confirm('Changing the order will reset the saved page number to 1. Continue?')) {
        return;
    }
    settings.order = [];
    settingsSaveAndReload();
}

/* ===== WAIT/LOADING ===== */

function waitStart() {
    document.title = loadingText;
    document.getElementsByTagName('body')[0].style.cursor = 'wait';
    document.getElementById('status').textContent = loadingText;
}
function waitEnd() {
    let count = document.getElementById('tracks').getElementsByTagName('tbody')[0].querySelectorAll('tr.show').length;
    document.title = appTitle;
    document.getElementsByTagName('body')[0].style.cursor = 'default';
    statusTextSet();
}

