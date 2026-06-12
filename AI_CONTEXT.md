# AI_CONTEXT.md — سياق الذكاء الاصطناعي لمشروع Attendance Extractor

> **هذا الملف مخصص لأي AI يعمل على هذا المشروع.**
> اقرأه كاملاً أول ما تفتح الجلسة لتعرف بالضبط أين وصل المشروع.

---

## ما هو هذا التطبيق؟

تطبيق موبايل للموظفين لتسجيل حضورهم عبر التصوير بالكاميرا.
- يلتقط صورة لجهاز البصمة ويحفظ الوقت الرسمي المزامَن تلقائياً
- يدعم نظام شفت واحد وشفتين
- يرسل تنبيهات قبل كل موعد دخول/خروج
- يحتفظ بسجل كامل مع الصور والتواريخ والتقارير
- يدعم إضافة **ملاحظة اختيارية** على كل سجل (حتى 200 حرف)

---

## Stack التقني

| المكوّن | التفاصيل |
|---|---|
| Framework | Expo SDK 54 + React Native 0.81.5 |
| Router | expo-router v6 |
| DB | expo-sqlite v15 (runSync API) |
| Updates | ❌ **OTA محذوف نهائياً** — نظام APK عبر GitHub Releases |
| Notifications | expo-notifications |
| Storage | AsyncStorage + expo-file-system |
| Build | EAS Build (pnpm workspace monorepo) |
| Language | TypeScript strict |
| Repo structure | pnpm monorepo — التطبيق في `artifacts/attendance/` |

---

## نظام التحديث الجديد (APK بدلاً من OTA)

### لماذا تم الإلغاء؟
نظام OTA كان يسبب كراش عند التعارض بين JS bundle الجديد وAPK القديم.

### كيف يعمل النظام الجديد؟
1. التطبيق يفحص `https://raw.githubusercontent.com/zozoaooccc1/attendance-releases/main/version.json` عند كل فتح
2. إذا كان الإصدار الموجود أحدث → يعرض modal يحتوي: رقم الإصدار + الميزات + زر "تحميل"
3. المستخدم يضغط "تحميل" → يفتح المتصفح برابط APK
4. يثبّت APK الجديد فوق القديم — البيانات تبقى 100%

### ملف الإصدار (زوز يحدّثه عند كل إصدار جديد):
- **Repo:** `https://github.com/zozoaooccc1/attendance-releases` (PUBLIC)
- **الملف:** `version.json`
- **التنسيق:**
```json
{
  "version": "2.7.0",
  "notes": "✨ ميزة جديدة\n🔧 إصلاح",
  "download_url": "رابط APK المباشر"
}
```
- عند رفع APK جديد: حدّث هذا الملف بالإصدار ورابط التنزيل

### الملفات الجديدة:
- `utils/githubUpdateChecker.ts` — منطق الفحص والمقارنة
- `components/AppUpdateModal.tsx` — واجهة إشعار التحديث

---

## خريطة الملفات المهمة

```
artifacts/attendance/
├── app.json                              <- version: "2.7.0" (بدون runtimeVersion/updates)
├── eas.json                              <- development/preview/production profiles
├── app/
│   ├── _layout.tsx                       <- ROOT LAYOUT (OTA محذوف، GitHub update check)
│   ├── (tabs)/index.tsx                  <- الشاشة الرئيسية
│   ├── (tabs)/history.tsx                <- السجل — شارة 📝 للتأخر مع ملاحظة
│   ├── (tabs)/calendar.tsx               <- التقويم الشهري
│   ├── (tabs)/reports.tsx                <- التقارير — ملاحظات التأخير في PDF+واتساب+CSV
│   ├── capture.tsx                       <- حقل ملاحظة اختياري (200 حرف)
│   ├── settings.tsx                      <- ⚠️ يحتاج مراجعة: قد يرجع لـ expo-updates
│   ├── record-detail.tsx
│   └── day-detail.tsx
├── utils/
│   ├── githubUpdateChecker.ts            <- [جديد] فحص الإصدار من GitHub Releases
│   ├── crashGuard.ts                     <- [محدَّث] بدون expo-updates — يستخدم Constants
│   ├── notifications.native.ts
│   ├── imageStorage.native.ts
│   ├── database.native.ts
│   ├── backup.native.ts
│   ├── timeService.ts
│   └── pinAuth.ts
├── constants/
│   ├── changelog.ts                      <- CURRENT_VERSION = '2.7.0'
│   ├── scheduleConfig.ts                 <- checkLateEntry() — مواعيد الدوام
│   └── types.ts                          <- AttendanceRecord — note?: string
├── context/
│   ├── AttendanceContext.tsx
│   ├── SettingsContext.tsx
│   └── ThemeContext.tsx
└── components/
    ├── AppUpdateModal.tsx                <- [جديد] modal إشعار التحديث
    ├── ChangelogModal.tsx
    ├── RestoreModal.tsx
    └── ErrorBoundary.tsx
```

