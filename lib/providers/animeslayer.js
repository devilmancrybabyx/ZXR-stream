/**
 * AnimeSlayer Scraper (أنمي سلاير)
 * Recreated from mehdigm-stream Kotlin provider
 */

const ProviderUtils = require('./utils');
const StreamExtractors = require('../extractors');
const config = require('../../config');

class AnimeSlayer {
  static get name() { return 'أنمي سلاير (AnimeSlayer)'; }
  static get id() { return 'animeslayer'; }
  static get baseUrl() { return config.DOMAINS.animeslayer; }

  static async getStreams(query) {
    const streams = [];
    try {
      const client = ProviderUtils.createClient(this.baseUrl);
      // AnimeSlayer search endpoint
      const searchUrl = `${this.baseUrl}/anime/public/animes/get-animes-search?search_key=${encodeURIComponent(query.title)}`;
      const res = await client.get(searchUrl, {
        headers: { 'User-Agent': 'okhttp/3.12.1' }
      });

      const list = Array.isArray(res.data) ? res.data : (res.data?.data || []);
      let matchedAnime = null;

      for (const item of list) {
        const title = item.anime_name || item.name || '';
        if (ProviderUtils.matchesTitle(title, query.title, query.year)) {
          matchedAnime = item;
          break;
        }
      }

      if (!matchedAnime || !matchedAnime.anime_id) return streams;

      const epNum = query.episode || 1;
      const epUrl = `${this.baseUrl}/la/public/api/episode/get-episode-servers?episode_id=${matchedAnime.anime_id}&episode_number=${epNum}`;
      const epRes = await client.get(epUrl, {
        headers: { 'User-Agent': 'okhttp/3.12.1' }
      });

      const servers = Array.isArray(epRes.data) ? epRes.data : (epRes.data?.data || []);
      for (const s of servers) {
        const url = s.episode_url || s.url;
        const name = s.episode_server_name || s.server_name || 'AnimeSlayerServer';
        if (url && url.startsWith('http')) {
          const extracted = await StreamExtractors.extract(url, this.baseUrl, `AnimeSlayer • ${name}`);
          streams.push(...extracted);
        }
      }
    } catch {}

    return streams;
  }
}

module.exports = AnimeSlayer;
