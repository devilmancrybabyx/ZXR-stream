/**
 * Video Stream Extractors for Arabic Streaming Hosts
 */

const https = require('https');
const axios = require('axios');
const JsPacker = require('./jspacker');
const config = require('../../config');

const insecureAgent = new https.Agent({ rejectUnauthorized: false });

class StreamExtractors {
  static defaultHeaders(referer) {
    return {
      'User-Agent': config.USER_AGENT,
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
      'Referer': referer || 'https://google.com/'
    };
  }

  /**
   * Main extractor entry point
   * @param {string} url - Host or embed URL
   * @param {string} [referer] - Page referer
   * @param {string} [serverName] - Label/host name
   * @returns {Promise<Array<{name: string, title: string, url: string, behaviorHints?: Object}>>}
   */
  static async extract(url, referer = '', serverName = 'Server') {
    if (!url || typeof url !== 'string') return [];
    const cleanUrl = url.trim();

    // 1. Direct stream links (.m3u8, .mp4, etc.)
    if (/\.(m3u8|mp4|webm|mkv)(\?|$)/i.test(cleanUrl)) {
      const qMatch = cleanUrl.match(/\b(2160|1440|1080|720|480|360)p?\b/i);
      const quality = qMatch ? `${qMatch[1]}p` : 'Auto';
      return [{
        name: `ZXR Stream\n[${serverName}] ${quality}`,
        title: `${serverName} • ${quality} • سيرفر مباشر`,
        url: cleanUrl,
        behaviorHints: { notWebReady: false }
      }];
    }

    try {
      // 2. MegaMax Embeds (Inertia.js player)
      if (/\/iframe\/[a-zA-Z0-9_-]+/i.test(cleanUrl) || /megamax\.me/i.test(cleanUrl)) {
        return await this.extractMegaMax(cleanUrl, referer, serverName);
      }

      // 3. VidHide / EarnVids / Dramiyos family
      if (/vidhide|earnvids|morencius|dramiyos|vidspeed|vidguard|streamhide/i.test(cleanUrl)) {
        return await this.extractVidHide(cleanUrl, referer, serverName);
      }

      // 4. StreamWish / Vibuxer / FileLions / StrWish family
      if (/streamwish|vibuxer|filelions|kisswish|strwish|dwish/i.test(cleanUrl)) {
        return await this.extractStreamWish(cleanUrl, referer, serverName);
      }

      // 5. Uqload
      if (/uqload/i.test(cleanUrl)) {
        return await this.extractUqload(cleanUrl, referer, serverName);
      }

      // 6. Mixdrop
      if (/mixdrop/i.test(cleanUrl)) {
        return await this.extractMixdrop(cleanUrl, referer, serverName);
      }

      // 7. Mp4Upload
      if (/mp4upload/i.test(cleanUrl)) {
        return await this.extractMp4Upload(cleanUrl, referer, serverName);
      }

      // 8. Generic HTML5 player / m3u8 finder
      return await this.extractGeneric(cleanUrl, referer, serverName);
    } catch {
      return [];
    }
  }

