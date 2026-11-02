# 🧠 ZXR Stream — Memory & Technical Fallback Manual

هذا الملف يُمثل **المرجع التقني الشامل ودليل الذاكرة (Fallback Memory)** لمشروع **ZXR Stream**. تم إعداده ليكون مرجعاً تقنياً ثابتاً يمكنك الرجوع إليه في أي وقت لإجراء أي تعديل، إضافة مصادر جديدة، تحديث نطاقات المواقع، أو صيانة الإضافة مستقبلاً.

---

## 📌 1. نظرة عامة والمعمارية المزدوجة (Architecture Overview)

- **الهدف الأساسي**: إعادة بناء وتحويل جميع المواقع الـ 21 من مستودع CloudStream الأصلي (`mehdigm4life/mehdigm-stream`) إلى إضافة موحدة تعمل في:
  1. **تطبيق Nuvio**: كإضافة Stremio متكاملة (عبر Vercel أو الخادم المحلي)، أو مباشرة عبر مستودع GitHub من خلال رابط `manifest.json`.
  2. **تطبيق Stremio**: عبر خادم Node.js / Express خفيف ينفذ بروتوكول Stremio Addon Protocol v3، متوافق بنسبة 100% مع النشر الفوري والمجاني على منصة Vercel كـ Serverless Functions.
- **المساهم الوحيد**: `devilmancrybabyx` في كامل سجل Git.

---

## 📂 2. الهيكلية التفصيلية للملفات

```text
ZXR-stream/
├── manifest.json                # مانيفست Nuvio و Stremio مع دعم البحث والتصفح
├── README.md                    # الوثيقة العربية الرسمية مع روابط التثبيت المباشرة
├── memory.md                    # ملف الذاكرة الحالي للرجوع إليه عند أي تعديل
├── package.json                 # تعريف المشروع والتبعيات
├── config.js                    # تكوين النطاقات النشطة لجميع المواقع الـ 21
├── server.js                    # خادم Express لـ Stremio والكاتالوج والبحث
├── vercel.json                  # إعدادات النشر على Vercel Serverless
├── api/
│   └── index.js                 # نقطة الدخول (Entry Point) لمنصة Vercel
├── manifest.js                  # مولد مانيفست Stremio الديناميكي
├── providers/                   # كواشط Nuvio المستقلة الـ 21 (GitHub Scrapers)
├── lib/
│   ├── cinemeta.js              # محلل المعرفات عبر IMDb و Kitsu
│   ├── extractors/              # مفككات التشفير ومستخرجات الروابط (MegaMax, VidHide, Uqload, JsPacker)
│   └── providers/               # كواشط Node.js لخادم Stremio
└── public/
    ├── index.html               # واجهة التثبيت والتخصيص التفاعلية
    └── images/                  # أيقونات المواقع والشعارات
```

---

## 🍿 3. قائمة المواقع الـ 21 والنطاقات النشطة (Active Domains)

