/**
 * Stremio & Nuvio Addon Manifest Definition
 */

const ProviderManager = require('./lib/providers');

function getManifest(userConfig = {}, hostUrl = '') {
  const logo = hostUrl ? `${hostUrl}/images/logo.png` : 'https://raw.githubusercontent.com/devilmancrybabyx/ZXR-stream/main/public/images/EgyDead.png';
  const background = hostUrl ? `${hostUrl}/images/banner.png` : '';

  return {
    id: 'org.zxr.stream.arabic',
    version: '1.0.0',
    name: 'ZXR Stream (إضافات عربية)',
    description: 'بوابتك العربية الأولى لتطبيقي Stremio و Nuvio لمشاهدة الأفلام والمسلسلات والأنمي والكرتون المترجم والمدبلج من أقوى المصادر العربية: إيجي ديد، فاصل إعلاني، ويت أنمي، أنمي فور اب، شاهد فور يو، توك توك سينما، سيما ناو، والمزيد.',
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
    catalogs: [
      {
        type: 'movie',
        id: 'zxr_arabic_movies',
        name: '🎬 أفلام عربية ومترجمة (ZXR)',
        extra: [
          { name: 'search', isRequired: false },
          { name: 'skip', isRequired: false }
        ]
      },
      {
        type: 'series',
        id: 'zxr_arabic_series',
        name: '📺 مسلسلات عربية وأجنبية (ZXR)',
        extra: [
          { name: 'search', isRequired: false },
          { name: 'skip', isRequired: false }
        ]
      },
      {
        type: 'anime',
        id: 'zxr_arabic_anime',
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
