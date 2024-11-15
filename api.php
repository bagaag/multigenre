<?php
require __DIR__ . '/vendor/autoload.php';

$action = $_GET["action"];
$music_dir = __DIR__ . '/music';

// Recursively collect all music files in the given directory
function collectTrackFiles($dir, $files = []) {
    $entries = glob($dir . '/*');
    foreach ($entries as $entry) {
        if (is_dir($entry)) {
            $files = collectTrackFiles($entry, $files);
        } else if (str_ends_with($entry, '.mp3') || str_ends_with($entry, '.m4a')) {
            $files[] = $entry;
        }
    }
    return $files;
}

// Scan a track file and return its ID3 metadata
function scanTrack($file) {
    global $music_dir;
    $getID3 = new getID3;
    $track = $getID3->analyze($file);
    $tag_set = $track['tags_html'];
    $tag_set_keys = array_keys($tag_set);
    if (in_array('quicktime', $tag_set_keys)) {
        $tags = $tag_set['quicktime'];
    } else if (in_array('id3v2', $tag_set_keys)) {
        $tags = $tag_set['id3v2'];
    } else if (in_array('id3v1', $tag_set_keys)) {
        $tags = $tag_set['id3v1'];
    } else {
        return array_keys($tag_set);
    }
    $ret = ['file' => substr($file, strlen($music_dir) + 1)];
    $ret['id'] = md5($file);
    $tag_names = array_keys($tags);
    if ($tag_set != '') {
        $ret['title'] = $tags['title'][0] ?? '';
        $ret['album'] = $tags['album'][0] ?? '';
        $ret['artist'] = $tags['artist'][0] ?? '';
        if (in_array('creation_date', $tag_names)) {
            $ret['year'] = substr($tags['creation_date'][0] ?? '', 0, 4);
        } else {
            $ret['year'] = substr($tags['year'][0] ?? '', 0, 4);
        }
        $ret['trackNumber'] = intval($tags['track_number'][0] ?? '0');
        $genres = $tags['genre'] ?? [];
        if (count($genres) == 1) {
            $ret['genres'] = explode(';', $genres[0]);
        } else {
            $ret['genres'] = $genres;
        }
    }
    return $ret;
}

/** Action handlers */
if ($action == 'scan') {
    $trackFiles = collectTrackFiles($music_dir);
    $tracks = array_map('scanTrack', $trackFiles);
    echo json_encode($tracks, JSON_UNESCAPED_SLASHES);
}
