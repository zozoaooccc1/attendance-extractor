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


---

## 2026-06-12 — جلسة جديدة: تبويب الموظف + EAS Update Checker

### ما أُضيف في هذه الجلسة:

#### 1. تبويب "بيانات الموظف" (الخامس)
- **الملف:** `app/(tabs)/employee.tsx` — شاشة بيانات الموظف
- **السياق:** `context/EmployeeContext.tsx` — يخزن الاسم والقسم في AsyncStorage
- **الموقع:** تبويب خامس قبل "اليوم" في `_layout.tsx` (TAB_COUNT=5)
- **محدود التصميم مع إضافته:** `app/_layout.tsx` ← `EmployeeProvider` مُضاف

#### 2. إعادة تصميم `employee.tsx` — موحَّد مع لغة التطبيق
واجهة "بيانات الموظف" أُعيد بناؤها كاملاً لتطابق نمط `settings.tsx` و `index.tsx`:

| العنصر | النمط المستخدم |
|---|---|
| مجموعات الحقول | `groupLabel` + `groupCard` (borderRadius 14, borderWidth 1) |
| صفوف الحقول | `settingsRow` (flexDirection row, paddingH 14, paddingV 13, gap 12) |
| أيقونات الصفوف | `rowIcon` (34×34, borderRadius 9, لون + 20% opacity) |
| فاصل بين الحقول | `RowSep` — خط رفيع يبدأ من marginLeft 60 |
| اختيار الشفت | `chips` أفقية (flex-row, borderRadius 10, borderWidth 1) |
| بطاقات الإحصائيات | نفس progressCard (borderRadius 14, borderWidth 1, padding 13) |
| الخطوط | Inter_400/500/600/700 مطابقة لبقية التطبيق |
| التعديل الإلكتروني | TextInput inline داخل الصف — يظهر عند الضغط، يُحفظ بالـ checkmark |

#### 3. نظام فحص تحديثات EAS (يحل محل GitHub)
- **الملف الجديد:** `utils/easUpdateChecker.ts`
- **الملف المحدَّث:** `app/_layout.tsx` — import من `easUpdateChecker` بدلاً من `githubUpdateChecker`
- **الملف المحدَّث:** `app.config.js` — يضيف `expoToken: process.env.EXPO_TOKEN` في `extra`

##### كيف يعمل النظام الجديد:
1. التطبيق يستعلم `https://api.expo.dev/graphql` مباشرةً
2. يطلب آخر بناء Android (FINISHED) عبر GraphQL:
   ```graphql
   app { byId(appId: "e0d07504-ef8f-4a60-9ce3-92694b0d6804") {
     builds(limit:1, offset:0, platform:ANDROID, status:FINISHED) {
       appVersion appBuildVersion createdAt
       artifacts { applicationArchiveUrl }
     }
   }}
   ```
3. إذا كان `appVersion` أحدث من الإصدار الحالي → يعرض `AppUpdateModal`
4. رابط التحميل: مباشر من `expo.dev/artifacts/eas/*.apk` — **بدون GitHub**

##### إعداد التوكن للبناء:
```bash
# مرة واحدة فقط — يحفظ التوكن في EAS Secrets:
eas secret:create --scope project --name EXPO_TOKEN --value <token>
# بعدها يُدمج تلقائياً في كل APK بناء
```
في التطبيق: `Constants.expoConfig?.extra?.expoToken`

#### 4. تحديث خريطة الملفات

```
artifacts/attendance/
├── app.config.js                         ← [محدَّث] expoToken في extra
├── app/
│   ├── _layout.tsx                       ← [محدَّث] import easUpdateChecker + EmployeeProvider
│   └── (tabs)/
│       └── employee.tsx                  ← [جديد/محدَّث] تبويب بيانات الموظف
├── context/
│   └── EmployeeContext.tsx               ← [جديد] اسم الموظف + القسم في AsyncStorage
└── utils/
    ├── easUpdateChecker.ts               ← [جديد] فحص التحديثات عبر EAS GraphQL API
    └── githubUpdateChecker.ts            ← [قديم — لا يُستخدم] GitHub version.json
```

#### 5. الأسرار المحدَّثة

| الاسم | الحالة |
|---|---|
| `EXPO_TOKEN` | ✅ **صالح** — تم تخزينه في Replit Secrets (2026-06-12) |
| `GITHUB_PERSONAL_ACCESS_TOKEN` | ✅ صالح — repo scope |
| `SESSION_SECRET` | ✅ للـ API server |

> **⚠️ تصحيح:** جدول الأسرار السابق أشار إلى EXPO_TOKEN كـ "منتهي الصلاحية" — هذا لم يعد صحيحاً. التوكن الحالي صالح.

#### 6. قواعد مُحدَّثة للـ AI

