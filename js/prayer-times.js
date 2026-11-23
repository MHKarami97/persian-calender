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

class QiblaCalculator {
  static calculate(lat, lng) {
    const meccaLat = 21.4225 * DEG2RAD;
    const meccaLng = 39.8262 * DEG2RAD;
    const phi = lat * DEG2RAD;
    const lambda = lng * DEG2RAD;
    const deltaLambda = meccaLng - lambda;

    const y = Math.sin(deltaLambda);
    const x = Math.cos(phi) * Math.tan(meccaLat) - Math.sin(phi) * Math.cos(deltaLambda);
    const qibla = Math.atan2(y, x) * RAD2DEG;
    return Math.round((qibla + 360) % 360);
  }
}

class PrayerHelper {
  static getNextPrayer(times, now = new Date()) {
    const prayerOrder = [
      { key: 'fajr', label: 'اذان صبح' },
      { key: 'sunrise', label: 'طلوع آفتاب' },
      { key: 'noon', label: 'اذان ظهر' },
      { key: 'sunset', label: 'غروب آفتاب' },
      { key: 'maghrib', label: 'اذان مغرب' },
      { key: 'isha', label: 'اذان عشا' },
      { key: 'midnight', label: 'نیمه‌شب شرعی' },
    ];

    const currentMinutes = now.getHours() * 60 + now.getMinutes() + now.getSeconds() / 60;

    for (const prayer of prayerOrder) {
      const timeStr = times[prayer.key];
      if (!timeStr || timeStr === '--:--') continue;
      const [h, m] = timeStr.split(':').map(Number);
      const prayerMinutes = h * 60 + m;
      if (prayerMinutes > currentMinutes) {
        const diffMinutes = prayerMinutes - currentMinutes;
        return {
          key: prayer.key,
          label: prayer.label,
          time: timeStr,
          secondsRemaining: Math.floor(diffMinutes * 60),
        };
      }
    }

    if (!times.fajr || times.fajr === '--:--') return null;
    const [h, m] = times.fajr.split(':').map(Number);
    const tomorrowFajrMinutes = 24 * 60 + h * 60 + m;
    const diffMinutes = tomorrowFajrMinutes - currentMinutes;
    return {
      key: 'fajr',
      label: 'اذان صبح (فردا)',
      time: times.fajr,
      secondsRemaining: Math.floor(diffMinutes * 60),
    };
  }
}

const IRAN_PROVINCE_CAPITALS = [
  { name: 'تهران', lat: 35.6892, lng: 51.3890 },
  { name: 'مشهد', lat: 36.2972, lng: 59.6067 },
  { name: 'اصفهان', lat: 32.6546, lng: 51.6680 },
  { name: 'تبریز', lat: 38.0800, lng: 46.2919 },
  { name: 'شیراز', lat: 29.5918, lng: 52.5837 },
  { name: 'اهواز', lat: 31.3183, lng: 48.6706 },
  { name: 'قم', lat: 34.6401, lng: 50.8764 },
  { name: 'کرج', lat: 35.8327, lng: 50.9915 },
  { name: 'کرمانشاه', lat: 34.3142, lng: 47.0650 },
  { name: 'رشت', lat: 37.2809, lng: 49.5924 },
  { name: 'کرمان', lat: 30.2839, lng: 57.0834 },
  { name: 'ارومیه', lat: 37.5527, lng: 45.0761 },
  { name: 'زاهدان', lat: 29.4963, lng: 60.8629 },
  { name: 'همدان', lat: 34.7982, lng: 48.5146 },
  { name: 'یزد', lat: 31.8974, lng: 54.3569 },
  { name: 'اراک', lat: 34.0954, lng: 49.7013 },
  { name: 'اردبیل', lat: 38.2498, lng: 48.2933 },
  { name: 'بندرعباس', lat: 27.1832, lng: 56.2666 },
  { name: 'زنجان', lat: 36.6736, lng: 48.4787 },
  { name: 'سنندج', lat: 35.3219, lng: 46.9862 },
  { name: 'قزوین', lat: 36.2797, lng: 50.0049 },
  { name: 'خرم‌آباد', lat: 33.4878, lng: 48.3558 },
  { name: 'گرگان', lat: 36.8427, lng: 54.4439 },
  { name: 'ساری', lat: 36.5659, lng: 53.0586 },
  { name: 'بجنورد', lat: 37.4747, lng: 57.3290 },
  { name: 'بیرجند', lat: 32.8663, lng: 59.2211 },
  { name: 'بوشهر', lat: 28.9234, lng: 50.8203 },
  { name: 'شهرکرد', lat: 32.3256, lng: 50.8644 },
  { name: 'سمنان', lat: 35.5729, lng: 53.3971 },
  { name: 'یاسوج', lat: 30.6684, lng: 51.5876 },
  { name: 'ایلام', lat: 33.6374, lng: 46.4227 },
];

if (typeof window !== "undefined") {
  window.PrayerTimesCalculator = PrayerTimesCalculator;
  window.QiblaCalculator = QiblaCalculator;
  window.PrayerHelper = PrayerHelper;
  window.IRAN_PROVINCE_CAPITALS = IRAN_PROVINCE_CAPITALS;
  window.DEFAULT_LOCATION = { lat: 35.6892, lng: 51.3890, timezone: 3.5, name: 'تهران' };
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = {
    PrayerTimesCalculator,
    QiblaCalculator,
    PrayerHelper,
    IRAN_PROVINCE_CAPITALS,
    DEFAULT_LOCATION: { lat: 35.6892, lng: 51.3890, timezone: 3.5, name: 'تهران' },
  };
}
