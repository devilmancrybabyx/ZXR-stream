/**
 * EgyDead Scraper (إيجي ديد)
 * Recreated from mehdigm-stream Kotlin provider
 */

const cheerio = require('cheerio');
const ProviderUtils = require('./utils');
const StreamExtractors = require('../extractors');
const config = require('../../config');

class EgyDead {
  static get name() { return 'إيجي ديد (EgyDead)'; }
  static get id() { return 'egydead'; }
  static get baseUrl() { return config.DOMAINS.egydead; }

  /**
   * Search and extract video streams
   * @param {{ title: string, year?: number, season?: number, episode?: number, type: string }} query
   * @returns {Promise<Array>}
   */
  static async getStreams(query) {
    const streams = [];
    try {
      const client = ProviderUtils.createClient(this.baseUrl);
      const searchTerms = [query.title];
      let matchedItemUrl = null;

      for (const term of searchTerms) {
        if (!term) continue;
        const res = await client.get(`/?s=${encodeURIComponent(term)}`);
        const $ = cheerio.load(res.data);

        $('div.movies-list li.movieItem, div.catHolder li.movieItem, li.movieItem').each((_, el) => {
          if (matchedItemUrl) return;
          const a = $(el).find('a[href]').first();
          const href = a.attr('href');
          const rawTitle = $(el).find('.BottomTitle, h1, h2, h3').text().trim() || a.attr('title') || '';

          if (!href || !rawTitle) return;

          // Check if series vs movie
          if (query.season && query.episode) {
            // Looking for episode or series
            if (ProviderUtils.matchesTitle(rawTitle, query.title, query.year)) {
              matchedItemUrl = href;
            }
          } else {
            // Movie
            if (ProviderUtils.matchesTitle(rawTitle, query.title, query.year)) {
              matchedItemUrl = href;
            }
          }
        });

        if (matchedItemUrl) break;
      }

      if (!matchedItemUrl) return streams;

      // Clean watch URL
      let targetUrl = matchedItemUrl.replace(/\/watch\/?$/i, '/');

      // If series, find the specific season & episode
      if (query.season && query.episode) {
        const itemPage = await client.get(targetUrl);
        const $item = cheerio.load(itemPage.data);

        // Find episode link
        let epUrl = null;
        $item('a[href*="/episode"]').each((_, el) => {
          if (epUrl) return;
          const href = $item(el).attr('href');
          const text = $item(el).text().trim() || $item(el).attr('title') || '';
          const epNumMatch = text.match(/(?:الحلقة|حلقة|ep)\s*(\d+)/i) || href.match(/episode-(\d+)/i);
          if (epNumMatch && parseInt(epNumMatch[1], 10) === query.episode) {
            epUrl = href;
          }
        });

        if (epUrl) {
          targetUrl = epUrl.replace(/\/watch\/?$/i, '/');
        }
      }

      const watchUrl = `${targetUrl.replace(/\/$/, '')}/watch/`;
      let watchDoc = null;

      try {
        const watchRes = await client.get(watchUrl, { headers: { 'Referer': targetUrl } });
        watchDoc = cheerio.load(watchRes.data);
      } catch {
        const pageRes = await client.get(targetUrl);
        watchDoc = cheerio.load(pageRes.data);
      }

      if (!watchDoc) return streams;

      // Collect server links
      const serverUrls = [];

      // 1. Watch server buttons
      watchDoc('ul.serversList li, .serversList li, [data-link], [data-embed]').each((_, el) => {
        const raw = watchDoc(el).attr('data-link') ||
                    watchDoc(el).attr('data-embed') ||
                    watchDoc(el).attr('data-src') ||
                    watchDoc(el).attr('data-url');
        if (raw && !raw.includes('youtube.com')) {
          const sName = watchDoc(el).text().trim() || 'WatchServer';
          serverUrls.push({ url: raw.startsWith('//') ? `https:${raw}` : raw, name: sName });
        }
      });

      // 2. Embedded iframes
      watchDoc('iframe[src]').each((_, el) => {
        const src = watchDoc(el).attr('src');
        if (src && !src.includes('youtube.com') && !src.includes('google')) {
          serverUrls.push({ url: src.startsWith('//') ? `https:${src}` : src, name: 'Player' });
        }
      });

      // 3. Download server links
      watchDoc('ul.donwload-servers-list li a, ul.download-servers-list li a').each((_, el) => {
        const href = watchDoc(el).attr('href');
        const sName = watchDoc(el).find('.ser-name').text().trim() || 'DownloadServer';
        if (href && href.startsWith('http')) {
          serverUrls.push({ url: href, name: sName });
        }
      });

      // Extract streams in parallel
      const extracted = await Promise.allSettled(
        serverUrls.slice(0, 7).map(s => StreamExtractors.extract(s.url, watchUrl, `EgyDead • ${s.name}`))
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

module.exports = EgyDead;
