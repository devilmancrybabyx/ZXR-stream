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
  console.log('Checking Stremio Manifest structure...');
  const manifest = getManifest({}, 'http://localhost:7000');
  assert.strictEqual(manifest.id, 'org.zxr.stream.arabic');
  assert.strictEqual(manifest.version, '1.0.0');
  assert.strictEqual(manifest.resources.length, 2);
  assert.strictEqual(manifest.catalogs.length, 3);
  for (const cat of manifest.catalogs) {
    assert.ok(cat.extra && cat.extra.some(e => e.name === 'search'), `Catalog ${cat.id} must have search extra`);
  }
  console.log('✅ Stremio Manifest test passed.');

  // 2. Nuvio Root manifest.json
  console.log('\nChecking Nuvio Root manifest.json...');
  const rootManifestPath = path.join(__dirname, '..', 'manifest.json');
  assert.ok(fs.existsSync(rootManifestPath), 'Root manifest.json must exist');
  const rootManifest = JSON.parse(fs.readFileSync(rootManifestPath, 'utf8'));
  assert.strictEqual(rootManifest.scrapers.length, 21, 'Must contain all 21 scrapers');
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

  // 6. Real Stream Resolution Verification
  console.log('\nChecking Real Stream Resolution for Movie (tt0111161)...');
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
  console.log(`✅ Movie stream resolved: ${movieStreams.length} stream(s), top: ${movieStreams[0].title}`);

  console.log('\nChecking Real Stream Resolution for TV Series (tt0903747:1:1)...');
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
  console.log(`✅ TV Series stream resolved: ${seriesStreams.length} stream(s), top: ${seriesStreams[0].title}`);

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🚀');
}

runTests().catch(err => {
  console.error('\n❌ TEST FAILED:', err.message);
  process.exit(1);
});
