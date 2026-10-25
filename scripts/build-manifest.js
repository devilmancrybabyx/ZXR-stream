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
  const match = source.match(/}\\s*\\('(.*?)'\\s*,\\s*(\\d+)\\s*,\\s*(\\d+)\\s*,\\s*'(.*?)'\\.split\\('\\|'\\)/s);
  if (!match) return source;
  try {
    const payload = match[1].replace(/\\\\'/g, "'");
    const radix = parseInt(match[2], 10);
    const count = parseInt(match[3], 10);
    const symtab = match[4].split('|');
    if (symtab.length !== count) return source;
    const unbase = (val, base) => {
      const selector = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ";
      if (base <= 36) return parseInt(val, base);
      let res = 0;
      for (let i = 0; i < val.length; i++) {
        const idx = selector.indexOf(val[i]);
        if (idx < 0) return 0;
        res = res * base + idx;
      }
      return res;
    };
    return payload.replace(/\\b[a-zA-Z0-9_]+\\b/g, (word) => {
      const idx = unbase(word, radix);
      return (idx < symtab.length && symtab[idx]) ? symtab[idx] : word;
    });
  } catch { return source; }
}

async function getTMDBDetails(tmdbId, mediaType) {
  try {
    if (typeof tmdbId === 'string' && tmdbId.startsWith('tt')) {
      const cinemetaType = mediaType === 'tv' ? 'series' : 'movie';
      const r = await fetch(\`https://v3-cinemeta.strem.io/meta/\${cinemetaType}/\${tmdbId}.json\`);
      const d = await r.json();
      return { title: d.meta?.name || '', year: d.meta?.year ? parseInt(d.meta.year) : null };
    }
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = \`\${TMDB_BASE_URL}/\${endpoint}/\${tmdbId}?api_key=\${TMDB_API_KEY}&append_to_response=external_ids\`;
    const response = await fetch(url, { headers: { "Accept": "application/json", "User-Agent": "Mozilla/5.0" } });
    if (!response.ok) return { title: "", year: null };
    const data = await response.json();
    return {
      title: mediaType === "tv" ? data.name : data.title,
      year: (data.first_air_date || data.release_date || "").split("-")[0] ? parseInt((data.first_air_date || data.release_date).split("-")[0]) : null
    };
  } catch { return { title: "", year: null }; }
}

async function extractStreamsFromUrl(url, pageReferer) {
  const streams = [];
  if (!url || typeof url !== 'string') return streams;

  // Direct MP4 or M3U8 links
  if (/\\.(m3u8|mp4|webm)(\\?|$)/i.test(url)) {
    const qMatch = url.match(/\\b(2160|1440|1080|720|480)p?\\b/i);
    const quality = qMatch ? qMatch[1] + "p" : "1080p";
    streams.push({
      name: \`ZXR • ${p.name}\`,
      title: \`${p.name} • \${quality} • سيرفر مباشر\`,
      url: url,
      quality: quality,
      headers: { "User-Agent": HEADERS["User-Agent"], "Referer": pageReferer || BASE_URL },
      provider: "${p.id}"
    });
    return streams;
  }

  // Embed hosts (StreamWish, Uqload, Mixdrop, Mp4Upload, VidHide)
  try {
    const resp = await fetch(url, { headers: { ...HEADERS, "Referer": pageReferer || BASE_URL } });
    const html = await resp.text();
    const unpacked = unpackJs(html);
    const combined = html + "\\n" + unpacked;

    const m3u8Match = combined.match(/https?:\\/\\/[^\\s"'<>]+\\.m3u8[^\\s"'<>]*/i);
    if (m3u8Match) {
      streams.push({
        name: \`ZXR • ${p.name} (HLS)\`,
        title: \`${p.name} • Auto HLS • سيرفر سريع\`,
        url: m3u8Match[0],
        quality: "1080p",
        headers: { "User-Agent": HEADERS["User-Agent"], "Referer": url },
        provider: "${p.id}"
      });
    }

    const mp4Match = combined.match(/https?:\\/\\/[^\\s"'<>]+\\.mp4[^\\s"'<>]*/i);
    if (mp4Match) {
      streams.push({
        name: \`ZXR • ${p.name} (MP4)\`,
        title: \`${p.name} • 720p HD\`,
        url: mp4Match[0],
        quality: "720p",
        headers: { "User-Agent": HEADERS["User-Agent"], "Referer": url },
        provider: "${p.id}"
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

    // Match candidate link
    const linkMatches = [...html.matchAll(/href=["'](https?:\\/\\/[^"']*(?:movie|film|series|anime|episode|video|post)[^"']*)["']/gi)];
    const candidateUrls = [...new Set(linkMatches.map(m => m[1]))].slice(0, 3);

    const streams = [];
    for (const pageUrl of candidateUrls) {
      try {
        const pageRes = await fetch(pageUrl, { headers: HEADERS });
        const pageHtml = await pageRes.text();

        // Find embedded iframe players
        const iframes = [...pageHtml.matchAll(/<iframe[^>]+src=["'](https?:\\/\\/[^"']+)["']/gi)].map(m => m[1]);
        // Find server data links
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
    { type: "movie", id: "zxr_movies", name: "🎬 أفلام عربية ومترجمة (ZXR)" },
    { type: "series", id: "zxr_series", name: "📺 مسلسلات عربية وأجنبية (ZXR)" },
    { type: "anime", id: "zxr_anime", name: "🎌 أنمي وكرتون (ZXR)" }
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
