/**
 * Events Service — Fetches lunar/day-specific Iranian occasions from a free
 * public API (pnldev.com Jalali Calendar API) and caches results in
 * localStorage for 30 days to avoid repeated network calls.
 * API: https://pnldev.com/fa/api-doc/calender
 *
 * Fallback: if the remote API is unreachable or returns an error, this
 * service falls back to a fully local, offline occasions dataset
 * (SOLAR_OCCASIONS / LUNAR_OCCASIONS / INTL_OCCASIONS) so the app keeps
 * working (and keeps showing holidays/occasions) without a network
 * connection.
 *
 * Design pattern: Decorator (caching over HTTP repository) + Cache-Aside
 * + Null Object / Fallback Repository for offline resilience.
 */
'use strict';

const CACHE_PREFIX = 'shamsi_events_cache_v1_';
const CACHE_TTL_DAYS = 30;
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
const API_BASE = 'https://pnldev.com/api/calender';

const GREGORIAN_MONTHS_EN = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

const OCCASION_HIJRI_MONTHS = [
  'محرم', 'صفر', 'ربیع‌الاول', 'ربیع‌الثانی', 'جمادی‌الاول', 'جمادی‌الثانی',
  'رجب', 'شعبان', 'رمضان', 'شوال', 'ذیقعده', 'ذیحجه'
];

function detectOccasionTag(text) {
  if (GREGORIAN_MONTHS_EN.some((m) => text.includes(m))) return 'میلادی';
  if (/ع\)|ره\)|عج\)/.test(text) || OCCASION_HIJRI_MONTHS.some((m) => text.includes(m))) return 'قمری';
  return 'شمسی';
}

/* ------------------------------------------------------------------ *
 * Local fallback dataset — used only when the remote API call fails.
 * ------------------------------------------------------------------ */

const SOLAR_OCCASIONS = {
  1: {
    1: { title: 'جشن نوروز / آغاز سال نو', holiday: true },
    2: { title: 'عید نوروز', holiday: true },
    3: { title: 'عید نوروز', holiday: true },
    4: { title: 'عید نوروز', holiday: true },
    12: { title: 'روز جمهوری اسلامی ایران', holiday: true },
    13: { title: 'روز طبیعت (سیزده‌به‌در)', holiday: true },
    25: { title: 'روز بزرگداشت عطار نیشابوری', holiday: false }
  },
  2: {
    1: { title: 'روز بزرگداشت سعدی', holiday: false },
    3: { title: 'روز بزرگداشت شیخ بهایی', holiday: false },
    10: { title: 'روز ملی خلیج فارس', holiday: false },
    12: { title: 'روز معلم', holiday: false },
    25: { title: 'روز بزرگداشت فردوسی', holiday: false },
    28: { title: 'روز بزرگداشت خیام نیشابوری', holiday: false }
  },
  3: {
    1: { title: 'روز بزرگداشت ملاصدرا', holiday: false },
    14: { title: 'رحلت امام خمینی (ره)', holiday: true },
    15: { title: 'قیام ۱۵ خرداد', holiday: true },
    29: { title: 'درگذشت دکتر علی شریعتی', holiday: false }
  },
  4: {
    1: { title: 'جشن آب‌پاشونک / روز اصناف', holiday: false },
    5: { title: 'روز جهانی مبارزه با مواد مخدر', holiday: false },
    7: { title: 'روز قوه قضاییه', holiday: false },
    8: { title: 'روز مبارزه با سلاح‌های شیمیایی', holiday: false },
    10: { title: 'روز صنعت و معدن', holiday: false },
    13: { title: 'جشن تیرگان', holiday: false },
    14: { title: 'روز قلم', holiday: false },
    22: { title: 'روز ملی فناوری اطلاعات', holiday: false },
    25: { title: 'روز بهزیستی و تامین اجتماعی', holiday: false }
  },
  5: {
    7: { title: 'جشن مردادگان', holiday: false },
    10: { title: 'جشن چله تابستان', holiday: false },
    14: { title: 'روز ملی خط و زبان فارسی', holiday: false }
  },
  6: {
    1: { title: 'روز پزشک', holiday: false },
    4: { title: 'جشن شهریورگان', holiday: false },
    13: { title: 'روز بزرگداشت ابوریحان بیرونی', holiday: false },
    27: { title: 'روز شعر و ادب پارسی (شهریار)', holiday: false }
  },
  7: {
    13: { title: 'روز جهانی کودک', holiday: false },
    26: { title: 'روز دانش‌آموز', holiday: false }
  },
  8: {
    13: { title: 'روز نیروی هوایی', holiday: false }
  },
  9: {
    5: { title: 'روز بیمه', holiday: false },
    20: { title: 'شب یلدا', holiday: false }
  },
  10: {
    1: { title: 'جشن خرم‌روز', holiday: false },
    20: { title: 'درگذشت امیرکبیر', holiday: false }
  },
  11: {
    22: { title: 'پیروزی انقلاب اسلامی', holiday: true }
  },
  12: {
    5: { title: 'روز بزرگداشت خواجه نصیرالدین طوسی', holiday: false },
    15: { title: 'جشن اسفندگان', holiday: false },
    29: { title: 'روز ملی شدن صنعت نفت ایران', holiday: true }
  }
};