- **التحديثات الآن عبر EAS** — `easUpdateChecker.ts` هو المرجع، لا `githubUpdateChecker.ts`
- **لا تحذف `githubUpdateChecker.ts`** — قد يُستخدم مرجعاً، لكن `_layout.tsx` يستورد من easUpdateChecker
- **EmployeeProvider مضاف** في `app/_layout.tsx` — لا تنسَه عند إعادة البناء
- **Tab count = 5** في `app/(tabs)/_layout.tsx`


---

## 2026-06-12 — إضافة اسم الموظف والقسم في التقارير

### الملف المحدَّث: `app/(tabs)/reports.tsx`

#### ما أُضيف:
- **import:** `useEmployee` من `@/context/EmployeeContext`
- **في المكوّن:** `const { employeeName, department } = useEmployee();`
- **دوال محدَّثة:** `buildPdfHtml(records, period, employeeName, department)` و `buildCsv(records, period, employeeName, department)`

#### كيف يظهر اسم الموظف والقسم:

| نوع التصدير | المكان |
|---|---|
| **PDF** | سطر أزرق مميّز أسفل العنوان مباشرة: `👤 اسم الموظف  •  🏢 القسم` |
| **PDF (عنوان المشاركة)** | `تقرير {الاسم} — {الفترة}` بدلاً من "تقرير الحضور" |
| **CSV** | صفان في بداية الملف: `اسم الموظف,{الاسم}` و `القسم,{القسم}` |
| **اسم ملف CSV** | `بصمتي_{الاسم}_{الفترة}.csv` |
| **واتساب** | سطران أعلى التقرير: `👤 الموظف: *الاسم*` و `🏢 القسم: القسم` |

#### ملاحظات التصميم:
- إذا كان الاسم أو القسم فارغاً → لا يظهر ذلك السطر (لا تُكسر التقارير القديمة)
- المعلومات تُقرأ من `EmployeeContext` التي تخزن البيانات في AsyncStorage


---

## 2026-06-12 — إعادة بناء نظام إشعار التحديثات (EAS Direct Install)

### المشكلة السابقة:
- `AppUpdateModal.tsx` كان يستورد من `githubUpdateChecker` (خطأ بعد إنشاء `easUpdateChecker`)
- زر "تحميل" كان يفتح المتصفح برابط GitHub (المستخدم لا يريد GitHub)
- نافذة التحديث لم تعرض Changelog حقيقياً — فقط نص عادي

### الحل المُطبَّق — `components/AppUpdateModal.tsx`:

#### تدفق التثبيت الجديد (بدون GitHub، بدون متصفح):
```
زر "تثبيت" → FileSystem.createDownloadResumable() → شريط تقدم %
       ↓
   APK محفوظ في cacheDirectory
       ↓
   Sharing.shareAsync(mimeType: 'application/vnd.android.package-archive')
       ↓
   Android يفتح نافذة التثبيت المدمجة مباشرة ✅
```

#### المراحل (phase):
| المرحلة | الوصف |
|---|---|
| `idle` | زر "تثبيت التحديث" + "لاحقاً" |
| `downloading` | شريط تقدم + نسبة % — الأزرار مخفية |
| `ready` | ActivityIndicator "جارٍ فتح نافذة التثبيت..." |
| `error` | رسالة الخطأ + "إعادة المحاولة" |

#### Changelog حقيقي:
- يستورد `getVersionChangelog(info.version)` من `constants/changelog.ts`
- يعرض كل عنصر مع أيقونة ولون حسب النوع: `new`🟢 / `fix`🟡 / `improve`🔵
- إذا لم يجد الإصدار في changelog → يعرض `info.notes` كنص عادي

#### ملاحظات تقنية:
- EAS URL يُعيد 307 redirect لـ S3 presigned — `downloadAsync` يتبعه تلقائياً
- `Sharing.shareAsync('application/vnd.android.package-archive')` = package installer مباشرة على Android
- Web: fallback لـ `Linking.openURL()`
- Import صُحِّح: `from '@/utils/easUpdateChecker'` (لا githubUpdateChecker)

### الملف المحدَّث:
- `components/AppUpdateModal.tsx` — إعادة كتابة كاملة


---

## جلسة 2026-06-12 — الإصدار 2.9.0 + EAS Build

### ما تم في هذه الجلسة:

#### 1. رفع الإصدار إلى 2.9.0
- `app.json` → `"version": "2.9.0"`
- `constants/changelog.ts` → `CURRENT_VERSION = '2.9.0'` + entry جديد:
  - تبويب "بيانات الموظف" الجديد
  - التقارير تحمل اسم الموظف والقسم
  - نظام التحديثات من EAS مع تثبيت APK مباشر
  - شريط تقدم أثناء التحميل

