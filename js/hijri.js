/**
 * Hijri (Islamic Lunar) Calendar Conversion Module
 *
 * Resolution strategy (Chain of Responsibility):
 *   1. OfficialIranHijriCalendar - month starts announced by the official
 *      Iranian calendar (moon-sighting based, Institute of Geophysics,
 *      University of Tehran). Used wherever data exists.
 *   2. TabularHijriCalendar - Kuwaiti tabular algorithm, used as fallback.
 *      Reference: Richards, E.G. "Mapping Time" (1998), Cambridge Univ. Press.
 *
 * Why two layers: the tabular algorithm is purely arithmetic and can differ
 * by 1-2 days from the Iranian official calendar, which is based on actual
 * crescent sighting and therefore cannot be computed by a formula.
 *
 * Design pattern: Static Utility Classes + Facade (HijriAlgorithm) + Value Object (HijriDate)
 */
'use strict';

const HIJRI_MONTH_NAMES = [
  'محرم', 'صفر', 'ربیع‌الاول', 'ربیع‌الثانی', 'جمادی‌الاول', 'جمادی‌الثانی',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذیقعده', 'ذیحجه'
];

class JulianDayConverter {
  static gregorianToJdn(gy, gm, gd) {
    const a = Math.floor((14 - gm) / 12);
    const y = gy + 4800 - a;
    const m = gm + 12 * a - 3;
    return gd + Math.floor((153 * m + 2) / 5) + 365 * y
      + Math.floor(y / 4) - Math.floor(y / 100) + Math.floor(y / 400) - 32045;
  }

  static jdnToGregorian(jdn) {
    const a = jdn + 32044;
    const b = Math.floor((4 * a + 3) / 146097);
    const c = a - Math.floor((146097 * b) / 4);
    const d = Math.floor((4 * c + 3) / 1461);
    const e = c - Math.floor((1461 * d) / 4);
    const m = Math.floor((5 * e + 2) / 153);
    const gd = e - Math.floor((153 * m + 2) / 5) + 1;
    const gm = m + 3 - 12 * Math.floor(m / 10);
    const gy = 100 * b + d - 4800 + Math.floor(m / 10);
    return { gy, gm, gd };
  }
}

class TabularHijriCalendar {
  static hijriToJdn(hy, hm, hd) {
    return Math.floor((11 * hy + 3) / 30) + 354 * hy + 30 * hm
      - Math.floor((hm - 1) / 2) + hd + 1948440 - 385;
  }

  static jdnToHijri(jdn) {
    let hy = Math.floor((30 * (jdn - 1948440) + 10646) / 10631);
    let dayDiff = jdn - TabularHijriCalendar.hijriToJdn(hy, 1, 1);
    if (dayDiff < 0) {
      hy -= 1;
      dayDiff = jdn - TabularHijriCalendar.hijriToJdn(hy, 1, 1);
    }
    let hm = 1;
    while (true) {
      const monthLen = TabularHijriCalendar.monthLength(hy, hm);
      if (dayDiff < monthLen) break;
      dayDiff -= monthLen;
      hm += 1;
      if (hm > 12) { hm = 1; hy += 1; }
    }
    return { hy, hm, hd: dayDiff + 1 };
  }

  static isLeapYear(hy) { return (11 * hy + 14) % 30 < 11; }

  static monthLength(hy, hm) {
    if (hm % 2 === 1) return 30;
    if (hm === 12) return TabularHijriCalendar.isLeapYear(hy) ? 30 : 29;
    return 29;
  }
}

/**
 * Official Iranian calendar month starts (Gregorian date of the 1st day of
 * each hijri month). Add new entries in chronological order and keep them
 * CONSECUTIVE (no missing month) - gaps are rejected at load time.
 * Everything outside the covered range transparently falls back to the
 * tabular algorithm.
 */
