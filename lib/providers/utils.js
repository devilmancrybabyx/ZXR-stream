/**
 * Shared Provider Utilities (Title normalization, fuzzy matching, Arabic numbers)
 */

const https = require('https');
const axios = require('axios');
const config = require('../../config');

const insecureAgent = new https.Agent({ rejectUnauthorized: false });

const ARABIC_DIGITS = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];

class ProviderUtils {
  static createClient(baseURL, customHeaders = {}) {
    return axios.create({
      baseURL,
      timeout: config.REQUEST_TIMEOUT,
      httpsAgent: insecureAgent,
      headers: {
        'User-Agent': config.USER_AGENT,
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8',
        'Accept-Language': 'ar,en-US;q=0.9,en;q=0.8',
        'Connection': 'keep-alive',
        ...customHeaders
      }
    });
  }

  static normalizeText(text) {
    if (!text) return '';
    let res = text.toLowerCase()
      .replace(/[إأآا]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[^\w\s\u0600-\u06FF]/gi, ' ')
      .replace(/\s+/g, ' ');

    ARABIC_DIGITS.forEach((d, i) => {
      res = res.replaceAll(d, i.toString());
    });

    return res.trim();
  }

  static cleanTitle(title) {
    if (!title) return '';
    return title
      .replace(/(مشاهدة|فيلم|مسلسل|انمي|أنمي|مترجم|مدبلج|اون لاين|كامل|HD|FHD|BluRay|WEB-DL|الحلقة|الموسم)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  /**
   * Title matcher: checks if query title matches scraped item title
   */
  static matchesTitle(sourceTitle, queryTitle, year = null) {
    if (!sourceTitle || !queryTitle) return false;

    const sNorm = this.normalizeText(sourceTitle);
    const qNorm = this.normalizeText(queryTitle);

    if (!qNorm) return false;

    // Check year constraint if year is given
    if (year) {
      const sYearMatch = sourceTitle.match(/\b(19\d{2}|20\d{2})\b/);
      if (sYearMatch) {
        const foundYear = parseInt(sYearMatch[1], 10);
        if (Math.abs(foundYear - year) > 1) {
          return false;
        }
      }
    }

    // Direct substring match
    if (sNorm.includes(qNorm)) {
      return true;
    }

    // Tokenized word matching
    const queryWords = qNorm.split(' ').filter(w => w.length > 1);
    if (queryWords.length === 0) return false;

    const matchedWords = queryWords.filter(word => sNorm.includes(word));
    const matchRatio = matchedWords.length / queryWords.length;

    return matchRatio >= 0.75;
  }
}

module.exports = ProviderUtils;
