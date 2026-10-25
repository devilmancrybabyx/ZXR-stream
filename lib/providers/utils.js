/**
 * Shared Provider Utilities (Title normalization, fuzzy matching, Arabic numbers)
 */

const axios = require('axios');
const config = require('../../config');

class ProviderUtils {
  static createClient(baseURL, customHeaders = {}) {
    return axios.create({
      baseURL,
      timeout: config.REQUEST_TIMEOUT,
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
    return text
      .toLowerCase()
      .replace(/[إأآا]/g, 'ا')
      .replace(/ة/g, 'ه')
      .replace(/ى/g, 'ي')
      .replace(/[٠-٩]/g, d => '٠١٢٣٤٥٦٧٨٩'.indexOf(d).toString())
      .replace(/[^\w\s\u0600-\u06FF]/gi, ' ')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static cleanTitle(title) {
    if (!title) return '';
    return title
      .replace(/(مشاهدة|فيلم|مسلسل|انمي|أنمي|مترجم|مدبلج|اون لاين|كامل|HD|FHD|BluRay|WEB-DL|الحلقة|الموسم)/gi, '')
      .replace(/\s+/g, ' ')
      .trim();
  }

  static matchesTitle(sourceTitle, queryTitle, year = null) {
    const sNorm = this.normalizeText(sourceTitle);
    const qNorm = this.normalizeText(queryTitle);

    if (!qNorm) return false;

    // Check if query words appear in source
    const queryWords = qNorm.split(' ').filter(w => w.length > 1);
    if (queryWords.length === 0) return false;

    const matchedWords = queryWords.filter(word => sNorm.includes(word));
    const matchRatio = matchedWords.length / queryWords.length;

    // If year is given, verify year isn't conflicting
    if (year) {
      const yearStr = year.toString();
      const sYearMatch = sourceTitle.match(/\b(19\d{2}|20\d{2})\b/);
      if (sYearMatch && Math.abs(parseInt(sYearMatch[1], 10) - year) > 1) {
        return false;
      }
    }

    return matchRatio >= 0.7;
  }
}

module.exports = ProviderUtils;
