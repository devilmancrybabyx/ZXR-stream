/**
 * CimaCloud Scraper (سيما كلاود)
 * Recreated from mehdigm-stream Kotlin provider
 */

const cheerio = require('cheerio');
const ProviderUtils = require('./utils');
const StreamExtractors = require('../extractors');
const config = require('../../config');

class CimaCloud {
  static get name() { return 'سيما كلاود (CimaCloud)'; }
  static get id() { return 'cimacloud'; }
  static get baseUrl() { return config.DOMAINS.cimacloud; }

  static async getStreams(query) {
    const streams = [];
    try {
      const client = ProviderUtils.createClient(this.baseUrl);
      const res = await client.get(`/?s=${encodeURIComponent(query.title)}`);
      const $ = cheerio.load(res.data);

      let matchedUrl = null;
      $('.post-item, .box, a[href*="/movie/"], a[href*="/series/"]').each((_, el) => {
        if (matchedUrl) return;
        const a = $(el).is('a') ? $(el) : $(el).find('a[href]').first();
        const href = a.attr('href');
        const title = a.attr('title') || $(el).find('h3, h2, .title').text().trim() || '';

        if (href && ProviderUtils.matchesTitle(title, query.title, query.year)) {
          matchedUrl = href.startsWith('http') ? href : `${this.baseUrl}${href}`;
        }
      });

      if (!matchedUrl) return streams;

      let targetUrl = matchedUrl;

      if (query.season && query.episode) {
        const seriesPage = await client.get(targetUrl);
        const $s = cheerio.load(seriesPage.data);
        let epHref = null;

        $s('a[href*="/episode/"], .episodes-list a').each((_, el) => {
          if (epHref) return;
          const h = $s(el).attr('href');
          const t = $s(el).text().trim();
          const m = t.match(/الحلقة\s*(\d+)/i) || h.match(/episode-(\d+)/i);
          if (m && parseInt(m[1], 10) === query.episode) {
            epHref = h.startsWith('http') ? h : `${this.baseUrl}${h}`;
          }
        });

        if (epHref) targetUrl = epHref;
      }

      const pageRes = await client.get(targetUrl);
      const $doc = cheerio.load(pageRes.data);

      const serverUrls = [];

      $doc('iframe[src]').each((_, el) => {
        const src = $doc(el).attr('src');
        if (src && !src.includes('google') && !src.includes('youtube')) {
          serverUrls.push({ url: src.startsWith('//') ? `https:${src}` : src, name: 'Player' });
        }
      });

      $doc('.servers-list a, [data-url]').each((_, el) => {
        const u = $doc(el).attr('data-url') || $doc(el).attr('href');
        if (u && u.startsWith('http')) {
          serverUrls.push({ url: u, name: $doc(el).text().trim() || 'Server' });
        }
      });

      const extracted = await Promise.allSettled(
        serverUrls.slice(0, 5).map(s => StreamExtractors.extract(s.url, targetUrl, `CimaCloud • ${s.name}`))
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

module.exports = CimaCloud;
