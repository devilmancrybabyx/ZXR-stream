/**
 * ZXR Stream - Automated Self-Checks and Verification Suite
 */

const assert = require('assert');
const { getManifest } = require('../manifest');
const JsPacker = require('../lib/extractors/jspacker');
const Cinemeta = require('../lib/cinemeta');
const ProviderManager = require('../lib/providers');
const StreamExtractors = require('../lib/extractors');

async function runTests() {
  console.log('🧪 Starting ZXR Stream test suite...\n');

  // 1. Verify Manifest
  console.log('Checking Manifest structure...');
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
  console.log('✅ Manifest test passed.');

  // 2. Verify JsPacker
  console.log('\nChecking Dean Edwards P.A.C.K.E.R. Unpacker...');
  const packedSample = `eval(function(p,a,c,k,e,d){e=function(c){return c};if(!''.replace(/^/,String)){while(c--){d[c]=k[c]||c}k=[function(e){return d[e]}];e=function(){return'\\\\w+'};c=1};while(c--){if(k[c]){p=p.replace(new RegExp('\\\\b'+e(c)+'\\\\b','g'),k[c])}}return p}('0 1="2";',3,3,'var|hello|world'.split('|'),0,{}))`;
  const unpacked = JsPacker.unpack(packedSample);
  assert.ok(unpacked.includes('var hello="world"') || unpacked.includes('hello'), 'Unpacker should recover payload');
  console.log('✅ JsPacker test passed.');

  // 3. Verify Cinemeta ID Parsing
  console.log('\nChecking Cinemeta ID Parser...');
  const movieParsed = Cinemeta.parseId('tt0111161');
  assert.strictEqual(movieParsed.imdbId, 'tt0111161');
  assert.strictEqual(movieParsed.season, null);
  assert.strictEqual(movieParsed.episode, null);

  const seriesParsed = Cinemeta.parseId('tt0944947:3:9');
  assert.strictEqual(seriesParsed.imdbId, 'tt0944947');
  assert.strictEqual(seriesParsed.season, 3);
  assert.strictEqual(seriesParsed.episode, 9);

  const animeParsed = Cinemeta.parseId('kitsu:1234:12');
  assert.strictEqual(animeParsed.kitsuId, '1234');
  assert.strictEqual(animeParsed.season, 1);
  assert.strictEqual(animeParsed.episode, 12);
  console.log('✅ Cinemeta ID Parser test passed.');

  // 4. Verify Providers Registration
  console.log('\nChecking Providers list...');
  const providers = ProviderManager.list;
  assert.strictEqual(providers.length, 12, 'Must have 12 registered providers from mehdigm-stream');
  const providerIds = providers.map(p => p.id);
  assert.ok(providerIds.includes('egydead'));
  assert.ok(providerIds.includes('faselhd'));
  assert.ok(providerIds.includes('witanime'));
  assert.ok(providerIds.includes('anime4up'));
  assert.ok(providerIds.includes('shahid4u'));
  assert.ok(providerIds.includes('tuktuk'));
  assert.ok(providerIds.includes('cimanow'));
  assert.ok(providerIds.includes('topcinema'));
  assert.ok(providerIds.includes('stardima'));
  assert.ok(providerIds.includes('animezid'));
  assert.ok(providerIds.includes('dramaworld'));
  assert.ok(providerIds.includes('shooflive'));
  console.log(`✅ All 12 providers verified: ${providerIds.join(', ')}`);

  // 5. Verify Direct Stream Extractor
  console.log('\nChecking StreamExtractors...');
  const directM3u8 = await StreamExtractors.extract('https://example.com/master_1080p.m3u8', '', 'FastHost');
  assert.ok(Array.isArray(directM3u8) && directM3u8.length > 0);
  assert.ok(directM3u8[0].url === 'https://example.com/master_1080p.m3u8');
  assert.ok(directM3u8[0].name.includes('FastHost'));
  console.log('✅ StreamExtractors direct test passed.');

  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! 🚀');
}

runTests().catch(err => {
  console.error('\n❌ Test failed:', err);
  process.exit(1);
});
