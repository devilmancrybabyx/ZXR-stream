# 🧠 ZXR Stream — Memory & Technical Fallback Manual

هذا الملف يُمثل **المرجع التقني الشامل ودليل الذاكرة (Fallback Memory)** لمشروع **ZXR Stream**. تم إعداده ليكون مرجعاً تقنياً ثابتاً يمكنك الرجوع إليه في أي وقت لإجراء أي تعديل، إضافة مصادر جديدة، تحديث نطاقات المواقع، أو صيانة الإضافة مستقبلاً.

---

## 📌 1. نظرة عامة والمعمارية المزدوجة (Architecture Overview)

- **الهدف الأساسي**: إعادة بناء وتحويل جميع المواقع الـ 21 من مستودع CloudStream الأصلي (`mehdigm4life/mehdigm-stream`) إلى إضافة موحدة تعمل في:
  1. **تطبيق Nuvio**: **مباشرة عبر GitHub** من خلال الرابط الخام لـ `manifest.json`، حيث يُحمّل التطبيق ملفات `providers/*.js` محلياً وينفذ الكشط والاستخراج مباشرة دون الحاجة لأي خادم وسيط.
  2. **تطبيق Stremio**: عبر خادم Node.js / Express خفيف ينفذ بروتوكول Stremio Addon Protocol v3.
- **المساهم الوحيد**: `devilmancrybabyx` في كامل سجل Git.

---

## 📂 2. الهيكلية التفصيلية للملفات

```text
ZXR-stream/
├── manifest.json                # المانيفست الرئيسي المتوافق مع Nuvio و Stremio
├── README.md                    # الوثيقة العربية الرسمية مع روابط التثبيت المباشرة
├── memory.md                    # ملف الذاكرة الحالي للرجوع إليه عند أي تعديل
├── package.json                 # تعريف المشروع والتبعيات
├── config.js                    # تكوين النطاقات النشطة لجميع المواقع الـ 21
├── server.js                    # خادم Express لـ Stremio وواجهة الويب
├── manifest.js                  # مولد مانيفست Stremio الديناميكي
├── providers/                   # كواشط Nuvio المستقلة الـ 21 (يتم استدعاؤها عبر GitHub مباشرة)
│   ├── egydead.js
│   ├── faselhd.js
│   ├── witanime.js
│   ├── anime4up.js
│   ├── shahid4u.js
│   ├── tuktuk.js
│   ├── cimanow.js
│   ├── topcinema.js
│   ├── stardima.js
│   ├── animezid.js
│   ├── dramaworld.js
│   ├── shooflive.js
│   ├── anime3rb.js
│   ├── animeday.js
│   ├── animerift.js
│   ├── animeslayer.js
│   ├── cartoonanime.js
│   ├── cimacloud.js
│   ├── cimawbas.js
│   ├── egywatch.js
│   └── timemovies.js
├── lib/
│   ├── cinemeta.js              # محلل المعرفات عبر IMDb و Kitsu
│   ├── extractors/              # مفككات التشفير ومستخرجات الروابط المباشرة (m3u8, mp4, StreamWish...)
│   └── providers/               # كواشط Node.js لخادم Stremio
└── public/
    ├── index.html               # واجهة التثبيت والتخصيص التفاعلية
    └── images/                  # أيقونات المواقع والشعارات
```

---

## 🍿 3. قائمة المواقع الـ 21 والنطاقات النشطة (Active Domains)

| المعرف (ID) | اسم المصدر | النطاق الأساسي (Base URL) | التصنيف |
|---|---|---|---|
| `egydead` | إيجي ديد (EgyDead) | `https://tv10.egydead.live` | أفلام ومسلسلات وأنمي |
| `faselhd` | فاصل إعلاني (FaselHD) | `https://www.fasel-hd.co` | أفلام ومسلسلات أجنبية |
| `witanime` | ويت أنمي (WitAnime) | `https://witanime.com` | أنمي ياباني |
| `anime4up` | أنمي فور اب (Anime4Up) | `https://w1.anime4up.rest` | مسلسلات وأفلام أنمي |
| `shahid4u` | شاهد فور يو (Shahid4u) | `https://shaahidd4u.net` | مسلسلات عربية وتركية |
| `tuktuk` | توك توك سينما (TukTuk) | `https://tuktukhd.com` | منصات عالمية وأفلام |
| `cimanow` | سيما ناو (CimaNow) | `https://cimanow.cc` | أعمال عربية وأجنبية |
| `topcinema` | توب سينما (TopCinema) | `https://topcinema.film` | تقييمات IMDb وسلاسل |
| `stardima` | ستار ديما (StarDima) | `https://app.stardima.com` | كرتون أطفال ومدبلج |
| `animezid` | أنمي زد (Animezid) | `https://animezid.org` | أنمي وكرتون |
| `dramaworld` | عالم الدراما (DramaWorld) | `https://test.arabypros.com` | دراما كورية وآسيوية |
| `shooflive` | شوف لايف (ShoofLive) | `https://shooflive.watch` | مسلسلات عربية وتركية |
| `anime3rb` | أنمي عرب (Anime3rb) | `https://anime3rb.com` | أنمي مترجم |
| `animeday` | أنمي داي (AnimeDay) | `https://www.anime-day.com` | مسلسلات وأفلام أنمي |
| `animerift` | أنمي ريفت (AnimeRift) | `https://www.anime-rift.com` | أنمي وأوفا |
| `animeslayer` | أنمي سلاير (AnimeSlayer) | `https://anslayer.com` | واجهة تطبيق أنمي سلاير |
| `cartoonanime` | كرتون أنمي (CartoonAnime) | `https://apps-anime.com` | كرتون كلاسيكي وحديث |
| `cimacloud` | سيما كلاود (CimaCloud) | `https://www.cima-cloud.com` | أفلام ومسلسلات |
| `cimawbas` | سيما وبس (Cimawbas) | `https://vid.mycima.cc` | أفلام ومسلسلات |
| `egywatch` | إيجي واتش (Egywatch) | `https://egywatch.me` | أعمال منوعة وبث مباشر |
| `timemovies` | تايم موفيز (TimeMovies) | `https://tmovies.app` | عروض سينمائية وسلاسل |

---

## ⚡ 4. روابط التثبيت والتشغيل

### لتطبيق Nuvio (مباشرة عبر GitHub):
انسخ الرابط التالي والصقه في Nuvio تحت **Settings** ← **Plugins / Scrapers** ← **Add Manifest URL**:
```text
https://raw.githubusercontent.com/devilmancrybabyx/ZXR-stream/main/manifest.json
```

### لتطبيق Stremio:
1. تشغيل الخادم على جهازك:
   ```bash
   npm install
   npm start
   ```
2. تثبيت الرابط داخل Stremio:
   `http://localhost:7000/manifest.json`

---

## 🔧 5. دليل الصيانة والتعديل السريع

- **لتحديث نطاق موقع غيّر رابطه**:
  عدّل النطاق في `config.js` وأعد تشغيل `node scripts/build-manifest.js` لتحديث ملفات `providers/` و `manifest.json`.
- **لتشغيل الفحص الذاتي واختبار التوافق**:
  ```bash
  npm test
  ```
