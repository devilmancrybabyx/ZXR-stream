/**
 * WitAnime Scraper (ويت أنمي)
 * Anime specialist provider recreated from mehdigm-stream Kotlin provider
 */

const cheerio = require('cheerio');
const ProviderUtils = require('./utils');
const StreamExtractors = require('../extractors');
const config = require('../../config');

class WitAnime {
  static get name() { return 'ويت أنمي (WitAnime)'; }
  static get id() { return 'witanime'; }
  static get baseUrl() { return config.DOMAINS.witanime; }

  static async getStreams(query) {
    const streams = [];
    try {
      const client = ProviderUtils.createClient(this.baseUrl);
      const searchRes = await client.get(`/?search_param=animes&s=${encodeURIComponent(query.title)}`);
      const $ = cheerio.load(searchRes.data);

      let animeUrl = null;
      $('a[href*="/anime/"], .anime-card-container a').each((_, el) => {
        if (animeUrl) return;
        const href = $(el).attr('href');
        const title = $(el).text().trim() || $(el).attr('title') || '';
        if (href && ProviderUtils.matchesTitle(title, query.title, query.year)) {
          animeUrl = href;
        }
      });

      if (!animeUrl) return streams;

      // Determine episode URL
      let watchUrl = null;
      const epNum = query.episode || 1;

      // Fetch anime page to find episode link
      const animePage = await client.get(animeUrl);
      const $page = cheerio.load(animePage.data);

      $page('a[href*="/watch/"], .episodes-card-title a').each((_, el) => {
        if (watchUrl) return;
        const href = $page(el).attr('href');
        const text = $page(el).text().trim();
        const m = text.match(/(?:الحلقة|حلقة|ep)\s*(\d+)/i) || href.match(/[-_](\d+)(?:\/|$)/);
        if (m && parseInt(m[1], 10) === epNum) {
          watchUrl = href;
        }
      });

      // Fallback watch URL pattern
      if (!watchUrl) {
        const slug = animeUrl.replace(/\/$/, '').split('/').pop();
        watchUrl = `${this.baseUrl}/watch/${slug}/${epNum}`;
      }

      // Fetch watch page
      const watchRes = await client.get(watchUrl, { headers: { 'Referer': animeUrl } });
      const $watch = cheerio.load(watchRes.data);

      const serverLinks = [];

      // Extract server URLs from buttons & iframes
      $watch('ul#episode-servers li a, .server-item a, [data-url]').each((_, el) => {
        const url = $watch(el).attr('data-url') || $watch(el).attr('href');
        const name = $watch(el).text().trim() || 'Server';
        if (url && url.startsWith('http')) {
          serverLinks.push({ url, name });
        }
      });

      $watch('iframe[src]').each((_, el) => {
        const src = $watch(el).attr('src');
        if (src && !src.includes('google') && !src.includes('youtube')) {
          serverLinks.push({ url: src.startsWith('//') ? `https:${src}` : src, name: 'Player' });
        }
      });

      const extracted = await Promise.allSettled(
        serverLinks.slice(0, 6).map(s => StreamExtractors.extract(s.url, watchUrl, `WitAnime • ${s.name}`))
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

module.exports = WitAnime;
