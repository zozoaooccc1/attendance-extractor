function fmt(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
}

export function calculateStreak(allDates: string[]): number {
  if (allDates.length === 0) return 0;
  const set = new Set(allDates);
  const today = new Date();
  const todayStr = fmt(today);
  const check = new Date(today);
  if (!set.has(todayStr)) check.setDate(check.getDate() - 1);
  let streak = 0;
  for (let i = 0; i < 400; i++) {
    if (!set.has(fmt(check))) break;
    streak++;
    check.setDate(check.getDate() - 1);
  }
  return streak;
}

export function calculateLongestStreak(allDates: string[]): number {
  if (allDates.length === 0) return 0;
  const sorted = [...allDates].sort();
  let max = 1, cur = 1;
  for (let i = 1; i < sorted.length; i++) {
    const diff = (new Date(sorted[i]).getTime() - new Date(sorted[i-1]).getTime()) / 86400000;
    if (diff === 1) { cur++; if (cur > max) max = cur; }
    else cur = 1;
  }
  return max;
}
