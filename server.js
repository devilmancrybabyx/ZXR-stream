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
  res.json(getManifest({}, host));
});

app.get('/:config/manifest.json', (req, res) => {
  const host = `${req.protocol}://${req.get('host')}`;
  const userConfig = parseConfig(req.params.config);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.json(getManifest(userConfig, host));
});

// --------------------------------------------------------------------------
// Catalog Endpoints (Discovery & Search in Stremio / Nuvio)
// --------------------------------------------------------------------------

app.get(['/catalog/:type/:id.json', '/catalog/:type/:id/:extra.json', '/:config/catalog/:type/:id.json', '/:config/catalog/:type/:id/:extra.json'], async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

  const extra = req.params.extra ? parseConfig(req.params.extra) : {};
  const searchQuery = extra.search || req.query.search;

  if (!searchQuery) {
    // Return empty catalog list or curated items
    return res.json({ metas: [] });
  }

  // If user searched for something inside Stremio/Nuvio Discover:
  try {
    const metas = [
      {
        id: `zxr_search_${Date.now()}`,
        type: req.params.type || 'movie',
        name: searchQuery,
        poster: 'https://raw.githubusercontent.com/devilmancrybabyx/ZXR-stream/main/public/images/EgyDead.png',
        description: `بحث عن: ${searchQuery} في المصادر العربية`
      }
    ];
    return res.json({ metas });
  } catch {
    return res.json({ metas: [] });
  }
});

// --------------------------------------------------------------------------
// Stream Endpoint (The Core Playback Pipeline)
// --------------------------------------------------------------------------

app.get(['/stream/:type/:id.json', '/:config/stream/:type/:id.json'], async (req, res) => {
  res.setHeader('Content-Type', 'application/json; charset=utf-8');

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