const LUNAR_OCCASIONS = {
  1: {
    1: { title: 'آغاز سال قمری جدید', holiday: false },
    8: { title: 'تاسوعای حسینی', holiday: true },
    9: { title: 'عاشورای حسینی', holiday: true },
    11: { title: 'شهادت امام زین‌العابدین (ع)', holiday: false }
  },
  2: {
    19: { title: 'اربعین حسینی', holiday: true },
    27: { title: 'رحلت پیامبر اکرم (ص) و شهادت امام حسن مجتبی (ع)', holiday: true },
    28: { title: 'شهادت امام رضا (ع)', holiday: true }
  },
  3: {
    7: { title: 'شهادت امام حسن عسکری (ع)', holiday: true },
    16: { title: 'میلاد پیامبر اکرم (ص) و امام جعفر صادق (ع)', holiday: true }
  },
  6: {
    2: { title: 'شهادت حضرت فاطمه زهرا (س)', holiday: true }
  },
  7: {
    13: { title: 'ولادت امام علی (ع) و روز پدر', holiday: true },
    27: { title: 'مبعث پیامبر اکرم (ص)', holiday: true }
  },
  8: {
    15: { title: 'ولادت امام زمان (عج) / جشن نیمه شعبان', holiday: true }
  },
  9: {
    21: { title: 'شهادت امام علی (ع)', holiday: true }
  },
  10: {
    1: { title: 'عید سعید فطر', holiday: true },
    2: { title: 'تعطیل به مناسبت عید فطر', holiday: true },
    25: { title: 'شهادت امام جعفر صادق (ع)', holiday: false }
  },
  12: {
    9: { title: 'روز عرفه', holiday: false },
    10: { title: 'عید سعید قربان', holiday: true },
    18: { title: 'عید سعید غدیر خم', holiday: true }
  }
};