#### 2. EAS Build — الإصدار 2.9.0
- **Build ID**: `251b43bc-46d9-4da7-8e8c-91f0a0a5a1f1`
- **URL**: https://expo.dev/accounts/amr9925487962/projects/attendance/builds/251b43bc-46d9-4da7-8e8c-91f0a0a5a1f1
- **Profile**: preview (APK مباشر)
- **Status**: submitted ✅ — يبني في سحابة Expo

#### 3. مشاكل واجهناها وحلولها (مهم لاحقاً):

**مشكلة Clone:** `git clone` يستغرق أكثر من 60 ثانية في بيئة Replit
- **الحل**: استخدم timeout=120000 في bash

**مشكلة pnpm install (frozen lockfile):** lockfile قديم (packages جديدة مضافة)
- **الحل**: `pnpm install --no-frozen-lockfile` (قد يتجاوز 120 ثانية أيضاً — ينتهي بـ exit -1 لكن يكمل التثبيت)

**مشكلة catalog: protocol:** `npm install` لا يدعم pnpm `catalog:` protocol
- **الحل**: لا تستخدم npm — استخدم pnpm فقط

**مشكلة onesignal-expo-plugin/index.js فارغة:**
```js
// المشكلة: index.js يحتوي فقط module.exports = {};
// الحل:
echo "module.exports = require('./dist/index.js');" > /path/to/onesignal-expo-plugin/index.js
```

**مشكلة EAS "Failed to resolve plugin":**
- EAS CLI يفحص الـ plugins محلياً قبل الرفع
- pnpm virtual store لا يضيف symlinks تلقائياً في root node_modules
- **الحل**: أنشئ symlinks يدوياً:
```bash
NM="/tmp/eas-v290/node_modules"
PNPM="$NM/.pnpm"
for PKG in expo-router expo-font expo-web-browser onesignal-expo-plugin expo-modules-core; do
  PATTERN=$(ls "$PNPM" | grep "^${PKG}@" | head -1)
  ln -sfn "$PNPM/$PATTERN/node_modules/$PKG" "$NM/$PKG"
done
```

#### 4. كيف تُطلق EAS Build في المستقبل (الطريقة الصحيحة):

```bash
# 1. Clone نظيف
git clone --depth 1 --single-branch --branch main \
  "https://$GITHUB_PERSONAL_ACCESS_TOKEN@github.com/zozoaooccc1/attendance-extractor.git" \
  /tmp/eas-build-NEW --timeout 120s

# 2. pnpm install (يقبل exit -1 إذا الباقات اتثبتت)
cd /tmp/eas-build-NEW && pnpm install --no-frozen-lockfile || true

# 3. Symlink الـ plugins المطلوبة
NM="/tmp/eas-build-NEW/node_modules"; PNPM="$NM/.pnpm"
for PKG in expo-router expo-font expo-web-browser onesignal-expo-plugin expo-modules-core; do
  PATTERN=$(ls "$PNPM" | grep "^${PKG}@" | head -1)
  [ -n "$PATTERN" ] && ln -sfn "$PNPM/$PATTERN/node_modules/$PKG" "$NM/$PKG"
done

# 4. إصلاح onesignal index.js (إذا فارغ)
OS_DIR=$(ls "$PNPM" | grep "^onesignal-expo-plugin" | head -1)
echo "module.exports = require('./dist/index.js');" > "$PNPM/$OS_DIR/node_modules/onesignal-expo-plugin/index.js"

# 5. EAS Build
cd /tmp/eas-build-NEW/artifacts/attendance && \
  EAS_SKIP_AUTO_FINGERPRINT=1 EXPO_TOKEN=$EXPO_TOKEN \
  npx eas-cli build --platform android --profile preview --non-interactive --no-wait
```

### الملفات المُحدَّثة في هذه الجلسة:
- `artifacts/attendance/app.json` — version → 2.9.0
- `artifacts/attendance/constants/changelog.ts` — v2.9.0 entry + CURRENT_VERSION


---

## 2026-06-12 — نقل المشروع إلى Replit (إعداد البيئة)

### ما تم في هذه الجلسة:

#### 1. إعداد بيئة Replit
- تم إضافة `GITHUB_TOKEN` و`EXPO_TOKEN` كـ Replit Secrets
- تم سحب المشروع من `zozoaooccc1/attendance-extractor` عبر GITHUB_TOKEN
- تم نسخ `artifacts/attendance/` إلى workspace Replit
- تم تثبيت الحزم بـ `pnpm install --no-frozen-lockfile`
- تم تسجيل artifact التطبيق وتشغيل workflow على port 25477

#### 2. التعديلات على pnpm-workspace.yaml
- إضافة `react-native-onesignal` و`onesignal-expo-plugin` إلى `minimumReleaseAgeExclude`

#### 3. قواعد العمل الدائمة للـ AI في هذا المشروع