  /**
   * Fast MegaMax Inertia.js Stream Extractor
   */
  static async extractMegaMax(url, referer, serverName) {
    const headers = {
      ...this.defaultHeaders(referer),
      'X-Inertia': 'true',
      'X-Inertia-Partial-Component': 'files/mirror/video',
      'X-Inertia-Partial-Data': 'streams'
    };

    let res;
    try {
      res = await axios.get(url, { headers, httpsAgent: insecureAgent, timeout: 5000 });
    } catch (err) {
      if (err.response && err.response.status === 409) {
        const v = err.response.headers['x-inertia-version'];
        if (v) {
          headers['X-Inertia-Version'] = v;
          const cookies = (err.response.headers['set-cookie'] || []).map(c => c.split(';')[0]).join('; ');
          if (cookies) headers['Cookie'] = cookies;
          try {
            res = await axios.get(url, { headers, httpsAgent: insecureAgent, timeout: 5000 });
          } catch {}
        }
      }
    }

    if (!res || !res.data || !res.data.props?.streams?.data) return [];

    const streams = [];
    const qualities = res.data.props.streams.data;

    for (const q of qualities) {
      const label = q.label || '1080p';
      for (const m of (q.mirrors || [])) {
        const driver = (m.driver || 'Mirror').toUpperCase();
        let link = m.link;
        if (!link) continue;
        if (link.startsWith('//')) link = `https:${link}`;

        streams.push({
          name: `ZXR Stream\n[${driver}] ${label}`,
          title: `${driver} • ${label} • سيرفر سريع`,
          url: link,
          behaviorHints: { notWebReady: false }
        });
      }
    }

    // Resolve direct HLS for the first Uqload mirror in parallel (max 2.5s)
    const firstUqload = streams.find(s => s.url.includes('uqload'));
    if (firstUqload) {
      try {
        const uqRes = await axios.get(firstUqload.url, {
          headers: this.defaultHeaders(url),
          httpsAgent: insecureAgent,
          timeout: 2500
        });
        if (JsPacker.detect(uqRes.data)) {
          const unp = JsPacker.unpack(uqRes.data);
          const m3u8 = unp.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
          if (m3u8) {
            streams.unshift({
              name: `ZXR Stream\n[Direct HLS] 1080p`,
              title: `⭐ سيرفر مباشر عالي السرعة (Master HLS)`,
              url: m3u8[0],
              behaviorHints: { notWebReady: false }
            });
          }
        }
      } catch {}
    }

    return streams;
  }

