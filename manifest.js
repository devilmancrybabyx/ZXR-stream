/**
 * Stremio & Nuvio Addon Manifest Definition
 */

const ProviderManager = require('./lib/providers');

function getManifest(userConfig = {}, hostUrl = '') {
  const logo = hostUrl ? `${hostUrl}/images/logo.svg` : 'https://raw.githubusercontent.com/devilmancrybabyx/ZXR-stream/main/public/images/logo.svg';
  const background = hostUrl ? `${hostUrl}/images/banner.svg` : 'https://raw.githubusercontent.com/devilmancrybabyx/ZXR-stream/main/public/images/banner.svg';

  return {
    id: 'org.zxr.stream.arabic',
    version: '1.0.0',
    name: 'ZXR Stream (إضافات عربية)',
    description: 'المستودع العربي الشامل لإضافات المشاهدة لتطبيقي Stremio و Nuvio — أفلام، مسلسلات، أنمي، وكرتون من أشهر 21 موقعاً عربياً',
    logo: logo,
    background: background,
    resources: [
      {
        name: 'stream',
        types: ['movie', 'series', 'anime'],
        idPrefixes: ['tt', 'kitsu:']
      },
      {
        name: 'catalog',
        types: ['movie', 'series', 'anime'],
        idPrefixes: ['tt', 'kitsu:']
      }
    ],
    types: ['movie', 'series', 'anime'],
    idPrefixes: ['tt', 'kitsu:'],
    catalogs: [
      {
        type: 'movie',
        id: 'zxr_movies',
        name: '🎬 أفلام عربية ومترجمة (ZXR)',
        extra: [
          { name: 'search', isRequired: false },
          { name: 'skip', isRequired: false }
        ]
      },
      {
        type: 'series',
        id: 'zxr_series',
        name: '📺 مسلسلات عربية وأجنبية (ZXR)',
        extra: [
          { name: 'search', isRequired: false },
          { name: 'skip', isRequired: false }
        ]
      },
      {
        type: 'anime',
        id: 'zxr_anime',
        name: '🎌 أنمي وكرتون (ZXR)',
        extra: [
          { name: 'search', isRequired: false },
          { name: 'skip', isRequired: false }
        ]
      }
    ],
    behaviorHints: {
      configurable: true,
      configurationRequired: false
    }
  };
}

module.exports = { getManifest };
