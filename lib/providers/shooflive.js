/**
 * ShoofLive Scraper (شوف لايف)
 * Recreated from mehdigm-stream Kotlin provider
 */

const cheerio = require('cheerio');
const ProviderUtils = require('./utils');
const StreamExtractors = require('../extractors');
const config = require('../../config');

class ShoofLive {
  static get name() { return 'شوف لايف (ShoofLive)'; }
  static get id() { return 'shooflive'; }
  static get baseUrl() { return config.DOMAINS.shooflive; }

  static async getStreams(query) {
    const streams = [];
    try {
      const client = ProviderUtils.createClient(this.baseUrl);
      const searchRes = await client.get(`/?s=${encodeURIComponent(query.title)}`);
      const $ = cheerio.load(searchRes.data);

      let matchedUrl = null;
      $('.post-item, .film-item, article, a[href*="/movies/"], a[href*="/series/"]').each((_, el) => {
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

        $s('a[href*="/episode/"], .episodes-list a').each((_, el) => {
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
      const $doc = cheerio.load(pageRes.data);

      const serverUrls = [];

      $doc('iframe[src*="albaplayer"], iframe[src]').each((_, el) => {
        const src = $doc(el).attr('src');
        if (src && !src.includes('google') && !src.includes('youtube')) {
          serverUrls.push({ url: src.startsWith('//') ? `https:${src}` : src, name: 'AlbaPlayer' });
        }
      });

      $doc('[data-url], .server-item a').each((_, el) => {
        const u = $doc(el).attr('data-url') || $doc(el).attr('href');
        if (u && u.startsWith('http')) {
          serverUrls.push({ url: u, name: $doc(el).text().trim() || 'Server' });
        }
      });

      const extracted = await Promise.allSettled(
        serverUrls.slice(0, 5).map(s => StreamExtractors.extract(s.url, targetUrl, `ShoofLive • ${s.name}`))
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

module.exports = ShoofLive;
