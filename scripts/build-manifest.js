/**
 * Script to generate all 21 standalone Nuvio providers and manifest.json
 */

const fs = require('fs');
const path = require('path');
const config = require('../config');

const PROVIDERS_DATA = [
  { id: 'egydead', name: 'EgyDead (إيجي ديد)', desc: 'أحدث الأفلام والمسلسلات والأنمي المترجم والمدبلج', domain: config.DOMAINS.egydead, logo: 'public/images/EgyDead.png', types: ['movie', 'tv'] },
  { id: 'faselhd', name: 'FaselHD (فاصل إعلاني)', desc: 'مشاهدة وتحميل الأفلام والمسلسلات الأجنبية والآسيوية', domain: config.DOMAINS.faselhd, logo: 'public/images/TopCinema.png', types: ['movie', 'tv'] },
  { id: 'witanime', name: 'WitAnime (ويت أنمي)', desc: 'المصدر العربي الأول لمسلسلات وأفلام الأنمي الياباني', domain: config.DOMAINS.witanime, logo: 'public/images/Anime4Up.png', types: ['movie', 'tv'] },
  { id: 'anime4up', name: 'Anime4Up (أنمي فور اب)', desc: 'مشاهدة وتحميل مسلسلات وأفلام الأنمي والكرتون', domain: config.DOMAINS.anime4up, logo: 'public/images/Anime4Up.png', types: ['movie', 'tv'] },
  { id: 'shahid4u', name: 'Shahid4u (شاهد فور يو)', desc: 'مسلسلات عربية وتركية وأفلام عالمية بجودة عالية', domain: config.DOMAINS.shahid4u, logo: 'public/images/Shahid4u.png', types: ['movie', 'tv'] },
  { id: 'tuktuk', name: 'TukTuk (توك توك سينما)', desc: 'أفلام ومسلسلات المنصات العالمية وسلاسل كاملة', domain: config.DOMAINS.tuktuk, logo: 'public/images/TopCinema.png', types: ['movie', 'tv'] },
  { id: 'cimanow', name: 'CimaNow (سيما ناو)', desc: 'باقة من أحدث الأفلام والمسلسلات العربية والأجنبية', domain: config.DOMAINS.cimanow, logo: 'public/images/CimaNow.png', types: ['movie', 'tv'] },
  { id: 'topcinema', name: 'TopCinema (توب سينما)', desc: 'أعلى الأفلام والمسلسلات تقييماً وسلاسل سينمائية', domain: config.DOMAINS.topcinema, logo: 'public/images/TopCinema.png', types: ['movie', 'tv'] },
  { id: 'stardima', name: 'StarDima (ستار ديما)', desc: 'المتخصص في كرتون الأطفال والأنمي المدبلج للعربية', domain: config.DOMAINS.stardima, logo: 'public/images/cartoonanime.jpeg', types: ['movie', 'tv'] },
  { id: 'animezid', name: 'Animezid (أنمي زد)', desc: 'أفلام ومسلسلات الأنمي والكرتون المدبلج والمترجم', domain: config.DOMAINS.animezid, logo: 'public/images/animeslayer_logo.png', types: ['movie', 'tv'] },
  { id: 'dramaworld', name: 'DramaWorld (عالم الدراما)', desc: 'المتخصص في الدراما الكورية والآسيوية المترجمة', domain: config.DOMAINS.dramaworld, logo: 'public/images/DramaWorld.png', types: ['movie', 'tv'] },
  { id: 'shooflive', name: 'ShoofLive (شوف لايف)', desc: 'مسلسلات عربية وتركية حصرية وسيرفرات سريعة', domain: config.DOMAINS.shooflive, logo: 'public/images/Shahid4u.png', types: ['movie', 'tv'] },
  { id: 'anime3rb', name: 'Anime3rb (أنمي عرب)', desc: 'مكتبة أنمي عربية متكاملة وسيرفرات مباشرة', domain: config.DOMAINS.anime3rb, logo: 'public/images/Anime4Up.png', types: ['movie', 'tv'] },
  { id: 'animeday', name: 'AnimeDay (أنمي داي)', desc: 'أنمي مترجم ومدبلج بجودة متعددة', domain: config.DOMAINS.animeday, logo: 'public/images/AnimeDay.jpg', types: ['movie', 'tv'] },
  { id: 'animerift', name: 'AnimeRift (أنمي ريفت)', desc: 'أحدث حلقات وأفلام الأنمي وسيرفرات مشاهدة متعددة', domain: config.DOMAINS.animerift, logo: 'public/images/animeslayer_logo.png', types: ['movie', 'tv'] },
  { id: 'animeslayer', name: 'AnimeSlayer (أنمي سلاير)', desc: 'تطبيق وموقع أنمي سلاير الشهير لمشاهدة الأنمي', domain: config.DOMAINS.animeslayer, logo: 'public/images/animeslayer_logo.png', types: ['movie', 'tv'] },
  { id: 'cartoonanime', name: 'CartoonAnime (كرتون أنمي)', desc: 'أكبر مكتبة كرتون كلاسيكي وحديث للأطفال', domain: config.DOMAINS.cartoonanime, logo: 'public/images/cartoonanime.jpeg', types: ['movie', 'tv'] },
  { id: 'cimacloud', name: 'CimaCloud (سيما كلاود)', desc: 'أفلام ومسلسلات أجنبية وعربية متجددة', domain: config.DOMAINS.cimacloud, logo: 'public/images/CimaCloud.png', types: ['movie', 'tv'] },
  { id: 'cimawbas', name: 'Cimawbas (سيما وبس)', desc: 'مشاهدة وتحميل أفلام ومسلسلات مباشرة', domain: config.DOMAINS.cimawbas, logo: 'public/images/Cimawbas.png', types: ['movie', 'tv'] },
  { id: 'egywatch', name: 'Egywatch (إيجي واتش)', desc: 'بث مباشر وأفلام ومسلسلات عربية وعالمية', domain: config.DOMAINS.egywatch, logo: 'public/images/Egywatch.png', types: ['movie', 'tv'] },
  { id: 'timemovies', name: 'TimeMovies (تايم موفيز)', desc: 'سلاسل سينمائية وأحدث العروض العالمية', domain: config.DOMAINS.timemovies, logo: 'public/images/TimeMovies.png', types: ['movie', 'tv'] }
];

