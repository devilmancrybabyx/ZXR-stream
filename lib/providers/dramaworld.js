/**
 * DramaWorld Scraper (عالم الدراما)
 * Asian, Korean & Turkish drama specialist
 * Recreated from mehdigm-stream Kotlin provider
 */

const ProviderUtils = require('./utils');
const StreamExtractors = require('../extractors');
const config = require('../../config');

class DramaWorld {
  static get name() { return 'عالم الدراما (DramaWorld)'; }
  static get id() { return 'dramaworld'; }
  static get baseUrl() { return config.DOMAINS.dramaworld; }

  static async getStreams(query) {
    const streams = [];
    try {
      const client = ProviderUtils.createClient(this.baseUrl);
      // DramaWorld JSON API search
      const key = "4F5A9C3D9A86FA54EACEDDD635185";
      const uuid = "d506abfd-9fe2-4b71-b979-feff21bcad13";

      const searchEndpoint = `/api/search/by/${encodeURIComponent(query.title)}/${key}/${uuid}/`;
      const res = await client.get(searchEndpoint, {
        headers: { 'User-Agent': 'okhttp/4.12.0' }
      });

      const items = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      let matchedItem = null;

      for (const item of items) {
        const title = item.title || item.name || '';
        if (ProviderUtils.matchesTitle(title, query.title, query.year)) {
          matchedItem = item;
          break;
        }
      }

      if (!matchedItem) return streams;

      // If series, fetch sources for the episode
      let sourcesUrl = '';
      if (query.season && query.episode) {
        sourcesUrl = `/api/episode/source/by/${matchedItem.id || matchedItem.item_id}/${query.episode}/${key}/${uuid}/`;
      } else {
        sourcesUrl = `/api/movie/source/by/${matchedItem.id || matchedItem.item_id}/${key}/${uuid}/`;
      }

      const sourcesRes = await client.get(sourcesUrl, {
        headers: { 'User-Agent': 'okhttp/4.12.0' }
      });

      let rawSources = sourcesRes.data;
      // Handle base64 decoded payload "W3s" pattern from Kotlin app
      if (typeof rawSources === 'string' && rawSources.includes('W3s')) {
        const b64Part = rawSources.substring(rawSources.indexOf('W3s'));
        try {
          rawSources = JSON.parse(Buffer.from(b64Part, 'base64').toString('utf-8'));
        } catch {}
      }

      if (Array.isArray(rawSources)) {
        for (const src of rawSources) {
          const streamUrl = src.url;
          const hostName = src.title || 'DramaServer';
          if (streamUrl && streamUrl.startsWith('http')) {
            const extracted = await StreamExtractors.extract(streamUrl, this.baseUrl, `DramaWorld • ${hostName}`);
            streams.push(...extracted);
          }
        }
      }
    } catch {}

    return streams;
  }
}

module.exports = DramaWorld;
