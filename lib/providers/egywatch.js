/**
 * Egywatch Scraper (إيجي واتش)
 * EasyPlex API based provider
 * Recreated from mehdigm-stream Kotlin provider
 */

const ProviderUtils = require('./utils');
const StreamExtractors = require('../extractors');
const config = require('../../config');

class Egywatch {
  static get name() { return 'إيجي واتش (Egywatch)'; }
  static get id() { return 'egywatch'; }
  static get baseUrl() { return config.DOMAINS.egywatch; }

  static async getStreams(query) {
    const streams = [];
    try {
      const client = ProviderUtils.createClient(this.baseUrl);
      const code = 'p2lbgWkFrykA4QyUmpHihzmc5BNzIABq';
      const searchUrl = `/api/search/${encodeURIComponent(query.title)}/${code}`;
      const res = await client.get(searchUrl, {
        headers: {
          'User-Agent': 'EasyPlex (Android 14; M2006C3MG; Redmi angelica; en)',
          'package-name': 'com.linkletter.app'
        }
      });

      const items = Array.isArray(res.data) ? res.data : (res.data?.search || res.data?.data || []);
      let matchedItem = null;

      for (const item of items) {
        const title = item.title || item.name || '';
        if (ProviderUtils.matchesTitle(title, query.title, query.year)) {
          matchedItem = item;
          break;
        }
      }

      if (!matchedItem) return streams;

      // Extract video streams from videos array
      const videos = matchedItem.videos || [];
      for (const v of videos) {
        const link = v.link || v.url;
        const server = v.server || 'EgywatchServer';
        if (link && link.startsWith('http')) {
          const extracted = await StreamExtractors.extract(link, this.baseUrl, `Egywatch • ${server}`);
          streams.push(...extracted);
        }
      }
    } catch {}

    return streams;
  }
}

module.exports = Egywatch;
