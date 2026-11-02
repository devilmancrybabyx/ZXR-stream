/**
 * Stremio & Nuvio Addon Manifest Definition
 */

function getManifest(userConfig = {}, hostUrl = '') {
  const logo = hostUrl ? `${hostUrl}/images/logo.svg` : 'https://raw.githubusercontent.com/devilmancrybabyx/ZXR-stream/main/public/images/logo.svg';
  const background = hostUrl ? `${hostUrl}/images/banner.svg` : 'https://raw.githubusercontent.com/devilmancrybabyx/ZXR-stream/main/public/images/banner.svg';

  return {
    id: 'org.zxr.stream.arabic',
    version: '1.0.0',
    name: 'ZXR Stream (إضافات عربية)',
    description: 'المستودع العربي الشامل لمشاهدة الأفلام والمسلسلات والأنمي المترجم والمدبلج من أقوى المصادر العربية: إيجي ديد، فاصل إعلاني، ويت أنمي، أنمي فور اب، شاهد فور يو، توك توك سينما، توب سينما، والمزيد.',
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
        id: 'zxr_catalog',
        name: '🌟 ZXR Stream (المكتبة العربية الشاملة)',
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