  /**
   * VidHide / EarnVids Extractor
   */
  static async extractVidHide(url, referer, serverName) {
    try {
      const domain = new URL(url).origin;
      const resp = await axios.get(url, {
        headers: this.defaultHeaders(referer || domain),
        httpsAgent: insecureAgent,
        timeout: 4000
      });
      const html = resp.data || '';
      const unpacked = JsPacker.detect(html) ? JsPacker.unpack(html) : '';
      const combined = `${html}\n${unpacked}`;

      const m3u8Match = combined.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
      if (m3u8Match) {
        return [{
          name: `ZXR Stream\n[VidHide] HLS`,
          title: `${serverName} • HLS Auto • جودة عالية`,
          url: m3u8Match[0],
          behaviorHints: { notWebReady: false }
        }];
      }

      const mp4Match = combined.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i);
      if (mp4Match) {
        return [{
          name: `ZXR Stream\n[VidHide] MP4`,
          title: `${serverName} • MP4 HD`,
          url: mp4Match[0],
          behaviorHints: { notWebReady: false }
        }];
      }
    } catch {}
    return [];
  }

  /**
   * StreamWish Extractor
   */
  static async extractStreamWish(url, referer, serverName) {
    try {
      const domain = new URL(url).origin;
      const resp = await axios.get(url, {
        headers: this.defaultHeaders(referer || domain),
        httpsAgent: insecureAgent,
        timeout: 4000
      });
      const html = resp.data || '';
      const unpacked = JsPacker.detect(html) ? JsPacker.unpack(html) : '';
      const combined = `${html}\n${unpacked}`;

      const m3u8Match = combined.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
      if (m3u8Match) {
        return [{
          name: `ZXR Stream\n[StreamWish] 1080p`,
          title: `${serverName} • HLS Auto • سيرفر سريع`,
          url: m3u8Match[0],
          behaviorHints: { notWebReady: false }
        }];
      }

      const mp4Match = combined.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i);
      if (mp4Match) {
        return [{
          name: `ZXR Stream\n[StreamWish] 720p`,
          title: `${serverName} • MP4 HD`,
          url: mp4Match[0],
          behaviorHints: { notWebReady: false }
        }];
      }
    } catch {}
    return [];
  }

  /**
   * Uqload Extractor
   */
  static async extractUqload(url, referer, serverName) {
    try {
      const domain = new URL(url).origin;
      const resp = await axios.get(url, {
        headers: this.defaultHeaders(referer || domain),
        httpsAgent: insecureAgent,
        timeout: 4000
      });
      const html = resp.data || '';
      const unpacked = JsPacker.detect(html) ? JsPacker.unpack(html) : '';
      const combined = `${html}\n${unpacked}`;

      const m3u8Match = combined.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
      if (m3u8Match) {
        return [{
          name: `ZXR Stream\n[Uqload] 1080p`,
          title: `${serverName} • Uqload HLS Master`,
          url: m3u8Match[0],
          behaviorHints: { notWebReady: false }
        }];
      }

      const match = combined.match(/sources:\s*\[\s*["'](https?:\/\/[^"']+)["']/i);
      if (match) {
        return [{
          name: `ZXR Stream\n[Uqload] 1080p`,
          title: `${serverName} • Uqload HD`,
          url: match[1],
          behaviorHints: { notWebReady: false }
        }];
      }
    } catch {}
    return [];
  }

  /**
   * MixDrop Extractor
   */
  static async extractMixdrop(url, referer, serverName) {
    try {
      const embedUrl = url.replace('/f/', '/e/');
      const domain = new URL(embedUrl).origin;
      const resp = await axios.get(embedUrl, {
        headers: this.defaultHeaders(referer || domain),
        httpsAgent: insecureAgent,
        timeout: 4000
      });
      const html = resp.data || '';
      const unpacked = JsPacker.detect(html) ? JsPacker.unpack(html) : html;
      const match = unpacked.match(/MDCore\.wurl\s*=\s*["']([^"']+)["']/i) ||
                    unpacked.match(/(?:source|src)\s*[:=]\s*["']([^"']+\.mp4[^"']*)["']/i);
      if (match) {
        let streamUrl = match[1];
        if (streamUrl.startsWith('//')) streamUrl = `https:${streamUrl}`;
        return [{
          name: `ZXR Stream\n[MixDrop] 1080p`,
          title: `${serverName} • MixDrop Fast`,
          url: streamUrl,
          behaviorHints: { notWebReady: false }
        }];
      }
    } catch {}
    return [];
  }

  /**
   * Mp4Upload Extractor
   */
  static async extractMp4Upload(url, referer, serverName) {
    try {
      const domain = new URL(url).origin;
      const resp = await axios.get(url, {
        headers: this.defaultHeaders(referer || domain),
        httpsAgent: insecureAgent,
        timeout: 4000
      });
      const html = resp.data || '';
      const match = html.match(/src:\s*["'](https?:\/\/[^"']+\.mp4[^"']*)["']/i);
      if (match) {
        return [{
          name: `ZXR Stream\n[Mp4Upload] 1080p`,
          title: `${serverName} • Mp4Upload Direct`,
          url: match[1],
          behaviorHints: { notWebReady: false }
        }];
      }
    } catch {}
    return [];
  }

  /**
   * Generic HTML5 / m3u8 Extractor
   */
  static async extractGeneric(url, referer, serverName) {
    try {
      const domain = new URL(url).origin;
      const resp = await axios.get(url, {
        headers: this.defaultHeaders(referer || domain),
        httpsAgent: insecureAgent,
        timeout: 4000
      });
      const html = resp.data || '';
      const unpacked = JsPacker.detect(html) ? JsPacker.unpack(html) : '';
      const combined = `${html}\n${unpacked}`;

      const m3u8Match = combined.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*[^\s"'<>\.]/i);
      if (m3u8Match) {
        return [{
          name: `ZXR Stream\n[${serverName}] HLS`,
          title: `${serverName} • Stream HLS`,
          url: m3u8Match[0],
          behaviorHints: { notWebReady: false }
        }];
      }

      const mp4Match = combined.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*[^\s"'<>\.]/i);
      if (mp4Match) {
        return [{
          name: `ZXR Stream\n[${serverName}] MP4`,
          title: `${serverName} • Direct MP4`,
          url: mp4Match[0],
          behaviorHints: { notWebReady: false }
        }];
      }
    } catch {}
    return [];
  }
}

module.exports = StreamExtractors;
