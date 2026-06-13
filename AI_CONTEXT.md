# AI_CONTEXT.md — تطبيق باس (حضور)

## نظرة عامة
تطبيق Expo لتتبع الحضور والانصراف. يعمل على Android.  
GitHub: https://github.com/zozoaooccc1/attendance-extractor  
EAS Project ID: e0d07504-ef8f-4a60-9ce3-92694b0d6804  
EAS Account: amr9925487962

## الإصدار الحالي
- **version**: 3.1.6  
- **versionCode**: 38  
- **آخر تحديث**: 2026-06-13

## البنية
- `artifacts/attendance/` — تطبيق Expo (React Native)
- `artifacts/api-server/` — Express 5 API Server (port 5000 dev, 8080 prod)
- `artifacts/attendance/eas.json` — إعدادات EAS Build
- `artifacts/attendance/app.json` — إعدادات Expo
- `artifacts/attendance/utils/crashGuard.ts` — نظام كشف الكراش
- `artifacts/attendance/constants/changelog.ts` — سجل التغييرات

## نقاط API المتاحة
- `GET  /api/healthz` — فحص صحة الخادم
- `POST /api/ai-scan` — الكشّاف الذكي (Gemini) — يحتاج `GEMINI_API_KEY`
- `POST /api/notify/eas-webhook` — webhook من EAS عند اكتمال البناء
- `POST /api/notify/send` — إرسال إشعار يدوي

## متغيرات البيئة المطلوبة (API Server)
| المتغير | الوصف |
|---------|-------|
| `GEMINI_API_KEY` | مفتاح Google Gemini API لميزة AI Scan |
| `ONESIGNAL_APP_ID` | OneSignal App ID للإشعارات |
| `ONESIGNAL_REST_API_KEY` | OneSignal REST API Key |
| `NOTIFY_SECRET` | مفتاح سري لـ webhook endpoints |
| `DATABASE_URL` | رابط PostgreSQL |

## متغيرات البيئة (EAS Build)
- `EXPO_PUBLIC_API_URL` = `https://47eaabd4-5226-4cf2-9645-0069fe462693-00-1830rv7d5wjt2.sisko.replit.dev`
- **مضمّنة في جميع profiles** (development, preview, production) في eas.json

## الإصلاحات المنجزة (v3.1.3)

### Bug 1 — حلقة كراش وهمية (crashGuard.ts) ✅
**المشكلة**: `onAppStable()` تكتب `Date.now()` جديد → لا يتطابق مع `KEY_STARTED` → كل تشغيل يُعد كراشاً.
**الحل**: `onAppStable()` تقرأ قيمة `KEY_STARTED` وتكتب **نفس القيمة** إلى `KEY_COMPLETED`.

### Bug 2 — AI Scan يرجع 403 ✅
**المشكلة**: `EXPO_PUBLIC_API_URL` غير مُعيَّن في APK → طلبات تذهب لـ replit.com → 403.
**الحل**: أُضيف `EXPO_PUBLIC_API_URL` في جميع profiles في `eas.json`.

## الإصلاحات المنجزة (v3.1.6) — جلسة 2026-06-13

### Bug 3 — كراش صفحة الموظف ✅
**المشكلة**: `employee.tsx` يستخدم `t` دون استيراد `useLanguage` → ReferenceError عند فتح الصفحة.
**الحل**: أُضيف `import { useLanguage }` و `const { t } = useLanguage()` داخل `EmployeeScreen`.
**الملف**: `artifacts/attendance/app/(tabs)/employee.tsx`

### Bug 4 — حلقة التنزيل المتكررة في نافذة التحديث ✅
**المشكلة**: عند فشل `IntentLauncher.startActivityAsync` → catch يُعيّن phase='error' → المستخدم يضغط "إعادة المحاولة" → يُعيد التنزيل من الصفر رغم اكتمال التنزيل.
**الحل**:
1. فصل خطأ التنزيل عن خطأ التثبيت (`launchInstaller` منفصل).
2. حفظ مسار الملف المُنزَّل في `localApkUri` state → عند الخطأ يُعيد فتح التثبيت بدون إعادة تنزيل.
3. عند فشل `IntentLauncher` → يجرب `Sharing.shareAsync` كبديل تلقائي.
4. زر "إعادة المحاولة" يُميّز بين: فتح التثبيت مجدداً أو إعادة التنزيل الكامل.
**الملف**: `artifacts/attendance/components/AppUpdateModal.tsx`

## أوامر مفيدة
```bash
# بناء APK (preview) — من داخل مجلد attendance مع git مُهيَّأ
EXPO_TOKEN=$(printenv EXPO_TOKEN) \
EAS_DANGEROUS_DISABLE_VCS_OVERRIDE=1 \
npx eas-cli build --platform android --profile preview --non-interactive --no-wait
```

## Replit Dev Domain
`47eaabd4-5226-4cf2-9645-0069fe462693-00-1830rv7d5wjt2.sisko.replit.dev`

## Version Bumps
- v3.1.3: versionCode 35
- v3.1.4: versionCode 36
- v3.1.5: versionCode 37
- v3.1.6: versionCode 38 — إصلاح كراش الموظف + حلقة التحديث
