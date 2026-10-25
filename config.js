/**
 * ZXR Stream - Global Configuration
 * All 21 Arabic Providers from mehdigm-stream
 */

module.exports = {
  PORT: process.env.PORT || 7000,
  HOST: process.env.HOST || '0.0.0.0',
  USER_AGENT: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Safari/537.36',
  MOBILE_UA: 'Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/133.0.0.0 Mobile Safari/537.36',
  REQUEST_TIMEOUT: 11000, // 11s timeout per provider
  CACHE_TTL: 3600,

  // All 21 Arabic Provider Active Domains
  DOMAINS: {
    egydead: process.env.EGYDEAD_URL || 'https://tv10.egydead.live',
    faselhd: process.env.FASELHD_URL || 'https://www.fasel-hd.co',
    witanime: process.env.WITANIME_URL || 'https://witanime.com',
    anime4up: process.env.ANIME4UP_URL || 'https://w1.anime4up.rest',
    shahid4u: process.env.SHAHID4U_URL || 'https://shaahidd4u.net',
    tuktuk: process.env.TUKTUK_URL || 'https://tuktukhd.com',
    cimanow: process.env.CIMANOW_URL || 'https://cimanow.cc',
    topcinema: process.env.TOPCINEMA_URL || 'https://topcinema.film',
    stardima: process.env.STARDIMA_URL || 'https://app.stardima.com',
    animezid: process.env.ANIMEZID_URL || 'https://animezid.org',
    dramaworld: process.env.DRAMAWORLD_URL || 'https://test.arabypros.com',
    shooflive: process.env.SHOOFLIVE_URL || 'https://shooflive.watch',
    anime3rb: process.env.ANIME3RB_URL || 'https://anime3rb.com',
    animeday: process.env.ANIMEDAY_URL || 'https://www.anime-day.com',
    animerift: process.env.ANIMERIFT_URL || 'https://www.anime-rift.com',
    animeslayer: process.env.ANIMESLAYER_URL || 'https://anslayer.com',
    cartoonanime: process.env.CARTOONANIME_URL || 'https://apps-anime.com',
    cimacloud: process.env.CIMACLOUD_URL || 'https://www.cima-cloud.com',
    cimawbas: process.env.CIMAWBAS_URL || 'https://vid.mycima.cc',
    egywatch: process.env.EGYWATCH_URL || 'https://egywatch.me',
    timemovies: process.env.TIMEMOVIES_URL || 'https://tmovies.app'
  }
};