var INTL_OCCASIONS = {
  1: {
    1: { title: 'آغاز سال نو میلادی' },
    24: { title: 'روز جهانی آموزش' },
    27: { title: 'روز بین‌المللی یادبود هولوکاست' },
    28: { title: 'روز جهانی حفظ حریم خصوصی اطلاعات' }
  },
  2: {
    2: { title: 'روز جهانی تالاب‌ها' },
    4: { title: 'روز جهانی سرطان' },
    11: { title: 'روز جهانی زنان و دختران در علم' },
    14: { title: 'روز ولنتاین' },
    20: { title: 'روز جهانی عدالت اجتماعی' },
    21: { title: 'روز جهانی زبان مادری' }
  },
  3: {
    3: { title: 'روز جهانی حیات وحش' },
    8: { title: 'روز جهانی زن' },
    14: { title: 'روز عدد پی' },
    20: { title: 'روز جهانی شادی' },
    21: { title: 'روز جهانی جنگل‌ها و روز جهانی شعر' },
    22: { title: 'روز جهانی آب' },
    31: { title: 'روز جهانی بک‌آپ‌گیری' }
  },
  4: {
    2: { title: 'روز جهانی آگاهی از اوتیسم' },
    7: { title: 'روز جهانی بهداشت' },
    18: { title: 'روز جهانی بناها و محوطه‌های تاریخی' },
    22: { title: 'روز جهانی زمین پاک' },
    23: { title: 'روز جهانی کتاب و حق مؤلف' },
    29: { title: 'روز جهانی رقص' }
  },
  5: {
    1: { title: 'روز جهانی کارگر' },
    3: { title: 'روز جهانی آزادی مطبوعات' },
    4: { title: 'روز جنگ ستارگان' },
    12: { title: 'روز جهانی پرستار' },
    15: { title: 'روز جهانی خانواده' },
    22: { title: 'روز بین‌المللی تنوع زیستی' },
    31: { title: 'روز جهانی بدون دخانیات' }
  },
  6: {
    1: { title: 'روز جهانی والدین' },
    5: { title: 'روز جهانی محیط زیست' },
    8: { title: 'روز جهانی اقیانوس‌ها' },
    12: { title: 'روز جهانی مبارزه با کار کودکان' },
    20: { title: 'روز جهانی پناهندگان' }
  },
  7: {
    11: { title: 'روز جهانی جمعیت' },
    15: { title: 'روز جهانی مهارت‌های جوانان' },
    17: { title: 'روز جهانی ایموجی' },
    18: { title: 'روز بین‌المللی نلسون ماندلا' },
    28: { title: 'روز جهانی هپاتیت' },
    30: { title: 'روز جهانی دوستی' }
  },
  8: {
    9: { title: 'روز جهانی مردمان بومی' },
    10: { title: 'روز جهانی تنبلی' },
    12: { title: 'روز جهانی جوانان' },
    13: { title: 'روز جهانی چپ‌دست‌ها' },
    19: { title: 'روز جهانی عکاسی و انسان‌دوستی' }
  },
  9: {
    5: { title: 'روز جهانی خیریه' },
    8: { title: 'روز جهانی سوادآموزی' },
    15: { title: 'روز جهانی دموکراسی' },
    21: { title: 'روز جهانی صلح' },
    27: { title: 'روز جهانی جهانگردی و گردشگری' }
  },
  10: {
    1: { title: 'روز جهانی سالمندان و روز جهانی قهوه' },
    4: { title: 'روز جهانی حیوانات' },
    5: { title: 'روز جهانی معلم' },
    10: { title: 'روز جهانی بهداشت روان' },
    16: { title: 'روز جهانی غذا' },
    24: { title: 'روز ملل متحد' },
    29: { title: 'روز جهانی اینترنت' }
  },
  11: {
    10: { title: 'روز جهانی علم در خدمت صلح و توسعه' },
    14: { title: 'روز جهانی دیابت' },
    16: { title: 'روز بین‌المللی بردباری' },
    19: { title: 'روز جهانی مردان' },
    20: { title: 'روز جهانی کودک' },
    25: { title: 'روز جهانی مبارزه با خشونت علیه زنان' }
  },
  12: {
    1: { title: 'روز جهانی ایدز' },
    3: { title: 'روز جهانی معلولان' },
    5: { title: 'روز جهانی خاک' },
    10: { title: 'روز حقوق بشر' },
    11: { title: 'روز بین‌المللی کوهستان' },
    18: { title: 'روز جهانی مهاجران' },
    28: { title: 'روز جهانی سینما' }
  }
};

/**
 * FallbackOccasionsRepository — builds an object shaped exactly like the
 * remote API's `result` payload (`{ [day]: { holiday, event: [titles] } }`)
 * purely from local data, so downstream code (EventsService) doesn't need
 * to know whether the data came from the network or from disk.
 */
class FallbackOccasionsRepository {
  static getMonthData(jy, jm, daysInMonth) {
    const data = {};
    for (let d = 1; d <= daysInMonth; d += 1) {
      const jalaliDate = new JalaliDate(jy, jm, d);
      const gregorian = jalaliDate.toGregorian();
      const hijri = HijriDate.fromGregorian(gregorian);

      const events = [];
      let isHoliday = false;

      const solar = SOLAR_OCCASIONS[jm] && SOLAR_OCCASIONS[jm][d];
      if (solar) {
        events.push(solar.title);
        if (solar.holiday) isHoliday = true;
      }

      const lunar = LUNAR_OCCASIONS[hijri.month] && LUNAR_OCCASIONS[hijri.month][hijri.day];
      if (lunar) {
        events.push(lunar.title);
        if (lunar.holiday) isHoliday = true;
      }

      const gm = gregorian.getMonth() + 1;
      const gd = gregorian.getDate();
      const intl = INTL_OCCASIONS[gm] && INTL_OCCASIONS[gm][gd];
      if (intl) {
        events.push(intl.title);
      }

      if (events.length) {
        data[String(d)] = { holiday: isHoliday, event: events };
      }
    }
    return data;
  }
}

