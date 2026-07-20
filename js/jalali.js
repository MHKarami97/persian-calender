/**
 * Jalali (Persian/Solar Hijri) Calendar Conversion Module
 * Algorithm reference: the original jalaali-js reference implementation
 * by Behrang Noruzi Niya / Roozbeh Pournader (MIT licensed), based on
 * the Birashk astronomical algorithm. Valid range: Jalali years -61..3177.
 *
 * IMPORTANT: the reference algorithm's div()/mod() use truncating
 * (toward-zero) integer division (JS bitwise `~~`), NOT Math.floor —
 * this matters for negative intermediate values in g2d/d2g and must be
 * preserved exactly, otherwise Gregorian<->Julian-Day conversion breaks.
 *
 * Design pattern: Static Utility Class (Namespace) + Value Object (JalaliDate)
 */
'use strict';

const BRESKIN_BREAKS = [
  -61, 9, 38, 199, 426, 686, 756, 818, 1111, 1181, 1210,
  1635, 2060, 2097, 2192, 2262, 2324, 2394, 2456, 3178
];

class JalaliAlgorithm {
  /** Truncating integer division (toward zero), matching reference `~~(a/b)` */
  static div(a, b) {
    return (a / b) | 0;
  }

  static mod(a, b) {
    return a - JalaliAlgorithm.div(a, b) * b;
  }

  static jalCal(jy) {
    const breaks = BRESKIN_BREAKS;
    const bl = breaks.length;
    const gy = jy + 621;
    let leapJ = -14;
    let jp = breaks[0];

    if (jy < jp || jy >= breaks[bl - 1]) {
      throw new RangeError('Invalid Jalali year ' + jy);
    }

    let jump = 0;
    for (let i = 1; i < bl; i += 1) {
      const jm = breaks[i];
      jump = jm - jp;
      if (jy < jm) break;
      leapJ += JalaliAlgorithm.div(jump, 33) * 8 + JalaliAlgorithm.div(JalaliAlgorithm.mod(jump, 33), 4);
      jp = jm;
    }
    let n = jy - jp;

    leapJ += JalaliAlgorithm.div(n, 33) * 8 + JalaliAlgorithm.div(JalaliAlgorithm.mod(n, 33) + 3, 4);
    if (JalaliAlgorithm.mod(jump, 33) === 4 && jump - n === 4) leapJ += 1;

    const leapG = JalaliAlgorithm.div(gy, 4) - JalaliAlgorithm.div((JalaliAlgorithm.div(gy, 100) + 1) * 3, 4) - 150;
    const march = 20 + leapJ - leapG;

    if (jump - n < 6) n = n - jump + JalaliAlgorithm.div(jump, 33) * 33;
    let leap = JalaliAlgorithm.mod(JalaliAlgorithm.mod(n + 1, 33) - 1, 4);
    if (leap === -1) leap = 4;

    return { leap, gy, march };
  }

  static isLeapJalaliYear(jy) {
    return JalaliAlgorithm.jalCal(jy).leap === 0;
  }

  /** Gregorian calendar date to Julian Day Number */
  static g2d(gy, gm, gd) {
    let jdn = JalaliAlgorithm.div((gy + JalaliAlgorithm.div(gm - 8, 6) + 100100) * 1461, 4)
      + JalaliAlgorithm.div(153 * JalaliAlgorithm.mod(gm + 9, 12) + 2, 5)
      + gd - 34840408;
    jdn = jdn - JalaliAlgorithm.div(JalaliAlgorithm.div(gy + 100100 + JalaliAlgorithm.div(gm - 8, 6), 100) * 3, 4) + 752;
    return jdn;
  }

  /** Julian Day Number to Gregorian calendar date */
  static d2g(jdn) {
    let j = 4 * jdn + 139361631
      + JalaliAlgorithm.div(JalaliAlgorithm.div(4 * jdn + 183187720, 146097) * 3, 4) * 4 - 3908;
    const i = JalaliAlgorithm.div(JalaliAlgorithm.mod(j, 1461), 4) * 5 + 308;
    const gd = JalaliAlgorithm.div(JalaliAlgorithm.mod(i, 153), 5) + 1;
    const gm = JalaliAlgorithm.mod(JalaliAlgorithm.div(i, 153), 12) + 1;
    const gy = JalaliAlgorithm.div(j, 1461) - 100100 + JalaliAlgorithm.div(8 - gm, 6);
    return { gy, gm, gd };
  }

