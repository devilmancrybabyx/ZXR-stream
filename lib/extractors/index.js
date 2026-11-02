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
   * Helper to format stream in exact emoji layout requested by user
   */
  static formatStream({ sourceName = 'ZXR', quality = '1080p', driver = 'Direct', displayTitle = 'مشاهدة مباشرة', url, referer }) {
    if (!url || typeof url !== 'string') return null;

    // Strip IP/ASN locking parameters (&asn=\d+, &i=\d+\.\d+) so stream plays seamlessly across any network
    let cleanUrl = url
      .replace(/([?&])asn=\d+(&?)/gi, (m, p1, p2) => (p1 === '?' && p2 ? '?' : (p1 === '?' && !p2 ? '' : (p2 ? '&' : ''))))
      .replace(/([?&])i=\d+\.\d+(&?)/gi, (m, p1, p2) => (p1 === '?' && p2 ? '?' : (p1 === '?' && !p2 ? '' : (p2 ? '&' : ''))))
      .replace(/[?&]$/, '');

    const qMatch = quality.match(/\b(2160|1440|1080|720|480|360)p?\b/i);
    const q = qMatch ? `${qMatch[1]}p` : quality;
    const resBadge = q === '1080p' ? 'FHD' : (q === '720p' ? 'HD' : (q === '2160p' ? '4K UHD' : 'SD'));

    const reqHeaders = {
      'User-Agent': config.USER_AGENT
    };
    if (referer) reqHeaders['Referer'] = referer;

    return {
      name: `🎬${sourceName} 🧊 ${q} • ZXR Stream`,
      title: `🍿 ${displayTitle}\n🏷️ ${driver} - ${q} ${resBadge}\n🎞️ ${q} • Direct\n📡 Source: ${sourceName} • ZXR Stream\n💬 Arabic Subtitles (مترجم للعربية)`,
      url: cleanUrl,
      behaviorHints: {
        notWebReady: false,
        proxyHeaders: {
          request: reqHeaders
        }
      }
    };
  }

  /**
   * Main extractor entry point
   */
  static async extract(url, referer = '', sourceName = 'Server', queryInfo = {}) {
    if (!url || typeof url !== 'string') return [];
    const cleanUrl = url.trim();

    // 1. Direct stream links (.m3u8, .mp4, etc.)
    if (/\.(m3u8|mp4|webm|mkv)(\?|$)/i.test(cleanUrl)) {
      const qMatch = cleanUrl.match(/\b(2160|1440|1080|720|480|360)p?\b/i);
      const quality = qMatch ? `${qMatch[1]}p` : '1080p';
      const stream = this.formatStream({
        sourceName,
        quality,
        driver: 'Direct HLS',
        displayTitle: queryInfo.displayTitle || 'فيديو مباشر',
        url: cleanUrl,
        referer
      });
      return stream ? [stream] : [];
    }

    try {
      // 2. MegaMax Embeds (Inertia.js player)
      if (/\/iframe\/[a-zA-Z0-9_-]+/i.test(cleanUrl) || /megamax\.me/i.test(cleanUrl)) {
        return await this.extractMegaMax(cleanUrl, referer, sourceName, queryInfo);
      }

      // 3. Vidtube Family
      if (/vidtube|down\.vidtube|serv-stream-cdn/i.test(cleanUrl)) {
        return await this.extractVidtube(cleanUrl, referer, sourceName, queryInfo);
      }

      // 4. UpDown Family
      if (/updown\.(cam|cam|org)|gamescdn/i.test(cleanUrl)) {
        return await this.extractUpDown(cleanUrl, referer, sourceName, queryInfo);
      }

      // 5. VidHide / EarnVids / Dramiyos family
      if (/vidhide|earnvids|morencius|dramiyos|vidspeed|vidguard|streamhide/i.test(cleanUrl)) {
        return await this.extractVidHide(cleanUrl, referer, sourceName, queryInfo);
      }

      // 6. StreamWish / Vibuxer / FileLions / StrWish family
      if (/streamwish|vibuxer|filelions|kisswish|strwish|dwish|premilkyway|cyyroro/i.test(cleanUrl)) {
        return await this.extractStreamWish(cleanUrl, referer, sourceName, queryInfo);
      }

      // 7. Uqload
      if (/uqload/i.test(cleanUrl)) {
        return await this.extractUqload(cleanUrl, referer, sourceName, queryInfo);
      }

      // 8. Mixdrop
      if (/mixdrop/i.test(cleanUrl)) {
        return await this.extractMixdrop(cleanUrl, referer, sourceName, queryInfo);
      }

      // 9. Generic HTML5 player / m3u8 finder
      return await this.extractGeneric(cleanUrl, referer, sourceName, queryInfo);
    } catch {
      return [];
    }
  }

  /**
   * Fast MegaMax Inertia.js Stream Extractor
   */
  static async extractMegaMax(url, referer, sourceName = 'EgyDead', queryInfo = {}) {
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

    const qualities = res.data.props.streams.data;
    const directTasks = [];
    const displayTitle = queryInfo.displayTitle || 'مشاهدة مباشرة مترجمة';

    for (const q of qualities) {
      const rawLabel = q.label || '1080p';
      const qMatch = rawLabel.match(/\b(2160|1440|1080|720|480|360)p?\b/i);
      const quality = qMatch ? `${qMatch[1]}p` : '1080p';

      for (const m of (q.mirrors || [])) {
        let link = m.link;
        if (!link) continue;
        if (link.startsWith('//')) link = `https:${link}`;

        // 1. VidHide / EarnVids
        if (/vidhide|earnvids|morencius/i.test(link)) {
          directTasks.push(async () => {
            try {
              const resp = await axios.get(link, { headers, httpsAgent: insecureAgent, timeout: 3500 });
              const html = resp.data || '';
              const unp = JsPacker.detect(html) ? JsPacker.unpack(html) : '';
              const m3u8 = (html + '\n' + unp).match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
              if (m3u8) {
                return StreamExtractors.formatStream({
                  sourceName,
                  quality,
                  driver: 'VidHide',
                  displayTitle,
                  url: m3u8[0],
                  referer: ''
                });
              }
            } catch {}
            return null;
          });
        }
        // 2. Uqload
        else if (/uqload/i.test(link)) {
          directTasks.push(async () => {
            try {
              const resp = await axios.get(link, { headers: { ...headers, Referer: url }, httpsAgent: insecureAgent, timeout: 3500 });
              const html = resp.data || '';
              const unp = JsPacker.detect(html) ? JsPacker.unpack(html) : '';
              const m3u8 = (html + '\n' + unp).match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
              if (m3u8) {
                return StreamExtractors.formatStream({
                  sourceName,
                  quality,
                  driver: 'Uqload',
                  displayTitle,
                  url: m3u8[0],
                  referer: 'https://uqload.vc/'
                });
              }
            } catch {}
            return null;
          });
        }
        // 3. Vidmoly
        else if (/vidmoly/i.test(link)) {
          directTasks.push(async () => {
            try {
              const resp = await axios.get(link, { headers, httpsAgent: insecureAgent, timeout: 3500 });
              const m3u8 = (resp.data || '').match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
              if (m3u8) {
                return StreamExtractors.formatStream({
                  sourceName,
                  quality,
                  driver: 'Vidmoly',
                  displayTitle,
                  url: m3u8[0],
                  referer: ''
                });
              }
            } catch {}
            return null;
          });
        }
        // 4. StreamWish / Premilkyway in MegaMax
        else if (/streamwish|premilkyway|cyyroro|strwish/i.test(link)) {
          directTasks.push(async () => {
            try {
              const resp = await axios.get(link, { headers, httpsAgent: insecureAgent, timeout: 3500 });
              const html = resp.data || '';
              const unp = JsPacker.detect(html) ? JsPacker.unpack(html) : '';
              const m3u8 = (html + '\n' + unp).match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
              if (m3u8) {
                return StreamExtractors.formatStream({
                  sourceName,
                  quality,
                  driver: 'StreamWish',
                  displayTitle,
                  url: m3u8[0],
                  referer: ''
                });
              }
            } catch {}
            return null;
          });
        }
        // 5. Vidtube in MegaMax
        else if (/vidtube|down\.vidtube/i.test(link)) {
          directTasks.push(async () => {
            try {
              const resp = await axios.get(link, { headers, httpsAgent: insecureAgent, timeout: 3500 });
              const html = resp.data || '';
              const unp = JsPacker.detect(html) ? JsPacker.unpack(html) : '';
              const m3u8 = (html + '\n' + unp).match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
              if (m3u8) {
                return StreamExtractors.formatStream({
                  sourceName,
                  quality,
                  driver: 'Vidtube',
                  displayTitle,
                  url: m3u8[0],
                  referer: 'https://down.vidtube.one/'
                });
              }
            } catch {}
            return null;
          });
        }
      }
    }

    const results = await Promise.allSettled(directTasks.map(t => t()));
    const validStreams = [];
    const seenUrls = new Set();

    for (const r of results) {
      if (r.status === 'fulfilled' && r.value && r.value.url && !seenUrls.has(r.value.url)) {
        seenUrls.add(r.value.url);
        validStreams.push(r.value);
      }
    }

    return validStreams;
  }

  /**
   * Vidtube Extractor
   */
  static async extractVidtube(url, referer, sourceName, queryInfo = {}) {
    try {
      const embedReferer = referer && !referer.includes('vidtube') ? referer : 'https://topcinemaa.vip/';
      const resp = await axios.get(url, {
        headers: {
          'User-Agent': config.USER_AGENT,
          'Referer': embedReferer,
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8'
        },
        httpsAgent: insecureAgent,
        timeout: 4500
      });
      const html = resp.data || '';
      const unpacked = JsPacker.detect(html) ? JsPacker.unpack(html) : '';
      const combined = `${html}\n${unpacked}`;

      const m3u8Match = combined.match(/https?:\/\/[^\s"'<>]+\.m3u8[^\s"'<>]*/i);
      if (m3u8Match) {
        const masterUrl = m3u8Match[0];
        const streams = [];

        // 1. 1080p FHD
        const url1080 = masterUrl.includes('_,l,n,h,x,.urlset/master.m3u8')
          ? masterUrl.replace('_,l,n,h,x,.urlset/master.m3u8', '_x/index-v1-a1.m3u8')
          : masterUrl;
        const s1080 = this.formatStream({
          sourceName,
          quality: '1080p',
          driver: 'Vidtube',
          displayTitle: queryInfo.displayTitle || 'مشاهدة مباشرة',
          url: url1080,
          referer: 'https://down.vidtube.one/'
        });
        if (s1080) streams.push(s1080);

        // 2. 720p HD (if urlset has multiple qualities)
        if (masterUrl.includes('_,l,n,h,x,.urlset/master.m3u8')) {
          const url720 = masterUrl.replace('_,l,n,h,x,.urlset/master.m3u8', '_h/index-v1-a1.m3u8');
          const s720 = this.formatStream({
            sourceName,
            quality: '720p',
            driver: 'Vidtube',
            displayTitle: queryInfo.displayTitle || 'مشاهدة مباشرة',
            url: url720,
            referer: 'https://down.vidtube.one/'
          });
          if (s720) streams.push(s720);

          // 3. 480p SD
          const url480 = masterUrl.replace('_,l,n,h,x,.urlset/master.m3u8', '_n/index-v1-a1.m3u8');
          const s480 = this.formatStream({
            sourceName,
            quality: '480p',
            driver: 'Vidtube',
            displayTitle: queryInfo.displayTitle || 'مشاهدة مباشرة',
            url: url480,
            referer: 'https://down.vidtube.one/'
          });
          if (s480) streams.push(s480);
        }

        return streams;
      }
    } catch {}
    return [];
  }

  /**
   * UpDown Extractor
   */
  static async extractUpDown(url, referer, sourceName, queryInfo = {}) {
    try {
      const resp = await axios.get(url, {
        headers: this.defaultHeaders(referer || 'https://updown.cam/'),
        httpsAgent: insecureAgent,
        timeout: 4000
      });
      const html = resp.data || '';
      const unpacked = JsPacker.detect(html) ? JsPacker.unpack(html) : '';
      const combined = `${html}\n${unpacked}`;

      const mp4Match = combined.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i);
      if (mp4Match) {
        const stream = this.formatStream({
          sourceName,
          quality: '1080p',
          driver: 'UpDown',
          displayTitle: queryInfo.displayTitle || 'مشاهدة مباشرة',
          url: mp4Match[0],
          referer: 'https://updown.cam/'
        });
        return stream ? [stream] : [];
      }
    } catch {}
    return [];
  }

  /**
   * VidHide / EarnVids Extractor
   */
  static async extractVidHide(url, referer, sourceName, queryInfo = {}) {
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
        return [
          this.formatStream({
            sourceName,
            quality: '1080p',
            driver: 'VidHide',
            displayTitle: queryInfo.displayTitle || 'مشاهدة مباشرة',
            url: m3u8Match[0],
            referer: ''
          })
        ];
      }
    } catch {}
    return [];
  }

  /**
   * StreamWish Extractor
   */
  static async extractStreamWish(url, referer, sourceName, queryInfo = {}) {
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
        return [
          this.formatStream({
            sourceName,
            quality: '1080p',
            driver: 'StreamWish',
            displayTitle: queryInfo.displayTitle || 'مشاهدة مباشرة',
            url: m3u8Match[0],
            referer: ''
          })
        ];
      }

      const mp4Match = combined.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*/i);
      if (mp4Match) {
        return [
          this.formatStream({
            sourceName,
            quality: '720p',
            driver: 'StreamWish',
            displayTitle: queryInfo.displayTitle || 'مشاهدة مباشرة',
            url: mp4Match[0],
            referer: ''
          })
        ];
      }
    } catch {}
    return [];
  }

  /**
   * Uqload Extractor
   */
  static async extractUqload(url, referer, sourceName, queryInfo = {}) {
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
        return [
          this.formatStream({
            sourceName,
            quality: '1080p',
            driver: 'Uqload',
            displayTitle: queryInfo.displayTitle || 'مشاهدة مباشرة',
            url: m3u8Match[0],
            referer: 'https://uqload.vc/'
          })
        ];
      }
    } catch {}
    return [];
  }

  /**
   * MixDrop Extractor
   */
  static async extractMixdrop(url, referer, sourceName, queryInfo = {}) {
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
        return [
          this.formatStream({
            sourceName,
            quality: '1080p',
            driver: 'MixDrop',
            displayTitle: queryInfo.displayTitle || 'مشاهدة مباشرة',
            url: streamUrl,
            referer: ''
          })
        ];
      }
    } catch {}
    return [];
  }

  /**
   * Generic HTML5 / m3u8 Extractor
   */
  static async extractGeneric(url, referer, sourceName, queryInfo = {}) {
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
        return [
          this.formatStream({
            sourceName,
            quality: '1080p',
            driver: 'Direct HLS',
            displayTitle: queryInfo.displayTitle || 'مشاهدة مباشرة',
            url: m3u8Match[0],
            referer: ''
          })
        ];
      }

      const mp4Match = combined.match(/https?:\/\/[^\s"'<>]+\.mp4[^\s"'<>]*[^\s"'<>\.]/i);
      if (mp4Match) {
        return [
          this.formatStream({
            sourceName,
            quality: '1080p',
            driver: 'Direct MP4',
            displayTitle: queryInfo.displayTitle || 'مشاهدة مباشرة',
            url: mp4Match[0],
            referer: ''
          })
        ];
      }
    } catch {}
    return [];
  }
}

module.exports = StreamExtractors;