---

## إصدارات النسخ

| Version | الميزات الرئيسية | الحالة |
|---|---|---|
| **2.7.0** | إلغاء OTA + نظام APK update + ملاحظات التأخير في التقارير | **الأحدث** |
| 2.6.0 | إضافة حقل ملاحظة في capture.tsx | سابق |
| 2.5.0 | 4-layer DB hardening (toSafe+safeRun+globalGuard) | سابق |
| 2.2.0 | عداد تنازلي، APK مبني | APK قديم |

**ملاحظة:** `runtimeVersion` حُذف من app.json — لا تعيد إضافته.

---

## ⚠️ ميزة عرض الملاحظات في التقارير

### المنطق:
- `r.note` تظهر **فقط** إذا كان السجل متأخراً (`checkLateEntry().isLate === true`)
- إذا صوّر قبل انتهاء وقت السماح → لا تظهر الملاحظة مطلقاً

### أين تظهر:
| المكان | الشكل |
|---|---|
| PDF | `📝 سبب التأخير: (نص)` تحت الوقت مباشرة |
| PDF (قسم منفصل) | جدول "ملاحظات التأخير" في آخر التقرير |
| واتساب | قسم `📝 أسباب التأخير` بعد ملخص الإحصائيات |
| CSV | عمود "سبب التأخير" — فارغ إذا لم يكن متأخراً |
| قائمة السجل | شارة `📝` حمراء + chip `⚠️ تأخر • ملاحظة مُرفقة` |

---

## ⚠️ نظام الحماية الرباعي لقاعدة البيانات (v2.5.0)

لا تتجاوز هذه الطبقات أبداً:

**Layer 1 — toSafe():** تحويل كل قيمة لـ primitive آمن
```typescript
function toSafe(v: unknown): string | number | null {
  if (v === null || v === undefined) return null;
  if (typeof v === 'boolean') return v ? 1 : 0;
  if (typeof v === 'number') return isFinite(v) ? v : null;
  if (typeof v === 'string') return v;
  // ...
}
```

**Layer 2 — safeRun():** كل write لـ SQLite يجب أن يمر عبره
**Layer 3 — Debug Logger (dev only)**
**Layer 4 — installGlobalGuard():** monkey-patch على proto.runSync

---

## ⚠️ بناء APK — كيف تبني APK جديد يدوياً؟

```bash
# لا يمكن بدون EXPO_TOKEN صالح — انتهت المجانية
# عند تجديد الحساب أو الترقية:
cd /tmp/eas-fresh/artifacts/attendance
EAS_SKIP_AUTO_FINGERPRINT=1 EXPO_TOKEN=$EXPO_TOKEN \
  eas build --platform android --profile preview --non-interactive

# بعد البناء: ارفع APK على GitHub Releases
# ثم حدّث: https://github.com/zozoaooccc1/attendance-releases/blob/main/version.json
```

---

## ⚠️ settings.tsx — يحتاج مراجعة

ملف `settings.tsx` قد يحتوي على references لـ `expo-updates` مثل:
- `Updates.channel`
- `Updates.updateId`  
- `Updates.runtimeVersion`

**إذا فشل البناء بسبب هذا:** احذف هذه القيم أو استبدلها بـ `'—'`

---

## أوامر التطوير

```bash
# ── بناء APK (يحتاج EXPO_TOKEN صالح) ──
EXPO_TOKEN=$EXPO_TOKEN eas build --platform android --profile preview --non-interactive --no-wait

# ── فحص TypeScript ──
cd artifacts/attendance && npx tsc --noEmit

# ── تحديث ملف الإصدار بعد رفع APK ──
# عدّل version.json في https://github.com/zozoaooccc1/attendance-releases
```

---

## الأسرار والمتغيرات

| الاسم في Replit Secrets | الوصف |
|---|---|
| `GITHUB_TOKEN` | GitHub Personal Access Token (repo scope) |
| `EXPO_TOKEN` | EAS/Expo Authentication Token — **منتهي الصلاحية** |
| `SESSION_SECRET` | للـ API server |

