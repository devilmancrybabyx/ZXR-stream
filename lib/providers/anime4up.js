/**
 * Anime4Up Scraper (أنمي فور اب)
 * Recreated from mehdigm-stream Kotlin provider
 */

const cheerio = require('cheerio');
const ProviderUtils = require('./utils');
const StreamExtractors = require('../extractors');
const config = require('../../config');

class Anime4Up {
  static get name() { return 'أنمي فور اب (Anime4Up)'; }
  static get id() { return 'anime4up'; }
  static get baseUrl() { return config.DOMAINS.anime4up; }

  static async getStreams(query) {
    const streams = [];
    try {
      const client = ProviderUtils.createClient(this.baseUrl);
      const searchRes = await client.get(`/?search_param=animes&s=${encodeURIComponent(query.title)}`);
      const $ = cheerio.load(searchRes.data);

      let animeUrl = null;
      $('.anime-card-container a, a[href*="/anime/"]').each((_, el) => {
        if (animeUrl) return;
        const href = $(el).attr('href');
        const title = $(el).text().trim() || $(el).attr('title') || '';
        if (href && ProviderUtils.matchesTitle(title, query.title, query.year)) {
          animeUrl = href;
        }
      });

      if (!animeUrl) return streams;

      const epNum = query.episode || 1;
      let epUrl = null;

      const animePage = await client.get(animeUrl);
      const $page = cheerio.load(animePage.data);

      $page('a[href*="/episode/"], .episodes-card-title a').each((_, el) => {
        if (epUrl) return;
        const href = $page(el).attr('href');
        const text = $page(el).text().trim();
        const m = text.match(/(?:الحلقة|حلقة|ep)\s*(\d+)/i) || href.match(/[-_](\d+)(?:\/|$)/);
        if (m && parseInt(m[1], 10) === epNum) {
          epUrl = href;
        }
      });

      if (!epUrl) {
        const slug = animeUrl.replace(/\/$/, '').split('/').pop();
        epUrl = `${this.baseUrl}/episode/${slug}-الحلقة-${epNum}/`;
      }

      const epRes = await client.get(epUrl, { headers: { 'Referer': animeUrl } });
      const $ep = cheerio.load(epRes.data);

      const serverLinks = [];

      $ep('ul#episode-servers li a, .server-item a, [data-url]').each((_, el) => {
        const u = $ep(el).attr('data-url') || $ep(el).attr('href');
        const name = $ep(el).text().trim() || 'Server';
        if (u && u.startsWith('http')) {
          serverLinks.push({ url: u, name });
        }
      });

      $ep('iframe[src]').each((_, el) => {
        const src = $ep(el).attr('src');
        if (src && !src.includes('google') && !src.includes('youtube')) {
          serverLinks.push({ url: src.startsWith('//') ? `https:${src}` : src, name: 'Player' });
        }
      });

      const extracted = await Promise.allSettled(
        serverLinks.slice(0, 6).map(s => StreamExtractors.extract(s.url, epUrl, `Anime4Up • ${s.name}`))
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

module.exports = Anime4Up;