function generateProviderJs(p) {
  return `/**
 * ${p.name} - Nuvio Provider Scraper
 * Part of ZXR Stream (devilmancrybabyx/ZXR-stream)
 */

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "${p.domain}";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/",
  "Accept-Language": "ar,en-US;q=0.9,en;q=0.8"
};

// P.A.C.K.E.R Decoder
function unpackJs(source) {
  if (!source) return '';
  try {
    const packerPattern = /eval\\(function\\(p,a,c,k,e,d\\)[\\s\\S]*?\\}\\('(.*)',\\s*(\\d+),\\s*(\\d+),\\s*'([^']*)'\\.split\\('\\|'\\)/;
    const match = source.match(packerPattern);
    if (!match) return source;

    let payload = match[1];
    const radix = parseInt(match[2], 10);
    const count = parseInt(match[3], 10);
    const symtab = match[4].split('|');

    function unbase(val, rad) {
      const chars = '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';
      let res = 0;
      for (let i = 0; i < val.length; i++) {
        res = res * rad + chars.indexOf(val[i]);
      }
      return res;
    }

    return payload.replace(/\\b[0-9a-zA-Z]+\\b/g, (token) => {
      const idx = unbase(token, radix);
      return idx < count && symtab[idx] ? symtab[idx] : token;
    });
  } catch {
    return source;
  }
}

async function getTMDBDetails(tmdbId, mediaType = "movie") {
  try {
    const url = \`\${TMDB_BASE_URL}/\${mediaType === "series" || mediaType === "tv" ? "tv" : "movie"}/\${tmdbId}?api_key=\${TMDB_API_KEY}&language=ar\`;
    const res = await fetch(url);
    const data = await res.json();
    return {
      title: data.title || data.name || data.original_title || data.original_name,
      originalTitle: data.original_title || data.original_name,
      year: data.release_date ? data.release_date.split("-")[0] : (data.first_air_date ? data.first_air_date.split("-")[0] : null)
    };
  } catch {
    return { title: "", originalTitle: "", year: null };
  }
}

async function extractStreamsFromUrl(embedUrl, referer) {
  const streams = [];
  try {
    const res = await fetch(embedUrl, {
      headers: { ...HEADERS, Referer: referer || BASE_URL }
    });
    const html = await res.text();
    const unpacked = unpackJs(html);
    const combined = html + "\\n" + unpacked;

    // Direct m3u8
    const m3u8Matches = [...combined.matchAll(/https?:\\/\\/[^\\s"'<>]+\\.m3u8[^\\s"'<>]*/gi)];
    for (const m of m3u8Matches) {
      streams.push({
        name: "🎬${p.name} 🧊 Auto • ZXR Stream",
        title: "🍿 رابط مباشر عالي الجودة\\n🏷️ ${p.name} Direct HLS\\n🎞️ Auto • Direct\\n📡 Source: ${p.name} • ZXR Stream\\n💬 Arabic Subtitles",
        url: m[0],
        quality: "Auto",
        headers: { Referer: embedUrl }
      });
    }

    // Direct mp4
    const mp4Matches = [...combined.matchAll(/https?:\\/\\/[^\\s"'<>]+\\.mp4[^\\s"'<>]*/gi)];
    for (const m of mp4Matches) {
      streams.push({
        name: "🎬${p.name} 🧊 1080p • ZXR Stream",
        title: "🍿 فيديو مباشر عالي الجودة\\n🏷️ ${p.name} Direct MP4\\n🎞️ 1080p • Direct\\n📡 Source: ${p.name} • ZXR Stream\\n💬 Arabic Subtitles",
        url: m[0],
        quality: "1080p",
        headers: { Referer: embedUrl }
      });
    }
  } catch {}
  return streams;
}

async function getStreams(tmdbId, mediaType = "movie", season = null, episode = null) {
  try {
    const mediaInfo = await getTMDBDetails(tmdbId, mediaType);
    if (!mediaInfo.title) return [];

    const searchUrl = \`\${BASE_URL}/?s=\${encodeURIComponent(mediaInfo.title)}\`;
    const res = await fetch(searchUrl, { headers: HEADERS });
    const html = await res.text();

    const linkMatches = [...html.matchAll(/href=["'](https?:\\/\\/[^"']*(?:movie|film|series|anime|episode|video|post)[^"']*)["']/gi)];
    const candidateUrls = [...new Set(linkMatches.map(m => m[1]))].slice(0, 3);

    const streams = [];
    for (const pageUrl of candidateUrls) {
      try {
        const pageRes = await fetch(pageUrl, { headers: HEADERS });
        const pageHtml = await pageRes.text();

        const iframes = [...pageHtml.matchAll(/<iframe[^>]+src=["'](https?:\\/\\/[^"']+)["']/gi)].map(m => m[1]);
        const dataLinks = [...pageHtml.matchAll(/data-(?:url|link|embed)=["'](https?:\\/\\/[^"']+)["']/gi)].map(m => m[1]);

        const allCandidates = [...new Set([...iframes, ...dataLinks])].filter(u => !u.includes("youtube.com") && !u.includes("google.com"));

        for (const candUrl of allCandidates.slice(0, 4)) {
          const s = await extractStreamsFromUrl(candUrl, pageUrl);
          streams.push(...s);
        }
      } catch {}
    }

    return streams;
  } catch (err) {
    return [];
  }
}

module.exports = { getStreams };
`;
}

