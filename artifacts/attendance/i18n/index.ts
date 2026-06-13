export type Language = 'ar' | 'en';
export const RTL_LANGUAGES: Language[] = ['ar'];

export interface AppTranslations {
  appName: string;
  cancel: string;
  confirm: string;
  done: string;
  error: string;
  ok: string;
  yes: string;
  save: string;
  delete: string;

  am: string;
  pm: string;

  days: string[];
  daysShort: string[];
  months: string[];
  monthsShort: string[];

  recordTypes: { entry1: string; exit1: string; entry2: string; exit2: string };

  tabs: { today: string; history: string; calendar: string; reports: string };

  today: {
    companyPeriod: string;
    progress: string;
    allComplete: string;
    timeToExit: string;
    singleShift: string;
    doubleShift: string;
    workSchedule: string;
    todayRecords: string;
    capture: string;
    confirmed: string;
    needsReview: string;
    notSynced: string;
    friday: string;
    fridayBadge: string;
    fridaySchedule: string;
    streakDays: string;
  };

  history: {
    searchPlaceholder: string;
    groupByWeek: string;
    noRecords: string;
    noResults: string;
    friday: string;
    day: string;
  };

  calendar: {
    complete: string;
    partial: string;
    noRecord: string;
    completeLabel: string;
    fridayLabel: string;
    tapHint: string;
    daysComplete: (n: number) => string;
    totalDays: (n: number) => string;
  };

  reports: {
    exportPdf: string;
    shareWhatsapp: string;
    companyPeriod: string;
    specificMonth: string;
    commitmentRate: string;
    excellent: string;
    good: string;
    needsImprovement: string;
    registeredDays: string;
    totalRecords: string;
    mostLateDay: string;
    unsyncedWarning: string;
    lateEntries: string;
    noRecords: string;
    attendanceReport: string;
    period: string;
    exportDate: string;
    commitment: string;
    complete: string;
    incomplete: string;
    late: string;
    unsynced: string;
    lateCount: string;
  };

  settings: {
    title: string;
    theme: string;
    themeLight: string;
    themeDark: string;
    themeAuto: string;
    timeFormat: string;
    time12h: string;
    time24h: string;
    fontSize: string;
    fontSmall: string;
    fontMedium: string;
    fontLarge: string;
    language: string;
    notifications: string;
    notifOn: string;
    notifOff: string;
    earlyReminder: string;
    earlyReminderSub: string;
    testNotif: string;
    sendingNotif: string;
    saveNotifSettings: string;
    biometric: string;
    biometricOn: string;
    biometricOff: string;
    biometricLabel: string;
    biometricNote: string;
    biometricNoteActive: string;
    pin: string;
    pinOn: string;
    pinOff: string;
    changePIN: string;
    disablePIN: string;
    setPIN: string;
    disablePINTitle: string;
    disablePINMsg: string;
    autoDelete: string;
    autoDeleteOff: string;
    autoDeleteMonths: (n: number) => string;
    autoDeleteConfirm: (n: number) => string;
    autoDeleteDone: (n: number) => string;
    offline: string;
    offlineInfo: string;
    about: string;
    aboutInfo: string;
    checkUpdate: string;
    checkingUpdate: string;
    downloadingUpdate: string;
    upToDate: string;
    updateError: string;
    updateReady: string;
    updateReadySub: string;
    updateLater: string;
    updateRestart: string;
    singleShift: string;
    doubleShift: string;
    notify5minEarly: string;
    persistentReminder: string;
    persistentReminderSub: string;
  };

  capture: {
    title: string;
    webOnly: string;
    permissionTitle: string;
    permissionMsg: string;
    permissionAllow: string;
    confirmPhotoTitle: string;
    confirmPhotoMsg: string;
    retake: string;
    yesContinue: string;
    fetchingTime: string;
    syncingTime: string;
    confirmTitle: string;
    noteLabel: string;
    notePlaceholder: string;
    lockedTime: string;
    saving: string;
    cameraError: string;
    saveError: string;
    success: string;
  };

