/**
 * TopCinema Scraper (توب سينما)
 * Recreated from mehdigm-stream Kotlin provider
 * Full support for Movies & Series with VideoTube, UpDown, StreamWish, and Uqload
 */

const cheerio = require('cheerio');
const qs = require('querystring');
const ProviderUtils = require('./utils');
const StreamExtractors = require('../extractors');
const config = require('../../config');

const ARABIC_SEASONS = {
  1: ['الاول', 'الأول', '1'],
  2: ['الثاني', 'الثانى', '2'],
  3: ['الثالث', '3'],
  4: ['الرابع', '4'],
  5: ['الخامس', '5'],
  6: ['السادس', '6'],
  7: ['السابع', '7'],
  8: ['الثامن', '8'],
  9: ['التاسع', '9'],
  10: ['العاشر', '10']
};

class TopCinema {
  static get name() { return 'TopCinema'; }
  static get id() { return 'topcinema'; }
  static get baseUrl() { return config.DOMAINS.topcinema; }

  static async getStreams(query) {
    const streams = [];
    try {
      const client = ProviderUtils.createClient(this.baseUrl);
      const isSeries = !!(query.season && query.episode);
      const displayTitle = isSeries
        ? `مسلسل ${query.title} الموسم ${query.season} الحلقة ${query.episode} مترجم`
        : `مشاهدة فيلم ${query.title} ${query.year || ''} مترجم`;
      const queryInfo = { displayTitle };

      let targetUrl = null;

      if (isSeries) {
        const sWords = ARABIC_SEASONS[query.season] || [String(query.season)];
        const searchTerms = [
          `${query.title} الموسم ${sWords[0]}`,
          `${query.title} ${query.season}`,
          query.title
        ];

        for (const term of searchTerms) {
          if (targetUrl) break;
          const sRes = await client.get(`/search/?query=${encodeURIComponent(term)}&type=series`);
          const $ = cheerio.load(sRes.data);

          $('.page--contents a').each((_, el) => {
            if (targetUrl) return;
            const h = $(el).attr('href');
            const t = $(el).text().trim().replace(/\s+/g, ' ');
            if (!h) return;

            const hasSeason = sWords.some(w => t.includes(`الموسم ${w}`) || t.includes(`s0${query.season}`) || t.includes(`s${query.season}`));
            const epRegex = new RegExp(`الحلقة\\s*${query.episode}\\b|حلقة\\s*${query.episode}\\b|ep0?${query.episode}\\b`, 'i');
            if (hasSeason && epRegex.test(t)) {
              targetUrl = h;
            }
          });
        }
      } else {
        // Movies
        const searchTerms = [
          query.title,
          query.title.replace(/^The\s+/i, '')
        ];

        for (const term of searchTerms) {
          if (targetUrl) break;
          const sRes = await client.get(`/search/?query=${encodeURIComponent(term)}&type=movies`);
          const $ = cheerio.load(sRes.data);

          $('.page--contents a').each((_, el) => {
            if (targetUrl) return;
            const h = $(el).attr('href');
            const t = $(el).text().trim().replace(/\s+/g, ' ');
            if (h && (h.includes('/film-') || h.includes('/%d9%81%d9%8a%d9%84%d9%85-') || h.includes('/movie/'))) {
              if (ProviderUtils.matchesTitle(t, term, query.year)) {
                targetUrl = h;
              }
            }
          });

          // Fallback title match
          if (!targetUrl) {
            $('.page--contents a').each((_, el) => {
              if (targetUrl) return;
              const h = $(el).attr('href');
              const t = $(el).text().trim().replace(/\s+/g, ' ');
              if (h && (h.includes('/film-') || h.includes('/%d9%81%d9%8a%d9%84%d9%85-') || h.includes('/movie/'))) {
                const words = term.toLowerCase().split(/\s+/).filter(w => w.length > 3);
                if (words.some(w => t.toLowerCase().includes(w))) {
                  targetUrl = h;
                }
              }
            });
          }
        }
      }

      if (!targetUrl) return streams;

      const watchUrl = `${targetUrl.replace(/\/watch\/?$/i, '').replace(/\/$/, '')}/watch/`;
      const wRes = await client.get(watchUrl);
      const $w = cheerio.load(wRes.data);

      const serverItems = [];
      $w('.server--item').each((_, el) => {
        const id = $w(el).attr('data-id');
        const index = $w(el).attr('data-server');
        if (id && index !== undefined) {
          serverItems.push({ id, index, name: $w(el).text().trim() });
        }
      });

      // Default iframe already in DOM
      const defaultIframe = $w('iframe[src]').attr('src');
      const iframeTasks = [];

      if (defaultIframe) {
        iframeTasks.push(Promise.resolve(defaultIframe));
      }

      for (const item of serverItems.slice(0, 6)) {
        iframeTasks.push(
          client.post(
            'https://topcinemaa.vip/wp-content/themes/movies2023/Ajaxat/Single/Server.php',
            qs.stringify({ id: item.id, i: item.index }),
            {
              headers: {
                'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
                'X-Requested-With': 'XMLHttpRequest',
                'Referer': watchUrl
              },
              timeout: 4000
            }
          ).then(r => {
            const $ajax = cheerio.load(r.data);
            return $ajax('iframe').attr('src') || r.data;
          }).catch(() => null)
        );
      }

      const iframeResults = await Promise.allSettled(iframeTasks);
      const serverUrls = [];
      for (const r of iframeResults) {
        if (r.status === 'fulfilled' && r.value && typeof r.value === 'string' && r.value.startsWith('http')) {
          serverUrls.push(r.value);
        }
      }

      const uniqueServerUrls = [...new Set(serverUrls)];
      const extractionTasks = uniqueServerUrls.map(u => 
        StreamExtractors.extract(u, watchUrl, 'TopCinema', queryInfo)
      );

      const extracted = await Promise.allSettled(extractionTasks);
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
