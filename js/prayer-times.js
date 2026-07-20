/**
 * Prayer Times (Owqat-e-Shar'i) Astronomical Calculator — pure client-side.
 * Algorithm reference: PrayTimes.org solar-position formulas by
 * Hamid Zarrabi-Zadeh (open, well-documented reference algorithm).
 * Method used: "Jafari" (Shia Ithna Ashari), standard for Iranian usage.
 * Design pattern: Strategy Pattern (calculation method swappable)
 */
'use strict';

const DEG2RAD = Math.PI / 180;
const RAD2DEG = 180 / Math.PI;

const CALCULATION_METHODS = {
  jafari: { fajr: 16, isha: 14, maghrib: 4 },
};

class SunPositionCalculator {
  static julianDate(year, month, day) {
    if (month <= 2) { year -= 1; month += 12; }
    const A = Math.floor(year / 100);
    const B = 2 - A + Math.floor(A / 4);
    return Math.floor(365.25 * (year + 4716)) + Math.floor(30.6001 * (month + 1)) + day + B - 1524.5;
  }

  static sunPosition(jd) {
    const D = jd - 2451545.0;
    const g = SunPositionCalculator.fixAngle(357.529 + 0.98560028 * D);
    const q = SunPositionCalculator.fixAngle(280.459 + 0.98564736 * D);
    const L = SunPositionCalculator.fixAngle(q + 1.915 * Math.sin(g * DEG2RAD) + 0.020 * Math.sin(2 * g * DEG2RAD));
    const e = 23.439 - 0.00000036 * D;
    const RA = SunPositionCalculator.fixAngle(
      RAD2DEG * Math.atan2(Math.cos(e * DEG2RAD) * Math.sin(L * DEG2RAD), Math.cos(L * DEG2RAD))
    ) / 15;
    const decl = RAD2DEG * Math.asin(Math.sin(e * DEG2RAD) * Math.sin(L * DEG2RAD));
    const eqTime = q / 15 - SunPositionCalculator.fixHour(RA);
    return { declination: decl, equation: eqTime };
  }

  static fixAngle(a) { a = a % 360; return a < 0 ? a + 360 : a; }
  static fixHour(h) { h = h % 24; return h < 0 ? h + 24 : h; }
}

class PrayerTimesCalculator {
  constructor(method = 'jafari') { this.params = CALCULATION_METHODS[method] || CALCULATION_METHODS.jafari; }

  computeTime(angle, jd, lat, lng, timezone, isAfterNoon) {
    const sun = SunPositionCalculator.sunPosition(jd + (isAfterNoon ? 0.75 : 0.25));
    const noon = 12 - lng / 15 - sun.equation + timezone;
    const decl = sun.declination;
    const cosArg = (-Math.sin(angle * DEG2RAD) - Math.sin(decl * DEG2RAD) * Math.sin(lat * DEG2RAD))
      / (Math.cos(decl * DEG2RAD) * Math.cos(lat * DEG2RAD));
    const clamped = Math.max(-1, Math.min(1, cosArg));
    const t = RAD2DEG * Math.acos(clamped) / 15;
    return isAfterNoon ? noon + t : noon - t;
  }

  computeNoon(jd, lng, timezone) {
    const sun = SunPositionCalculator.sunPosition(jd + 0.5);
    return 12 - lng / 15 - sun.equation + timezone;
  }

  static hoursToTimeString(hours) {
    if (Number.isNaN(hours)) return '--:--';
    let h = Math.floor(hours);
    let m = Math.round((hours - h) * 60);
    if (m === 60) { m = 0; h += 1; }
    h = ((h % 24) + 24) % 24;
    const pad = (n) => String(n).padStart(2, '0');
    return `${pad(h)}:${pad(m)}`;
  }

  getTimesForDate(date, lat, lng, timezone) {
    const jd = SunPositionCalculator.julianDate(date.getFullYear(), date.getMonth() + 1, date.getDate());
    const fajr = this.computeTime(this.params.fajr, jd, lat, lng, timezone, false);
    const sunrise = this.computeTime(0.833, jd, lat, lng, timezone, false);
    const noon = this.computeNoon(jd, lng, timezone) + (2 / 60);
    const sunset = this.computeTime(0.833, jd, lat, lng, timezone, true);
    const maghrib = this.computeTime(this.params.maghrib, jd, lat, lng, timezone, true);
    const isha = this.computeTime(this.params.isha, jd, lat, lng, timezone, true);

    const nextFajrJd = SunPositionCalculator.julianDate(date.getFullYear(), date.getMonth() + 1, date.getDate() + 1);
    const nextFajr = this.computeTime(this.params.fajr, nextFajrJd, lat, lng, timezone, false) + 24;
    const midnight = (sunset + nextFajr) / 2;

    return {
      imsak: PrayerTimesCalculator.hoursToTimeString(fajr - (10 / 60)),
      fajr: PrayerTimesCalculator.hoursToTimeString(fajr),
      sunrise: PrayerTimesCalculator.hoursToTimeString(sunrise),
      noon: PrayerTimesCalculator.hoursToTimeString(noon),
      sunset: PrayerTimesCalculator.hoursToTimeString(sunset),
      maghrib: PrayerTimesCalculator.hoursToTimeString(maghrib),
      isha: PrayerTimesCalculator.hoursToTimeString(isha),
      midnight: PrayerTimesCalculator.hoursToTimeString(midnight % 24),
    };
  }
}

window.PrayerTimesCalculator = PrayerTimesCalculator;
window.DEFAULT_LOCATION = { lat: 35.6892, lng: 51.3890, timezone: 3.5, name: 'تهران' };
