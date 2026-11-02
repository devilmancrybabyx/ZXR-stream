/**
 * ZXR Stream - Stremio & Nuvio Arabic Addon Server
 * Recreated with all providers from mehdigm-stream
 */

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');
const axios = require('axios');
const config = require('./config');
const { getManifest } = require('./manifest');
const Cinemeta = require('./lib/cinemeta');
const ProviderManager = require('./lib/providers');

const app = express();

// In-memory catalog cache for instant responses
const catalogCache = new Map();

// Fallback curated popular titles if Cinemeta times out
const FALLBACK_METAS = [
  { id: 'tt0903747', type: 'series', name: 'Breaking Bad', poster: 'https://images.metahub.space/poster/small/tt0903747/img', releaseInfo: '2008-2013', imdbRating: '9.5', genres: ['Crime', 'Drama', 'Thriller'] },
  { id: 'tt1375666', type: 'movie', name: 'Inception', poster: 'https://images.metahub.space/poster/small/tt1375666/img', releaseInfo: '2010', imdbRating: '8.8', genres: ['Action', 'Sci-Fi'] },
  { id: 'tt0944947', type: 'series', name: 'Game of Thrones', poster: 'https://images.metahub.space/poster/small/tt0944947/img', releaseInfo: '2011-2019', imdbRating: '9.2', genres: ['Action', 'Adventure', 'Drama'] },
  { id: 'tt0111161', type: 'movie', name: 'The Shawshank Redemption', poster: 'https://images.metahub.space/poster/small/tt0111161/img', releaseInfo: '1994', imdbRating: '9.3', genres: ['Drama'] },
  { id: 'tt4574334', type: 'series', name: 'Stranger Things', poster: 'https://images.metahub.space/poster/small/tt4574334/img', releaseInfo: '2016-', imdbRating: '8.7', genres: ['Drama', 'Fantasy', 'Horror'] },
  { id: 'tt0468569', type: 'movie', name: 'The Dark Knight', poster: 'https://images.metahub.space/poster/small/tt0468569/img', releaseInfo: '2008', imdbRating: '9.0', genres: ['Action', 'Crime'] },
  { id: 'tt3032476', type: 'series', name: 'Better Call Saul', poster: 'https://images.metahub.space/poster/small/tt3032476/img', releaseInfo: '2015-2022', imdbRating: '9.0', genres: ['Crime', 'Drama'] },
  { id: 'tt0816692', type: 'movie', name: 'Interstellar', poster: 'https://images.metahub.space/poster/small/tt0816692/img', releaseInfo: '2014', imdbRating: '8.7', genres: ['Adventure', 'Drama', 'Sci-Fi'] },
  { id: 'tt2560140', type: 'series', name: 'Attack on Titan', poster: 'https://images.metahub.space/poster/small/tt2560140/img', releaseInfo: '2013-2023', imdbRating: '9.1', genres: ['Animation', 'Action'] },
  { id: 'tt15239678', type: 'movie', name: 'Dune: Part Two', poster: 'https://images.metahub.space/poster/small/tt15239678/img', releaseInfo: '2024', imdbRating: '8.6', genres: ['Action', 'Sci-Fi'] }
];

// Enable CORS for Stremio Web and Nuvio
app.use(cors());
app.use(express.json());

// Serve static assets (logos, icons, web UI)
app.use(express.static(path.join(__dirname, 'public')));

// Helper: parse user configuration from URL segment
function parseConfig(rawConfig) {
  if (!rawConfig) return {};
  try {
    if (rawConfig.startsWith('ey')) {
      const decoded = Buffer.from(rawConfig, 'base64').toString('utf-8');
      return JSON.parse(decoded);
    }
    return JSON.parse(decodeURIComponent(rawConfig));
  } catch {
    return {};
  }
}

