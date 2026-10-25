/**
 * AnimeRift Scraper (أنمي ريفت)
 * Recreated from mehdigm-stream Kotlin provider
 */

const cheerio = require('cheerio');
const ProviderUtils = require('./utils');
const StreamExtractors = require('../extractors');
const config = require('../../config');

class AnimeRift {
  static get name() { return 'أنمي ريفت (AnimeRift)'; }
  static get id() { return 'animerift'; }
  static get baseUrl() { return config.DOMAINS.animerift; }

  static async getStreams(query) {
    const streams = [];
    try {
      const client = ProviderUtils.createClient(this.baseUrl);
      const res = await client.get(`/browse?q=${encodeURIComponent(query.title)}`);
      const $ = cheerio.load(res.data);

      let matchedUrl = null;
      $('a[href*="/anime/"]').each((_, el) => {
        if (matchedUrl) return;
        const href = $(el).attr('href');
        const title = $(el).text().trim() || $(el).attr('title') || '';
        if (href && ProviderUtils.matchesTitle(title, query.title, query.year)) {
          matchedUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
        }
      });

      if (!matchedUrl) return streams;

      const epNum = query.episode || 1;
      const animeId = matchedUrl.replace(/\/$/, '').split('/').pop();
      const watchUrl = `${this.baseUrl}/watch/${animeId}?ep=${epNum}`;

      const watchRes = await client.get(watchUrl, { headers: { 'Referer': matchedUrl } });
      const $w = cheerio.load(watchRes.data);

      const serverUrls = [];

      $w('iframe[src]').each((_, el) => {
        const src = $w(el).attr('src');
        if (src && !src.includes('google') && !src.includes('youtube')) {
          serverUrls.push({ url: src.startsWith('//') ? `https:${src}` : src, name: 'Player' });
        }
      });

      $w('[data-embed], [data-url], .servers-list a').each((_, el) => {
        const u = $w(el).attr('data-embed') || $w(el).attr('data-url') || $w(el).attr('href');
        if (u && u.startsWith('http')) {
          serverUrls.push({ url: u, name: $w(el).text().trim() || 'RiftServer' });
        }
      });

      const extracted = await Promise.allSettled(
        serverUrls.slice(0, 5).map(s => StreamExtractors.extract(s.url, watchUrl, `AnimeRift • ${s.name}`))
      );

      for (const r of extracted) {
        if (r.status === 'fulfilled' && Array.isArray(r.value)) {
          streams.push(...r.value);
        }
      }
    } catch {}

    return streams;
  }
}

module.exports = AnimeRift;