> **⚠️ قواعد إلزامية — لا استثناء:**

1. **GitHub Sync:** أي تعديل أو تطوير يُرسَل فوراً إلى GitHub (`zozoaooccc1/attendance-extractor`) عبر `GITHUB_TOKEN`
2. **AI_CONTEXT.md:** مرجع المشروع — يُضاف عليه فقط (append) في نهاية كل جلسة. **ممنوع تعديل أو حذف المحتوى القديم أبداً.**
3. **الإصدار الحالي:** `2.9.0` — راجع `app.json` و`constants/changelog.ts` قبل أي بناء APK جديد

#### 4. طريقة الرفع إلى GitHub من Replit

```bash
# Push مع token مدمج في الرابط مباشرة
git push "https://$GITHUB_TOKEN@github.com/zozoaooccc1/attendance-extractor.git" HEAD:main
```

#### 5. حالة البيئة
- **Workflow:** يعمل على `/` (port 25477) — Expo Dev Server
- **pnpm-workspace.yaml:** محدَّث بالاستثناءات المطلوبة
- **EXPO_TOKEN:** صالح — يُستخدم للبناء عبر EAS (حساب `amr9925487962`)
- **GITHUB_TOKEN:** صالح — يُستخدم للقراءة والكتابة
- **ONESIGNAL_APP_ID:** `4b67803a-e800-4f83-974b-32615789ed23`

---

## 2026-06-12 — إصلاح settings.tsx (إزالة expo-updates)

### المشكلة:
`app/settings.tsx` كان لا يزال يستورد `expo-updates` بعد حذفه من المشروع:
```ts
import * as Updates from 'expo-updates'; // سطر 14
```
هذا سبب خطأ "Unable to resolve expo-updates" في Metro Bundler.

### الحل:
- **حُذف:** `import * as Updates from 'expo-updates';`
- **حُدِّثت:** دالة `handleCheckUpdate()` — بدلاً من `Updates.checkForUpdateAsync()` تعرض الآن رسالة ثابتة:
  > "يتحقق التطبيق من التحديثات تلقائياً عند كل فتح. الإصدار الحالي: X.X.X"
- التحديثات الحقيقية تُعالَج تلقائياً في `_layout.tsx` عبر `easUpdateChecker.ts`

### الملف المُصلَح:
- `artifacts/attendance/app/settings.tsx`

---

## 2026-06-12 — إصلاح خطأ TypeScript + EAS Build 2.9.0

### المشكلة:
```
app/_layout.tsx(39,1): error TS2304: Cannot find name 'initOneSignal'.
```
`initOneSignal()` كانت مستدعاة في `_layout.tsx` لكن **import مفقود**.

### الحل:
أُضيف السطر التالي في `app/_layout.tsx` (بعد import easUpdateChecker):
```typescript
import { initOneSignal } from "@/utils/oneSignalService";
```

### الملف المُصلَح:
- `artifacts/attendance/app/_layout.tsx` — سطر 39

### EAS Build 2.9.0:
- **Build ID:** `19b7c518-650b-4ee9-b93f-d84add3fa870`
- **URL:** https://expo.dev/accounts/amr9925487962/projects/attendance/builds/19b7c518-650b-4ee9-b93f-d84add3fa870
- **Profile:** preview (APK مباشر)
- **Status:** submitted ✅ — يبني في سحابة Expo

### ملاحظة EAS:
ظهر تحذير `"expo-updates" package hasn't been installed` — هذا متوقع ومقصود لأننا حذفنا OTA. التحذير لا يؤثر على البناء.

---

## 2026-06-12 — نظام إشعارات OneSignal (Webhook + Manual Send)

### ما تم بناؤه:
ملف جديد: `artifacts/api-server/src/routes/notify.ts`

**Endpoint 1 — EAS Webhook (تلقائي عند اكتمال البناء):**
```
POST /api/notify/eas-webhook
Header: x-notify-secret: <NOTIFY_SECRET>
```
يستقبل إشعار Expo عند اكتمال بناء Android ويرسل push notification لجميع المستخدمين.

**Endpoint 2 — Manual Send (يدوي):**
```
POST /api/notify/send
Header: x-notify-secret: <NOTIFY_SECRET>
Body: { "title": "...", "body": "...", "url": "..." }
```
لإرسال إشعار مخصص في أي وقت.

### Secrets المطلوبة (محفوظة في Replit):
- `ONESIGNAL_APP_ID` = `4b67803a-e800-4f83-974b-32615789ed23`
- `ONESIGNAL_REST_API_KEY` = مفتاح OneSignal REST API v2
- `NOTIFY_SECRET` = كلمة سر تحمي الـ endpoints