  recordDetail: {
    title: string;
    recordType: string;
    date: string;
    shiftType: string;
    singleShift: string;
    doubleShift: string;
    recordedTime: string;
    note: string;
    highConfidence: string;
    needsReview: string;
    syncedNote: string;
    unsyncedNote: string;
    editPhotoTitle: string;
    editPhotoSub: string;
    deleteAndRecapture: string;
    deleteOnly: string;
    deleteRecaptureTitle: string;
    deleteRecaptureMsg: (label: string) => string;
    deleteOnlyTitle: string;
    deleteOnlyMsg: (label: string) => string;
    deleteError: string;
    viewPhoto: string;
    manual: string;
    highConf: string;
    review: string;
  };

  dayDetail: {
    title: string;
    noRecords: string;
    manual: string;
    highConf: string;
    review: string;
  };

  pin: {
    setupTitle: string;
    enterNew: string;
    confirm: string;
    enterHint: string;
    confirmHint: string;
    doneTitle: string;
    doneSub: string;
    doneBtn: string;
    mismatch: string;
    backLink: string;
    disablePIN: string;
  };

  employee: {
    title: string;
    subtitle: string;
    personalInfo: string;
    nameLabel: string;
    namePlaceholder: string;
    deptLabel: string;
    deptPlaceholder: string;
    shiftType: string;
    singleShiftSub: string;
    doubleShiftSub: string;
    active: string;
    monthlyStats: string;
    lateMinutes: string;
  };

  lock: {
    title: string;
    biometricSub: string;
    unlockBtn: string;
    pinTitle: string;
    pinSub: string;
    wrongPin: string;
    useBiometric: string;
    authFail: string;
    bioUnavailable: string;
  };
}

