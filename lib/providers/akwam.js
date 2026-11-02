/**
 * Akwam Scraper (أكوام)
 * High-speed direct MP4 streams (1080p, 720p, 480p)
 * Ported from re-3arabi
 */

const cheerio = require('cheerio');
const ProviderUtils = require('./utils');
const StreamExtractors = require('../extractors');
const config = require('../../config');

class Akwam {
  static get name() { return 'Akwam'; }
  static get id() { return 'akwam'; }
  static get baseUrl() { return config.DOMAINS.akwam || 'https://akwam.ss'; }

  static async getStreams(query) {
    const streams = [];
    try {
      const client = ProviderUtils.createClient(this.baseUrl);
      const isSeries = !!(query.season && query.episode);
      const searchTerms = [
        query.title,
        query.title.replace(/^The\s+/i, ''),
        ...(query.titles || [])
      ].filter((t, idx, arr) => t && arr.indexOf(t) === idx);

      const displayTitle = isSeries
        ? `مسلسل ${query.title} الموسم ${query.season} الحلقة ${query.episode} مترجم`
        : `مشاهدة فيلم ${query.title} ${query.year || ''} مترجم`;

      let targetItemUrl = null;

      for (const term of searchTerms) {
        if (targetItemUrl) break;
        try {
          const sRes = await client.get(`/search?q=${encodeURIComponent(term)}`);
          const $ = cheerio.load(sRes.data);

          $('div.col-lg-auto.col-md-4.col-6').each((_, el) => {
            if (targetItemUrl) return;
            const a = $(el).find('h3.entry-title a').first();
            const h = a.attr('href');
            const t = a.text().trim();
            if (!h) return;

            if (isSeries) {
              if (h.includes('/series/')) {
                const sKeywords = [`الموسم ${query.season}`, `s0${query.season}`, `s${query.season}`, String(query.season)];
                const matchesSeason = sKeywords.some(k => t.includes(k));
                if (matchesSeason || ProviderUtils.matchesTitle(t, term)) {
                  targetItemUrl = h;
                }
              }
            } else {
              if (h.includes('/movie/')) {
                if (ProviderUtils.matchesTitle(t, term, query.year)) {
                  targetItemUrl = h;
                }
              }
            }
          });
        } catch {}
      }

      if (!targetItemUrl) return streams;

      let watchPageUrl = null;

      if (isSeries) {
        const itemRes = await client.get(targetItemUrl);
        const $item = cheerio.load(itemRes.data);
        let epPageUrl = null;

        $item('a[href*="/episode/"]').each((_, el) => {
          if (epPageUrl) return;
          const href = $item(el).attr('href');
          const txt = $item(el).text().trim();
          const epMatch = txt.match(/(?:الحلقة|حلقه|حلقة|ep)\s*(\d+)/i) || href.match(/\/(\d+)\//);
          if (epMatch && parseInt(epMatch[1], 10) === query.episode) {
            epPageUrl = href;
          }
        });

        if (epPageUrl) {
          const epRes = await client.get(epPageUrl);
          const $ep = cheerio.load(epRes.data);
          watchPageUrl = $ep('a.link-show, a[href*="/watch/"]').attr('href');
        }
      } else {
        const itemRes = await client.get(targetItemUrl);
        const $item = cheerio.load(itemRes.data);
        watchPageUrl = $item('a.link-show, a[href*="/watch/"]').attr('href');
      }

      if (!watchPageUrl) return streams;

      const watchRes = await client.get(watchPageUrl, {
        headers: { Referer: targetItemUrl }
      });
      const $w = cheerio.load(watchRes.data);

      $w('source[src], video[src]').each((_, el) => {
        const src = $w(el).attr('src');
        const size = $w(el).attr('size') || $w(el).attr('label') || '1080';
        if (src && src.startsWith('http')) {
          const q = size.includes('p') ? size : `${size}p`;
          const s = StreamExtractors.formatStream({
            sourceName: 'Akwam',
            quality: q,
            driver: 'Direct MP4',
            displayTitle,
            url: src,
            referer: watchPageUrl
          });
          if (s) streams.push(s);
        }
      });
    } catch {}

    return streams;
  }
}

module.exports = Akwam;
