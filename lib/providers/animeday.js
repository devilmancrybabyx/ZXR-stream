/**
 * AnimeDay Scraper (أنمي داي)
 * Recreated from mehdigm-stream Kotlin provider
 */

const cheerio = require('cheerio');
const ProviderUtils = require('./utils');
const StreamExtractors = require('../extractors');
const config = require('../../config');

class AnimeDay {
  static get name() { return 'أنمي داي (AnimeDay)'; }
  static get id() { return 'animeday'; }
  static get baseUrl() { return config.DOMAINS.animeday; }

  static async getStreams(query) {
    const streams = [];
    try {
      const client = ProviderUtils.createClient(this.baseUrl);
      const res = await client.get(`/?s=${encodeURIComponent(query.title)}`);
      const $ = cheerio.load(res.data);

      let matchedUrl = null;
      $('.post-item, .anime-card, a[href*="/anime/"]').each((_, el) => {
        if (matchedUrl) return;
        const a = $(el).is('a') ? $(el) : $(el).find('a[href]').first();
        const href = a.attr('href');
        const title = a.attr('title') || $(el).find('h3, h2, .title').text().trim() || '';

        if (href && ProviderUtils.matchesTitle(title, query.title, query.year)) {
          matchedUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
        }
      });

      if (!matchedUrl) return streams;

      const epNum = query.episode || 1;
      let epUrl = null;

      const animePage = await client.get(matchedUrl);
      const $page = cheerio.load(animePage.data);

      $page('a[href*="/episode/"], .episodes-list a').each((_, el) => {
        if (epUrl) return;
        const h = $page(el).attr('href');
        const t = $page(el).text().trim();
        const m = t.match(/الحلقة\s*(\d+)/i) || h.match(/episode-(\d+)/i);
        if (m && parseInt(m[1], 10) === epNum) {
          epUrl = h.startsWith('http') ? h : `${this.baseUrl}${h}`;
        }
      });

      if (!epUrl) {
        epUrl = `${matchedUrl.replace(/\/$/, '')}/episode/${epNum}`;
      }

      const epRes = await client.get(epUrl, { headers: { 'Referer': matchedUrl } });
      const $ep = cheerio.load(epRes.data);

      const serverUrls = [];

      $ep('iframe[src]').each((_, el) => {
        const src = $ep(el).attr('src');
        if (src && !src.includes('google') && !src.includes('youtube')) {
          serverUrls.push({ url: src.startsWith('//') ? `https:${src}` : src, name: 'Player' });
        }
      });

      $ep('.server-item a, [data-url]').each((_, el) => {
        const u = $ep(el).attr('data-url') || $ep(el).attr('href');
        if (u && u.startsWith('http')) {
          serverUrls.push({ url: u, name: $ep(el).text().trim() || 'Server' });
        }
      });

      const extracted = await Promise.allSettled(
        serverUrls.slice(0, 5).map(s => StreamExtractors.extract(s.url, epUrl, `AnimeDay • ${s.name}`))
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

module.exports = AnimeDay;
