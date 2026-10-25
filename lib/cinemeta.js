/**
 * Metadata & ID Resolver for Stremio & Nuvio
 * Maps IMDb IDs (tt...) and Kitsu IDs to Title, Year, Season, and Episode
 */

const axios = require('axios');
const config = require('../config');

// In-memory cache for fast lookups
const metaCache = new Map();

class Cinemeta {
  /**
   * Parse Stremio media identifier
   * @param {string} id - e.g. "tt0111161", "tt0944947:1:1", "kitsu:12:1"
   * @returns {{ rawId: string, imdbId: string, season: number|null, episode: number|null, kitsuId: string|null }}
   */
  static parseId(id) {
    if (!id) return { rawId: '', imdbId: '', season: null, episode: null, kitsuId: null };

    if (id.startsWith('kitsu:')) {
      const parts = id.split(':');
      return {
        rawId: id,
        imdbId: '',
        season: 1,
        episode: parts[2] ? parseInt(parts[2], 10) : 1,
        kitsuId: parts[1] || ''
      };
    }

    const parts = id.split(':');
    return {
      rawId: id,
      imdbId: parts[0],
      season: parts[1] ? parseInt(parts[1], 10) : null,
      episode: parts[2] ? parseInt(parts[2], 10) : null,
      kitsuId: null
    };
  }

  /**
   * Fetch metadata from Cinemeta or Kitsu
   * @param {string} type - "movie", "series", "anime"
   * @param {string} id - Stremio ID
   * @returns {Promise<{ title: string, year: number|null, season: number|null, episode: number|null, type: string, poster: string, genres: string[] }|null>}
   */
  static async getMetadata(type, id) {
    const parsed = this.parseId(id);
    const cacheKey = `${type}:${id}`;

    if (metaCache.has(cacheKey)) {
      return metaCache.get(cacheKey);
    }

    // 1. Kitsu Anime lookup
    if (parsed.kitsuId) {
      try {
        const resp = await axios.get(`https://kitsu.io/api/edge/anime/${parsed.kitsuId}`, {
          timeout: 7000,
          headers: { 'User-Agent': config.USER_AGENT }
        });
        const attrs = resp.data?.data?.attributes;
        if (attrs) {
          const result = {
            title: attrs.canonicalTitle || attrs.titles?.en || attrs.titles?.en_jp || '',
            titles: [
              attrs.canonicalTitle,
              attrs.titles?.en,
              attrs.titles?.en_jp,
              attrs.titles?.ja_jp
            ].filter(Boolean),
            year: attrs.startDate ? parseInt(attrs.startDate.split('-')[0], 10) : null,
            season: parsed.season || 1,
            episode: parsed.episode || 1,
            type: 'anime',
            poster: attrs.posterImage?.medium || '',
            genres: []
          };
          metaCache.set(cacheKey, result);
          return result;
        }
      } catch {}
    }

    // 2. Cinemeta lookup for IMDb IDs
    if (parsed.imdbId) {
      const cinemetaType = type === 'series' || parsed.season !== null ? 'series' : 'movie';
      try {
        const resp = await axios.get(`https://v3-cinemeta.strem.io/meta/${cinemetaType}/${parsed.imdbId}.json`, {
          timeout: 7000,
          headers: { 'User-Agent': config.USER_AGENT }
        });
        const meta = resp.data?.meta;
        if (meta) {
          const result = {
            title: meta.name || '',
            titles: [meta.name, ...(meta.aliases || [])].filter(Boolean),
            year: meta.year ? parseInt(meta.year, 10) : null,
            season: parsed.season,
            episode: parsed.episode,
            type: cinemetaType,
            poster: meta.poster || '',
            genres: meta.genres || []
          };
          metaCache.set(cacheKey, result);
          return result;
        }
      } catch {}
    }

    return null;
  }
}

module.exports = Cinemeta;