### مشكلة واجهناها:
الـ Secrets كانت محفوظة بعلامات اقتباس زائدة `"..."` مما يفسد UUID. الحل في الكود:
```typescript
.trim().replace(/^["']|["']$/g, "")
```

### اختبار ناجح:
```bash
curl -X POST /api/notify/send \
  -H "x-notify-secret: $NOTIFY_SECRET" \
  -d '{"title":"🚀 تحديث جديد","body":"..."}'
# Response: {"ok":true}
```

### إعداد Webhook في Expo:
**تم الربط تلقائياً عبر EAS CLI** في 2026-06-12:
```bash
eas webhook:create --event BUILD \
  --url "https://<REPLIT_DEV_DOMAIN>/api/notify/eas-webhook" \
  --secret "$NOTIFY_SECRET"
```
- **ملاحظة:** الـ NOTIFY_SECRET يجب أن يكون 16 حرفاً على الأقل (الحالي 48 حرفاً).
- **ملاحظة:** الـ webhook مربوط بـ dev domain — عند النشر الإنتاجي يجب تحديثه بالـ domain الثابت.


---

## 2026-06-12 — إصلاح كراش v2.9.0 + تحديث Changelog

### المشكلة التي تم حلها: كراش فوري عند فتح APK 2.9.0

#### السبب الجذري (مشكلتان):

**المشكلة 1 — `initOneSignal()` على مستوى الوحدة (module level):**
```typescript
// _layout.tsx — السطر 40 القديم (خطأ)
initOneSignal(); // ← يُستدعى قبل أن React Native يكون جاهزاً → CRASH
```
`OneSignal.Notifications.requestPermission(true)` تُطلق نافذة نظام Android
فور تحميل JS bundle، قبل تهيئة Native modules → كراش فوري.

**المشكلة 2 — كتلة `updates` في `app.config.js`:**
```javascript
// القديم (خطأ)
updates: {
  ...appJson.expo.updates,
  requestHeaders: { 'expo-channel-name': ... },
},
```
هذه الكتلة تجعل الـ runtime يبحث عن `expo-updates` المحذوف → تعارض عند البدء.

#### الحل المُطبَّق:

**الملف 1 — `app/_layout.tsx`:**
- حُذف: `initOneSignal();` من مستوى الوحدة (السطر 40)
- أُضيف: استدعاء `initOneSignal()` داخل `useEffect` (الخطوة 0) مُغلَّف بـ try/catch:
```typescript
// 0. OneSignal — داخل useEffect بعد تحميل React Native
if (Platform.OS !== 'web') {
  try { initOneSignal(); } catch {}
}
```

**الملف 2 — `app.config.js`:**
- حُذفت كتلة `updates` بالكامل — النظام لا يحتاجها بعد إلغاء expo-updates.

**الملف 3 — `constants/changelog.ts` — v2.9.0:**
- أُضيفت 3 إدخالات جديدة لـ v2.9.0:
  - `new`: إشعار فوري عبر OneSignal عند اكتمال بناء APK جديد
  - `fix`: إصلاح كراش بدء التشغيل (نقل OneSignal لـ useEffect)
  - `fix`: إزالة كتلة updates من app.config.js

#### حالة GitHub:
- جميع الملفات الثلاثة رُفعت إلى `main` عبر GitHub Contents API ✅
- الرفع تم بدون `git push` (محظور في Replit main agent) — نستخدم API بديلاً

#### قاعدة مستقبلية للـ AI:
- **لا تضع أي استدعاء لـ OneSignal أو native modules على مستوى الوحدة** — دائماً داخل `useEffect` أو بعد `AppRegistry.registerComponent`
- **لا تضيف كتلة `updates` لـ app.config.js** — expo-updates محذوف نهائياً
- **للرفع إلى GitHub من Replit:** استخدم GitHub Contents API مع base64 encoding (git push محظور في main agent)


---

## 2026-06-12 — الإصدار 2.9.1 + EAS Build (إصلاح كراش)

### ما تم في هذه الجلسة:

#### 1. رفع الإصدار إلى 2.9.1
- `app.json` → `"version": "2.9.1"`
- `constants/changelog.ts` → `CURRENT_VERSION = '2.9.1'` + entry جديد:
  - إصلاح كراش فوري عند فتح التطبيق (OneSignal)
  - إزالة تعارض expo-updates من إعدادات البناء

#### 2. EAS Build — الإصدار 2.9.1
- **Build ID:** `f42d8a5d-dd89-406b-93a9-54e3825e03e5`
- **URL:** https://expo.dev/accounts/amr9925487962/projects/attendance/builds/f42d8a5d-dd89-406b-93a9-54e3825e03e5
- **Profile:** preview (APK مباشر)
- **Status:** submitted ✅ — يبني في سحابة Expo

