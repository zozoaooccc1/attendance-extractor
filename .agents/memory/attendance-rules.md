---
name: قواعد مشروع Attendance
description: قواعد إلزامية لكل جلسة عمل على مشروع تتبع الحضور والانصراف
---

# قواعد مشروع Attendance — إلزامية في كل جلسة

**Why:** المستخدم طلب صراحةً أن يكون GitHub هو المرجع الدائم للمشروع وأن AI_CONTEXT.md هو سجل التطور التاريخي.

## القاعدة 1 — GitHub Sync

بعد **أي** تعديل على الملفات، ارفع فوراً إلى GitHub:

```bash
git push "https://$GITHUB_TOKEN@github.com/zozoaooccc1/attendance-extractor.git" HEAD:main
```

إذا رُفض بسبب diverged history، استخدم `--force`.

**How to apply:** في نهاية كل رد يتضمن تعديل ملفات.

## القاعدة 2 — AI_CONTEXT.md (append-only)

- الملف: `/home/runner/workspace/AI_CONTEXT.md`
- **مسموح:** إضافة قسم جديد في النهاية بعنوان `## YYYY-MM-DD — وصف الجلسة`
- **ممنوع مطلقاً:** تعديل أو حذف أي محتوى قديم
- استخدم `edit` tool لإضافة القسم الجديد بعد آخر سطر

**How to apply:** في نهاية كل جلسة قبل الـ git push.

## معلومات المشروع

- **Repo:** `https://github.com/zozoaooccc1/attendance-extractor`
- **Artifact dir:** `artifacts/attendance/`
- **الإصدار الحالي:** `2.9.0` (راجع `app.json` و`constants/changelog.ts`)
- **EAS Account:** `amr9925487962`
- **EAS Project ID:** `e0d07504-ef8f-4a60-9ce3-92694b0d6804`
- **ONESIGNAL_APP_ID:** `4b67803a-e800-4f83-974b-32615789ed23`
- **Secrets:** `GITHUB_TOKEN`, `EXPO_TOKEN`, `SESSION_SECRET`

## أوامر بناء APK

```bash
# Clone نظيف
git clone --depth 1 "https://$GITHUB_TOKEN@github.com/zozoaooccc1/attendance-extractor.git" /tmp/eas-build

# Install
cd /tmp/eas-build && pnpm install --no-frozen-lockfile || true

# Build
cd artifacts/attendance && EAS_SKIP_AUTO_FINGERPRINT=1 EXPO_TOKEN=$EXPO_TOKEN \
  npx eas-cli build --platform android --profile preview --non-interactive --no-wait
```

## قواعد الكود الحرجة

- OTA (expo-updates) محذوف نهائياً — لا تعيده
- `note?: string` فقط — لا null
- toSafe+safeRun لكل write على SQLite
- التحديثات عبر `easUpdateChecker.ts` فقط
- Tab count = 5 في `app/(tabs)/_layout.tsx`