---

## قواعد مهمة للـ AI

1. **اقرأ هذا الملف أولاً** في كل جلسة جديدة
2. **OTA محذوف نهائياً** — لا تعيد `expo-updates` أو `runtimeVersion` أو `updates` في app.json
3. **التحديث الآن عبر APK** — عبر `githubUpdateChecker.ts` + `AppUpdateModal.tsx`
4. **بياناتك للمستخدمين محفوظة** عند تثبيت APK جديد (نفس `com.attendance.app`)
5. **تحقق من toSafe+safeRun** قبل أي write لـ SQLite
6. **note?: string** — لا null، فقط string أو undefined
7. **بعد انتهاء الجلسة**: حدّث هذا الملف بكل تغيير جديد
8. **settings.tsx** قد يحتاج تحديثاً لإزالة expo-updates references
9. **ملف الإصدار العام**: `https://raw.githubusercontent.com/zozoaooccc1/attendance-releases/main/version.json`

---

## مشاكل معروفة وحلولها

| المشكلة | السبب | الحل |
|---|---|---|
| `Cannot convert '[object Object]' to Kotlin` | قيمة غير آمنة لـ expo-sqlite v15 | 4-layer: toSafe+safeRun+debugLogger+globalGuard |
| APK build يفشل | TypeScript errors أو EXPO_TOKEN منتهي | فحص tsc + تجديد Token |
| settings.tsx لا تعمل | references لـ expo-updates المحذوف | احذف/استبدل Updates.* بقيم ثابتة |
| `npm install` يفشل | `catalog:` protocol من pnpm | استخدم symlink من clone مثبّت |
| `note: null` TypeScript error | `note?: string` لا يقبل null | استخدم `undefined` أو احذف المفتاح |

---

## الإصدار الحالي

| البند | القيمة |
|---|---|
| **الإصدار** | `3.1.2` (versionCode 34) |
| **APK Build ID** | `710f8824-f823-4fa0-9e60-28a48af4704d` |
| **حالة البناء** | in queue / in progress (2026-06-12) |
| **رابط EAS** | https://expo.dev/accounts/amr9925487962/projects/attendance/builds/710f8824-f823-4fa0-9e60-28a48af4704d |

---

## إصلاحات الجلسة الحالية (3.1.1 → 3.1.2)

### Bug 1 — شريط حجم الخط (3.1.1)
- **المشكلة:** الشريط يقفز بمضاعفات 5 (`Math.round(raw/5)*5`)
- **الحل:** `Math.round(raw)` — خطوة 1% فقط
- **الملفات:** `app/settings.tsx` ، `context/SettingsContext.tsx`

### Bug 2 — الصفحة الرئيسية الافتراضية (3.1.1)
- **المشكلة:** `initialRouteName` يُعيَّن قبل تحميل AsyncStorage → يُتجاهل
- **الحل:** `SettingsGate` component في `_layout.tsx` يُبقي null حتى `settingsLoaded === true`
- **الملفات:** `app/_layout.tsx` ، `context/SettingsContext.tsx` (أضيف `settingsLoaded: boolean`)

### Bug 3 — نافذة التثبيت تختفي (3.1.1)
- **المشكلة:** بعد `IntentLauncher.startActivityAsync()` كان يُستدعى `onDismiss()` مما يُغلق نافذة التحديث
- **الحل:** حُذف `onDismiss()` بعد intent — نافذة التحديث تبقى مفتوحة للإعادة
- **الملف:** `components/AppUpdateModal.tsx`

### Bug 4 — حد التخزين غير قابل للتعديل (3.1.1)
- **المشكلة:** حد 500MB مثبّت في الكود
- **الحل:** `maxStorageMB` في `SettingsContext` (default 1000MB)، 4 أزرار في settings: 500MB/1GB/2GB/∞ (∞ = -1)
- **الملفات:** `context/SettingsContext.tsx` ، `app/settings.tsx`

### Bug 5 — زر "تحقق من التحديثات" (3.1.2)
- **المشكلة 1:** `checkForAppUpdate()` ترجع `null` دائماً إذا سبق الضغط على "لاحقاً" (snooze)
- **المشكلة 2:** الزر في settings.tsx أصلاً لا يستدعي `checkForAppUpdate()` — كان يعرض Alert وهمية فقط!
- **الحل:** أضيف `force=true` parameter يتجاوز snooze، وأُعيدت كتابة `handleCheckUpdate` في settings.tsx لتستدعي `checkForAppUpdate(true)` وتعرض `AppUpdateModal` مباشرة
- **الملفات:** `utils/easUpdateChecker.ts` ، `app/settings.tsx`

