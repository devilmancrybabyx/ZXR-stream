/**
 * TimeMovies (تايم موفيز) - Nuvio Provider Scraper
 * Part of ZXR Stream (devilmancrybabyx/ZXR-stream)
 */

const TMDB_BASE_URL = "https://api.themoviedb.org/3";
const TMDB_API_KEY = "439c478a771f35c05022f9feabcca01c";
const BASE_URL = "https://tmovies.app";
const HEADERS = {
  "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36",
  "Referer": BASE_URL + "/",
  "Accept-Language": "ar,en-US;q=0.9,en;q=0.8"
};

// P.A.C.K.E.R Decoder
function unpackJs(source) {
  if (!source) return '';
  const match = source.match(/}\s*\('(.*?)'\s*,\s*(\d+)\s*,\s*(\d+)\s*,\s*'(.*?)'\.split\('\|'\)/s);
  if (!match) return source;
  try {
    const payload = match[1].replace(/\\'/g, "'");
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
    return payload.replace(/\b[a-zA-Z0-9_]+\b/g, (word) => {
      const idx = unbase(word, radix);
      return (idx < symtab.length && symtab[idx]) ? symtab[idx] : word;
    });
  } catch { return source; }
}

async function getTMDBDetails(tmdbId, mediaType) {
  try {
    if (typeof tmdbId === 'string' && tmdbId.startsWith('tt')) {
      const cinemetaType = mediaType === 'tv' ? 'series' : 'movie';
      const r = await fetch(`https://v3-cinemeta.strem.io/meta/${cinemetaType}/${tmdbId}.json`);
      const d = await r.json();
      return { title: d.meta?.name || '', year: d.meta?.year ? parseInt(d.meta.year) : null };
    }
    const endpoint = mediaType === "tv" ? "tv" : "movie";
    const url = `${TMDB_BASE_URL}/${endpoint}/${tmdbId}?api_key=${TMDB_API_KEY}&append_to_response=external_ids`;
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
  if (/\.(m3u8|mp4|webm)(\?|$)/i.test(url)) {
    const qMatch = url.match(/\b(2160|1440|1080|720|480)p?\b/i);
    const quality = qMatch ? qMatch[1] + "p" : "1080p";
    streams.push({
      name: `ZXR • TimeMovies (تايم موفيز)`,
      title: `TimeMovies (تايم موفيز) • ${quality} • سيرفر مباشر`,
      url: url,
      quality: quality,
      headers: { "User-Agent": HEADERS["User-Agent"], "Referer": pageReferer || BASE_URL },
      provider: "timemovies"
    });
    return streams;
  }

  // Embed hosts (StreamWish, Uqload, Mixdrop, Mp4Upload, VidHide)
  try {
    const resp = await fetch(url, { headers: { ...HEADERS, "Referer": pageReferer || BASE_URL } });
    const html = await resp.text();
    const unpacked = unpackJs(html);
    const combined = html + "\n" + unpacked;

    const m3u8Match = combined.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
    if (m3u8Match) {
      streams.push({
        name: `ZXR • TimeMovies (تايم موفيز) (HLS)`,
        title: `TimeMovies (تايم موفيز) • Auto HLS • سيرفر سريع`,
        url: m3u8Match[0],
        quality: "1080p",
        headers: { "User-Agent": HEADERS["User-Agent"], "Referer": url },
        provider: "timemovies"
      });
    }

    const mp4Match = combined.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i);
    if (mp4Match) {
      streams.push({
        name: `ZXR • TimeMovies (تايم موفيز) (MP4)`,
        title: `TimeMovies (تايم موفيز) • 720p HD`,
        url: mp4Match[0],
        quality: "720p",
        headers: { "User-Agent": HEADERS["User-Agent"], "Referer": url },
        provider: "timemovies"
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
