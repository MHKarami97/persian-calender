/**
 * Hijri (Islamic Lunar) Calendar Conversion Module
 * Algorithm: Kuwaiti tabular Islamic calendar algorithm, used by most
 * JS Hijri libraries for civil purposes. Reference: Richards, E.G.
 * "Mapping Time" (1998), Cambridge University Press.
 * Design pattern: Static Utility Class + Value Object (HijriDate)
 */
'use strict';

const HIJRI_MONTH_NAMES = [
  'محرم', 'صفر', 'ربیع‌الاول', 'ربیع‌الثانی', 'جمادی‌الاول', 'جمادی‌الثانی',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذیقعده', 'ذیحجه'
];

class HijriAlgorithm {
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

  static hijriToJdn(hy, hm, hd) {
    return Math.floor((11 * hy + 3) / 30) + 354 * hy + 30 * hm
      - Math.floor((hm - 1) / 2) + hd + 1948440 - 385;
  }

  static jdnToHijri(jdn) {
    let hy = Math.floor((30 * (jdn - 1948440) + 10646) / 10631);
    let hm, hd;
    let dayDiff = jdn - HijriAlgorithm.hijriToJdn(hy, 1, 1);
    if (dayDiff < 0) {
      hy -= 1;
      dayDiff = jdn - HijriAlgorithm.hijriToJdn(hy, 1, 1);
    }
    hm = 1;
    while (true) {
      const monthLen = HijriAlgorithm.hijriMonthLength(hy, hm);
      if (dayDiff < monthLen) break;
      dayDiff -= monthLen;
      hm += 1;
      if (hm > 12) { hm = 1; hy += 1; }
    }
    hd = dayDiff + 1;
    return { hy, hm, hd };
  }

  static isHijriLeapYear(hy) { return (11 * hy + 14) % 30 < 11; }

  static hijriMonthLength(hy, hm) {
    if (hm % 2 === 1) return 30;
    if (hm === 12) return HijriAlgorithm.isHijriLeapYear(hy) ? 30 : 29;
    return 29;
  }

  static gregorianToHijri(gy, gm, gd) {
    const jdn = HijriAlgorithm.gregorianToJdn(gy, gm, gd);
    return HijriAlgorithm.jdnToHijri(jdn);
  }

  static hijriToGregorian(hy, hm, hd) {
    const jdn = HijriAlgorithm.hijriToJdn(hy, hm, hd);
    return HijriAlgorithm.jdnToGregorian(jdn);
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