| المعرف (ID) | اسم المصدر | النطاق الأساسي (Base URL) | التصنيف | الحالة |
|---|---|---|---|---|
| `egydead` | إيجي ديد (EgyDead) | `https://a1.egydead.media` | أفلام ومسلسلات وأنمي | نشط ومختبر (MegaMax + Direct HLS) |
| `faselhd` | فاصل إعلاني (FaselHD) | `https://www.faselhd.ac` | أفلام ومسلسلات أجنبية | نشط ومختبر |
| `witanime` | ويت أنمي (WitAnime) | `https://witanime.com` | أنمي ياباني | نشط |
| `anime4up` | أنمي فور اب (Anime4Up) | `https://w1.anime4up.rest` | مسلسلات وأفلام أنمي | نشط |
| `shahid4u` | شاهد فور يو (Shahid4u) | `https://shaahidd4u.net` | مسلسلات عربية وتركية | نشط |
| `tuktuk` | توك توك سينما (TukTuk) | `https://tuktukhd.com` | منصات عالمية وأفلام | نشط |
| `cimanow` | سيما ناو (CimaNow) | `https://cimanow.cc` | أعمال عربية وأجنبية | نشط (عبر Mobile UA) |
| `topcinema` | توب سينما (TopCinema) | `https://topcinema.film` | تقييمات IMDb وسلاسل | نشط |
| `stardima` | ستار ديما (StarDima) | `https://www.stardima.com` | كرتون أطفال ومدبلج | نشط |
| `animezid` | أنمي زد (Animezid) | `https://animezid.org` | أنمي وكرتون | نشط |
| `dramaworld` | عالم الدراما (DramaWorld) | `https://test.arabypros.com` | دراما كورية وآسيوية | تحت المراقبة |
| `shooflive` | شوف لايف (ShoofLive) | `https://shooflive.watch` | مسلسلات عربية وتركية | نشط |
| `anime3rb` | أنمي عرب (Anime3rb) | `https://anime3rb.com` | أنمي مترجم | نشط |
| `animeday` | أنمي داي (AnimeDay) | `https://www.anime-day.com` | مسلسلات وأفلام أنمي | نشط |
| `animerift` | أنمي ريفت (AnimeRift) | `https://www.anime-rift.com` | أنمي وأوفا | نشط |
| `animeslayer` | أنمي سلاير (AnimeSlayer) | `https://anslayer.com` | واجهة تطبيق أنمي سلاير | يتطلب بروكسي |
| `cartoonanime` | كرتون أنمي (CartoonAnime) | `https://apps-anime.com` | كرتون كلاسيكي وحديث | نشط |
| `cimacloud` | سيما كلاود (CimaCloud) | `https://www.cima-cloud.com` | أفلام ومسلسلات | نشط |
| `cimawbas` | سيما وبس (Cimawbas) | `https://vid.mycima.cc` | أفلام ومسلسلات | تحت التحديث |
| `egywatch` | إيجي واتش (Egywatch) | `https://egywatch.me` | أعمال منوعة وبث مباشر | تحت التحديث |
| `timemovies` | تايم موفيز (TimeMovies) | `https://tmovies.app` | عروض سينمائية وسلاسل | نشط |

---

## 🛠️ 4. تفاصيل الحلول والتحسينات المطبقة (Engineering Fixes)

### 1. حل مشكلة الكتالوج والبحث الفارغ (Catalogs & Search)
- **سبب المشكلة السابق**: كان الخادم يُرجع `{ metas: [] }` عند عدم وجود معلمة بحث، كما كان يفكك معلمة `extra` بصيغة JSON بدلاً من `URLSearchParams`، مما كان يجعل البحث في Nuvio/Stremio يُعيد نتائج فارغة.
- **الحل الجذري**:
  - عند فتح الكتالوج بدون بحث، يتم جلب أشهر الأعمال الحالية وحفظها في الذاكرة (Cache). في حال تأخر خادم Cinemeta، توجد قائمة احتياطية جاهزة (Fallback) تضم أقوى الأفلام والمسلسلات لضمان عدم ظهور شاشة فارغة أبداً.
  - عند كتابة أي كلمة في شريط البحث داخل Nuvio أو Stremio، يستجيب الكتالوج فوراً بنتائج حقيقية تحمل معرفات IMDb صحيحة (`tt...`).
  - إضافة `{ name: "search", isRequired: false }` و `{ name: "skip", isRequired: false }` إلى ملفات المانيفست لتفعيل خانة البحث وأزرار التصفح داخل التطبيق.

### 2. حل استخراج مسلسلات إيجي ديد (Series Traversal)
- **سبب المشكلة السابق**: عند البحث عن مسلسل مثل *Breaking Bad*، كانت النتائج تقود إلى صفحة المسلسل `/Series/`، وهي لا تحوي روابط الحلقات مباشرة بل تحوي روابط المواسم (`/seasons/`).
- **الحل الجذري**:
  - تمت إضافة منطق تنقل ذكي: يتعرف الكاشط على رقم الموسم المطلوب بالإنجليزية (`s01`) والعربية (`الموسم الاول`)، يفتح صفحة الموسم المعني، ثم يستخرج رابط الحلقة المحددة بدقة، ويفتح صفحة المشاهدة `/watch/`.

