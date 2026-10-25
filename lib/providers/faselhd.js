/**
 * FaselHD Scraper (فاصل إعلاني)
 * Recreated from mehdigm-stream Kotlin provider
 */

const cheerio = require('cheerio');
const ProviderUtils = require('./utils');
const StreamExtractors = require('../extractors');
const config = require('../../config');

class FaselHD {
  static get name() { return 'فاصل إعلاني (FaselHD)'; }
  static get id() { return 'faselhd'; }
  static get baseUrl() { return config.DOMAINS.faselhd; }

  static async getStreams(query) {
    const streams = [];
    try {
      const client = ProviderUtils.createClient(this.baseUrl);
      const searchRes = await client.get(`/?s=${encodeURIComponent(query.title)}`);
      const $ = cheerio.load(searchRes.data);

      let matchedUrl = null;
      $('.postDiv, div[class*="col-"]').each((_, el) => {
        if (matchedUrl) return;
        const a = $(el).find('a[href]').first();
        const href = a.attr('href');
        const title = $(el).find('.h1, h1, h2, h3, .post-title').text().trim() || a.attr('title') || '';

        if (!href || !title) return;

        if (ProviderUtils.matchesTitle(title, query.title, query.year)) {
          matchedUrl = href;
        }
      });

      if (!matchedUrl) return streams;

      // If series, look for episode link
      let targetUrl = matchedUrl;
      if (query.season && query.episode) {
        const seriesPage = await client.get(targetUrl);
        const $s = cheerio.load(seriesPage.data);
        let foundEpUrl = null;

        $s('a[href*="/episode/"], a[href*="/episodes/"], .episodesList a').each((_, el) => {
          if (foundEpUrl) return;
          const href = $s(el).attr('href');
          const text = $s(el).text().trim() || $s(el).attr('title') || '';
          const epNum = text.match(/(?:الحلقة|حلقة|ep)\s*(\d+)/i) || href.match(/episode-(\d+)/i);
          if (epNum && parseInt(epNum[1], 10) === query.episode) {
            foundEpUrl = href;
          }
        });

        if (foundEpUrl) targetUrl = foundEpUrl;
      }

      // Fetch watch / episode page
      const pageRes = await client.get(targetUrl);
      const $doc = cheerio.load(pageRes.data);

      const serverUrls = [];

      // Look for player iframes or server buttons
      $doc('iframe[src]').each((_, el) => {
        const src = $doc(el).attr('src');
        if (src && !src.includes('youtube.com') && !src.includes('google')) {
          serverUrls.push({ url: src.startsWith('//') ? `https:${src}` : src, name: 'Player' });
        }
      });

      $doc('[data-url], [data-src], .download-links a[href]').each((_, el) => {
        const u = $doc(el).attr('data-url') || $doc(el).attr('data-src') || $doc(el).attr('href');
        if (u && u.startsWith('http') && !u.includes('fasel-hd.co/?s=')) {
          const sName = $doc(el).text().trim() || 'Server';
          serverUrls.push({ url: u, name: sName });
        }
      });

      const extracted = await Promise.allSettled(
        serverUrls.slice(0, 6).map(s => StreamExtractors.extract(s.url, targetUrl, `FaselHD • ${s.name}`))
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

module.exports = FaselHD;