const ar: AppTranslations = {
  appName: 'تطبيق الحضور',
  cancel: 'إلغاء',
  confirm: 'تأكيد',
  done: 'تم',
  error: 'خطأ',
  ok: 'حسناً',
  yes: 'نعم',
  save: 'حفظ',
  delete: 'حذف',

  am: 'ص',
  pm: 'م',

  days: ['الأحد', 'الاثنين', 'الثلاثاء', 'الأربعاء', 'الخميس', 'الجمعة', 'السبت'],
  daysShort: ['أحد', 'إثن', 'ثلث', 'أرب', 'خمس', 'جمع', 'سبت'],
  months: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],
  monthsShort: ['يناير', 'فبراير', 'مارس', 'أبريل', 'مايو', 'يونيو', 'يوليو', 'أغسطس', 'سبتمبر', 'أكتوبر', 'نوفمبر', 'ديسمبر'],

  recordTypes: { entry1: 'دخول', exit1: 'خروج', entry2: 'دخول 2', exit2: 'خروج 2' },

  tabs: { today: 'اليوم', history: 'السجل', calendar: 'التقويم', reports: 'التقارير' },

  today: {
    companyPeriod: 'فترة دوام الشركة:',
    progress: 'تقدم اليوم',
    allComplete: 'جميع السجلات مكتملة اليوم!',
    timeToExit: 'المتبقي للانصراف:',
    singleShift: 'شفت واحد',
    doubleShift: 'شفتين',
    workSchedule: 'مواعيد الدوام',
    todayRecords: 'سجلات اليوم',
    capture: 'التقط',
    confirmed: 'مؤكد',
    needsReview: 'للمراجعة',
    notSynced: '⚠ غير مزامن',
    friday: 'الجمعة',
    fridayBadge: 'جمعة',
    fridaySchedule: 'دوام الجمعة: 2:00 م — 12:00 ص (شفت واحد فقط)',
    streakDays: 'يوم متواصل',
  },

  history: {
    searchPlaceholder: 'بحث بالتاريخ أو اليوم...',
    groupByWeek: 'عرض مجمّع بالأسبوع',
    noRecords: 'لا توجد سجلات بعد',
    noResults: 'لا نتائج للبحث',
    friday: 'جمعة',
    day: 'يوم',
  },

  calendar: {
    complete: 'مكتمل',
    partial: 'ناقص',
    noRecord: 'بلا سجل',
    completeLabel: 'مكتمل (دخول + خروج)',
    fridayLabel: 'يوم الجمعة (دوام خاص)',
    tapHint: 'اضغط على يوم لعرض تفاصيله',
    daysComplete: (n) => `${n} يوم مكتمل`,
    totalDays: (n) => `من أصل ${n}`,
  },

  reports: {
    exportPdf: 'تصدير PDF',
    shareWhatsapp: 'مشاركة على واتساب',
    companyPeriod: 'فترة دوام الشركة',
    specificMonth: 'شهر محدد',
    commitmentRate: 'نسبة الالتزام',
    excellent: 'ممتاز',
    good: 'جيد',
    needsImprovement: 'يحتاج تحسين',
    registeredDays: 'أيام مسجلة',
    totalRecords: 'إجمالي السجلات',
    mostLateDay: 'أكثر يوم تأخراً:',
    unsyncedWarning: 'سجل بدون مزامنة — يُنصح بالتحقق',
    lateEntries: 'حالة تأخر',
    noRecords: 'لا توجد سجلات في هذه الفترة',
    attendanceReport: 'تقرير الحضور',
    period: 'فترة:',
    exportDate: 'التصدير:',
    commitment: 'الالتزام',
    complete: 'مكتملة',
    incomplete: 'ناقصة',
    late: 'متأخرة',
    unsynced: 'غير مزامن',
    lateCount: 'تأخر',
  },

  settings: {
    title: 'الإعدادات',
    theme: 'مظهر التطبيق',
    themeLight: 'نهاري',
    themeDark: 'ليلي',
    themeAuto: 'تلقائي',
    timeFormat: 'تنسيق الوقت',
    time12h: '12 ساعة (م/ص)',
    time24h: '24 ساعة',
    fontSize: 'حجم الخط',
    fontSmall: 'صغير',
    fontMedium: 'متوسط',
    fontLarge: 'كبير',
    language: 'اللغة',
    notifications: 'تنبيهات الحضور',
    notifOn: 'مفعّل',
    notifOff: 'معطّل',
    earlyReminder: 'تنبيه 5 دقائق مبكراً',
    earlyReminderSub: 'قبل موعد البصمة بـ 5 دقائق',
    testNotif: 'إرسال تنبيه تجريبي',
    sendingNotif: 'جاري الإرسال…',
    saveNotifSettings: 'حفظ إعدادات التنبيهات',
    biometric: 'قفل البصمة / Face ID',
    biometricOn: 'مفعّل',
    biometricOff: 'معطّل',
    biometricLabel: 'تفعيل القفل البيومتري',
    biometricNote: 'يُقفل التطبيق تلقائياً بعد دقيقتين في الخلفية',
    biometricNoteActive: 'القفل مفعّل — ستُطلب المصادقة عند كل فتح',
    pin: 'رمز PIN',
    pinOn: 'مفعّل',
    pinOff: 'معطّل',
    changePIN: 'تغيير PIN',
    disablePIN: 'إلغاء PIN',
    setPIN: 'تعيين رمز PIN',
    disablePINTitle: 'إلغاء PIN',
    disablePINMsg: 'هل تريد إلغاء رمز PIN؟',
    autoDelete: 'حذف تلقائي للصور',
    autoDeleteOff: 'معطّل',
    autoDeleteMonths: (n) => `${n} أشهر`,
    autoDeleteConfirm: (n) => `سيتم حذف السجلات الأقدم من ${n} أشهر. هل تريد المتابعة؟`,
    autoDeleteDone: (n) => `تم حذف السجلات الأقدم من ${n} أشهر`,
    offline: 'وضع بدون إنترنت',
    offlineInfo: '• عند وجود الإنترنت: وقت من خادم NTP (UTC+3)\n• بدونه: ساعة الجهاز مع علامة ⚠\n• البيانات محلية — لا يُرسَل شيء خارجياً\n• الصور مخفية تلقائياً عن الألبوم',
    about: 'عن التطبيق',
    aboutInfo: 'نظام حضور شخصي يعمل بدون إنترنت\nالسجلات مقفلة بعد الحفظ\nالشهر يبدأ 26 وينتهي 25\nالإصدار 2.2.0',
    checkUpdate: 'التحقق من التحديثات',
    checkingUpdate: 'جاري التحقق…',
    downloadingUpdate: 'جاري التنزيل…',
    upToDate: 'التطبيق محدّث ✓',
    updateError: 'فشل التحقق — أعد المحاولة',
    updateReady: '✅ تحديث جاهز',
    updateReadySub: 'تم تنزيل التحديث. إعادة التشغيل الآن؟',
    updateLater: 'لاحقاً',
    updateRestart: 'إعادة التشغيل',
    singleShift: 'شفت واحد',
    doubleShift: 'شفتين',
    notify5minEarly: 'التنبيهات مضبوطة 5 دقائق مبكراً',
    persistentReminder: 'التنبيه المستمر',
    persistentReminderSub: 'إشعارات متكررة كل 3 دقائق في الـ15 دقيقة قبل بصمة الدخول',
  },

  capture: {
    title: 'تسجيل',
    webOnly: 'الكاميرا متاحة فقط على الأجهزة المحمولة',
    permissionTitle: 'إذن الكاميرا',
    permissionMsg: 'يحتاج التطبيق إلى الكاميرا.',
    permissionAllow: 'السماح',
    confirmPhotoTitle: 'تأكيد الصورة',
    confirmPhotoMsg: 'هل تظهر شاشة جهاز البصمة في الصورة بوضوح؟',
    retake: 'إعادة التصوير',
    yesContinue: 'نعم، تابع',
    fetchingTime: 'جاري جلب الوقت الرسمي',
    syncingTime: 'مزامنة مع خادم الوقت (Asia/Riyadh)...',
    confirmTitle: 'تأكيد الحضور',
    noteLabel: 'ملاحظة (اختياري)',
    notePlaceholder: 'مثال: مهمة خارجية، اجتماع...',
    lockedTime: 'وقت التسجيل — مقفل لا يمكن تعديله',
    saving: 'جاري الحفظ...',
    cameraError: 'فشل فتح الكاميرا',
    saveError: 'فشل الحفظ',
    success: '✓',
  },

  recordDetail: {
    title: 'تفاصيل السجل',
    recordType: 'نوع السجل',
    date: 'التاريخ',
    shiftType: 'نوع الدوام',
    singleShift: 'شفت واحد',
    doubleShift: 'شفتين',
    recordedTime: 'الوقت المسجل',
    note: 'الملاحظة',
    highConfidence: 'صورة مسجّلة بنجاح',
    needsReview: 'يحتاج مراجعة الصورة',
    syncedNote: 'وقت مزامن مع خادم NTP',
    unsyncedNote: 'وقت الجهاز — غير مزامن ⚠',
    editPhotoTitle: 'تعديل الصورة',
    editPhotoSub: 'يمكنك حذف البصمة وإعادة تصويرها',
    deleteAndRecapture: 'حذف وإعادة التصوير',
    deleteOnly: 'حذف السجل فقط',
    deleteRecaptureTitle: 'حذف الصورة وإعادة التصوير',
    deleteRecaptureMsg: (label) => `سيتم حذف سجل "${label}" وفتح الكاميرا لإعادة التصوير. هل تريد المتابعة؟`,
    deleteOnlyTitle: 'حذف السجل',
    deleteOnlyMsg: (label) => `سيتم حذف سجل "${label}" وصورته نهائياً. هل أنت متأكد؟`,
    deleteError: 'فشل الحذف، حاول مجدداً',
    viewPhoto: 'اضغط لتكبير الصورة',
    manual: 'يدوي',
    highConf: 'ثقة عالية',
    review: 'مراجعة',
  },

  dayDetail: {
    title: 'سجلات اليوم',
    noRecords: 'لا توجد سجلات لهذا اليوم',
    manual: 'يدوي',
    highConf: 'ثقة عالية',
    review: 'مراجعة',
  },

  pin: {
    setupTitle: 'إعداد رمز PIN',
    enterNew: 'أدخل رمز PIN الجديد',
    confirm: 'أكّد رمز PIN',
    enterHint: 'أدخل 4 أرقام',
    confirmHint: 'أعد إدخال نفس الرمز',
    doneTitle: 'تم تعيين رمز PIN',
    doneSub: 'سيُطلب منك الرمز عند فتح التطبيق',
    doneBtn: 'تم',
    mismatch: 'الرمزان غير متطابقان — حاول مجدداً',
    backLink: '← العودة لإدخال رمز جديد',
    disablePIN: 'إلغاء PIN',
  },

  employee: {
    title: 'بيانات الموظف',
    subtitle: 'معلوماتك الشخصية وإحصائيات الحضور',
    personalInfo: 'المعلومات الشخصية',
    nameLabel: 'اسم الموظف',
    namePlaceholder: 'اضغط لإضافة الاسم',
    deptLabel: 'القسم',
    deptPlaceholder: 'اضغط لإضافة القسم',
    shiftType: 'نوع الدوام',
    singleShiftSub: 'تصوير واحد في اليوم',
    doubleShiftSub: 'تصويران في اليوم',
    active: 'فعّال',
    monthlyStats: 'إحصائيات الشهر الحالي',
    lateMinutes: 'دقائق التأخير هذا الشهر',
  },

  lock: {
    title: 'تطبيق الحضور',
    biometricSub: 'محمي بالبصمة / Face ID',
    unlockBtn: 'فتح القفل',
    pinTitle: 'رمز PIN',
    pinSub: 'أدخل رمزك للمتابعة',
    wrongPin: 'رمز PIN خاطئ',
    useBiometric: 'استخدم البصمة',
    authFail: 'فشل التحقق. حاول مجدداً.',
    bioUnavailable: 'البيومتري غير متاح على هذا الجهاز.',
  },
};

