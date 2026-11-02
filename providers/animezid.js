/**
 * Animezid (أنمي زد) - Nuvio Provider Scraper
 * Part of ZXR Stream (devilmancrybabyx/ZXR-stream)
 */

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://animezid.org";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/",
  "Accept-Language": "ar,en-US;q=0.9,en;q=0.8"
};

// P.A.C.K.E.R Decoder
function unpackJs(source) {
  if (!source) return '';
  try {
    const packerPattern = /eval\(function\(p,a,c,k,e,d\)[\s\S]*?\}\('(.*)',\s*(\d+),\s*(\d+),\s*'([^']*)'\.split\('\|'\)/;
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

    return payload.replace(/\b[0-9a-zA-Z]+\b/g, (token) => {
      const idx = unbase(token, radix);
      return idx < count && symtab[idx] ? symtab[idx] : token;
    });
  } catch {
    return source;
  }
}

async function getTMDBDetails(tmdbId, mediaType = "movie") {
  try {
    const url = `${TMDB_BASE_URL}/${mediaType === "series" || mediaType === "tv" ? "tv" : "movie"}/${tmdbId}?api_key=${TMDB_API_KEY}&language=ar`;
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
    const combined = html + "\n" + unpacked;

    // Direct m3u8
    const m3u8Matches = [...combined.matchAll(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/gi)];
    for (const m of m3u8Matches) {
      streams.push({
        name: "Animezid (أنمي زد) (HLS)",
        url: m[0],
        quality: "Auto",
        headers: { Referer: embedUrl }
      });
    }

    // Direct mp4
    const mp4Matches = [...combined.matchAll(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/gi)];
    for (const m of mp4Matches) {
      streams.push({
        name: "Animezid (أنمي زد) (MP4)",
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

    const searchUrl = `${BASE_URL}/?s=${encodeURIComponent(mediaInfo.title)}`;
    const res = await fetch(searchUrl, { headers: HEADERS });
    const html = await res.text();

    // Match candidate link
    const linkMatches = [...html.matchAll(/href=["'](https?:\/\/[^"']*(?:movie|film|series|anime|episode|video|post)[^"']*)["']/gi)];
    const candidateUrls = [...new Set(linkMatches.map(m => m[1]))].slice(0, 3);

    const streams = [];
    for (const pageUrl of candidateUrls) {
      try {
        const pageRes = await fetch(pageUrl, { headers: HEADERS });
        const pageHtml = await pageRes.text();

        // Find embedded iframe players
        const iframes = [...pageHtml.matchAll(/<iframe[^>]+src=["'](https?:\/\/[^"']+)["']/gi)].map(m => m[1]);
        // Find server data links
        const dataLinks = [...pageHtml.matchAll(/data-(?:url|link|embed)=["'](https?:\/\/[^"']+)["']/gi)].map(m => m[1]);

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
