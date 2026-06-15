export interface OfficialTime {
  time: Date;
  isSynced: boolean;
  source: 'ntp' | 'device';
  displayTime: string;
  displayDate: string;
}

async function tryFetchTime(url: string, parse: (data: any) => Date, timeoutMs: number): Promise<Date> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const resp = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const data = await resp.json();
    return parse(data);
  } finally {
    clearTimeout(timer);
  }
}

export async function getOfficialTime(timeoutMs = 5000): Promise<OfficialTime> {
  const startTime = Date.now();

  const sources: Array<{ url: string; parse: (data: any) => Date }> = [
    {
      url: 'https://worldtimeapi.org/api/timezone/Asia/Riyadh',
      parse: (d) => new Date(d.datetime),
    },
    {
      url: 'https://timeapi.io/api/Time/current/zone?timeZone=Asia/Riyadh',
      parse: (d) => new Date(d.dateTime),
    },
    {
      url: 'https://www.timeapi.io/api/time/current/zone?timeZone=Asia/Riyadh',
      parse: (d) => new Date(d.dateTime),
    },
  ];

  for (const src of sources) {
    const elapsed = Date.now() - startTime;
    const remaining = timeoutMs - elapsed;
    if (remaining <= 0) break; // انتهى الوقت الإجمالي

    try {
      const time = await tryFetchTime(src.url, src.parse, remaining);
      if (isNaN(time.getTime())) throw new Error('invalid date');
      return {
        time,
        isSynced: true,
        source: 'ntp',
        displayTime: fmtTime(time),
        displayDate: fmtDate(time),
      };
    } catch {
      // try next source
    }
  }

  // All sources failed — use device time
  const time = new Date();
  return {
    time,
    isSynced: false,
    source: 'device',
    displayTime: fmtTime(time),
    displayDate: fmtDate(time),
  };
}

function fmtTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export function fmtDate(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export interface CompanyPeriod {
  start: Date;
  end: Date;
  startStr: string;
  endStr: string;
  label: string;
}

function fmt(d: Date): string {
  return `${String(d.getDate()).padStart(2, '0')}/${String(d.getMonth() + 1).padStart(2, '0')}/${d.getFullYear()}`;
}

export function getCompanyPeriod(date: Date = new Date()): CompanyPeriod {
  const day = date.getDate();
  let startYear = date.getFullYear();
  let startMonth = date.getMonth();
  let endYear: number;
  let endMonth: number;

  if (day >= 26) {
    endMonth = startMonth + 1;
    endYear = startYear;
    if (endMonth > 11) { endMonth = 0; endYear++; }
  } else {
    endMonth = startMonth;
    endYear = startYear;
    startMonth = startMonth - 1;
    if (startMonth < 0) { startMonth = 11; startYear--; }
  }

  const start = new Date(startYear, startMonth, 26);
  const end = new Date(endYear, endMonth, 25);

  return {
    start,
    end,
    startStr: fmtDate(start),
    endStr: fmtDate(end),
    label: `${fmt(start)} — ${fmt(end)}`,
  };
}

export function shiftCompanyPeriod(current: CompanyPeriod, direction: 1 | -1): CompanyPeriod {
  if (direction === 1) {
    const nextStart = new Date(current.end.getFullYear(), current.end.getMonth(), 26);
    return getCompanyPeriod(nextStart);
  } else {
    const prevEnd = new Date(current.start.getFullYear(), current.start.getMonth(), 25);
    return getCompanyPeriod(prevEnd);
  }
}
