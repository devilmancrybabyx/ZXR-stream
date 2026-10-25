/**
 * Provider Manager & Multi-Source Aggregator
 */

const EgyDead = require('./egydead');
const FaselHD = require('./faselhd');
const WitAnime = require('./witanime');
const Anime4Up = require('./anime4up');
const Shahid4u = require('./shahid4u');
const TukTukCinema = require('./tuktuk');
const CimaNow = require('./cimanow');
const TopCinema = require('./topcinema');
const StarDima = require('./stardima');
const Animezid = require('./animezid');
const DramaWorld = require('./dramaworld');
const ShoofLive = require('./shooflive');

const ALL_PROVIDERS = [
  EgyDead,
  FaselHD,
  WitAnime,
  Anime4Up,
  Shahid4u,
  TukTukCinema,
  CimaNow,
  TopCinema,
  StarDima,
  Animezid,
  DramaWorld,
  ShoofLive
];

class ProviderManager {
  static get list() {
    return ALL_PROVIDERS.map(p => ({
      id: p.id,
      name: p.name,
      baseUrl: p.baseUrl
    }));
  }

  /**
   * Aggregate streams across all or configured providers
   * @param {{ title: string, year?: number, season?: number, episode?: number, type: string }} query
   * @param {Object} [userConfig] - User configuration options
   * @returns {Promise<Array>}
   */
  static async getStreams(query, userConfig = {}) {
    if (!query || !query.title) return [];

    const enabledIds = userConfig.providers || ALL_PROVIDERS.map(p => p.id);
    let selectedProviders = ALL_PROVIDERS.filter(p => enabledIds.includes(p.id));

    // Smart provider routing based on type
    const isAnime = query.type === 'anime' || (query.genres && query.genres.includes('Animation'));
    if (isAnime) {
      // Put anime specialists first
      selectedProviders.sort((a, b) => {
        const aSpecial = ['witanime', 'anime4up', 'animezid'].includes(a.id) ? -1 : 1;
        const bSpecial = ['witanime', 'anime4up', 'animezid'].includes(b.id) ? -1 : 1;
        return aSpecial - bSpecial;
      });
    }

    // Execute provider scrapers in parallel with a hard 11s timeout per provider
    const tasks = selectedProviders.map(provider => {
      return Promise.race([
        provider.getStreams(query),
        new Promise(resolve => setTimeout(() => resolve([]), 11000))
      ]).catch(() => []);
    });

    const results = await Promise.allSettled(tasks);
    const allStreams = [];
    const seenUrls = new Set();

    for (const res of results) {
      if (res.status === 'fulfilled' && Array.isArray(res.value)) {
        for (const stream of res.value) {
          if (stream && stream.url && !seenUrls.has(stream.url)) {
            seenUrls.add(stream.url);
            allStreams.push(stream);
          }
        }
      }
    }

    // Sort streams by resolution / quality
    const qualityWeight = (title) => {
      if (/4k|2160/i.test(title)) return 100;
      if (/1080/i.test(title)) return 80;
      if (/720/i.test(title)) return 60;
      if (/480/i.test(title)) return 40;
      return 50;
    };

    allStreams.sort((a, b) => qualityWeight(b.title || b.name) - qualityWeight(a.title || a.name));

    return allStreams;
  }
}

module.exports = ProviderManager;
