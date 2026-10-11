/*
  YouTube Music playlist export. No dependencies, no build step.

  Talks to exactly one place: the YouTube Data API v3 at googleapis.com, using
  an API key the visitor brings. That is the whole reason this works without
  being throttled: scraping YouTube's pages hits rate limits and bot checks,
  whereas the official API is metered by a free daily quota (10,000 units) and
  a playlist costs about one unit per 50 tracks.

  Three calls, in order:

    1. playlists.list      title, owner, and thumbnail of the playlist
    2. playlistItems.list  the tracks, 50 per page, following nextPageToken
    3. videos.list         durations, 50 ids per call

  Two outputs come out of that. `raw` is the response bodies exactly as Google
  returned them, and `music` is derived from `raw` alone by shape(), so the
  friendly version can always be traced back to the source. Request URLs are
  never kept, which means the key cannot end up in anything copied or saved.

  The API has no artist field, so artists are inferred. See toTrack().

  Everything above init() is pure and is exported when this file is loaded by
  Node, for script/ytm.test.js. In the browser it is wrapped in an IIFE like
  /blackjack/, and the DOM is built with textContent, never innerHTML.
*/
(function () {
  'use strict';

  var API = 'https://www.googleapis.com/youtube/v3/';
  var MUSIC = 'https://music.youtube.com/';
  var PAGE_SIZE = 50;
  /* YouTube caps a playlist at 5,000 items, which is 100 pages. The guard is
     there so a misbehaving nextPageToken cannot loop forever on someone's
     quota. */
  var MAX_PAGES = 120;
  var STORE_KEY = 'ytm.apiKey';
  var THUMB_ORDER = ['maxres', 'standard', 'high', 'medium', 'default'];
  var UNAVAILABLE_TITLES = ['Private video', 'Deleted video'];
  /* Liked Music and the old Liked videos list. Both are private to their
     owner and an API key, which carries no identity, can never read them. */
  var PRIVATE_IDS = ['LM', 'LL', 'WL'];

  /* ── Input ─────────────────────────────────────────── */

  /* Accepts a raw playlist id or any URL carrying one:
       https://music.youtube.com/playlist?list=PL...
       https://music.youtube.com/browse/VLPL...   (browse ids are "VL" + id)
       https://www.youtube.com/watch?v=...&list=PL...
     Returns null when nothing usable is found. */
  function parsePlaylistId(input) {
    var value = String(input == null ? '' : input).trim();
    if (!value) return null;

    var id = value;
    if (/^https?:\/\//i.test(value) || /^(www\.|music\.|m\.)?youtube\.com\//i.test(value)) {
      var url;
      try {
        url = new URL(/^https?:\/\//i.test(value) ? value : 'https://' + value);
      } catch (e) {
        return null;
      }
      id = url.searchParams.get('list');
      if (!id) {
        var browse = url.pathname.match(/\/browse\/([\w-]+)/);
        id = browse ? browse[1] : null;
      }
      if (!id) return null;
    }

    if (/^VL[\w-]{2,}$/.test(id)) id = id.slice(2);
    return /^[\w-]{2,}$/.test(id) ? id : null;
  }

  function isPrivateId(id) {
    return PRIVATE_IDS.indexOf(id) !== -1;
  }

  /* ── Small formatting helpers ──────────────────────── */

  /* ISO 8601 durations as the API returns them: PT4M13S, PT1H2M3S, P1DT2H.
     Live streams report P0D. Anything unparseable is null rather than 0, so
     "unknown" and "zero seconds" stay distinguishable in the output. */
  function parseIsoDuration(iso) {
    if (typeof iso !== 'string') return null;
    var m = iso.match(/^P(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/);
    if (!m) return null;
    return (Number(m[1] || 0) * 86400) +
      (Number(m[2] || 0) * 3600) +
      (Number(m[3] || 0) * 60) +
      Number(m[4] || 0);
  }

  function formatDuration(seconds) {
    if (typeof seconds !== 'number' || !isFinite(seconds) || seconds < 0) return null;
    var h = Math.floor(seconds / 3600);
    var m = Math.floor((seconds % 3600) / 60);
    var s = seconds % 60;
    var ss = (s < 10 ? '0' : '') + s;
    if (h > 0) return h + ':' + (m < 10 ? '0' : '') + m + ':' + ss;
    return m + ':' + ss;
  }

  function pickThumbnail(thumbnails) {
    if (!thumbnails) return null;
    for (var i = 0; i < THUMB_ORDER.length; i++) {
      var t = thumbnails[THUMB_ORDER[i]];
      if (t && t.url) return t.url;
    }
    return null;
  }

  function chunk(list, size) {
    var out = [];
    for (var i = 0; i < list.length; i += size) out.push(list.slice(i, i + size));
    return out;
  }

  function unique(list) {
    var seen = {};
    return list.filter(function (item) {
      var k = item.toLowerCase();
      if (seen[k]) return false;
      seen[k] = true;
      return true;
    });
  }

  function slugify(text) {
    var slug = String(text == null ? '' : text)
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 80)
      .replace(/-+$/, '');
    return slug || 'playlist';
  }

  /* ── Artist and title inference ────────────────────── */

  /* Auto-generated "Topic" uploads, which are most of what YouTube Music
     plays, carry a description in a fixed shape:

       Provided to YouTube by <label>

       Song Title · Artist A · Artist B

       Album Name

       (P) 2020 ...

     The middle-dot line is the most reliable artist data the API exposes, and
     the paragraph after it is the album. */
  function parseTopicDescription(description) {
    if (typeof description !== 'string' || !description) return null;
    var paragraphs = description
      .replace(/\r\n?/g, '\n')
      .split(/\n\s*\n/)
      .map(function (p) { return p.trim(); })
      .filter(Boolean);

    for (var i = 0; i < paragraphs.length; i++) {
      var line = paragraphs[i].split('\n')[0];
      if (line.indexOf(' \u00b7 ') === -1) continue;

      var parts = line.split(' \u00b7 ').map(function (p) { return p.trim(); }).filter(Boolean);
      if (parts.length < 2) continue;

      var next = paragraphs[i + 1] || '';
      var album = next && !/^(\u2117|\u00a9|Released on:|Auto-generated by YouTube)/.test(next) &&
        next.indexOf('\n') === -1 ? next : null;

      return { title: parts[0], artists: unique(parts.slice(1)), album: album };
    }
    return null;
  }

  /* Noise that uploaders bolt onto titles. Only bracketed forms are removed,
     so a song genuinely called "Audio" survives. */
  var TITLE_NOISE = new RegExp(
    '\\s*[\\(\\[]\\s*(?:' + [
      'official\\s+(?:music\\s+|lyric\\s+|hd\\s+|4k\\s+)?(?:video|audio|visuali[sz]er)',
      'official',
      'lyrics?(?:\\s+video)?',
      'audio',
      'visuali[sz]er',
      'music\\s+video',
      'video\\s+oficial',
      'hd|hq|4k',
      'explicit|clean',
      'm\\/v|mv'
    ].join('|') + ')\\s*[\\)\\]]',
    'gi'
  );

  function cleanTitle(title) {
    return String(title == null ? '' : title).replace(TITLE_NOISE, '').replace(/\s{2,}/g, ' ').trim();
  }

  /* "Song (feat. Someone)" and "Song ft. Someone, Other". Featured names move
     into the artist list. Ampersands are left alone because they are as often
     part of one act's name ("Simon & Garfunkel") as a join between two. */
  function splitFeatured(title) {
    var m = String(title).match(/\s*[\(\[]?\s*\b(?:feat\.?|ft\.?|featuring)\s+([^\)\]]+?)\s*[\)\]]?\s*$/i);
    if (!m) return { title: String(title).trim(), featured: [] };
    var featured = m[1].split(/\s*,\s*/).map(function (a) { return a.trim(); }).filter(Boolean);
    return { title: String(title).slice(0, m.index).trim(), featured: featured };
  }

  /* "Artist - Title", the convention for official music videos. Hyphen, en
     dash, and em dash separators are all accepted; they are written as
     escapes here because this repository keeps the em dash character out. */
  function parseTitleArtist(title) {
    var cleaned = cleanTitle(title);
    var m = cleaned.match(/^(.+?)\s+[-\u2013\u2014]\s+(.+)$/);
    if (!m) return null;
    return { artist: m[1].trim(), title: m[2].trim() };
  }

  function artistFromChannel(channel) {
    var name = String(channel == null ? '' : channel)
      .replace(/\s+-\s+Topic$/, '')
      .replace(/\s*VEVO$/i, '')
      .trim();
    return name || null;
  }

  function isTopicChannel(channel) {
    return / - Topic$/.test(String(channel || ''));
  }

  function videoIdOf(item) {
    var cd = (item && item.contentDetails) || {};
    var sn = (item && item.snippet) || {};
    return cd.videoId || (sn.resourceId && sn.resourceId.videoId) || null;
  }

  function isUnavailable(item) {
    var sn = (item && item.snippet) || {};
    return !videoIdOf(item) || UNAVAILABLE_TITLES.indexOf(sn.title) !== -1;
  }

  /* One playlist item to one track. Artist inference, most reliable first:
       1. Topic upload with a parseable description: title, artists, album.
       2. Topic upload without one: the title as-is, artist from the channel.
          Never split on a dash here, since "Song - Live" is a title.
       3. Anything else titled "Artist - Title": split it.
       4. Otherwise: the title, with the uploading channel as the artist. */
  function toTrack(item, durationIso, number) {
    var sn = item.snippet || {};
    var channel = sn.videoOwnerChannelTitle || '';
    var videoId = videoIdOf(item);
    var title;
    var artists = [];
    var album = null;

    var topic = isTopicChannel(channel) ? parseTopicDescription(sn.description) : null;
    var split = topic || isTopicChannel(channel) ? null : parseTitleArtist(sn.title);

    if (topic) {
      title = topic.title;
      artists = topic.artists;
      album = topic.album;
    } else if (split) {
      title = split.title;
      artists = split.artist.split(/\s*,\s*/);
    } else {
      title = cleanTitle(sn.title);
      var fromChannel = artistFromChannel(channel);
      if (fromChannel) artists = [fromChannel];
    }

    var feat = splitFeatured(title);
    title = feat.title;
    artists = unique(artists.concat(feat.featured).filter(Boolean));

    var seconds = parseIsoDuration(durationIso);
    return {
      number: number,
      title: title,
      artist: artists.join(', '),
      artists: artists,
      album: album,
      duration: formatDuration(seconds),
      durationSeconds: seconds,
      thumbnailUrl: pickThumbnail(sn.thumbnails),
      url: MUSIC + 'watch?v=' + videoId,
      videoId: videoId
    };
  }

  /* The music output, built from the raw output alone. Unavailable entries
     are counted rather than listed, and the remaining tracks are numbered
     1..N so the numbers match what a listener actually hears. */
  function shape(raw, exportedAt) {
    var playlist = ((raw && raw.playlists && raw.playlists.items) || [])[0] || {};
    var ps = playlist.snippet || {};

    var durations = {};
    ((raw && raw.videos) || []).forEach(function (res) {
      ((res && res.items) || []).forEach(function (v) {
        durations[v.id] = v.contentDetails && v.contentDetails.duration;
      });
    });

    var tracks = [];
    var skipped = 0;
    ((raw && raw.playlistItems) || []).forEach(function (page) {
      ((page && page.items) || []).forEach(function (item) {
        if (isUnavailable(item)) {
          skipped++;
          return;
        }
        tracks.push(toTrack(item, durations[videoIdOf(item)], tracks.length + 1));
      });
    });

    return {
      id: playlist.id || null,
      title: ps.title || null,
      owner: ps.channelTitle || null,
      url: playlist.id ? MUSIC + 'playlist?list=' + playlist.id : null,
      thumbnailUrl: pickThumbnail(ps.thumbnails),
      trackCount: tracks.length,
      tracks: tracks,
      skipped: skipped,
      exportedAt: exportedAt || null
    };
  }

  /* ── Errors ────────────────────────────────────────── */

  /* Google reports the cause in two places depending on the failure: the
     legacy `errors[].reason` and the newer `details[].reason`. Both are read. */
  function describeError(status, body, origin) {
    var err = (body && body.error) || {};
    var reasons = [];
    (err.errors || []).forEach(function (e) { if (e && e.reason) reasons.push(e.reason); });
    (err.details || []).forEach(function (d) { if (d && d.reason) reasons.push(d.reason); });
    function has(r) { return reasons.indexOf(r) !== -1; }
    var message = err.message || '';

    if (has('API_KEY_INVALID') || has('keyInvalid') || /API key not valid/i.test(message)) {
      return 'That API key was rejected. Check that it was copied in full.';
    }
    if (has('API_KEY_HTTP_REFERRER_BLOCKED') || /referer/i.test(message)) {
      return 'This key is restricted to other websites. Add ' + (origin || 'this site') +
        '/* to its website restrictions, then try again.';
    }
    if (has('API_KEY_SERVICE_BLOCKED')) {
      return 'This key is restricted to other APIs. Allow YouTube Data API v3 on it.';
    }
    if (has('accessNotConfigured') || has('SERVICE_DISABLED')) {
      return 'YouTube Data API v3 is not enabled for this key\'s project. Enable it (step 2), wait a minute, and try again.';
    }
    if (has('quotaExceeded') || has('dailyLimitExceeded') || has('RATE_LIMIT_EXCEEDED')) {
      return 'This key has used its daily quota. It resets at midnight Pacific time.';
    }
    if (has('playlistNotFound') || status === 404) {
      return 'Playlist not found. Check the id, and that the playlist is public.';
    }
    if (has('playlistItemsNotAccessible') || has('forbidden')) {
      return 'This playlist is not public, so an API key cannot read it.';
    }
    return 'YouTube returned an error (' + status + (message ? ': ' + message : '') + ').';
  }

  /* ── Network ───────────────────────────────────────── */

  function apiGet(resource, params, key) {
    var url = new URL(API + resource);
    Object.keys(params).forEach(function (k) {
      if (params[k] !== undefined && params[k] !== null && params[k] !== '') {
        url.searchParams.set(k, params[k]);
      }
    });
    url.searchParams.set('key', key);

    return fetch(url.toString(), { headers: { Accept: 'application/json' } })
      .catch(function () {
        throw new Error('Could not reach YouTube. Check your connection and try again.');
      })
      .then(function (res) {
        return res.json().catch(function () { return null; }).then(function (body) {
          if (!res.ok) throw new Error(describeError(res.status, body, window.location.origin));
          return body;
        });
      });
  }

  async function fetchPlaylist(id, key, progress) {
    var raw = { playlists: null, playlistItems: [], videos: [] };

    progress('Looking up the playlist.');
    raw.playlists = await apiGet('playlists', { part: 'snippet,contentDetails', id: id, maxResults: 1 }, key);
    var playlist = (raw.playlists.items || [])[0];
    if (!playlist) {
      throw new Error('Playlist not found. It may be private, or the id may be wrong.');
    }
    var total = (playlist.contentDetails && playlist.contentDetails.itemCount) || 0;

    var token = null;
    var fetched = 0;
    var pages = 0;
    do {
      var page = await apiGet('playlistItems', {
        part: 'snippet,contentDetails',
        playlistId: id,
        maxResults: PAGE_SIZE,
        pageToken: token
      }, key);
      raw.playlistItems.push(page);
      fetched += (page.items || []).length;
      pages++;
      progress('Fetched ' + fetched + (total ? ' / ' + total : '') + ' tracks.');
      token = page.nextPageToken || null;
    } while (token && pages < MAX_PAGES);

    var ids = [];
    raw.playlistItems.forEach(function (p) {
      (p.items || []).forEach(function (item) {
        if (!isUnavailable(item)) ids.push(videoIdOf(item));
      });
    });
    ids = ids.filter(function (v, i) { return ids.indexOf(v) === i; });

    var batches = chunk(ids, PAGE_SIZE);
    for (var b = 0; b < batches.length; b++) {
      progress('Fetching durations (' + (b + 1) + ' / ' + batches.length + ').');
      raw.videos.push(await apiGet('videos', {
        part: 'contentDetails',
        id: batches[b].join(','),
        maxResults: PAGE_SIZE
      }, key));
    }

    return raw;
  }

  var helpers = {
    parsePlaylistId: parsePlaylistId,
    isPrivateId: isPrivateId,
    parseIsoDuration: parseIsoDuration,
    formatDuration: formatDuration,
    pickThumbnail: pickThumbnail,
    chunk: chunk,
    slugify: slugify,
    parseTopicDescription: parseTopicDescription,
    cleanTitle: cleanTitle,
    splitFeatured: splitFeatured,
    parseTitleArtist: parseTitleArtist,
    artistFromChannel: artistFromChannel,
    toTrack: toTrack,
    shape: shape,
    describeError: describeError
  };

  if (typeof module === 'object' && module.exports) {
    module.exports = helpers;
    return;
  }

  /* ── Page ──────────────────────────────────────────── */

  var el = {};
  var outputs = { music: null, raw: null };
  var slug = 'playlist';
  var busy = false;

  /* Storage is wrapped because Safari throws on localStorage in some private
     modes, and a page that refuses to load is worse than one that forgets. */
  function loadKey() {
    try { return window.localStorage.getItem(STORE_KEY) || ''; } catch (e) { return ''; }
  }

  function saveKey(key) {
    try { window.localStorage.setItem(STORE_KEY, key); } catch (e) { /* forgetful is fine */ }
  }

  function clearKey() {
    try { window.localStorage.removeItem(STORE_KEY); } catch (e) { /* nothing to clear */ }
  }

  function say(text, tone) {
    el.status.textContent = text;
    el.status.className = 'ytm-status' + (tone ? ' ytm-status--' + tone : '');
  }

  function setBusy(on) {
    busy = on;
    el.retrieve.disabled = on;
    el.form.setAttribute('aria-busy', on ? 'true' : 'false');
  }

  function toggleSteps(open) {
    var show = typeof open === 'boolean' ? open : el.steps.hidden;
    el.steps.hidden = !show;
    el.stepsToggle.setAttribute('aria-expanded', show ? 'true' : 'false');
    el.stepsToggle.textContent = show ? 'hide key setup' : 'show key setup';
  }

  function render(music, raw) {
    outputs.music = JSON.stringify(music, null, 2);
    outputs.raw = JSON.stringify(raw, null, 2);
    slug = slugify(music.title || music.id);

    el.output.music.textContent = outputs.music;
    el.output.raw.textContent = outputs.raw;

    el.title.textContent = music.title || music.id;
    var meta = music.trackCount + (music.trackCount === 1 ? ' track' : ' tracks');
    if (music.owner) meta = music.owner + ' | ' + meta;
    if (music.skipped) meta += ', ' + music.skipped + ' unavailable skipped';
    el.meta.textContent = meta;

    if (music.thumbnailUrl) {
      el.cover.src = music.thumbnailUrl;
      el.cover.alt = 'Playlist thumbnail for ' + (music.title || music.id);
      el.cover.hidden = false;
    } else {
      el.cover.removeAttribute('src');
      el.cover.hidden = true;
    }

    el.results.hidden = false;
  }

  async function retrieve(e) {
    e.preventDefault();
    if (busy) return;

    var key = el.key.value.trim();
    var id = parsePlaylistId(el.list.value);

    if (!key) {
      say('Paste your API key first. The steps above show how to get one.', 'error');
      el.key.focus();
      return;
    }
    if (!id) {
      say('That does not look like a playlist URL or id.', 'error');
      el.list.focus();
      return;
    }
    if (isPrivateId(id)) {
      say('That is a private list (such as Liked Music). Only public playlists can be read with an API key.', 'error');
      return;
    }

    if (el.remember.checked) saveKey(key);
    else clearKey();

    setBusy(true);
    try {
      var raw = await fetchPlaylist(id, key, function (text) { say(text, null); });
      var music = shape(raw, new Date().toISOString());
      render(music, raw);
      say('Done. ' + music.trackCount + ' tracks exported' +
        (music.skipped ? ', ' + music.skipped + ' unavailable skipped.' : '.'), 'ok');
      if (el.remember.checked) toggleSteps(false);
    } catch (err) {
      say(err && err.message ? err.message : 'Something went wrong.', 'error');
    } finally {
      setBusy(false);
    }
  }

  function copy(which) {
    var text = outputs[which];
    if (!text) return;
    var done = function () { say('Copied the ' + which + ' JSON to the clipboard.', 'ok'); };
    var fail = function () { say('Copy failed. Select the text and copy it by hand.', 'error'); };
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(done, fail);
    } else {
      fail();
    }
  }

  function download(which) {
    var text = outputs[which];
    if (!text) return;
    var blob = new Blob([text + '\n'], { type: 'application/json' });
    var href = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = href;
    a.download = slug + (which === 'raw' ? '.raw' : '') + '.json';
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(function () { URL.revokeObjectURL(href); }, 0);
  }

  function init() {
    var root = document.getElementById('ytm');
    if (!root) return;

    function q(name) { return root.querySelector('[data-ytm="' + name + '"]'); }

    el.form = q('form');
    el.key = q('key');
    el.remember = q('remember');
    el.forget = q('forget');
    el.list = q('list');
    el.retrieve = q('retrieve');
    el.status = q('status');
    el.results = q('results');
    el.cover = q('cover');
    el.title = q('title');
    el.meta = q('meta');
    el.steps = document.querySelector('[data-ytm="steps"]');
    el.stepsToggle = q('stepsToggle');
    el.output = {
      music: root.querySelector('[data-ytm-output="music"]'),
      raw: root.querySelector('[data-ytm-output="raw"]')
    };

    el.form.addEventListener('submit', retrieve);

    el.forget.addEventListener('click', function () {
      clearKey();
      el.key.value = '';
      el.remember.checked = false;
      say('Key forgotten. Nothing is stored in this browser now.', 'ok');
      el.key.focus();
    });

    el.remember.addEventListener('change', function () {
      if (!el.remember.checked) clearKey();
    });

    el.stepsToggle.addEventListener('click', function () { toggleSteps(); });

    Array.prototype.forEach.call(root.querySelectorAll('[data-ytm-copy]'), function (btn) {
      btn.addEventListener('click', function () { copy(btn.getAttribute('data-ytm-copy')); });
    });
    Array.prototype.forEach.call(root.querySelectorAll('[data-ytm-download]'), function (btn) {
      btn.addEventListener('click', function () { download(btn.getAttribute('data-ytm-download')); });
    });

    var stored = loadKey();
    if (stored) {
      el.key.value = stored;
      el.remember.checked = true;
    }

    /* /ytm/?list=PL... prefills the playlist, so a link can carry it. */
    var preset = new URLSearchParams(window.location.search).get('list');
    if (preset) el.list.value = preset;

    root.hidden = false;
    el.stepsToggle.hidden = false;
    /* Folded away only when a key is already saved: a first-time visitor needs
       the steps, a returning one does not. Without JavaScript they stay open. */
    toggleSteps(!stored);
    var fallback = document.getElementById('ytm-nojs');
    if (fallback) fallback.hidden = true;
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
