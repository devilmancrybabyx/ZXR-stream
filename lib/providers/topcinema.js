/**
 * TopCinema Scraper (توب سينما)
 * Recreated from mehdigm-stream Kotlin provider
 */

const cheerio = require('cheerio');
const ProviderUtils = require('./utils');
const StreamExtractors = require('../extractors');
const config = require('../../config');

class TopCinema {
  static get name() { return 'توب سينما (TopCinema)'; }
  static get id() { return 'topcinema'; }
  static get baseUrl() { return config.DOMAINS.topcinema; }

  static async getStreams(query) {
    const streams = [];
    try {
      const client = ProviderUtils.createClient(this.baseUrl);
      const searchRes = await client.get(`/?s=${encodeURIComponent(query.title)}`);
      const $ = cheerio.load(searchRes.data);

      let matchedUrl = null;
      $('.BlockItem, .post-item, .movie-card, a[href*="/movie/"], a[href*="/series/"]').each((_, el) => {
        if (matchedUrl) return;
        const a = $(el).is('a') ? $(el) : $(el).find('a[href]').first();
        const href = a.attr('href');
        const title = a.attr('title') || $(el).find('h3, h2, .title').text().trim() || '';

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

        $s('a[href*="/episode/"], .EpisodesList a').each((_, el) => {
          if (epHref) return;
          const h = $s(el).attr('href');
          const t = $s(el).text().trim() || $s(el).attr('title') || '';
          const epMatch = t.match(/الحلقة\s*(\d+)/i) || h.match(/episode-(\d+)/i);
          if (epMatch && parseInt(epMatch[1], 10) === query.episode) {
            epHref = h;
          }
        });

        if (epHref) targetUrl = epHref;
      }

      const pageRes = await client.get(targetUrl);
      const $page = cheerio.load(pageRes.data);

      const serverUrls = [];

      $page('iframe[src]').each((_, el) => {
        const src = $page(el).attr('src');
        if (src && !src.includes('google') && !src.includes('youtube')) {
          serverUrls.push({ url: src.startsWith('//') ? `https:${src}` : src, name: 'Player' });
        }
      });

      $page('.serversList li, [data-url], [data-link]').each((_, el) => {
        const u = $page(el).attr('data-url') || $page(el).attr('data-link');
        if (u && u.startsWith('http')) {
          serverUrls.push({ url: u, name: $page(el).text().trim() || 'TopServer' });
        }
      });

      const extracted = await Promise.allSettled(
        serverUrls.slice(0, 5).map(s => StreamExtractors.extract(s.url, targetUrl, `TopCinema • ${s.name}`))
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

module.exports = TopCinema;
