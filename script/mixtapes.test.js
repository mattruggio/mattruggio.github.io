'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const mx = require('./mixtapes.js');

test('parseMixTitle reads the number and name', () => {
  assert.deepEqual(mx.parseMixTitle('mix.014.South Beach Radio.keep'), { number: '014', name: 'South Beach Radio' });
  assert.deepEqual(mx.parseMixTitle('mix.001.a.b.c.keep'), { number: '001', name: 'a.b.c' });
  assert.deepEqual(mx.parseMixTitle('mix.014.south_beach_radio.keep'), { number: '014', name: 'south beach radio' });
  assert.deepEqual(mx.parseMixTitle('mix.001.concrete_&_static.keep'), { number: '001', name: 'concrete & static' });
});

test('customCoverUrl picks the largest uploaded cover from the page', () => {
  const meta = (u) => '<meta property="og:image" content="' + u + '">';
  const base = 'https://i.ytimg.com/pl_c/PLx/studio_square_thumbnail.jpg?sqp=';
  const html = meta(base + 'a&amp;rs=1') + meta(base + 'b&amp;rs=2') + meta(base + 'c&amp;rs=3');
  assert.equal(mx.customCoverUrl(html), base + 'c&rs=3');
  assert.equal(mx.customCoverUrl(meta('https://i.ytimg.com/vi/abc/hqdefault.jpg')), null);
  assert.equal(mx.customCoverUrl(''), null);
});

test('parseMixTitle rejects anything outside the convention', () => {
  ['LE014 \u2022 South Beach Radio', 'mix.014.South Beach Radio', 'mix.14.x.keep', 'mix.014..keep', 'my mix.001.x.keep', '']
    .forEach((t) => assert.equal(mx.parseMixTitle(t), null, t));
});

test('selectMixtapes filters, sorts by number, and rejects duplicates', () => {
  const pl = (id, title) => ({ id, snippet: { title } });
  const out = mx.selectMixtapes([pl('b', 'mix.010.Ten.keep'), pl('x', 'Road trip'), pl('a', 'mix.002.Two.keep')]);
  assert.deepEqual(out.map((m) => [m.id, m.number, m.name]), [['a', '002', 'Two'], ['b', '010', 'Ten']]);
  assert.throws(() => mx.selectMixtapes([pl('a', 'mix.003.A.keep'), pl('b', 'mix.003.B.keep')]), /numbered 003/);
});

test('formatRuntime rounds to minutes', () => {
  assert.equal(mx.formatRuntime(0), '0m');
  assert.equal(mx.formatRuntime(48 * 60 + 20), '48m');
  assert.equal(mx.formatRuntime(5520), '1h 32m');
  assert.equal(mx.formatRuntime(3600), '1h 0m');
});

test('coverSource never picks a letterboxed 4:3 size', () => {
  assert.equal(mx.coverSource({ maxres: { url: 'M' }, high: { url: 'H' }, medium: { url: 'm' } }), 'M');
  assert.equal(mx.coverSource({ high: { url: 'H' }, standard: { url: 'S' }, medium: { url: 'm' } }), 'm');
  assert.equal(mx.coverSource({ high: { url: 'H' } }), null);
});

test('documents round-trip and keep their body', () => {
  const data = { title: 'mix.001 \u201cQuotes\u201d: yes', tracks: [{ number: 1, title: 'A "B"' }] };
  const body = '\nA note about this mix.\n';
  const text = mx.renderDocument(data, body);
  assert.match(text, /^---\n\{/);
  const back = mx.splitDocument(text);
  assert.deepEqual(back.data, data);
  assert.equal(back.body, body);
  assert.deepEqual(mx.splitDocument('no front matter'), { data: null, body: '' });
});

test('toDocument totals the runtime and trims tracks', () => {
  const music = {
    url: 'https://music.youtube.com/playlist?list=PLx',
    trackCount: 2,
    tracks: [
      { number: 1, title: 'A', artist: 'X', album: null, duration: '3:00', durationSeconds: 180, url: 'u1', videoId: 'v1', thumbnailUrl: 't' },
      { number: 2, title: 'B', artist: 'Y', album: 'Z', duration: '2:30', durationSeconds: 150, url: 'u2', videoId: 'v2', thumbnailUrl: 't' }
    ]
  };
  const doc = mx.toDocument({ id: 'PLx', number: '007', name: 'Seven' }, music,
    { path: '/assets/images/mixtapes/007.jpg', source: 'src', width: 600, height: 600 }, '2026-10-11T00:00:00Z');
  assert.equal(doc.title, 'mix.007 Seven');
  assert.equal(doc.duration_seconds, 330);
  assert.equal(doc.runtime, '6m');
  assert.equal(doc.mix_name, 'Seven');
  assert.deepEqual([doc.image.path, doc.image.width], ['/assets/images/mixtapes/007.jpg', 600]);
  assert.deepEqual(Object.keys(doc.tracks[0]), ['number', 'title', 'artist', 'album', 'duration', 'url']);
  assert.equal(doc.tracks[1].url, 'https://music.youtube.com/watch?v=v2&list=PLx');
});
