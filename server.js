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
const FALLBACK_METAS = {
  movie: [
    { id: 'tt1375666', type: 'movie', name: 'Inception', poster: 'https://images.metahub.space/poster/small/tt1375666/img', releaseInfo: '2010', imdbRating: '8.8', genres: ['Action', 'Sci-Fi'] },
    { id: 'tt0111161', type: 'movie', name: 'The Shawshank Redemption', poster: 'https://images.metahub.space/poster/small/tt0111161/img', releaseInfo: '1994', imdbRating: '9.3', genres: ['Drama'] },
    { id: 'tt0468569', type: 'movie', name: 'The Dark Knight', poster: 'https://images.metahub.space/poster/small/tt0468569/img', releaseInfo: '2008', imdbRating: '9.0', genres: ['Action', 'Crime'] },
    { id: 'tt0816692', type: 'movie', name: 'Interstellar', poster: 'https://images.metahub.space/poster/small/tt0816692/img', releaseInfo: '2014', imdbRating: '8.7', genres: ['Adventure', 'Drama', 'Sci-Fi'] },
    { id: 'tt15239678', type: 'movie', name: 'Dune: Part Two', poster: 'https://images.metahub.space/poster/small/tt15239678/img', releaseInfo: '2024', imdbRating: '8.6', genres: ['Action', 'Adventure', 'Sci-Fi'] },
    { id: 'tt15398776', type: 'movie', name: 'Oppenheimer', poster: 'https://images.metahub.space/poster/small/tt15398776/img', releaseInfo: '2023', imdbRating: '8.9', genres: ['Biography', 'Drama', 'History'] },
    { id: 'tt0110912', type: 'movie', name: 'Pulp Fiction', poster: 'https://images.metahub.space/poster/small/tt0110912/img', releaseInfo: '1994', imdbRating: '8.9', genres: ['Crime', 'Drama'] },
    { id: 'tt0137523', type: 'movie', name: 'Fight Club', poster: 'https://images.metahub.space/poster/small/tt0137523/img', releaseInfo: '1999', imdbRating: '8.8', genres: ['Drama'] }
  ],
  series: [
    { id: 'tt0903747', type: 'series', name: 'Breaking Bad', poster: 'https://images.metahub.space/poster/small/tt0903747/img', releaseInfo: '2008-2013', imdbRating: '9.5', genres: ['Crime', 'Drama', 'Thriller'] },
    { id: 'tt0944947', type: 'series', name: 'Game of Thrones', poster: 'https://images.metahub.space/poster/small/tt0944947/img', releaseInfo: '2011-2019', imdbRating: '9.2', genres: ['Action', 'Adventure', 'Drama'] },
    { id: 'tt4574334', type: 'series', name: 'Stranger Things', poster: 'https://images.metahub.space/poster/small/tt4574334/img', releaseInfo: '2016-', imdbRating: '8.7', genres: ['Drama', 'Fantasy', 'Horror'] },
    { id: 'tt3032476', type: 'series', name: 'Better Call Saul', poster: 'https://images.metahub.space/poster/small/tt3032476/img', releaseInfo: '2015-2022', imdbRating: '9.0', genres: ['Crime', 'Drama'] },
    { id: 'tt3581920', type: 'series', name: 'The Last of Us', poster: 'https://images.metahub.space/poster/small/tt3581920/img', releaseInfo: '2023-', imdbRating: '8.8', genres: ['Action', 'Adventure', 'Drama'] },
    { id: 'tt8759904', type: 'series', name: 'Chernobyl', poster: 'https://images.metahub.space/poster/small/tt8759904/img', releaseInfo: '2019', imdbRating: '9.3', genres: ['Drama', 'History', 'Thriller'] },
    { id: 'tt0455275', type: 'series', name: 'Prison Break', poster: 'https://images.metahub.space/poster/small/tt0455275/img', releaseInfo: '2005-2017', imdbRating: '8.3', genres: ['Action', 'Crime', 'Drama'] },
    { id: 'tt2442560', type: 'series', name: 'Peaky Blinders', poster: 'https://images.metahub.space/poster/small/tt2442560/img', releaseInfo: '2013-2022', imdbRating: '8.8', genres: ['Crime', 'Drama'] }
  ],
  anime: [
    { id: 'tt2560140', type: 'series', name: 'Attack on Titan', poster: 'https://images.metahub.space/poster/small/tt2560140/img', releaseInfo: '2013-2023', imdbRating: '9.1', genres: ['Animation', 'Action', 'Adventure'] },
    { id: 'tt0877057', type: 'series', name: 'Death Note', poster: 'https://images.metahub.space/poster/small/tt0877057/img', releaseInfo: '2006-2007', imdbRating: '9.0', genres: ['Animation', 'Crime', 'Drama'] },
    { id: 'tt1438902', type: 'series', name: 'Fullmetal Alchemist: Brotherhood', poster: 'https://images.metahub.space/poster/small/tt1438902/img', releaseInfo: '2009-2010', imdbRating: '9.1', genres: ['Animation', 'Action', 'Adventure'] },
    { id: 'tt9335498', type: 'series', name: 'Demon Slayer: Kimetsu no Yaiba', poster: 'https://images.metahub.space/poster/small/tt9335498/img', releaseInfo: '2019-', imdbRating: '8.6', genres: ['Animation', 'Action', 'Fantasy'] },
    { id: 'tt12343534', type: 'series', name: 'Jujutsu Kaisen', poster: 'https://images.metahub.space/poster/small/tt12343534/img', releaseInfo: '2020-', imdbRating: '8.5', genres: ['Animation', 'Action', 'Fantasy'] },
    { id: 'tt0388629', type: 'series', name: 'One Piece', poster: 'https://images.metahub.space/poster/small/tt0388629/img', releaseInfo: '1999-', imdbRating: '9.0', genres: ['Animation', 'Action', 'Adventure'] }
  ]
};

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
// Catalog Endpoints (Discovery & Search in Stremio / Nuvio)
// --------------------------------------------------------------------------