### 3. حل مشغل MegaMax واستخراج الروابط المباشرة (MegaMax & Direct HLS)
- مشغل MegaMax يستخدم إطار عمل **Inertia.js** الحديث عبر Vue.
- **آلية الاستخراج**:
  1. إرسال ترويسات `X-Inertia: true` و `X-Inertia-Partial-Component: files/mirror/video` و `X-Inertia-Partial-Data: streams`.
  2. في حال حدوث 409 Conflict، يتم التقاط رقم الإصدار الجديد من ترويسة `x-inertia-version` وإعادة الطلب.
  3. يتم استخراج كافة السيرفرات والمرايا بجميع الجودات (1080p, 720p, 480p) ومفكك P.A.C.K.E.R لفك تشفير روابط Uqload و VidHide واستخراج رابط HLS مباشر عالي السرعة (`master.m3u8`).
  4. استخراج مباشر بالتوازي بسرعة فائقة (أقل من 1.5 ثانية).

### 4. دمج الكتالوجات في كتالوج واحد موحد (Single Merged Catalog)
- **سبب التعديل**: كان المانيفست يقسم الأعمال إلى 3 كتالوجات مما يظهر "3 catalogs" في تطبيق Nuvio.
- **الحل**: تم توحيد الكتالوجات في كتالوج واحد فقط تحت اسم المعرف `zxr_catalog` واسم `🌟 ZXR Stream (المكتبة العربية الشاملة)` مع دعم التصنيف (`type: 'movie'`) والبحث الشامل للأفلام والمسلسلات معاً وتصفح مدمج.

### 5. حل تشغيل السيرفرات وجعلها صالحة للتشغيل 100% (Direct Playable Streams)
- **سبب المشكلة السابق**: كانت السيرفرات تظهر في التطبيق لكنها لا تعمل أو تفشل عند الضغط عليها، والسبب أن بعض الروابط كانت عبارة عن صفحات ويب وتضمين إعلاني (HTML embeds مثل `vidmoly.biz/embed-...` و `mixdrop.ag/e/...`). عند محاولة مشغل Nuvio/Stremio (ExoPlayer) تشغيل صفحة HTML كفيديو، يعطي خطأ صيغة غير مدعومة أو فشل التشغيل. كذلك سيرفرات Uqload كانت ترفض التشغيل بـ 403 Forbidden لنقص ترويسة `Referer`.
- **الحل**:
  1. تصفية ومنع إرجاع أي روابط تضمين HTML عادية.
  2. حل الروابط واستخراج مسارات الفيديو الحقيقية والمباشرة (`.m3u8` أو `.mp4`) لسيرفرات VidHide و Vidmoly و StreamWish و Uqload.
  3. إرفاق ترويسات التشغيل `behaviorHints.proxyHeaders` مع ترويسة `Referer: https://uqload.vc/` لتخطي حظر Cloudflare و NGINX.

### 6. التنسيق الجمالي الاحترافي للروابط والرموز التعبيرية (Emoji Title Standard)
- تم تطبيق التنسيق الدقيق المطلوب:
  - **الاسم (`name`)**: `🎬<WebsiteName> 🧊 <Quality> • ZXR Stream` (مثال: `🎬EgyDead 🧊 1080p • ZXR Stream`)
  - **التفاصيل (`title`)**:
    ```text
    🍿 <Title>
    🏷️ <Host> - <Quality> <ResolutionBadge>
    🎞️ <Quality> • Direct
    📡 Source: <WebsiteName> • ZXR Stream
    💬 Arabic Subtitles (مترجم للعربية)
    ```

---

## ⚡ 5. أوامر الفحص والتشغيل

### لتشغيل الفحص الشامل واختبار كافة العمليات:
```bash
node test/test.js
```

### لبناء المانيفست وكواشط Nuvio من الصفر:
```bash
node scripts/build-manifest.js
```

### لتشغيل خادم التطوير محلياً:
```bash
node server.js
```
ثم فتح: `http://localhost:7000/manifest.json` أو واجهة التثبيت `http://localhost:7000/configure`.