// Helper: parse Stremio / Nuvio extra parameters (search, skip, genre)
function getSearchAndSkip(extraParam, reqQuery) {
  let search = reqQuery?.search || '';
  let skip = parseInt(reqQuery?.skip || '0', 10) || 0;

  if (extraParam) {
    if (extraParam.includes('=')) {
      const sp = new URLSearchParams(extraParam);
      if (sp.has('search')) search = sp.get('search');
      if (sp.has('skip')) skip = parseInt(sp.get('skip'), 10) || 0;
    } else {
      const cfg = parseConfig(extraParam);
      if (cfg.search) search = cfg.search;
      if (cfg.skip) skip = parseInt(cfg.skip, 10) || 0;
    }
  }
  return { search, skip };
}

// --------------------------------------------------------------------------
// Root & Configure Web Interface
// --------------------------------------------------------------------------

app.get('/', (req, res) => {
  res.redirect('/configure');
});

app.get('/configure', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// --------------------------------------------------------------------------
// Manifest Endpoints (Stremio & Nuvio)
// --------------------------------------------------------------------------

app.get('/manifest.json', (req, res) => {
  const host = `${req.protocol}://${req.get('host')}`;
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'max-age=86400, public');
  res.json(getManifest({}, host));
});

app.get('/:config/manifest.json', (req, res) => {
  const host = `${req.protocol}://${req.get('host')}`;
  const userConfig = parseConfig(req.params.config);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'max-age=86400, public');
  res.json(getManifest(userConfig, host));
});

// --------------------------------------------------------------------------
// Unified Catalog Endpoints (One Single Merged Library: Movies + Series)
// --------------------------------------------------------------------------

app.get([
  '/catalog/:type/:id.json',
  '/catalog/:type/:id/:extra.json',
  '/:config/catalog/:type/:id.json',
  '/:config/catalog/:type/:id/:extra.json'
], async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'max-age=1800, public');

  const { search, skip } = getSearchAndSkip(req.params.extra, req.query);

  try {
    // 1. Search in Unified Catalog (queries both movies & series in parallel)
    if (search) {
      const [mResp, sResp] = await Promise.allSettled([
        axios.get(`https://v3-cinemeta.strem.io/catalog/movie/top/search=${encodeURIComponent(search)}.json`, {
          timeout: 7000,
          headers: { 'User-Agent': config.USER_AGENT }
        }),
        axios.get(`https://v3-cinemeta.strem.io/catalog/series/top/search=${encodeURIComponent(search)}.json`, {
          timeout: 7000,
          headers: { 'User-Agent': config.USER_AGENT }
        })
      ]);

      const mMetas = mResp.status === 'fulfilled' ? (mResp.value.data?.metas || []) : [];
      const sMetas = sResp.status === 'fulfilled' ? (sResp.value.data?.metas || []) : [];
      const combined = [...sMetas, ...mMetas];

      const metas = combined.map(m => ({
        id: m.id || m.imdb_id,
        type: m.type || (m.id.startsWith('tt') ? 'movie' : 'series'),
        name: m.name,
        poster: m.poster,
        description: m.description || `مشاهدة ${m.name} مترجم ومدبلج على سيرفرات ZXR Stream`,
        releaseInfo: m.releaseInfo || m.year,
        imdbRating: m.imdbRating,
        genres: m.genres || []
      }));

      return res.json({ metas });
    }

    // 2. Default Unified Catalog Discovery (Merges Movies + Series into One Library)
    const cacheKey = `unified:${skip}`;
    const cached = catalogCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 1800000)) {
      return res.json({ metas: cached.metas });
    }

    try {
      const [mResp, sResp] = await Promise.allSettled([
        axios.get(`https://v3-cinemeta.strem.io/catalog/movie/top${skip ? `/skip=${skip}` : ''}.json`, {
          timeout: 7000,
          headers: { 'User-Agent': config.USER_AGENT }
        }),
        axios.get(`https://v3-cinemeta.strem.io/catalog/series/top${skip ? `/skip=${skip}` : ''}.json`, {
          timeout: 7000,
          headers: { 'User-Agent': config.USER_AGENT }
        })
      ]);

      const mList = mResp.status === 'fulfilled' ? (mResp.value.data?.metas || []) : [];
      const sList = sResp.status === 'fulfilled' ? (sResp.value.data?.metas || []) : [];

      // Interleave movies and series together for a diverse unified library
      const interleaved = [];
      const maxLen = Math.max(mList.length, sList.length);
      for (let i = 0; i < maxLen; i++) {
        if (sList[i]) interleaved.push(sList[i]);
        if (mList[i]) interleaved.push(mList[i]);
      }

      const metas = interleaved.map(m => ({
        id: m.id || m.imdb_id,
        type: m.type || 'movie',
        name: m.name,
        poster: m.poster,
        description: m.description || `مشاهدة ${m.name} على سيرفرات ZXR Stream`,
        releaseInfo: m.releaseInfo || m.year,
        imdbRating: m.imdbRating,
        genres: m.genres || []
      }));

      if (metas.length > 0) {
        catalogCache.set(cacheKey, { metas, timestamp: Date.now() });
        return res.json({ metas });
      }
    } catch {}

    // Fallback if Cinemeta times out
    return res.json({ metas: FALLBACK_METAS });
  } catch (err) {
    console.error('[ZXR-Stream] Catalog error:', err.message);
    return res.json({ metas: FALLBACK_METAS });
  }
});

