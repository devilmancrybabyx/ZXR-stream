/**
 * Comprehensive ZXR Stream Test Suite
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { getManifest } = require('../manifest');
const JsPacker = require('../lib/extractors/jspacker');
const Cinemeta = require('../lib/cinemeta');
const ProviderManager = require('../lib/providers');

async function runTests() {
  console.log('🧪 Starting ZXR Stream test suite...\n');

  // 1. Manifest
  console.log('Checking Stremio Manifest structure (Single Merged Catalog)...');
  const manifest = getManifest({}, 'http://localhost:7000');
  assert.strictEqual(manifest.id, 'org.zxr.stream.arabic');
  assert.strictEqual(manifest.version, '1.0.0');
  assert.strictEqual(manifest.resources.length, 2);
  assert.strictEqual(manifest.catalogs.length, 1, 'Must have exactly 1 merged catalog');
  assert.strictEqual(manifest.catalogs[0].id, 'zxr_catalog');
  assert.ok(manifest.catalogs[0].extra && manifest.catalogs[0].extra.some(e => e.name === 'search'), 'Catalog must support search');
  console.log('✅ Stremio Manifest test passed.');

  // 2. Nuvio Root manifest.json
  console.log('\nChecking Nuvio Root manifest.json...');
  const rootManifestPath = path.join(__dirname, '..', 'manifest.json');
  assert.ok(fs.existsSync(rootManifestPath), 'Root manifest.json must exist');
  const rootManifest = JSON.parse(fs.readFileSync(rootManifestPath, 'utf8'));
  assert.strictEqual(rootManifest.scrapers.length, 21, 'Must contain all 21 scrapers');
  assert.strictEqual(rootManifest.catalogs.length, 1, 'Root manifest must have 1 merged catalog');
  for (const s of rootManifest.scrapers) {
    const pPath = path.join(__dirname, '..', s.filename);
    assert.ok(fs.existsSync(pPath), `Provider file missing: ${s.filename}`);
  }
  console.log('✅ Nuvio Root manifest.json and all 21 provider files verified.');

  // 3. JsPacker
  console.log('\nChecking Dean Edwards P.A.C.K.E.R. Unpacker...');
  const samplePacked = "eval(function(p,a,c,k,e,d){while(c--)if(k[c])p=p.replace(new RegExp('\\\\b'+c.toString(a)+'\\\\b','g'),k[c]);return p}('0 1=\"2\";',3,3,'var|hello|world'.split('|')))";
  assert.ok(JsPacker.detect(samplePacked), 'JsPacker detect failed');
  const unpacked = JsPacker.unpack(samplePacked);
  assert.ok(unpacked.includes('var hello="world"'), `JsPacker output unexpected: ${unpacked}`);
  console.log('✅ JsPacker test passed.');

  // 4. Cinemeta ID Parser
  console.log('\nChecking Cinemeta ID Parser...');
  const parsedMovie = Cinemeta.parseId('tt0111161');
  assert.strictEqual(parsedMovie.imdbId, 'tt0111161');
  assert.strictEqual(parsedMovie.season, null);

  const parsedSeries = Cinemeta.parseId('tt0903747:2:5');
  assert.strictEqual(parsedSeries.imdbId, 'tt0903747');
  assert.strictEqual(parsedSeries.season, 2);
  assert.strictEqual(parsedSeries.episode, 5);
  console.log('✅ Cinemeta ID Parser test passed.');

  // 5. Providers list
  console.log('\nChecking Providers list in ProviderManager...');
  assert.strictEqual(ProviderManager.list.length, 21, 'Must have exactly 21 providers');
  console.log(`✅ All 21 providers verified: ${ProviderManager.list.map(p => p.id).join(', ')}`);

  // 6. Real Stream Resolution Verification for Movie (tt0111161)
  console.log('\nChecking Real Stream Resolution for Movie (The Shawshank Redemption tt0111161)...');
  const movieMeta = await Cinemeta.getMetadata('movie', 'tt0111161');
  assert.ok(movieMeta && movieMeta.title, 'Cinemeta metadata lookup failed');
  const movieStreams = await ProviderManager.getStreams({
    title: movieMeta.title,
    titles: movieMeta.titles,
    year: movieMeta.year,
    season: null,
    episode: null,
    type: 'movie',
    genres: movieMeta.genres
  });
  assert.ok(Array.isArray(movieStreams) && movieStreams.length > 0, 'Must return at least 1 movie stream');
  const topMovie = movieStreams[0];
  console.log(`✅ Movie stream resolved: ${movieStreams.length} stream(s)`);
  console.log(`   NAME: ${topMovie.name}`);
  console.log(`   TITLE: ${topMovie.title.split('\n')[0]}`);
  console.log(`   URL: ${topMovie.url.slice(0, 80)}...`);

  // Verify emojis and layout
  assert.ok(topMovie.name.includes('🎬'), 'Stream name must include 🎬');
  assert.ok(topMovie.name.includes('🧊'), 'Stream name must include 🧊');
  assert.ok(topMovie.name.includes('• ZXR Stream'), 'Stream name must include • ZXR Stream');
  assert.ok(topMovie.title.includes('🍿'), 'Stream title must include 🍿');
  assert.ok(topMovie.title.includes('🏷️'), 'Stream title must include 🏷️');
  assert.ok(topMovie.title.includes('🎞️'), 'Stream title must include 🎞️');
  assert.ok(topMovie.title.includes('📡'), 'Stream title must include 📡');
  assert.ok(topMovie.url.includes('.m3u8') || topMovie.url.includes('.mp4'), 'Stream must be a direct playable media link');

  // 7. Real Stream Resolution Verification for TV Series (tt0903747:1:1)
  console.log('\nChecking Real Stream Resolution for TV Series (Breaking Bad S01E01 tt0903747:1:1)...');
  const seriesMeta = await Cinemeta.getMetadata('series', 'tt0903747:1:1');
  assert.ok(seriesMeta && seriesMeta.title, 'Cinemeta series metadata lookup failed');
  const seriesStreams = await ProviderManager.getStreams({
    title: seriesMeta.title,
    titles: seriesMeta.titles,
    year: seriesMeta.year,
    season: 1,
    episode: 1,
    type: 'series',
    genres: seriesMeta.genres
  });
  assert.ok(Array.isArray(seriesStreams) && seriesStreams.length > 0, 'Must return at least 1 series stream');
  const topSeries = seriesStreams[0];
  console.log(`✅ TV Series stream resolved: ${seriesStreams.length} stream(s)`);
  console.log(`   NAME: ${topSeries.name}`);
  console.log(`   TITLE: ${topSeries.title.split('\n')[0]}`);
  console.log(`   URL: ${topSeries.url.slice(0, 80)}...`);

  // Verify emojis and direct media
  assert.ok(topSeries.name.includes('🎬'), 'Series stream name must include 🎬');
  assert.ok(topSeries.name.includes('🧊'), 'Series stream name must include 🧊');
  assert.ok(topSeries.name.includes('• ZXR Stream'), 'Series stream name must include • ZXR Stream');
  assert.ok(topSeries.title.includes('🍿'), 'Series stream title must include 🍿');
  assert.ok(topSeries.url.includes('.m3u8') || topSeries.url.includes('.mp4'), 'Series stream must be a direct playable media link');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🚀');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
