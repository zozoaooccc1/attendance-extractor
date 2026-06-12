export interface ChangelogItem {
  version: string;
  title: string;
  date: string;
  items: { type: 'new' | 'fix' | 'improve'; text: string }[];
}

const changelog: ChangelogItem[] = [
  {
    version: '3.0.0',
    title: 'ميزات كبرى: AI + تخزين + بحث',
    date: '2026-06-12',
    items: [
      { type: 'new',     text: 'شريط تمرير لحجم الخط (80%→150%) — تحكم دقيق في حجم النصوص' },
      { type: 'new',     text: 'وضع عالي التباين — ألوان فاقعة للأماكن المضيئة وضوء الشمس' },
      { type: 'new',     text: 'إحصاءات التخزين: عداد الصور وحجمها مع شريط بصري + تنظيف تلقائي' },
      { type: 'new',     text: 'نسخة احتياطية شاملة مع الصور — حماية كاملة لجميع بياناتك' },
      { type: 'new',     text: 'الكشّاف الذكي (AI) — يستخرج الوقت تلقائياً من صورة جهاز البصمة' },
      { type: 'new',     text: 'فلاتر متقدمة في السجل: التأخيرات فقط / هذا الشهر / الجمعة + ترتيب الأحدث/الأقدم' },
      { type: 'improve', text: 'البحث في السجل يشمل الآن ملاحظات السجلات' },
    ],
  },
  {
    version: '2.9.3',
    title: 'الصفحة الرئيسية + إصلاح شفت الجمعة',
    date: '2026-06-12',
    items: [
      { type: 'new',     text: 'اختيار الصفحة الرئيسية: حدد أي تبويب يفتح عند تشغيل التطبيق (الموظف، اليوم، السجل، التقويم، التقارير)' },
      { type: 'fix',     text: 'يوم الجمعة أصبح دائماً شفت واحد — مقفل ولا يمكن تغييره' },
      { type: 'improve', text: 'تحسين قسم الإعدادات: ترتيب أوضح وأقسام أكثر وضوحاً' },
    ],
  },
  {
    version: '2.9.2',
    title: 'إصلاح تجمّد شاشة البداية',
    date: '2026-06-12',
    items: [
      { type: 'fix', text: 'إصلاح تجمّد التطبيق على أيقونة البداية — كان فشل أي عملية تهيئة يمنع إخفاء الشاشة' },
      { type: 'fix', text: 'إضافة مؤقت أمان 5 ثوانٍ: التطبيق يفتح دائماً حتى لو فشلت إحدى خطوات التهيئة' },
      { type: 'fix', text: 'حماية كاملة لخطوة فحص القفل بـ try/catch لمنع التجمّد عند خطأ AsyncStorage أو LocalAuthentication' },
    ],
  },
  {
    version: '2.9.1',
    title: 'إصلاح القفل + تحسينات',
    date: '2026-06-12',
    items: [
      { type: 'fix',     text: 'إصلاح خطأ PIN — القفل يعمل بشكل صحيح الآن' },
      { type: 'fix',     text: 'إصلاح خطأ تطبيق APK جديد — IntentLauncher بدلاً من Sharing' },
      { type: 'improve', text: 'تحسين أداء شاشة الإعدادات' },
    ],
  },
  {
    version: '2.9.0',
    title: 'ملاحظة التأخير + تحسينات',
    date: '2026-06-11',
    items: [
      { type: 'new',     text: 'إضافة ملاحظة نصية عند التأخير — تُعرض في السجل مع شارة مرئية' },
      { type: 'improve', text: 'تحسين شاشة تفاصيل اليوم' },
    ],
  },
  {
    version: '2.5.0',
    title: 'استقرار جذري في الحفظ',
    date: '2026-06-11',
    items: [
      { type: 'fix',     text: 'إصلاح نهائي وشامل لخطأ الحفظ "Cannot convert object" — لن يعود أبداً' },
      { type: 'new',     text: 'طبقة حماية عالمية تمنع أي قيمة غير آمنة من الوصول لقاعدة البيانات' },
      { type: 'improve', text: 'كل عملية حفظ تمر عبر مصفاة إجبارية بغض النظر عن مصدرها' },
    ],
  },
  {
    version: '2.3.0',
    title: 'نسخ احتياطي ذكي + ميزات جديدة',
    date: '2026-06-09',
    items: [
      { type: 'new',     text: 'نسخ احتياطي تلقائي يُحفظ في التنزيلات' },
      { type: 'new',     text: 'استيراد فوري للنسخة الاحتياطية عند إعادة التثبيت' },
      { type: 'new',     text: 'تصدير السجلات بصيغة CSV / Excel' },
    ],
  },
  {
    version: '2.2.0',
    title: 'تحديث مستقر',
    date: '2026-06-08',
    items: [
      { type: 'new',     text: 'عداد مؤقت قبل موعد الدخول في جدول الدوام' },
      { type: 'improve', text: 'تحسين نظام مؤقت الخروج' },
      { type: 'fix',     text: 'إصلاح عرض مواعيد الدوام' },
    ],
  },
];

export function getVersionChangelog(version: string): ChangelogItem | null {
  return changelog.find(c => c.version === version) ?? null;
}

export function getLatestChangelog(): ChangelogItem | null {
  return changelog[0] ?? null;
}

export const CURRENT_VERSION = '3.0.0';