app.get([
  '/catalog/:type/:id.json',
  '/catalog/:type/:id/:extra.json',
  '/:config/catalog/:type/:id.json',
  '/:config/catalog/:type/:id/:extra.json'
], async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.setHeader('Cache-Control', 'max-age=1800, public');

  const type = req.params.type || 'movie';
  const { search, skip } = getSearchAndSkip(req.params.extra, req.query);
  const cinemetaType = (type === 'series') ? 'series' : 'movie';

  try {
    // 1. Search Query in Catalog
    if (search) {
      const searchUrl = `https://v3-cinemeta.strem.io/catalog/${cinemetaType}/top/search=${encodeURIComponent(search)}.json`;
      const resp = await axios.get(searchUrl, {
        timeout: 7000,
        headers: { 'User-Agent': config.USER_AGENT }
      });
      const metas = (resp.data?.metas || []).map(m => ({
        id: m.id || m.imdb_id,
        type: type,
        name: m.name,
        poster: m.poster,
        description: m.description || `مشاهدة ${m.name} مترجم ومدبلج على سيرفرات ZXR Stream`,
        releaseInfo: m.releaseInfo || m.year,
        imdbRating: m.imdbRating,
        genres: m.genres || []
      }));
      return res.json({ metas });
    }

    // 2. Default Catalog Discovery (Popular Movies/Series/Anime)
    const cacheKey = `${type}:${skip}`;
    const cached = catalogCache.get(cacheKey);
    if (cached && (Date.now() - cached.timestamp < 1800000)) {
      return res.json({ metas: cached.metas });
    }

    try {
      const topUrl = `https://v3-cinemeta.strem.io/catalog/${cinemetaType}/top${skip ? `/skip=${skip}` : ''}.json`;
      const resp = await axios.get(topUrl, {
        timeout: 7000,
        headers: { 'User-Agent': config.USER_AGENT }
      });
      const metas = (resp.data?.metas || []).map(m => ({
        id: m.id || m.imdb_id,
        type: type,
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
    const fallbacks = FALLBACK_METAS[type] || FALLBACK_METAS.movie;
    return res.json({ metas: fallbacks });
  } catch (err) {
    console.error('[ZXR-Stream] Catalog error:', err.message);
    const fallbacks = FALLBACK_METAS[type] || FALLBACK_METAS.movie;
    return res.json({ metas: fallbacks });
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