---

## نظام التحديث الحالي (EAS بدلاً من GitHub Releases)

> ⚠️ **ملاحظة مهمة:** النظام تطوّر — اقرأ هذا القسم بدلاً من القسم القديم أعلاه

### كيف يعمل النظام الحالي؟
1. التطبيق يفحص EAS Builds API مباشرةً (لا `githubUpdateChecker.ts` القديم)
2. الملف الفعلي: `utils/easUpdateChecker.ts` — يفحص أحدث build من EAS
3. إذا وُجد إصدار أحدث → يعرض `AppUpdateModal` (تحميل مباشر داخل التطبيق + IntentLauncher للتثبيت)
4. المستخدم يضغط "لاحقاً" → يُحفظ snooze في AsyncStorage بمفتاح `apk_update_snoozed_eas_v<version>`
5. زر "تحقق من التحديثات" في settings يستدعي `checkForAppUpdate(true)` لتجاوز الـ snooze

### الملفات الحالية للتحديث:
- `utils/easUpdateChecker.ts` — منطق الفحص من EAS API (بديل `githubUpdateChecker.ts`)
- `components/AppUpdateModal.tsx` — تحميل APK داخلياً + IntentLauncher للتثبيت

### ⚠️ لا تستخدم `githubUpdateChecker.ts` القديم:
الملف القديم `utils/githubUpdateChecker.ts` أُبدل بـ `utils/easUpdateChecker.ts`.

---

## ⚠️ بناء APK — كيف تبني APK جديداً يدوياً؟ (محدَّث)

```bash
# من مجلد artifacts/attendance في Replit workspace
cd /home/runner/workspace/artifacts/attendance
EXPO_TOKEN=$(printenv EXPO_TOKEN) \
EAS_DANGEROUS_DISABLE_VCS_OVERRIDE=1 \
npx eas-cli build --platform android --profile preview --non-interactive --no-wait

# بعد البناء: تحقق من الرابط على EAS Dashboard
# لا حاجة لتحديث version.json — النظام يقرأ مباشرة من EAS API
```

---

## تاريخ التحديثات

### 2026-06-11 — إلغاء OTA + نظام APK (v2.7.0)
- **حُذف نهائياً:** `expo-updates` من package.json وapp.json و_layout.tsx
- **حُذف نهائياً:** `runtimeVersion`, `updates` section من app.json
- **أُضيف:** `utils/githubUpdateChecker.ts` — يفحص version.json عام بدون auth
- **أُضيف:** `components/AppUpdateModal.tsx` — modal إشعار APK جديد مع رابط تنزيل
- **أُنشئ Repo عام:** `zozoaooccc1/attendance-releases` يحتوي `version.json`
- **حُدِّث:** `crashGuard.ts` — إزالة expo-updates، استخدام Constants.expoConfig.version
- **ميزة ملاحظات التأخير:** history.tsx + reports.tsx (PDF/واتساب/CSV)

### 2026-06-11 — ملاحظات التأخير في التقارير
- **history.tsx:** شارة 📝 + chip تظهر فقط عند تأخر مع ملاحظة
- **reports.tsx:** ملاحظة التأخير في PDF + جدول منفصل + واتساب + CSV
- القاعدة: الملاحظة تظهر فقط إذا `checkLateEntry().isLate === true`

### 2026-06-11 — الجلسة الثانية عشرة (v2.6.0)
- إضافة حقل الملاحظة في capture.tsx (200 حرف، note.trim() || undefined)

### 2026-06-11 — الجلسة الثانية عشرة (v2.5.0)
- 4-layer DB protection: toSafe+safeRun+debugLogger+installGlobalGuard