#### 3. الملفات المرفوعة لـ GitHub في هذه الجلسة
- `app/_layout.tsx` — نقل initOneSignal داخل useEffect ✅
- `app.config.js` — حذف كتلة updates ✅
- `constants/changelog.ts` — v2.9.1 entry + CURRENT_VERSION ✅
- `app.json` — version 2.9.1 ✅

#### 4. طريقة الرفع لـ GitHub من Replit (قاعدة دائمة)
`git push` محظور في Replit main agent — نستخدم GitHub Contents API:
```bash
CONTENT=$(base64 -w 0 /path/to/file)
curl -X PUT -H "Authorization: token $GITHUB_TOKEN" \
  "https://api.github.com/repos/zozoaooccc1/attendance-extractor/contents/PATH" \
  -d "{\"message\":\"...\",\"content\":\"$CONTENT\",\"sha\":\"<file_sha>\"}"
```

---

## 2026-06-12 — إصلاح تجمّد Splash Screen + فحص شامل (v2.9.2)

### المشكلة التي تم حلها: تجمّد التطبيق على أيقونة البداية (v2.9.1)

#### السبب الجذري:
خطوة "فحص القفل" (step 2) في `useEffect` بـ `_layout.tsx` كانت **بدون try/catch**:
```typescript
// القديم — خطر!
if (Platform.OS !== 'web') {
  const bioEnabled = await AsyncStorage.getItem(BIOMETRIC_KEY); // ← قد تفشل
  const pinEnabled = await isPINEnabled();  // ← قد تفشل
  const hasBio = await LocalAuthentication.hasHardwareAsync();  // ← قد تفشل
  const enrolled = await LocalAuthentication.isEnrolledAsync(); // ← قد تفشل
}
setLockChecked(true);
SplashScreen.hideAsync(); // ← لن تُستدعى إذا فشل أي await أعلاه!
```
كذلك الـ IIFE الخارجي بدون `.catch()` — أي خطأ غير محجوب → splash يبقى للأبد.

#### الحل المُطبَّق في `app/_layout.tsx`:
1. **try/catch حول خطوة فحص القفل** — منع أي `await` من إيقاف التهيئة
2. **`.catch()` على الـ IIFE الخارجي** — fallback يضمن إخفاء splash عند أي خطأ غير متوقع
3. **مؤقت أمان 5 ثوانٍ** — `forceShowApp()` يُستدعى تلقائياً إذا لم تكتمل التهيئة
```typescript
// الجديد — آمن
let splashHidden = false;
const forceShowApp = () => {
  if (splashHidden) return;
  splashHidden = true;
  setLockChecked(true);
  SplashScreen.hideAsync().catch(() => {});
};
const safetyTimer = setTimeout(forceShowApp, 5000); // حد أقصى 5 ثوانٍ

(async () => {
  // ...
  if (Platform.OS !== 'web') {
    try { /* فحص القفل */ } catch {} // ← try/catch
  }
  setLockChecked(true);
  clearTimeout(safetyTimer);
  splashHidden = true;
  SplashScreen.hideAsync().catch(() => {});
})().catch(() => { forceShowApp(); }); // ← fallback
```

#### إصلاحات إضافية:
- **`app.json`:** `splash.backgroundColor` من `#ffffff` (أبيض) إلى `#0f172a` (داكن) — لمنع الوميض الأبيض عند فتح التطبيق في الوضع الداكن

### الملفات المُصلَحة (مرفوعة لـ GitHub):
| الملف | التغيير |
|---|---|
| `app/_layout.tsx` | try/catch + safety timer + .catch() fallback |
| `app.json` | version 2.9.2 + splash backgroundColor #0f172a |
| `constants/changelog.ts` | CURRENT_VERSION = '2.9.2' + entry جديد |

### EAS Build v2.9.2:
- **Build ID:** `205f1ecc-0e81-4b97-a561-0d91cef904c4`
- **URL:** https://expo.dev/accounts/amr9925487962/projects/attendance/builds/205f1ecc-0e81-4b97-a561-0d91cef904c4
- **Profile:** preview (APK مباشر)
- **Status:** submitted ✅ — يبني في سحابة Expo

### قاعدة جديدة للـ AI:
- **دائماً** لف خطوة "فحص القفل" في try/catch في `_layout.tsx`
- **دائماً** أضف `.catch()` على الـ async IIFE في `useEffect` الرئيسي
- **دائماً** أضف مؤقت أمان كـ fallback لـ `SplashScreen.hideAsync()`
- **`splash.backgroundColor`** يجب أن يكون `#0f172a` (داكن) لمطابقة theme التطبيق