// --------------------------------------------------------------------------
// Stream Endpoint (The Core Playback Pipeline)
// --------------------------------------------------------------------------

app.get(['/stream/:type/:id.json', '/:config/stream/:type/:id.json'], async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'max-age=3600, public');

  const type = req.params.type;
  const id = req.params.id.replace(/\.json$/, '');
  const userConfig = req.params.config ? parseConfig(req.params.config) : {};

  try {
    // 1. Resolve IMDb or Kitsu ID to Media Title and Year
    const meta = await Cinemeta.getMetadata(type, id);
    if (!meta || !meta.title) {
      return res.json({ streams: [] });
    }

    // 2. Query Arabic providers for direct video streams
    const query = {
      title: meta.title,
      titles: meta.titles || [meta.title],
      year: meta.year,
      season: meta.season,
      episode: meta.episode,
      type: meta.type,
      genres: meta.genres || []
    };

    const streams = await ProviderManager.getStreams(query, userConfig);

    return res.json({ streams });
  } catch (err) {
    console.error(`[ZXR-Stream] Error resolving stream for ${id}:`, err.message);
    return res.json({ streams: [] });
  }
});

// --------------------------------------------------------------------------
// Stream Proxy Bridge (Bypasses Referer & CORS checks when needed)
// --------------------------------------------------------------------------

app.get('/proxy/stream', async (req, res) => {
  const targetUrl = req.query.url;
  const referer = req.query.referer || '';

  if (!targetUrl) {
    return res.status(400).send('Missing target URL');
  }

  try {
    const headers = {
      'User-Agent': config.USER_AGENT,
      'Accept': '*/*'
    };
    if (referer) headers['Referer'] = referer;

    const streamResponse = await axios({
      method: 'GET',
      url: targetUrl,
      headers: headers,
      responseType: 'stream',
      timeout: 15000
    });

    res.setHeader('Access-Control-Allow-Origin', '*');
    if (streamResponse.headers['content-type']) {
      res.setHeader('Content-Type', streamResponse.headers['content-type']);
    }

    streamResponse.data.pipe(res);
  } catch (err) {
    res.status(502).send(`Proxy streaming error: ${err.message}`);
  }
});

// --------------------------------------------------------------------------
// Health Check Endpoint
// --------------------------------------------------------------------------

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    version: '1.0.0',
    addon: 'ZXR Stream',
    providers: ProviderManager.list.length
  });
});

// Start Server
if (require.main === module) {
  const PORT = config.PORT;
  app.listen(PORT, config.HOST, () => {
    console.log(`====================================================`);
    console.log(`  ZXR Stream (إضافات عربية لستريميو + نوفيو)`);
    console.log(`  Running on http://${config.HOST}:${PORT}`);
    console.log(`  Configure & Install: http://localhost:${PORT}/configure`);
    console.log(`  Manifest: http://localhost:${PORT}/manifest.json`);
    console.log(`====================================================`);
  });
}

module.exports = app;
