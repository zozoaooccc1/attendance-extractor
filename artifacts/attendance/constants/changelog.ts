export interface ChangelogItem {
  version: string;
  title: string;
  date: string;
  items: { type: 'new' | 'fix' | 'improve'; text: string }[];
}

const changelog: ChangelogItem[] = [
  {
    version: '2.9.0',
    title: 'بيانات الموظف + تحديثات مباشرة + إشعارات APK',
    date: '2026-06-12',
    items: [
      { type: 'new',     text: 'تبويب جديد "بيانات الموظف": احفظ اسمك وقسمك ونوع دوامك' },
      { type: 'new',     text: 'التقارير تحمل اسم الموظف والقسم في PDF وواتساب وCSV' },
      { type: 'improve', text: 'نظام التحديثات يتحقق من EAS مباشرة — تثبيت APK بدون متصفح أو GitHub' },
      { type: 'improve', text: 'شريط تقدم أثناء تحميل التحديث مع عرض تفاصيل الميزات الجديدة' },
      { type: 'new',     text: 'إشعار فوري عبر OneSignal عند اكتمال بناء APK جديد — حتى لو التطبيق مغلق' },
      { type: 'fix',     text: 'إصلاح كراش عند بدء التشغيل: نقل تهيئة OneSignal داخل useEffect' },
      { type: 'fix',     text: 'إزالة كتلة updates من app.config.js التي كانت تسبب تعارضاً مع expo-updates المحذوف' },
    ],
  },
  {
    version: '2.8.0',
    title: 'إشعارات فورية عند الإصدار الجديد',
    date: '2026-06-11',
    items: [
      { type: 'new',     text: 'نظام OneSignal: إشعار فوري لكل المستخدمين عند رفع إصدار جديد حتى لو التطبيق مغلق' },
      { type: 'improve', text: 'طلب إذن الإشعارات عند أول تشغيل بشكل أنيق' },
      { type: 'improve', text: 'النظام مجاني بالكامل بدون أي سيرفر خاص' },
    ],
  },
  {
    version: '2.7.0',
    title: 'نظام تحديث APK + ملاحظات التأخير',
    date: '2026-06-11',
    items: [
      { type: 'new',     text: 'نظام تحديث APK: يظهر إشعار عند توفر إصدار جديد مع تفاصيل الميزات ورابط التنزيل' },
      { type: 'improve', text: 'إزالة نظام OTA القديم نهائياً — لا مزيد من الأعطال الناتجة عنه' },
      { type: 'new',     text: 'ملاحظات التأخير تظهر في تقرير PDF وواتساب وCSV — فقط عند التأخر الفعلي' },
      { type: 'new',     text: 'شارة 📝 في قائمة السجل على أيام التأخير التي تحتوي ملاحظة' },
    ],
  },
  {
    version: '2.6.0',
    title: 'إضافة حقل الملاحظة',
    date: '2026-06-11',
    items: [
      { type: 'new',     text: 'إضافة خانة ملاحظة اختيارية في شاشة التسجيل قبل حفظ السجل' },
      { type: 'improve', text: 'الملاحظة تُحفظ مع السجل وتظهر في التفاصيل لاحقاً' },
      { type: 'improve', text: 'حد أقصى 200 حرف مع عداد مرئي' },
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

export const CURRENT_VERSION = '2.9.0';