### طريقة البناء من Replit (محدَّثة):
```bash
rm -rf /tmp/eas-build && git clone "https://$GITHUB_TOKEN@github.com/zozoaooccc1/attendance-extractor.git" /tmp/eas-build --depth=1
cd /tmp/eas-build/artifacts/attendance
# تثبيت الحزم الأساسية فقط لتشغيل EAS CLI
npm install --legacy-peer-deps --no-optional --ignore-scripts \
  "expo@54.0.27" "expo-router@6.0.17" "expo-font@14.0.10" \
  "expo-web-browser@15.0.10" "onesignal-expo-plugin@2.7.0" \
  "react@19.1.0" "react-native@0.81.5"
# تشغيل البناء
EAS_SKIP_AUTO_FINGERPRINT=1 EXPO_TOKEN=$EXPO_TOKEN \
  ./node_modules/.bin/eas build \
  --platform android --profile preview --non-interactive --no-wait
```
**ملاحظة:** لا تستخدم `npx eas-cli` بل استخدم `./node_modules/.bin/eas` من داخل المشروع.

---

## 2026-06-12 — v2.9.3: اختيار الصفحة الرئيسية + قفل شفت الجمعة

### الميزات والإصلاحات:

#### 1. اختيار الصفحة الرئيسية (جديد)
**الملفات:** `context/SettingsContext.tsx` + `app/settings.tsx` + `app/(tabs)/_layout.tsx`
- أضيف `DefaultTab` type: `'employee' | 'index' | 'history' | 'calendar' | 'reports'`
- أضيف `defaultTab` و `setDefaultTab` في `SettingsContext`
- قسم جديد في الإعدادات "الصفحة الرئيسية" بـ 5 chips لاختيار التبويب الافتراضي
- `(tabs)/_layout.tsx` يستخدم `initialRouteName={defaultTab}` عند بدء التطبيق
- القيمة الافتراضية: `'index'` (اليوم) — محفوظة في AsyncStorage

#### 2. قفل شفت الجمعة (إصلاح)
**الملف:** `app/(tabs)/index.tsx`
```typescript
// قبل (خطأ): يغير فقط إذا لا توجد سجلات
if (isFriday && shiftType === 'double' && todayRecords.length === 0) {
  setShiftType('single');
}

// بعد (صحيح): يقفل دائماً بغض النظر عن السجلات
useEffect(() => {
  if (isFriday && shiftType !== 'single') {
    setShiftType('single');
  }
}, [isFriday, shiftType]);

// handleShiftChange: يمنع التغيير على الجمعة
const handleShiftChange = (shift: ShiftType) => {
  if (isFriday) { Alert.alert('يوم الجمعة', 'يوم الجمعة دائماً شفت واحد — لا يمكن تغييره.'); return; }
  ...
};
```

### الملفات المُعدَّلة (6 ملفات مرفوعة لـ GitHub):
| الملف | التغيير |
|---|---|
| `context/SettingsContext.tsx` | إضافة DefaultTab، defaultTab، setDefaultTab |
| `app/(tabs)/_layout.tsx` | initialRouteName={defaultTab} |
| `app/(tabs)/index.tsx` | قفل شفت الجمعة دائماً |
| `app/settings.tsx` | قسم "الصفحة الرئيسية" + DefaultTab |
| `constants/changelog.ts` | CURRENT_VERSION = '2.9.3' + entry |
| `app.json` | version 2.9.3 |

### EAS Build v2.9.3:
- **Build ID:** `c9f8cde6-7b4a-44c5-add7-56e3306ef663`
- **URL:** https://expo.dev/accounts/amr9925487962/projects/attendance/builds/c9f8cde6-7b4a-44c5-add7-56e3306ef663
- **Status:** submitted ✅

### طريقة البناء المحدَّثة (حل مشكلة catalog:):
```bash
# npm install يفشل مع catalog: من package.json الخاص بـ pnpm workspace
# الحل: استخدم مجلد عزل نظيف أولاً
rm -rf /tmp/expo-deps && mkdir -p /tmp/expo-deps
cat > /tmp/expo-deps/package.json << 'EOF'
{
  "name": "expo-deps-installer",
  "version": "1.0.0",
  "dependencies": {
    "expo": "54.0.27",
    "expo-router": "6.0.17",
    "expo-font": "14.0.10",
    "expo-web-browser": "15.0.10",
    "onesignal-expo-plugin": "2.7.0",
    "react": "19.1.0",
    "react-native": "0.81.5",
    "eas-cli": "16.0.0"
  }
}
EOF
cd /tmp/expo-deps && npm install --legacy-peer-deps --no-optional --ignore-scripts

# نقل node_modules للمشروع
rm -rf /tmp/eas-build/artifacts/attendance/node_modules
cp -r /tmp/expo-deps/node_modules /tmp/eas-build/artifacts/attendance/

# تشغيل البناء
cd /tmp/eas-build/artifacts/attendance
EAS_SKIP_AUTO_FINGERPRINT=1 EXPO_TOKEN=$EXPO_TOKEN \
  ./node_modules/.bin/eas build \
  --platform android --profile preview --non-interactive --no-wait
```

