/**
 * Animezid Scraper (أنمي زد)
 * Recreated from mehdigm-stream Kotlin provider
 */

const cheerio = require('cheerio');
const ProviderUtils = require('./utils');
const StreamExtractors = require('../extractors');
const config = require('../../config');

class Animezid {
  static get name() { return 'أنمي زد (Animezid)'; }
  static get id() { return 'animezid'; }
  static get baseUrl() { return config.DOMAINS.animezid; }

  static async getStreams(query) {
    const streams = [];
    try {
      const client = ProviderUtils.createClient(this.baseUrl);
      const searchRes = await client.get(`/?s=${encodeURIComponent(query.title)}`);
      const $ = cheerio.load(searchRes.data);

      let animeUrl = null;
      $('.anime-card, .post-item, a[href*="/anime/"], a[href*="/movie/"]').each((_, el) => {
        if (animeUrl) return;
        const a = $(el).is('a') ? $(el) : $(el).find('a[href]').first();
        const href = a.attr('href');
        const title = a.attr('title') || $(el).find('h3, h2, .title').text().trim() || '';

        if (href && ProviderUtils.matchesTitle(title, query.title, query.year)) {
          animeUrl = href;
        }
      });

      if (!animeUrl) return streams;

      let watchUrl = animeUrl;
      const epNum = query.episode || 1;

      // Check for episodes on anime page
      const pageRes = await client.get(animeUrl);
      const $doc = cheerio.load(pageRes.data);

      $doc('a[href*="/episode/"], .episodes-list a').each((_, el) => {
        const h = $doc(el).attr('href');
        const t = $doc(el).text().trim() || $doc(el).attr('title') || '';
        const m = t.match(/(?:الحلقة|حلقة|ep)\s*(\d+)/i) || h.match(/episode-(\d+)/i);
        if (m && parseInt(m[1], 10) === epNum) {
          watchUrl = h;
        }
      });

      const epPage = await client.get(watchUrl, { headers: { 'Referer': animeUrl } });
      const $ep = cheerio.load(epPage.data);

      const serverUrls = [];

      $ep('iframe[src]').each((_, el) => {
        const src = $ep(el).attr('src');
        if (src && !src.includes('google') && !src.includes('youtube')) {
          serverUrls.push({ url: src.startsWith('//') ? `https:${src}` : src, name: 'Player' });
        }
      });

      $ep('ul.servers-list li, [data-link], [data-embed]').each((_, el) => {
        const u = $ep(el).attr('data-link') || $ep(el).attr('data-embed') || $ep(el).attr('data-url');
        if (u && u.startsWith('http')) {
          serverUrls.push({ url: u, name: $ep(el).text().trim() || 'ZidServer' });
        }
      });

      const extracted = await Promise.allSettled(
        serverUrls.slice(0, 5).map(s => StreamExtractors.extract(s.url, watchUrl, `Animezid • ${s.name}`))
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

module.exports = Animezid;