### 2026-06-11 — OneSignal Push Notifications (v2.8.0)
- **أُضيف:** `react-native-onesignal@5.5.1` + `onesignal-expo-plugin@2.7.0`
- **أُضيف:** `utils/oneSignalService.ts` — تهيئة OneSignal وطلب الأذونات
- **حُدِّث:** `app/_layout.tsx` — تهيئة OneSignal عند بدء التطبيق
- **حُدِّث:** `app.json` — إضافة plugin `onesignal-expo-plugin` + version رُفع لـ `2.8.0`
- **حُدِّث:** `constants/changelog.ts` — CURRENT_VERSION = '2.8.0'
- **حُدِّث:** `pnpm-workspace.yaml` — إضافة react-native-onesignal وonesignal-expo-plugin لـ minimumReleaseAgeExclude
- **OneSignal App ID:** محفوظ في Replit Secret باسم `ONESIGNAL_APP_ID`
- **القيمة:** `4b67803a-e800-4f83-974b-32615789ed23`
- **EAS Build v2.8.0:** https://expo.dev/accounts/amr9925487962/projects/attendance/builds/e1899c66-42fc-443e-88b4-632d3c962322

---

## OneSignal — تفاصيل الدمج (v2.8.0)

### ما أُضيف:

**`utils/oneSignalService.ts`** (ملف جديد):
```typescript
import OneSignal from 'react-native-onesignal';
import { Platform } from 'react-native';
import Constants from 'expo-constants';

export function initOneSignal() {
  if (Platform.OS === 'web') return;
  const appId = Constants.expoConfig?.extra?.oneSignalAppId ?? '';
  if (!appId) return;
  OneSignal.initialize(appId);
  OneSignal.Notifications.requestPermission(true);
}
```

**في `app/_layout.tsx`:**
```typescript
import { initOneSignal } from '@/utils/oneSignalService';
// في useEffect أو مباشرة عند تحميل الـ layout:
initOneSignal();
```

**في `app.json`:**
```json
{
  "expo": {
    "version": "2.8.0",
    "plugins": [
      ["onesignal-expo-plugin", { "mode": "development" }],
      ...
    ],
    "extra": {
      "oneSignalAppId": "4b67803a-e800-4f83-974b-32615789ed23"
    }
  }
}
```

### ملاحظات مهمة:
- OneSignal يعمل فقط على Android/iOS — تجاهل web (`Platform.OS === 'web'`)
- `onesignal-expo-plugin` يحتاج Development Build (لا يعمل في Expo Go)
- App ID ثابت — لا تغيّره

---

## ⚠️ EAS Build — حساب ثانٍ (v2.8.0)

### السبب:
حساب Expo الأول (`bsmhrbee3`) استنفد كوتة البناء الشهرية المجانية.

### الحساب الثاني:
| البند | القيمة |
|---|---|
| اسم المستخدم | `amr9925487962` |
| EXPO_TOKEN | محفوظ في Replit Secret: `EXPO_TOKEN_2` |
| EAS Project ID | `e0d07504-ef8f-4a60-9ce3-92694b0d6804` |
| Project slug | `attendance` |

### كيفية البناء بالحساب الثاني:
```bash
# من /tmp/attendance-build/artifacts/attendance
EXPO_TOKEN=$EXPO_TOKEN_2 eas build \
  --platform android \
  --profile preview \
  --non-interactive \
  --no-wait
```

### eas.json يجب أن يحتوي:
```json
{
  "build": {
    "preview": {
      "android": { "buildType": "apk" },
      "env": { "EXPO_TOKEN": "" }
    }
  }
}
```

### ⚠️ قواعد مهمة:
- **`EAS_SKIP_AUTO_FINGERPRINT=1`** — أضفه دائماً لتجنب fingerprint mismatch
- **Project ID في app.json** — يجب أن يكون `e0d07504-ef8f-4a60-9ce3-92694b0d6804` (الحساب الثاني)
- **بعد البناء:** ارفع APK على GitHub Releases وحدّث version.json

### رابط مشروع EAS:
https://expo.dev/accounts/amr9925487962/projects/attendance

---

## معاينة الويب في Replit (Web Preview)

تم إنشاء artifact في Replit لعرض التطبيق على الويب:
- **المسار:** `artifacts/attendance/` في workspace
- **Preview Path:** `/attendance/`
- **Port:** 25477
- **الحالة:** يعرض UI وهمي (mock data) مشابه للتطبيق الحقيقي

### ⚠️ ما لا يعمل في Web Preview:
- الكاميرا (Camera) — تحتاج جهاز حقيقي
- SQLite database — native only
- OneSignal notifications — native only
- expo-local-authentication — native only

### ما يعمل في Web Preview:
- التصميم الكامل بالعربية (RTL)
- التنقل بين التبويبات (4 tabs)
- شاشة اليوم + السجل + التقويم + التقارير + الإعدادات
- بيانات وهمية للعرض

---