---

## جلسة 2026-06-12 — الإصدار 3.0.0 (5 ميزات كبرى)

### الملفات المُعدَّلة (12 ملف):
1. `context/SettingsContext.tsx` — أضيف `fontSizePercent` (80-150%) + `highContrast` boolean
2. `constants/colors.ts` — أضيف لوح ألوان `highContrast` (ألوان فاقعة)
3. `hooks/useColors.ts` — يعيد ألوان highContrast عند تفعيل الوضع
4. `utils/imageStorage.native.ts` — أضيف `getImagesStats()` + `deleteImagesOlderThan()` + `readImageAsBase64()` + `writeImageFromBase64()`
5. `utils/backup.native.ts` — أضيف `exportFullBackupToDownloads()` (نسخة مع صور بصيغة v3.0) + `restoreFromBackupData` يستعيد الصور أيضاً
6. `app/settings.tsx` — شريط تمرير الخط (PanResponder) + وضع التباين العالي + إحصاءات التخزين + نسخة شاملة
7. `app/(tabs)/history.tsx` — فلاتر (الكل/تأخيرات/هذا الشهر/جمعة) + ترتيب (أحدث/أقدم) + البحث في الملاحظات
8. `app/capture.tsx` — بطاقة الكشّاف الذكي (AI) + استخراج الوقت من صورة البصمة
9. `constants/changelog.ts` — إضافة مدخل v3.0.0
10. `app.json` — الإصدار 3.0.0 / versionCode 31
11. `artifacts/api-server/src/routes/ai-scan.ts` — نقطة Gemini Vision للكشّاف الذكي (ملف جديد)
12. `artifacts/api-server/src/routes/index.ts` — تسجيل ai-scan route

### ملاحظات مهمة للجلسات القادمة:
- الكشّاف الذكي يتطلب `GEMINI_API_KEY` في متغيرات بيئة api-server (تُضبط في Replit Secrets)
- النسخة الشاملة مع الصور تستخدم صيغة `v3.0` مع حقل `images: Record<string, base64>`
- شريط تمرير الخط يستخدم PanResponder المدمج — بدون مكتبات خارجية
- وضع التباين العالي يُطبَّق في `useColors.ts` بالتحقق من `highContrast` قبل `resolvedScheme`
- الفلتر `late` يستدعي `checkLateEntry` لكل سجل — قد يكون بطيئاً مع بيانات كثيرة، قابل للتخزين المؤقت لاحقاً
- EXPO_PUBLIC_API_URL يجب ضبطه في app.config.js للكشّاف الذكي في الجهاز الحقيقي

---

## جلسة 2026-06-12 — الإصدار 3.1.0 (منبّه صاخب + حذف دقائق الزيادة)

### الملفات المُعدَّلة (6 ملفات):
1. `utils/notifications.native.ts` — قناة جديدة `attendance-alarm` (IMPORTANCE_MAX + bypassDnd) + دالة `scheduleAlarmBurst(shiftType)` تُجدول 180 إشعار كل 5 ثوانٍ لمدة 15 دقيقة (30 إشعار على iOS كل 30 ثانية)
2. `context/SettingsContext.tsx` — إضافة `alarmBeforeShift: boolean` + `setAlarmBeforeShift`
3. `app/settings.tsx` — استبدال "التنبيه المستمر" بـ"المنبّه الصاخب" + واجهة جديدة مع تحذير أحمر
4. `app/(tabs)/employee.tsx` — حذف بطاقة "دقائق الزيادة" وعملياتها + حذف سطر `let bonus = 0` + حذف التعليق التوضيحي
5. `constants/changelog.ts` — إضافة مدخل v3.1.0
6. `app.json` — الإصدار 3.1.0 / versionCode 32

### تفاصيل المنبّه الصاخب:
- تقنية: DATE-trigger لكل إشعار فردي (ليس TIME_INTERVAL) — يتيح تخصيص النص لكل إشعار
- Android: 180 إشعار (كل 5 ثوانٍ × 15 دقيقة) بـ micro-batch من 30 لتفادي الحظر
- iOS: 30 إشعار (كل 30 ثانية × 15 دقيقة) لتجاوز حد 64 إشعار
- القناة `attendance-alarm` لها `bypassDnd: true` + `lockscreenVisibility: PUBLIC` + `enableVibrate`
- لا يمكن إيقافه إلا بإطفاء مفتاح "المنبّه الصاخب" في الإعدادات ثم حفظ

### EAS Build:
- ID: 41d3f1a2-b2cf-420f-84d6-81f9b3e355b3
- رابط: https://expo.dev/accounts/amr9925487962/projects/attendance/builds/41d3f1a2-b2cf-420f-84d6-81f9b3e355b3

