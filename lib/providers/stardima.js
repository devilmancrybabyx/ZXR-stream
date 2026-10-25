/**
 * StarDima Scraper (ستار ديما)
 * Dedicated Cartoon & Kids Dubbed Content
 * Recreated from mehdigm-stream Kotlin provider
 */

const cheerio = require('cheerio');
const ProviderUtils = require('./utils');
const StreamExtractors = require('../extractors');
const config = require('../../config');

class StarDima {
  static get name() { return 'ستار ديما (StarDima)'; }
  static get id() { return 'stardima'; }
  static get baseUrl() { return config.DOMAINS.stardima; }

  static async getStreams(query) {
    const streams = [];
    try {
      const client = ProviderUtils.createClient(this.baseUrl);
      // Query cartoon search
      const res = await client.get(`/search?q=${encodeURIComponent(query.title)}`);
      const $ = cheerio.load(res.data);

      let matchedUrl = null;
      $('.video-item, .post-item, a[href*="/video/"]').each((_, el) => {
        if (matchedUrl) return;
        const a = $(el).is('a') ? $(el) : $(el).find('a[href]').first();
        const href = a.attr('href');
        const title = a.attr('title') || $(el).find('h3, h2, .title').text().trim() || '';

        if (href && ProviderUtils.matchesTitle(title, query.title, query.year)) {
          matchedUrl = href;
        }
      });

      if (!matchedUrl) return streams;

      const pageRes = await client.get(matchedUrl);
      const $doc = cheerio.load(pageRes.data);

      const serverUrls = [];

      $doc('iframe[src]').each((_, el) => {
        const src = $doc(el).attr('src');
        if (src && !src.includes('google') && !src.includes('youtube')) {
          serverUrls.push({ url: src.startsWith('//') ? `https:${src}` : src, name: 'StarPlayer' });
        }
      });

      $doc('.server-links a, [data-stream]').each((_, el) => {
        const u = $doc(el).attr('data-stream') || $doc(el).attr('href');
        if (u && u.startsWith('http')) {
          serverUrls.push({ url: u, name: 'Backup' });
        }
      });

      const extracted = await Promise.allSettled(
        serverUrls.slice(0, 5).map(s => StreamExtractors.extract(s.url, matchedUrl, `StarDima • ${s.name}`))
      );

      for (const res of extracted) {
        if (res.status === 'fulfilled' && Array.isArray(res.value)) {
          streams.push(...res.value);
        }
      }
    } catch {}

    return streams;
  }
}

module.exports = StarDima;