  static j2d(jy, jm, jd) {
    const r = JalaliAlgorithm.jalCal(jy);
    return JalaliAlgorithm.g2d(r.gy, 3, r.march) + (jm - 1) * 31 - JalaliAlgorithm.div(jm, 7) * (jm - 7) + jd - 1;
  }

  static d2j(jdn) {
    const gy = JalaliAlgorithm.d2g(jdn).gy;
    let jy = gy - 621;
    let r = JalaliAlgorithm.jalCal(jy);
    let jdn1f = JalaliAlgorithm.g2d(gy, 3, r.march);
    let k = jdn - jdn1f;

    if (k >= 0) {
      if (k <= 185) {
        const jm = 1 + JalaliAlgorithm.div(k, 31);
        const jd = JalaliAlgorithm.mod(k, 31) + 1;
        return { jy, jm, jd };
      }
      k -= 186;
    } else {
      jy -= 1;
      k += 179;
      if (r.leap === 1) k += 1;
    }
    const jm = 7 + JalaliAlgorithm.div(k, 30);
    const jd = JalaliAlgorithm.mod(k, 30) + 1;
    return { jy, jm, jd };
  }

  static jalCalYearLength(jy) {
    return JalaliAlgorithm.isLeapJalaliYear(jy) ? 366 : 365;
  }

  static jalaaliToGregorian(jy, jm, jd) {
    const jdn = JalaliAlgorithm.j2d(jy, jm, jd);
    const g = JalaliAlgorithm.d2g(jdn);
    return { gy: g.gy, gm: g.gm, gd: g.gd };
  }

  static gregorianToJalaali(gy, gm, gd) {
    const jdn = JalaliAlgorithm.g2d(gy, gm, gd);
    return JalaliAlgorithm.d2j(jdn);
  }
}

const PERSIAN_MONTH_NAMES = [
  'فروردین', 'اردیبهشت', 'خرداد', 'تیر', 'مرداد', 'شهریور',
  'مهر', 'آبان', 'آذر', 'دی', 'بهمن', 'اسفند'
];

const PERSIAN_WEEKDAY_NAMES = [
  'یکشنبه', 'دوشنبه', 'سه‌شنبه', 'چهارشنبه', 'پنجشنبه', 'جمعه', 'شنبه'
];

class JalaliDate {
  constructor(year, month, day) {
    this.year = year;
    this.month = month;
    this.day = day;
    Object.freeze(this);
  }

  static fromGregorian(date) {
    const r = JalaliAlgorithm.gregorianToJalaali(date.getFullYear(), date.getMonth() + 1, date.getDate());
    return new JalaliDate(r.jy, r.jm, r.jd);
  }

  static today() { return JalaliDate.fromGregorian(new Date()); }

  toGregorian() {
    const r = JalaliAlgorithm.jalaaliToGregorian(this.year, this.month, this.day);
    return new Date(r.gy, r.gm - 1, r.gd);
  }

  get weekDay() { return this.toGregorian().getDay(); }
  get monthName() { return PERSIAN_MONTH_NAMES[this.month - 1]; }
  get isLeapYear() { return JalaliAlgorithm.isLeapJalaliYear(this.year); }

  daysInMonth() {
    if (this.month <= 6) return 31;
    if (this.month <= 11) return 30;
    return this.isLeapYear ? 30 : 29;
  }

  addDays(count) {
    const jdn = JalaliAlgorithm.j2d(this.year, this.month, this.day) + count;
    const r = JalaliAlgorithm.d2j(jdn);
    return new JalaliDate(r.jy, r.jm, r.jd);
  }

  toString() {
    const p = (n) => String(n).padStart(2, '0');
    return `${this.year}/${p(this.month)}/${p(this.day)}`;
  }

  format() { return `${this.day} ${this.monthName} ${this.year}`; }
  equals(other) { return this.year === other.year && this.month === other.month && this.day === other.day; }
}

window.JalaliAlgorithm = JalaliAlgorithm;
window.JalaliDate = JalaliDate;
window.PERSIAN_MONTH_NAMES = PERSIAN_MONTH_NAMES;
window.PERSIAN_WEEKDAY_NAMES = PERSIAN_WEEKDAY_NAMES;
