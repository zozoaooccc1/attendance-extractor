function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

/**
 * إضافة يوم واحد للتاريخ مع تجنب مشاكل التوقيت الصيفي
 */
function addDays(d: Date, days: number): Date {
  const result = new Date(d);
  result.setUTCDate(result.getUTCDate() + days);
  return result;
}

/**
 * حساب الفرق بالأيام بين تاريخين باستخدام مقارنة التواريخ فقط (YYYY-MM-DD)
 * لتجنب مشاكل التوقيت الصيفي
 */
function daysBetween(a: string, b: string): number {
  const [ay, am, ad] = a.split('-').map(Number);
  const [by, bm, bd] = b.split('-').map(Number);
  const dateA = new Date(ay, am - 1, ad);
  const dateB = new Date(by, bm - 1, bd);
  return Math.round((dateB.getTime() - dateA.getTime()) / 86400000);
}

/**
 * هل اليوم يوم جمعة (يوم عطلة)؟
 */
function isFriday(dateStr: string): boolean {
  const [y, m, d] = dateStr.split('-').map(Number);
  return new Date(y, m - 1, d).getDay() === 5;
}

export function calculateStreak(allDates: string[]): number {
  if (allDates.length === 0) return 0;
  const dateSet = new Set(allDates);
  const today = new Date();
  const todayStr = fmt(today);
  const check = new Date(today);
  if (!dateSet.has(todayStr)) check.setDate(check.getDate() - 1);
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    const checkStr = fmt(check);
    // تخطي أيام الجمعة (يوم عطلة) — لا تقطع السلسلة
    if (isFriday(checkStr)) {
      check.setDate(check.getDate() - 1);
      continue;
    }
    if (!dateSet.has(checkStr)) break;
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

export function calculateLongestStreak(allDates: string[]): number {
  if (allDates.length === 0) return 0;

  // إزالة التكرارات وترتيب التواريخ
  const unique = [...new Set(allDates)].sort();

  let max = 1, cur = 1;
  for (let i = 1; i < unique.length; i++) {
    // استخدام مقارنة التواريخ فقط بدلاً من حساب الفرق بالمللي ثانية
    // لتجنب مشاكل التوقيت الصيفي
    const diff = daysBetween(unique[i - 1], unique[i]);
    if (diff === 1) {
      cur++;
      if (cur > max) max = cur;
    } else if (diff > 1) {
      cur = 1;
    }
    // diff === 0 يعني نفس اليوم (لا نعيد التعيين)
  }
  return max;
}