const en: AppTranslations = {
  appName: 'Attendance App',
  cancel: 'Cancel',
  confirm: 'Confirm',
  done: 'Done',
  error: 'Error',
  ok: 'OK',
  yes: 'Yes',
  save: 'Save',
  delete: 'Delete',

  am: 'AM',
  pm: 'PM',

  days: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
  daysShort: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
  months: ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'],
  monthsShort: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'],

  recordTypes: { entry1: 'Entry', exit1: 'Exit', entry2: 'Entry 2', exit2: 'Exit 2' },

  tabs: { today: 'Today', history: 'History', calendar: 'Calendar', reports: 'Reports' },

  today: {
    companyPeriod: 'Work Period:',
    progress: "Today's Progress",
    allComplete: 'All records complete today!',
    timeToExit: 'Time to exit:',
    singleShift: 'Single Shift',
    doubleShift: 'Double Shift',
    workSchedule: 'Work Schedule',
    todayRecords: "Today's Records",
    capture: 'Capture',
    confirmed: 'Confirmed',
    needsReview: 'Review',
    notSynced: '⚠ Not Synced',
    friday: 'Friday',
    fridayBadge: 'Fri',
    fridaySchedule: 'Friday shift: 2:00 PM — 12:00 AM (single shift only)',
    streakDays: 'day streak',
  },

  history: {
    searchPlaceholder: 'Search by date or day...',
    groupByWeek: 'Group by week',
    noRecords: 'No records yet',
    noResults: 'No results found',
    friday: 'Fri',
    day: 'day',
  },

  calendar: {
    complete: 'Complete',
    partial: 'Partial',
    noRecord: 'No record',
    completeLabel: 'Complete (Entry + Exit)',
    fridayLabel: 'Friday (Special Shift)',
    tapHint: 'Tap a day to see details',
    daysComplete: (n) => `${n} days complete`,
    totalDays: (n) => `out of ${n}`,
  },

  reports: {
    exportPdf: 'Export PDF',
    shareWhatsapp: 'Share on WhatsApp',
    companyPeriod: 'Work Period',
    specificMonth: 'Specific Month',
    commitmentRate: 'Commitment Rate',
    excellent: 'Excellent',
    good: 'Good',
    needsImprovement: 'Needs Improvement',
    registeredDays: 'Registered Days',
    totalRecords: 'Total Records',
    mostLateDay: 'Most late day:',
    unsyncedWarning: 'Unsynced record — verification recommended',
    lateEntries: 'Late Entries',
    noRecords: 'No records in this period',
    attendanceReport: 'Attendance Report',
    period: 'Period:',
    exportDate: 'Exported:',
    commitment: 'Commitment',
    complete: 'Complete',
    incomplete: 'Incomplete',
    late: 'Late',
    unsynced: 'Unsynced',
    lateCount: 'Late',
  },

  settings: {
    title: 'Settings',
    theme: 'App Theme',
    themeLight: 'Light',
    themeDark: 'Dark',
    themeAuto: 'System',
    timeFormat: 'Time Format',
    time12h: '12-hour (AM/PM)',
    time24h: '24-hour',
    fontSize: 'Font Size',
    fontSmall: 'Small',
    fontMedium: 'Medium',
    fontLarge: 'Large',
    language: 'Language',
    notifications: 'Attendance Notifications',
    notifOn: 'On',
    notifOff: 'Off',
    earlyReminder: '5-minute early reminder',
    earlyReminderSub: '5 minutes before check-in time',
    testNotif: 'Send test notification',
    sendingNotif: 'Sending…',
    saveNotifSettings: 'Save Notification Settings',
    biometric: 'Biometric / Face ID Lock',
    biometricOn: 'On',
    biometricOff: 'Off',
    biometricLabel: 'Enable biometric lock',
    biometricNote: 'App locks automatically after 2 minutes in background',
    biometricNoteActive: 'Lock enabled — authentication required on every open',
    pin: 'PIN Code',
    pinOn: 'On',
    pinOff: 'Off',
    changePIN: 'Change PIN',
    disablePIN: 'Disable PIN',
    setPIN: 'Set PIN Code',
    disablePINTitle: 'Disable PIN',
    disablePINMsg: 'Do you want to disable your PIN code?',
    autoDelete: 'Auto-delete Photos',
    autoDeleteOff: 'Disabled',
    autoDeleteMonths: (n) => `${n} months`,
    autoDeleteConfirm: (n) => `Records older than ${n} months will be deleted. Continue?`,
    autoDeleteDone: (n) => `Records older than ${n} months were deleted`,
    offline: 'Offline Mode',
    offlineInfo: '• With internet: NTP server time (UTC+3)\n• Without: Device time with ⚠ marker\n• All data is local — nothing sent externally\n• Photos are hidden from gallery automatically',
    about: 'About',
    aboutInfo: 'Personal attendance system — works offline\nRecords are locked after saving\nWork month: 26th to 25th\nVersion 2.2.0',
    checkUpdate: 'Check for Updates',
    checkingUpdate: 'Checking…',
    downloadingUpdate: 'Downloading…',
    upToDate: 'App is up to date ✓',
    updateError: 'Check failed — try again',
    updateReady: '✅ Update Ready',
    updateReadySub: 'Update downloaded. Restart now?',
    updateLater: 'Later',
    updateRestart: 'Restart',
    singleShift: 'Single Shift',
    doubleShift: 'Double Shift',
    notify5minEarly: 'Notifications set 5 minutes early',
    persistentReminder: 'Persistent Reminder',
    persistentReminderSub: 'Repeated alerts every 3 min in the 15-min window before each check-in',
  },

  capture: {
    title: 'Record',
    webOnly: 'Camera is only available on mobile devices',
    permissionTitle: 'Camera Permission',
    permissionMsg: 'The app needs camera access.',
    permissionAllow: 'Allow',
    confirmPhotoTitle: 'Confirm Photo',
    confirmPhotoMsg: 'Is the fingerprint machine screen clearly visible in the photo?',
    retake: 'Retake',
    yesContinue: 'Yes, continue',
    fetchingTime: 'Fetching official time',
    syncingTime: 'Syncing with time server (Asia/Riyadh)...',
    confirmTitle: 'Confirm Attendance',
    noteLabel: 'Note (optional)',
    notePlaceholder: 'e.g. Field mission, meeting...',
    lockedTime: 'Recorded time — locked, cannot be edited',
    saving: 'Saving...',
    cameraError: 'Failed to open camera',
    saveError: 'Failed to save',
    success: '✓',
  },

  recordDetail: {
    title: 'Record Details',
    recordType: 'Record Type',
    date: 'Date',
    shiftType: 'Shift Type',
    singleShift: 'Single Shift',
    doubleShift: 'Double Shift',
    recordedTime: 'Recorded Time',
    note: 'Note',
    highConfidence: 'Successfully recorded',
    needsReview: 'Photo needs review',
    syncedNote: 'Time synced with NTP server',
    unsyncedNote: 'Device time — not synced ⚠',
    editPhotoTitle: 'Edit Photo',
    editPhotoSub: 'You can delete and retake the fingerprint photo',
    deleteAndRecapture: 'Delete & Retake',
    deleteOnly: 'Delete Record Only',
    deleteRecaptureTitle: 'Delete & Retake',
    deleteRecaptureMsg: (label) => `Record "${label}" will be deleted and camera will open to retake. Continue?`,
    deleteOnlyTitle: 'Delete Record',
    deleteOnlyMsg: (label) => `Record "${label}" and its photo will be permanently deleted. Are you sure?`,
    deleteError: 'Failed to delete, please try again',
    viewPhoto: 'Tap to enlarge',
    manual: 'Manual',
    highConf: 'High confidence',
    review: 'Review',
  },

  dayDetail: {
    title: "Day's Records",
    noRecords: 'No records for this day',
    manual: 'Manual',
    highConf: 'High conf.',
    review: 'Review',
  },

  pin: {
    setupTitle: 'Set Up PIN',
    enterNew: 'Enter new PIN code',
    confirm: 'Confirm PIN',
    enterHint: 'Enter 4 digits',
    confirmHint: 'Re-enter the same code',
    doneTitle: 'PIN Code Set',
    doneSub: 'You will be asked for the code when opening the app',
    doneBtn: 'Done',
    mismatch: 'Codes do not match — try again',
    backLink: '← Go back to enter a new code',
    disablePIN: 'Disable PIN',
  },

  employee: {
    title: 'Employee Data',
    subtitle: 'Your personal info and attendance stats',
    personalInfo: 'Personal Information',
    nameLabel: 'Employee Name',
    namePlaceholder: 'Tap to add your name',
    deptLabel: 'Department',
    deptPlaceholder: 'Tap to add department',
    shiftType: 'Shift Type',
    singleShiftSub: 'One capture per day',
    doubleShiftSub: 'Two captures per day',
    active: 'Active',
    monthlyStats: 'Monthly Statistics',
    lateMinutes: 'Late minutes this month',
  },

  lock: {
    title: 'Attendance App',
    biometricSub: 'Protected by Biometric / Face ID',
    unlockBtn: 'Unlock',
    pinTitle: 'PIN Code',
    pinSub: 'Enter your code to continue',
    wrongPin: 'Wrong PIN',
    useBiometric: 'Use Biometric',
    authFail: 'Authentication failed. Try again.',
    bioUnavailable: 'Biometrics not available on this device.',
  },
};

export const translations: Record<Language, AppTranslations> = { ar, en };

export const LANGUAGE_LABELS: Record<Language, string> = {
  ar: 'العربية',
  en: 'English',
};