// Generate files
const providersDir = path.join(__dirname, '..', 'providers');
if (!fs.existsSync(providersDir)) {
  fs.mkdirSync(providersDir, { recursive: true });
}

for (const p of PROVIDERS_DATA) {
  const filePath = path.join(providersDir, `${p.id}.js`);
  fs.writeFileSync(filePath, generateProviderJs(p), 'utf-8');
  console.log(`Created: providers/${p.id}.js`);
}

// Build root manifest.json
const rootManifest = {
  id: "org.zxr.stream.arabic",
  name: "ZXR Stream (إضافات عربية لستريميو + نوفيو)",
  version: "1.0.0",
  description: "المستودع العربي الشامل لإضافات المشاهدة لتطبيقي Stremio و Nuvio — أفلام، مسلسلات، أنمي، وكرتون من أشهر 21 موقعاً عربياً",
  author: "devilmancrybabyx",
  logo: "https://raw.githubusercontent.com/devilmancrybabyx/ZXR-stream/main/public/images/logo.svg",
  background: "https://raw.githubusercontent.com/devilmancrybabyx/ZXR-stream/main/public/images/banner.svg",
  resources: ["stream", "catalog"],
  types: ["movie", "series", "anime"],
  idPrefixes: ["tt", "kitsu:"],
  catalogs: [
    {
      type: "movie",
      id: "zxr_catalog",
      name: "🌟 ZXR Stream (المكتبة العربية الشاملة)",
      extra: [
        { name: "search", isRequired: false },
        { name: "skip", isRequired: false }
      ]
    }
  ],
  scrapers: PROVIDERS_DATA.map(p => ({
    id: p.id,
    name: p.name,
    description: p.desc,
    version: "1.0.0",
    author: "devilmancrybabyx",
    supportedTypes: p.types,
    filename: `providers/${p.id}.js`,
    enabled: true,
    formats: ["mp4", "m3u8"],
    logo: `https://raw.githubusercontent.com/devilmancrybabyx/ZXR-stream/main/${p.logo}`,
    contentLanguage: ["ar"]
  }))
};

const manifestPath = path.join(__dirname, '..', 'manifest.json');
fs.writeFileSync(manifestPath, JSON.stringify(rootManifest, null, 2), 'utf-8');
console.log('Created: manifest.json in root');
