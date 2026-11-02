/**
 * EgyDead Scraper (إيجي ديد)
 * Recreated from mehdigm-stream Kotlin provider
 */

const cheerio = require('cheerio');
const ProviderUtils = require('./utils');
const StreamExtractors = require('../extractors');
const config = require('../../config');

const ARABIC_SEASONS = {
  1: ['الاول', 'الأول', 's01', 's1'],
  2: ['الثاني', 'الثانى', 's02', 's2'],
  3: ['الثالث', 's03', 's3'],
  4: ['الرابع', 's04', 's4'],
  5: ['الخامس', 's05', 's5'],
  6: ['السادس', 's06', 's6'],
  7: ['السابع', 's07', 's7'],
  8: ['الثامن', 's08', 's8'],
  9: ['التاسع', 's09', 's9'],
  10: ['العاشر', 's10']
};

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
      const isSeries = !!(query.season && query.episode);
      const searchTerms = [query.title];

      let targetWatchUrl = null;

      for (const term of searchTerms) {
        if (!term || targetWatchUrl) continue;
        const res = await client.get(`/?s=${encodeURIComponent(term)}`);
        const $ = cheerio.load(res.data);

        let seasonUrl = null;
        let seriesUrl = null;
        let movieUrl = null;

        $('li.movieItem').each((_, el) => {
          const a = $(el).find('a[href]').first();
          const href = a.attr('href');
          const rawTitle = $(el).find('.BottomTitle, h1, h2, h3').text().trim() || a.attr('title') || '';

          if (!href || !rawTitle) return;
          if (!ProviderUtils.matchesTitle(rawTitle, query.title, query.year)) return;

          if (isSeries) {
            // Check if this item is directly the requested season
            const seasonKeywords = ARABIC_SEASONS[query.season] || [`s${query.season}`, `s0${query.season}`];
            const isMatchSeason = seasonKeywords.some(k => rawTitle.toLowerCase().includes(k) || href.toLowerCase().includes(k));

            if (href.includes('/seasons/') && isMatchSeason && !seasonUrl) {
              seasonUrl = href;
            } else if (href.includes('/Series/') && !seriesUrl) {
              seriesUrl = href;
            }
          } else {
            // Movie
            if (!movieUrl && !href.includes('/seasons/') && !href.includes('/Series/') && !href.includes('/episodes/')) {
              movieUrl = href;
            }
          }
        });

        if (isSeries) {
          // Resolve Season page
          let finalSeasonUrl = seasonUrl;
          if (!finalSeasonUrl && seriesUrl) {
            try {
              const sPage = await client.get(seriesUrl);
              const $s = cheerio.load(sPage.data);
              const seasonKeywords = ARABIC_SEASONS[query.season] || [`s${query.season}`, `s0${query.season}`];
              $s('a[href*="/seasons/"]').each((_, el) => {
                if (finalSeasonUrl) return;
                const h = $s(el).attr('href') || '';
                const t = $s(el).text().trim().toLowerCase();
                if (seasonKeywords.some(k => h.includes(k) || t.includes(k))) {
                  finalSeasonUrl = h;
                }
              });
            } catch {}
          }

          if (finalSeasonUrl) {
            // Find Episode link
            try {
              const seasonPageRes = await client.get(finalSeasonUrl);
              const $ep = cheerio.load(seasonPageRes.data);
              let epUrl = null;

              $ep('a[href*="/episodes/"], a[href*="/episode/"]').each((_, el) => {
                if (epUrl) return;
                const h = $ep(el).attr('href') || '';
                const t = $ep(el).text().trim();
                const epMatch = t.match(/(?:الحلقة|حلقه|حلقة|ep)\s*(\d+)/i) || h.match(/e0?(\d+)/i);
                if (epMatch && parseInt(epMatch[1], 10) === query.episode) {
                  epUrl = h;
                } else if (h.includes(`e0${query.episode}/`) || h.includes(`e${query.episode}/`)) {
                  epUrl = h;
                }
              });

              if (epUrl) {
                targetWatchUrl = `${epUrl.replace(/\/watch\/?$/i, '').replace(/\/$/, '')}/watch/`;
              }
            } catch {}
          }
        } else if (movieUrl) {
          targetWatchUrl = `${movieUrl.replace(/\/watch\/?$/i, '').replace(/\/$/, '')}/watch/`;
        }
      }

      if (!targetWatchUrl) return streams;

      // Fetch the Watch Page
      let watchDoc = null;
      try {
        const watchRes = await client.get(targetWatchUrl);
        watchDoc = cheerio.load(watchRes.data);
      } catch {
        const fallbackUrl = targetWatchUrl.replace(/\/watch\/$/, '/');
        const fbRes = await client.get(fallbackUrl);
        watchDoc = cheerio.load(fbRes.data);
      }

      if (!watchDoc) return streams;

      // Extract server URLs
      const serverUrls = [];

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

      watchDoc('iframe[src]').each((_, el) => {
        const src = watchDoc(el).attr('src');
        if (src && !src.includes('youtube.com') && !src.includes('google')) {
          serverUrls.push({ url: src.startsWith('//') ? `https:${src}` : src, name: 'Player' });
        }
      });

      // Extract streams in parallel
      const extracted = await Promise.allSettled(
        serverUrls.slice(0, 6).map(s => StreamExtractors.extract(s.url, targetWatchUrl, `EgyDead • ${s.name}`))
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
