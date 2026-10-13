#!/usr/bin/env node
/* Refreshes the mixtapes snapshot from YouTube.

     node script/mixtapes.js

   The key is read from YT_API_KEY, either in the environment or in a .env
   file at the repository root (gitignored), e.g. `YT_API_KEY=AIza...`.

   Finds every public playlist on the channel titled `mix.NNN.<title>.keep`,
   fetches its tracks with the same code /ytm/ uses, and writes one collection
   document per mixtape to _mixtapes/NNN.md plus its cover to
   assets/images/mixtapes/NNN.jpg: the square cover uploaded in YouTube
   Music, or the first track's thumbnail when there is none. Mixtapes no
   longer on the channel are removed. Review the diff, then commit it: the
   site never calls YouTube.

   The front matter is written as JSON, which YAML parses as-is, so no YAML
   library is needed. Anything below the closing `---` is kept across
   refreshes, which is where a note about a mixtape can go. */
'use strict';

const crypto = require('crypto');
const fs = require('fs');
const path = require('path');
const { execFileSync } = require('child_process');
const ytm = require('../assets/js/ytm.js');

const ROOT = path.join(__dirname, '..');
const CHANNEL_ID = 'UC1GUm0bdW_t7f2eB6Vpdxdw';
const DOCS_DIR = path.join(ROOT, '_mixtapes');
const COVERS_DIR = path.join(ROOT, 'assets', 'images', 'mixtapes');
const COVERS_URL = '/assets/images/mixtapes/';
const COVER_SIZE = 600;
const TITLE_PATTERN = /^mix\.(\d{3})\.(.+)\.keep$/;
const API = 'https://www.googleapis.com/youtube/v3/';

/* ── Pure helpers (exported for tests) ─────────────── */

/* Playlist titles are written as `mix.014.south_beach_radio.keep`; the name
   is shown with underscores as spaces and its case left alone. */
function parseMixTitle(title) {
  const m = TITLE_PATTERN.exec(String(title || '').trim());
  if (!m) return null;
  const name = m[2].replace(/_+/g, ' ').replace(/\s+/g, ' ').trim();
  return name ? { number: m[1], name: name } : null;
}

/* The square cover uploaded in YouTube Music is not in the Data API, which
   only offers the first track's thumbnail. The public playlist page lists it
   as og:image, once per size, smallest first. Only an uploaded cover (under
   /pl_c/) counts: anything else is the same first-track fallback. */
function customCoverUrl(html) {
  const re = /<meta property="og:image" content="([^"]+)"/g;
  let m;
  let last = null;
  while ((m = re.exec(String(html || '')))) {
    const url = m[1].replace(/&amp;/g, '&');
    if (/^https:\/\/i\.ytimg\.com\/pl_c\//.test(url)) last = url;
  }
  return last;
}

/* Channel playlists to mixtapes, oldest first. Two playlists claiming the
   same number would silently overwrite each other's page, so that fails. */
function selectMixtapes(playlists) {
  const byNumber = {};
  const out = [];
  (playlists || []).forEach(function (p) {
    const parsed = parseMixTitle(p && p.snippet && p.snippet.title);
    if (!parsed) return;
    if (byNumber[parsed.number]) {
      throw new Error('Two playlists are numbered ' + parsed.number + ': ' +
        byNumber[parsed.number] + ' and ' + p.id + '. Renumber one and run again.');
    }
    byNumber[parsed.number] = p.id;
    out.push({ id: p.id, number: parsed.number, name: parsed.name, playlist: p });
  });
  return out.sort(function (a, b) { return a.number < b.number ? -1 : 1; });
}

/* "1h 32m", "48m". Seconds are dropped: this is a runtime, not a timestamp. */
function formatRuntime(seconds) {
  const minutes = Math.round((Number(seconds) || 0) / 60);
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return h ? h + 'h ' + m + 'm' : m + 'm';
}

/* Only the 16:9 sizes. standard and high are 4:3 with black bars baked in,
   which would survive a square crop. */
function coverThumbnail(thumbnails) {
  const t = thumbnails || {};
  return t.maxres || t.medium || null;
}

function coverSource(thumbnails) {
  const pick = coverThumbnail(thumbnails);
  return pick ? pick.url : null;
}

/* A track played inside its mixtape, so YouTube Music queues the rest of the
   mix after it. No `index`: YouTube counts unavailable entries in it, which
   the numbering here skips, so it could point at the wrong track. */
function trackUrl(videoId, playlistId) {
  return 'https://music.youtube.com/watch?v=' + encodeURIComponent(videoId) +
    '&list=' + encodeURIComponent(playlistId);
}

