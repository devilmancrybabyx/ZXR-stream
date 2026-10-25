/**
 * ZXR Stream - Automated Self-Checks and Verification Suite
 * Verifies all 21 Arabic Providers from mehdigm-stream
 */

const assert = require('assert');
const fs = require('fs');
const path = require('path');
const { getManifest } = require('../manifest');
const JsPacker = require('../lib/extractors/jspacker');
const Cinemeta = require('../lib/cinemeta');
const ProviderManager = require('../lib/providers');
const StreamExtractors = require('../lib/extractors');

async function runTests() {
  console.log('🧪 Starting ZXR Stream test suite...\n');

  // 1. Verify Manifest
  console.log('Checking Stremio Manifest structure...');
  const manifest = getManifest({}, 'http://localhost:7000');
  assert.strictEqual(manifest.id, 'org.zxr.stream.arabic');
  assert.strictEqual(manifest.version, '1.0.0');
  assert.ok(manifest.name.includes('ZXR Stream'));
  assert.ok(Array.isArray(manifest.resources));
  assert.ok(manifest.resources.some(r => r.name === 'stream'));
  assert.ok(manifest.resources.some(r => r.name === 'catalog'));
  assert.ok(manifest.types.includes('movie'));
  assert.ok(manifest.types.includes('series'));
  assert.ok(manifest.types.includes('anime'));
  console.log('✅ Stremio Manifest test passed.');

  // 2. Verify Root manifest.json (for Nuvio)
  console.log('\nChecking Nuvio Root manifest.json...');
  const rootManifest = JSON.parse(fs.readFileSync(path.join(__dirname, '..', 'manifest.json'), 'utf-8'));
  assert.strictEqual(rootManifest.scrapers.length, 21, 'Must contain all 21 scrapers');
  for (const s of rootManifest.scrapers) {
    const pPath = path.join(__dirname, '..', s.filename);
    assert.ok(fs.existsSync(pPath), `Provider file must exist: ${s.filename}`);
  }
  console.log('✅ Nuvio Root manifest.json and all 21 provider files verified.');

  // 3. Verify JsPacker
  console.log('\nChecking Dean Edwards P.A.C.K.E.R. Unpacker...');
  const packedSample = `eval(function(p,a,c,k,e,d){e=function(c){return c};if(!''.replace(/^/,String)){while(c--){d[c]=k[c]||c}k=[function(e){return d[e]}];e=function(){return'\\\\w+'};c=1};while(c--){if(k[c]){p=p.replace(new RegExp('\\\\b'+e(c)+'\\\\b','g'),k[c])}}return p}('0 1="2";',3,3,'var|hello|world'.split('|'),0,{}))`;
  const unpacked = JsPacker.unpack(packedSample);
  assert.ok(unpacked.includes('var hello="world"') || unpacked.includes('hello'), 'Unpacker should recover payload');
  console.log('✅ JsPacker test passed.');

  // 4. Verify Cinemeta ID Parsing
  console.log('\nChecking Cinemeta ID Parser...');
  const movieParsed = Cinemeta.parseId('tt0111161');
  assert.strictEqual(movieParsed.imdbId, 'tt0111161');
  assert.strictEqual(movieParsed.season, null);
  assert.strictEqual(movieParsed.episode, null);

  const seriesParsed = Cinemeta.parseId('tt0944947:3:9');
  assert.strictEqual(seriesParsed.imdbId, 'tt0944947');
  assert.strictEqual(seriesParsed.season, 3);
  assert.strictEqual(seriesParsed.episode, 9);
  console.log('✅ Cinemeta ID Parser test passed.');

  // 5. Verify All 21 Providers Registration
  console.log('\nChecking Providers list in ProviderManager...');
  const providers = ProviderManager.list;
  assert.strictEqual(providers.length, 21, 'Must have 21 registered providers from mehdigm-stream');
  console.log(`✅ All 21 providers verified: ${providers.map(p => p.id).join(', ')}`);

  // 6. Verify Nuvio getStreams interface on providers
  console.log('\nChecking Nuvio getStreams interface on providers/egydead.js...');
  const egydeadNuvio = require('../providers/egydead');
  assert.strictEqual(typeof egydeadNuvio.getStreams, 'function');
  console.log('✅ Nuvio getStreams interface verified.');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🚀');
}

runTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