class OfficialIranHijriCalendar {
  static #MONTH_STARTS = [
    // [hijriYear, hijriMonth, 'gregorian YYYY-MM-DD']
    [1447, 12, '2026-05-18'],
    [1448, 1, '2026-06-16'],
    [1448, 2, '2026-07-16'],
    [1448, 3, '2026-08-14'],
    [1448, 4, '2026-09-13'],
    [1448, 5, '2026-10-12'],
    [1448, 6, '2026-11-11'],
    [1448, 7, '2026-12-11'],
    [1448, 8, '2027-01-10'],
    [1448, 9, '2027-02-08'],
    [1448, 10, '2027-03-10']
  ];

  static #entries = null;
  static #indexByKey = null;

  static #monthKey(hy, hm) { return hy * 100 + hm; }

  static #ensureLoaded() {
    if (OfficialIranHijriCalendar.#entries) return;

    const entries = OfficialIranHijriCalendar.#MONTH_STARTS.map(([hy, hm, iso]) => {
      const [gy, gm, gd] = iso.split('-').map(Number);
      return { hy, hm, jdn: JulianDayConverter.gregorianToJdn(gy, gm, gd) };
    });

    const indexByKey = new Map();
    entries.forEach((entry, i) => {
      if (i > 0) OfficialIranHijriCalendar.#assertConsecutive(entries[i - 1], entry);
      indexByKey.set(OfficialIranHijriCalendar.#monthKey(entry.hy, entry.hm), i);
    });

    OfficialIranHijriCalendar.#entries = entries;
    OfficialIranHijriCalendar.#indexByKey = indexByKey;
  }

  static #assertConsecutive(prev, next) {
    const expectedYear = prev.hm === 12 ? prev.hy + 1 : prev.hy;
    const expectedMonth = prev.hm === 12 ? 1 : prev.hm + 1;
    const length = next.jdn - prev.jdn;
    if (next.hy !== expectedYear || next.hm !== expectedMonth || (length !== 29 && length !== 30)) {
      throw new Error(`Invalid official hijri data near ${prev.hy}-${prev.hm}`);
    }
  }

  /** Returns { hy, hm, hd } or null when the date is outside the official data. */
  static jdnToHijri(jdn) {
    OfficialIranHijriCalendar.#ensureLoaded();
    const entries = OfficialIranHijriCalendar.#entries;
    const last = entries.length - 1;

    let low = 0;
    let high = last;
    let found = -1;
    while (low <= high) {
      const mid = (low + high) >> 1;
      if (entries[mid].jdn <= jdn) { found = mid; low = mid + 1; } else { high = mid - 1; }
    }

    // The final entry has no known end, so it is not trusted.
    if (found < 0 || found === last) return null;
    const entry = entries[found];
    return { hy: entry.hy, hm: entry.hm, hd: jdn - entry.jdn + 1 };
  }

  /** Returns a JDN or null when the month/day is not covered. */
  static hijriToJdn(hy, hm, hd) {
    OfficialIranHijriCalendar.#ensureLoaded();
    const entries = OfficialIranHijriCalendar.#entries;
    const index = OfficialIranHijriCalendar.#indexByKey.get(OfficialIranHijriCalendar.#monthKey(hy, hm));
    if (index === undefined || index === entries.length - 1) return null;

    const length = entries[index + 1].jdn - entries[index].jdn;
    return hd >= 1 && hd <= length ? entries[index].jdn + hd - 1 : null;
  }

  /** Returns 29 | 30, or null when the month is not covered. */
  static monthLength(hy, hm) {
    OfficialIranHijriCalendar.#ensureLoaded();
    const entries = OfficialIranHijriCalendar.#entries;
    const index = OfficialIranHijriCalendar.#indexByKey.get(OfficialIranHijriCalendar.#monthKey(hy, hm));
    if (index === undefined || index === entries.length - 1) return null;
    return entries[index + 1].jdn - entries[index].jdn;
  }
}

class HijriAlgorithm {
  static gregorianToJdn(gy, gm, gd) { return JulianDayConverter.gregorianToJdn(gy, gm, gd); }

  static jdnToGregorian(jdn) { return JulianDayConverter.jdnToGregorian(jdn); }

  static hijriToJdn(hy, hm, hd) {
    return OfficialIranHijriCalendar.hijriToJdn(hy, hm, hd)
      ?? TabularHijriCalendar.hijriToJdn(hy, hm, hd);
  }

  static jdnToHijri(jdn) {
    return OfficialIranHijriCalendar.jdnToHijri(jdn)
      ?? TabularHijriCalendar.jdnToHijri(jdn);
  }

  static isHijriLeapYear(hy) { return TabularHijriCalendar.isLeapYear(hy); }

  static hijriMonthLength(hy, hm) {
    return OfficialIranHijriCalendar.monthLength(hy, hm)
      ?? TabularHijriCalendar.monthLength(hy, hm);
  }

  static gregorianToHijri(gy, gm, gd) {
    return HijriAlgorithm.jdnToHijri(JulianDayConverter.gregorianToJdn(gy, gm, gd));
  }

  static hijriToGregorian(hy, hm, hd) {
    return JulianDayConverter.jdnToGregorian(HijriAlgorithm.hijriToJdn(hy, hm, hd));
  }
}

class HijriDate {
  constructor(year, month, day) {
    this.year = year;
    this.month = month;
    this.day = day;
    Object.freeze(this);
  }

  static fromGregorian(date) {
    const r = HijriAlgorithm.gregorianToHijri(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return new HijriDate(r.hy, r.hm, r.hd);
  }

  toGregorian() {
    const r = HijriAlgorithm.hijriToGregorian(this.year, this.month, this.day);
    return new Date(r.gy, r.gm - 1, r.gd);
  }

  get monthName() { return HIJRI_MONTH_NAMES[this.month - 1]; }
  format() { return `${this.day} ${this.monthName} ${this.year}`; }
}

window.HijriAlgorithm = HijriAlgorithm;
window.HijriDate = HijriDate;
window.HIJRI_MONTH_NAMES = HIJRI_MONTH_NAMES;