function splitDocument(text) {
  const m = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/.exec(String(text || ''));
  if (!m) return { data: null, body: '' };
  let data = null;
  try { data = JSON.parse(m[1]); } catch (e) { data = null; }
  return { data: data, body: m[2] };
}

function renderDocument(data, body) {
  return '---\n' + JSON.stringify(data, null, 2) + '\n---\n' + (body || '');
}

function toDocument(mix, music, cover, refreshedAt) {
  const seconds = music.tracks.reduce(function (sum, t) { return sum + (t.durationSeconds || 0); }, 0);
  const runtime = formatRuntime(seconds);
  return {
    title: 'mix.' + mix.number + ' ' + mix.name,
    mix_name: mix.name,
    number: mix.number,
    description: mix.name + ': a ' + music.trackCount + '-track mixtape by Matt Ruggio, ' + runtime + '.',
    playlist_id: mix.id,
    url_music: music.url,
    cover: cover.path,
    cover_source: cover.source,
    cover_hash: cover.hash,
    image: cover.path ? {
      path: cover.path,
      width: cover.width,
      height: cover.height,
      alt: 'Cover of mix.' + mix.number + ' ' + mix.name
    } : undefined,
    track_count: music.trackCount,
    duration_seconds: seconds,
    runtime: runtime,
    refreshed_at: refreshedAt,
    tracks: music.tracks.map(function (t) {
      return {
        number: t.number,
        title: t.title,
        artist: t.artist,
        album: t.album,
        duration: t.duration,
        url: trackUrl(t.videoId, mix.id)
      };
    })
  };
}

/* ── Network and files ─────────────────────────────── */

async function apiGet(resource, params, key) {
  const url = new URL(API + resource);
  Object.keys(params).forEach(function (k) {
    if (params[k] != null && params[k] !== '') url.searchParams.set(k, params[k]);
  });
  url.searchParams.set('key', key);
  const res = await fetch(url);
  const body = await res.json().catch(function () { return null; });
  if (!res.ok) throw new Error(ytm.describeError(res.status, body, null));
  return body;
}

/* An API key only ever sees public playlists, which is the point: a mixtape
   that is private or unlisted is not published here either. */
async function channelPlaylists(key) {
  const all = [];
  let token = null;
  let calls = 0;
  do {
    const page = await apiGet('playlists', {
      part: 'snippet,contentDetails,status',
      channelId: CHANNEL_ID,
      maxResults: 50,
      pageToken: token
    }, key);
    calls++;
    (page.items || []).forEach(function (p) {
      if (!p.status || p.status.privacyStatus === 'public') all.push(p);
    });
    token = page.nextPageToken || null;
  } while (token);
  return { playlists: all, calls: calls };
}

function readDocument(file) {
  try { return splitDocument(fs.readFileSync(file, 'utf8')); } catch (e) { return { data: null, body: '' }; }
}

/* macOS ships sips, which center-crops and resizes in place. Elsewhere the
   original is kept and CSS does the crop. Uploaded covers are already square,
   so for them this only resizes. Returns the final size, which
   the page's og:image needs: the site-wide default image is 1200x630 and
   Jekyll deep-merges it, so its dimensions would otherwise be claimed. */
function squareCrop(file, width, height) {
  if (process.platform !== 'darwin') return { width: width, height: height };
  try {
    const out = execFileSync('sips', ['-g', 'pixelHeight', '-g', 'pixelWidth', file], { encoding: 'utf8' });
    const h = Number(/pixelHeight: (\d+)/.exec(out)[1]);
    const w = Number(/pixelWidth: (\d+)/.exec(out)[1]);
    const side = Math.min(h, w);
    execFileSync('sips', ['-c', String(side), String(side), file], { stdio: 'ignore' });
    if (side > COVER_SIZE) execFileSync('sips', ['-Z', String(COVER_SIZE), file], { stdio: 'ignore' });
    const size = Math.min(side, COVER_SIZE);
    return { width: size, height: size };
  } catch (e) {
    console.warn('  could not crop ' + path.basename(file) + '; keeping the original');
    return { width: width, height: height };
  }
}

const PAGE_HEADERS = {
  'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 14_0) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.0 Safari/605.1.15',
  'Accept-Language': 'en-US,en;q=0.9'
};

/* One plain page load per mixtape, at the pace of a refresh run by hand.
   A failure here is not fatal: the API thumbnail is used instead. */
async function fetchCustomCover(id) {
  try {
    const res = await fetch('https://www.youtube.com/playlist?list=' + encodeURIComponent(id), { headers: PAGE_HEADERS });
    return res.ok ? customCoverUrl(await res.text()) : null;
  } catch (e) {
    return null;
  }
}

