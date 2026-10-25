/**
 * Shahid4u Scraper (شاهد فور يو)
 * Recreated from mehdigm-stream Kotlin provider
 */

const cheerio = require('cheerio');
const ProviderUtils = require('./utils');
const StreamExtractors = require('../extractors');
const config = require('../../config');

class Shahid4u {
  static get name() { return 'شاهد فور يو (Shahid4u)'; }
  static get id() { return 'shahid4u'; }
  static get baseUrl() { return config.DOMAINS.shahid4u; }

  static async getStreams(query) {
    const streams = [];
    try {
      const client = ProviderUtils.createClient(this.baseUrl);
      const searchRes = await client.get(`/?s=${encodeURIComponent(query.title)}`);
      const $ = cheerio.load(searchRes.data);

      let matchedUrl = null;
      $('.media-block, .content-box, .movie-card, .post-item').each((_, el) => {
        if (matchedUrl) return;
        const a = $(el).find('a[href]').first();
        const href = a.attr('href');
        const title = $(el).find('h3, h2, .title').text().trim() || a.attr('title') || '';

        if (href && ProviderUtils.matchesTitle(title, query.title, query.year)) {
          matchedUrl = href;
        }
      });

      if (!matchedUrl) return streams;

      let targetUrl = matchedUrl;

      // Handle Series episode selection
      if (query.season && query.episode) {
        const seriesPage = await client.get(targetUrl);
        const $s = cheerio.load(seriesPage.data);
        let epHref = null;

        $s('a[href*="/episode/"], .episodes-list a').each((_, el) => {
          if (epHref) return;
          const h = $s(el).attr('href');
          const t = $s(el).text().trim();
          const epMatch = t.match(/(?:الحلقة|حلقة|ep)\s*(\d+)/i) || h.match(/episode-(\d+)/i);
          if (epMatch && parseInt(epMatch[1], 10) === query.episode) {
            epHref = h;
          }
        });

        if (epHref) targetUrl = epHref;
      }

      // Fetch watch / episode page
      const watchUrl = `${targetUrl.replace(/\/$/, '')}/watch/`;
      let doc = null;

      try {
        const watchRes = await client.get(watchUrl, { headers: { 'Referer': targetUrl } });
        doc = cheerio.load(watchRes.data);
      } catch {
        const pageRes = await client.get(targetUrl);
        doc = cheerio.load(pageRes.data);
      }

      if (!doc) return streams;

      const serverUrls = [];

      doc('ul.servers-list li, .server-button, [data-link], [data-embed]').each((_, el) => {
        const link = doc(el).attr('data-link') || doc(el).attr('data-embed') || doc(el).attr('data-url');
        const sName = doc(el).text().trim() || 'Shahid4uServer';
        if (link && !link.includes('youtube.com')) {
          serverUrls.push({ url: link.startsWith('//') ? `https:${link}` : link, name: sName });
        }
      });

      doc('iframe[src]').each((_, el) => {
        const src = doc(el).attr('src');
        if (src && !src.includes('youtube.com') && !src.includes('google')) {
          serverUrls.push({ url: src.startsWith('//') ? `https:${src}` : src, name: 'Player' });
        }
      });

      const extracted = await Promise.allSettled(
        serverUrls.slice(0, 6).map(s => StreamExtractors.extract(s.url, targetUrl, `Shahid4u • ${s.name}`))
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

module.exports = Shahid4u;