class LocalCacheStore {
  static read(key) {
    try {
      const raw = localStorage.getItem(key);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (Date.now() - parsed.savedAt > CACHE_TTL_MS) {
        localStorage.removeItem(key);
        return null;
      }
      return parsed.data;
    } catch (e) {
      return null;
    }
  }

  static write(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
    } catch (e) {
      // storage unavailable; app still works without cache
    }
  }

  static purgeExpired() {
    const now = Date.now();
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(CACHE_PREFIX)) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key));
        if (now - parsed.savedAt > CACHE_TTL_MS) localStorage.removeItem(key);
      } catch (e) {
        localStorage.removeItem(key);
      }
    }
  }
}

class EventsApiRepository {
  static async getMonthEvents(jy, jm) {
    const cacheKey = `${CACHE_PREFIX}${jy}-${jm}`;
    const cached = LocalCacheStore.read(cacheKey);
    if (cached) return cached;

    try {
      const url = `${API_BASE}?year=${jy}&month=${jm}`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error(`network error: ${res.status}`);
      const json = await res.json();
      if (!json.status) throw new Error('api returned failure');
      LocalCacheStore.write(cacheKey, json.result);
      return json.result;
    } catch (err) {
      console.warn('EventsApiRepository: fetch failed, using local fallback occasions:', err.message);
      const daysInMonth = new JalaliDate(jy, jm, 1).daysInMonth();
      const fallback = FallbackOccasionsRepository.getMonthData(jy, jm, daysInMonth);
      // Note: fallback data is not cached, so a fresh network attempt is
      // made next time (in case connectivity is restored).
      return fallback;
    }
  }

  static async getDayEvents(jy, jm, jd) {
    const monthData = await EventsApiRepository.getMonthEvents(jy, jm);
    if (monthData && monthData[String(jd)]) return monthData[String(jd)];
    return null;
  }
}

class EventsService {
  static async getEventsForDay(jalaliDate) {
    const local = {
      solarEvents: EventRepository.getFixedJalaliEvents(jalaliDate.month, jalaliDate.day),
      gregorianEvents: [],
      hijriEvents: [],
      isHoliday: jalaliDate.weekDay === 5
    };

    const g = jalaliDate.toGregorian();
    local.gregorianEvents = EventRepository.getFixedGregorianEvents(g.getMonth() + 1, g.getDate());

    const apiDay = await EventsApiRepository.getDayEvents(jalaliDate.year, jalaliDate.month, jalaliDate.day);
    if (apiDay) {
      local.isHoliday = local.isHoliday || !!apiDay.holiday;
      if (Array.isArray(apiDay.event) && apiDay.event.length) {
        local.hijriEvents = apiDay.event;
      }
    }

    return local;
  }

  static async getMonthHolidayMap(jy, jm) {
    const monthData = await EventsApiRepository.getMonthEvents(jy, jm);
    const map = {};
    if (monthData) {
      Object.keys(monthData).forEach((day) => {
        map[day] = !!monthData[day].holiday;
      });
    }
    return map;
  }

  static async getMonthEventsList(jy, jm, daysInMonth) {
    const apiMonthData = await EventsApiRepository.getMonthEvents(jy, jm);
    const results = [];

    for (let d = 1; d <= daysInMonth; d += 1) {
      const dateObj = new JalaliDate(jy, jm, d);
      const items = [];

      EventRepository.getFixedJalaliEvents(jm, d).forEach((e) => {
        items.push({ text: e.title, holiday: e.holiday, tag: '' });
      });

      const g = dateObj.toGregorian();
      EventRepository.getFixedGregorianEvents(g.getMonth() + 1, g.getDate()).forEach((e) => {
        items.push({ text: e.title, holiday: e.holiday, tag: '' });
      });

      const apiDay = apiMonthData && apiMonthData[String(d)];
      if (apiDay && Array.isArray(apiDay.event)) {
        apiDay.event.forEach((e) => {
          items.push({ text: e, holiday: !!apiDay.holiday, tag: detectOccasionTag(e) });
        });
      }

      if (items.length) {
        const isHoliday = dateObj.weekDay === 5 || (apiDay && !!apiDay.holiday) || items.some((it) => it.holiday);
        results.push({ day: d, isHoliday, items });
      }
    }

    return results;
  }
}

LocalCacheStore.purgeExpired();

window.EventsService = EventsService;
window.LocalCacheStore = LocalCacheStore;
window.detectOccasionTag = detectOccasionTag;
window.FallbackOccasionsRepository = FallbackOccasionsRepository;