/* The uploaded square cover when there is one, else the first track's
   thumbnail cropped square. The cover URL is signed and changes daily, so
   whether the image changed is decided by hashing it, not by its URL. */
async function saveCover(mix, previous) {
  const custom = await fetchCustomCover(mix.id);
  const thumb = coverThumbnail(mix.playlist.snippet && mix.playlist.snippet.thumbnails);
  const source = custom || (thumb ? thumb.url : null);
  const file = path.join(COVERS_DIR, mix.number + '.jpg');
  const result = {
    path: source ? COVERS_URL + mix.number + '.jpg' : null,
    source: custom ? 'custom' : 'first-track',
    hash: null
  };
  if (!source) return result;

  const res = await fetch(source);
  if (!res.ok) throw new Error('Could not download the cover for mix.' + mix.number + ' (' + res.status + ').');
  const bytes = Buffer.from(await res.arrayBuffer());
  result.hash = crypto.createHash('sha256').update(bytes).digest('hex').slice(0, 16);

  const prior = previous && previous.image;
  if (previous && previous.cover_hash === result.hash && prior && fs.existsSync(file)) {
    return Object.assign(result, { width: prior.width, height: prior.height });
  }
  fs.writeFileSync(file, bytes);
  const size = custom ? { width: null, height: null } : { width: thumb.width, height: thumb.height };
  return Object.assign(result, squareCrop(file, size.width, size.height));
}

async function main() {
  const envFile = path.join(ROOT, '.env');
  if (fs.existsSync(envFile)) process.loadEnvFile(envFile);
  const key = process.env.YT_API_KEY;
  if (!key) {
    console.error('Set YT_API_KEY in .env (gitignored) or the environment, to a YouTube Data API v3 key with no website restriction.');
    process.exit(1);
  }

  fs.mkdirSync(DOCS_DIR, { recursive: true });
  fs.mkdirSync(COVERS_DIR, { recursive: true });

  const found = await channelPlaylists(key);
  const mixes = selectMixtapes(found.playlists);
  let units = found.calls;
  const refreshedAt = new Date().toISOString();
  const summary = { added: [], updated: [], removed: [] };

  for (const mix of mixes) {
    process.stdout.write('mix.' + mix.number + ' ' + mix.name + ' ... ');
    const file = path.join(DOCS_DIR, mix.number + '.md');
    const existing = readDocument(file);
    const raw = await ytm.fetchPlaylist(mix.id, key);
    units += 1 + raw.playlistItems.length + raw.videos.length;
    const music = ytm.shape(raw, refreshedAt);
    const cover = await saveCover(mix, existing.data);
    fs.writeFileSync(file, renderDocument(toDocument(mix, music, cover, refreshedAt), existing.body));
    (existing.data ? summary.updated : summary.added).push(mix.number);
    console.log(music.trackCount + ' tracks' + (music.skipped ? ', ' + music.skipped + ' unavailable skipped' : ''));
  }

  const keep = new Set(mixes.map(function (m) { return m.number; }));
  fs.readdirSync(DOCS_DIR).forEach(function (name) {
    const m = /^(\d{3})\.md$/.exec(name);
    if (!m || keep.has(m[1])) return;
    fs.rmSync(path.join(DOCS_DIR, name));
    fs.rmSync(path.join(COVERS_DIR, m[1] + '.jpg'), { force: true });
    summary.removed.push(m[1]);
    console.warn('removed mix.' + m[1] + ': no longer a public mix on the channel');
  });

  console.log('\n' + mixes.length + ' mixtapes. added: ' + (summary.added.join(', ') || 'none') +
    '; updated: ' + summary.updated.length + '; removed: ' + (summary.removed.join(', ') || 'none') +
    '. About ' + units + ' quota units used.');
}

module.exports = {
  parseMixTitle: parseMixTitle,
  selectMixtapes: selectMixtapes,
  formatRuntime: formatRuntime,
  coverSource: coverSource,
  customCoverUrl: customCoverUrl,
  splitDocument: splitDocument,
  renderDocument: renderDocument,
  toDocument: toDocument
};

if (require.main === module) {
  main().catch(function (err) {
    const blocked = /restricted to other websites/.test(err.message);
    console.error('\n' + (blocked
      ? 'This key is restricted to websites, so YouTube rejects it outside a browser. ' +
        'Use a key restricted to YouTube Data API v3 only, with no website restriction.'
      : err.message));
    process.exit(1);
  });
}
