/**
 * TukTuk Cinema Scraper (توك توك سينما)
 * Recreated from mehdigm-stream Kotlin provider
 */

const cheerio = require('cheerio');
const ProviderUtils = require('./utils');
const StreamExtractors = require('../extractors');
const config = require('../../config');

class TukTukCinema {
  static get name() { return 'توك توك سينما (TukTuk)'; }
  static get id() { return 'tuktuk'; }
  static get baseUrl() { return config.DOMAINS.tuktuk; }

  static async getStreams(query) {
    const streams = [];
    try {
      const client = ProviderUtils.createClient(this.baseUrl);
      const searchRes = await client.get(`/?s=${encodeURIComponent(query.title)}`);
      const $ = cheerio.load(searchRes.data);

      let matchedUrl = null;
      $('li.Small--Box, div.Block--Item, li.AsidePost, .Poster--Block').each((_, el) => {
        if (matchedUrl) return;
        const a = $(el).find('a[href]').first();
        const href = a.attr('href');
        const title = a.attr('title') || $(el).find('.title, h2, h3').text().trim() || '';

        if (href && ProviderUtils.matchesTitle(title, query.title, query.year)) {
          matchedUrl = href;
        }
      });

      if (!matchedUrl) return streams;

      let targetUrl = matchedUrl;

      // Handle episode page
      if (query.season && query.episode) {
        const showPage = await client.get(targetUrl);
        const $show = cheerio.load(showPage.data);
        let epHref = null;

        $show('a.SeriesEpisodeCard, a[href*="/episode/"]').each((_, el) => {
          if (epHref) return;
          const h = $show(el).attr('href');
          const t = $show(el).attr('title') || $show(el).text().trim();
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

      // Look for data-crypt iframe player
      const iframeCrypt = $page('iframe#main-video-frame, iframe[data-crypt]').attr('data-crypt');
      if (iframeCrypt) {
        try {
          const decodedUrl = Buffer.from(iframeCrypt, 'base64').toString('utf-8');
          if (decodedUrl.startsWith('http')) {
            serverUrls.push({ url: decodedUrl, name: 'Player' });
          }
        } catch {}
      }

      // Check standard iframes
      $page('iframe[src]').each((_, el) => {
        const src = $page(el).attr('src');
        if (src && !src.includes('google') && !src.includes('youtube')) {
          serverUrls.push({ url: src.startsWith('//') ? `https:${src}` : src, name: 'TukTukPlayer' });
        }
      });

      const extracted = await Promise.allSettled(
        serverUrls.slice(0, 5).map(s => StreamExtractors.extract(s.url, targetUrl, `TukTuk • ${s.name}`))
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

module.exports = TukTukCinema;
