/**
 * Events Service — Fully offline. Provides lunar/day-specific Iranian
 * occasions purely from the local datasets defined in this file
 * (SOLAR_OCCASIONS / LUNAR_OCCASIONS / INTL_OCCASIONS). No network calls,
 * no remote API, no localStorage caching — everything is computed
 * on-demand from local data only.
 *
 * Design pattern: Repository Pattern (LocalOccasionsRepository is the
 * single source of truth) + Facade (EventsService exposes the same
 * shape the UI already expects).
 *
 * NOTE (fix): Origin of each occasion (شمسی/قمری/میلادی) is now tagged
 * at the source (where it is read from SOLAR_OCCASIONS / LUNAR_OCCASIONS /
 * INTL_OCCASIONS), instead of being guessed from the text afterwards.
 * The previous text-based guesser (detectOccasionTag) is kept only for
 * backward compatibility with any external caller that still imports it,
 * but it is no longer used internally.
 */
"use strict";

const GREGORIAN_MONTHS_EN = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

const OCCASION_HIJRI_MONTHS = [
  "محرم",
  "صفر",
  "ربیع‌الاول",
  "ربیع‌الثانی",
  "جمادی‌الاول",
  "جمادی‌الثانی",
  "رجب",
  "شعبان",
  "رمضان",
  "شوال",
  "ذیقعده",
  "ذیحجه",
];

/** @deprecated kept for backward compatibility only — no longer used internally */
function detectOccasionTag(text) {
  if (GREGORIAN_MONTHS_EN.some((m) => text.includes(m))) return "میلادی";
  if (
    /ع\)|ره\)|عج\)/.test(text) ||
    OCCASION_HIJRI_MONTHS.some((m) => text.includes(m))
  )
    return "قمری";
  return "شمسی";
}

/* ------------------------------------------------------------------ *
 * Local occasions dataset — the ONLY source of data for this service.
 * ------------------------------------------------------------------ */

const SOLAR_OCCASIONS = {
  1: {
    1: { title: "جشن نوروز / آغاز سال نو", holiday: true },
    2: { title: "عید نوروز", holiday: true },
    3: { title: "عید نوروز", holiday: true },
    4: { title: "عید نوروز", holiday: true },
    12: { title: "روز جمهوری اسلامی ایران", holiday: true },
    13: { title: "روز طبیعت (سیزده‌به‌در)", holiday: true },
    25: { title: "روز بزرگداشت عطار نیشابوری", holiday: false },
  },
  2: {
    1: { title: "روز بزرگداشت سعدی", holiday: false },
    3: { title: "روز بزرگداشت شیخ بهایی", holiday: false },
    10: { title: "روز ملی خلیج فارس", holiday: false },
    12: { title: "روز معلم", holiday: false },
    25: { title: "روز بزرگداشت فردوسی", holiday: false },
    28: { title: "روز بزرگداشت خیام نیشابوری", holiday: false },
  },
  3: {
    1: { title: "روز بزرگداشت ملاصدرا", holiday: false },
    14: { title: "رحلت امام خمینی (ره)", holiday: true },
    15: { title: "قیام ۱۵ خرداد", holiday: true },
    29: { title: "درگذشت دکتر علی شریعتی", holiday: false },
  },
  4: {
    1: { title: "جشن آب‌پاشونک / روز اصناف", holiday: false },
    5: { title: "روز جهانی مبارزه با مواد مخدر", holiday: false },
    7: { title: "روز قوه قضاییه", holiday: false },
    8: { title: "روز مبارزه با سلاح‌های شیمیایی", holiday: false },
    10: { title: "روز صنعت و معدن", holiday: false },
    13: { title: "جشن تیرگان", holiday: false },
    14: { title: "روز قلم", holiday: false },
    22: { title: "روز ملی فناوری اطلاعات", holiday: false },
    25: { title: "روز بهزیستی و تامین اجتماعی", holiday: false },
  },
  5: {
    7: { title: "جشن مردادگان", holiday: false },
    10: { title: "جشن چله تابستان", holiday: false },
    14: { title: "روز ملی خط و زبان فارسی", holiday: false },
  },
  6: {
    1: { title: "روز پزشک", holiday: false },
    4: { title: "جشن شهریورگان", holiday: false },
    13: { title: "روز بزرگداشت ابوریحان بیرونی", holiday: false },
    27: { title: "روز شعر و ادب پارسی (شهریار)", holiday: false },
  },
  7: {
    13: { title: "روز جهانی کودک", holiday: false },
    26: { title: "روز دانش‌آموز", holiday: false },
  },
  8: {
    13: { title: "روز نیروی هوایی", holiday: false },
  },
  9: {
    5: { title: "روز بیمه", holiday: false },
    20: { title: "شب یلدا", holiday: false },
  },
  10: {
    1: { title: "جشن خرم‌روز", holiday: false },
    20: { title: "درگذشت امیرکبیر", holiday: false },
  },
  11: {
    22: { title: "پیروزی انقلاب اسلامی", holiday: true },
  },
  12: {
    5: { title: "روز بزرگداشت خواجه نصیرالدین طوسی", holiday: false },
    15: { title: "جشن اسفندگان", holiday: false },
    29: { title: "روز ملی شدن صنعت نفت ایران", holiday: true },
  },
};

const LUNAR_OCCASIONS = {
  1: {
    1: { title: "آغاز سال قمری جدید", holiday: false },
    8: { title: "تاسوعای حسینی", holiday: true },
    9: { title: "عاشورای حسینی", holiday: true },
    11: { title: "شهادت امام زین‌العابدین (ع)", holiday: false },
  },
  2: {
    19: { title: "اربعین حسینی", holiday: true },
    27: {
      title: "رحلت پیامبر اکرم (ص) و شهادت امام حسن مجتبی (ع)",
      holiday: true,
    },
    28: { title: "شهادت امام رضا (ع)", holiday: true },
  },
  3: {
    7: { title: "شهادت امام حسن عسکری (ع)", holiday: true },
    16: { title: "میلاد پیامبر اکرم (ص) و امام جعفر صادق (ع)", holiday: true },
  },
  6: {
    2: { title: "شهادت حضرت فاطمه زهرا (س)", holiday: true },
  },
  7: {
    13: { title: "ولادت امام علی (ع) و روز پدر", holiday: true },
    27: { title: "مبعث پیامبر اکرم (ص)", holiday: true },
  },
  8: {
    15: { title: "ولادت امام زمان (عج) / جشن نیمه شعبان", holiday: true },
  },
  9: {
    21: { title: "شهادت امام علی (ع)", holiday: true },
  },
  10: {
    1: { title: "عید سعید فطر", holiday: true },
    2: { title: "تعطیل به مناسبت عید فطر", holiday: true },
    25: { title: "شهادت امام جعفر صادق (ع)", holiday: false },
  },
  12: {
    9: { title: "روز عرفه", holiday: false },
    10: { title: "عید سعید قربان", holiday: true },
    18: { title: "عید سعید غدیر خم", holiday: true },
  },
};

/* ------------------------------------------------------------------ *
 * INTL_OCCASIONS — Gregorian-date international observances, expanded
 * with fixed-date UN / UNESCO / WHO international days that occur
 * worldwide (movable dates like "first Monday of the month" were
 * intentionally excluded to keep the dataset deterministic).
 * ------------------------------------------------------------------ */

var INTL_OCCASIONS = {
  1: {
    1: { title: "آغاز سال نو میلادی" },
    4: { title: "روز جهانی خط بریل" },
    24: { title: "روز جهانی آموزش" },
    27: { title: "روز بین‌المللی یادبود هولوکاست" },
    28: { title: "روز جهانی حفظ حریم خصوصی اطلاعات" },
  },
  2: {
    2: { title: "روز جهانی تالاب‌ها" },
    4: { title: "روز جهانی سرطان و روز جهانی برادری انسانی" },
    6: { title: "روز جهانی منع ختنه زنان" },
    10: { title: "روز جهانی حبوبات" },
    11: { title: "روز جهانی زنان و دختران در علم" },
    13: { title: "روز جهانی رادیو" },
    14: { title: "روز ولنتاین" },
    20: { title: "روز جهانی عدالت اجتماعی" },
    21: { title: "روز جهانی زبان مادری" },
  },
  3: {
    1: { title: "روز جهانی رفع تبعیض" },
    3: { title: "روز جهانی حیات وحش" },
    8: { title: "روز جهانی زن" },
    14: { title: "روز عدد پی" },
    20: { title: "روز جهانی شادی و روز جهانی زبان فرانسه" },
    21: {
      title:
        "روز جهانی جنگل‌ها، روز جهانی شعر و روز جهانی مبارزه با تبعیض نژادی",
    },
    22: { title: "روز جهانی آب" },
    23: { title: "روز جهانی هواشناسی" },
    24: { title: "روز جهانی مبارزه با سل" },
    25: { title: "روز جهانی یادبود قربانیان برده‌داری" },
    31: { title: "روز جهانی بک‌آپ‌گیری" },
  },
  4: {
    2: { title: "روز جهانی آگاهی از اوتیسم" },
    4: { title: "روز جهانی آگاهی از خطر مین" },
    7: { title: "روز جهانی بهداشت" },
    18: { title: "روز جهانی بناها و محوطه‌های تاریخی" },
    22: { title: "روز جهانی زمین پاک" },
    23: { title: "روز جهانی کتاب و حق مؤلف" },
    25: { title: "روز جهانی مبارزه با مالاریا" },
    29: { title: "روز جهانی رقص و روز یادبود قربانیان زلزله" },
  },
  5: {
    1: { title: "روز جهانی کارگر" },
    3: { title: "روز جهانی آزادی مطبوعات" },
    4: { title: "روز جنگ ستارگان" },
    12: { title: "روز جهانی پرستار" },
    15: { title: "روز جهانی خانواده" },
    17: { title: "روز جهانی مخابرات و جامعه اطلاعاتی" },
    21: { title: "روز جهانی تنوع فرهنگی برای گفتگو و توسعه" },
    22: { title: "روز بین‌المللی تنوع زیستی" },
    29: { title: "روز جهانی نیروهای حافظ صلح سازمان ملل" },
    31: { title: "روز جهانی بدون دخانیات" },
  },
  6: {
    1: { title: "روز جهانی والدین" },
    4: { title: "روز جهانی کودکان بی‌گناه قربانی تجاوز" },
    5: { title: "روز جهانی محیط زیست" },
    8: { title: "روز جهانی اقیانوس‌ها" },
    12: { title: "روز جهانی مبارزه با کار کودکان" },
    17: { title: "روز جهانی مبارزه با بیابان‌زایی و خشکسالی" },
    20: { title: "روز جهانی پناهندگان" },
    23: { title: "روز جهانی خدمات عمومی سازمان ملل" },
    26: {
      title: "روز جهانی مبارزه با سوءمصرف مواد مخدر و حمایت از قربانیان شکنجه",
    },
  },
  7: {
    11: { title: "روز جهانی جمعیت" },
    15: { title: "روز جهانی مهارت‌های جوانان" },
    17: { title: "روز جهانی ایموجی" },
    18: { title: "روز بین‌المللی نلسون ماندلا" },
    28: { title: "روز جهانی هپاتیت" },
    30: { title: "روز جهانی دوستی" },
  },
  8: {
    9: { title: "روز جهانی مردمان بومی" },
    10: { title: "روز جهانی تنبلی" },
    12: { title: "روز جهانی جوانان" },
    13: { title: "روز جهانی چپ‌دست‌ها" },
    19: { title: "روز جهانی عکاسی و روز جهانی بشردوستی" },
    21: { title: "روز جهانی یادبود قربانیان تروریسم" },
    23: { title: "روز جهانی یادبود تجارت برده و لغو آن" },
  },
  9: {
    5: { title: "روز جهانی خیریه" },
    8: { title: "روز جهانی سوادآموزی" },
    9: { title: "روز جهانی حفاظت از آموزش در برابر حمله" },
    15: { title: "روز جهانی دموکراسی" },
    16: { title: "روز جهانی حفاظت از لایه ازن" },
    21: { title: "روز جهانی صلح" },
    27: { title: "روز جهانی جهانگردی و گردشگری" },
  },
  10: {
    1: { title: "روز جهانی سالمندان و روز جهانی قهوه" },
    2: { title: "روز جهانی عدم خشونت" },
    4: { title: "روز جهانی حیوانات" },
    5: { title: "روز جهانی معلم" },
    6: { title: "روز جهانی مسکن" },
    9: { title: "روز جهانی پست" },
    10: { title: "روز جهانی بهداشت روان" },
    13: { title: "روز جهانی کاهش خطر بلایا" },
    15: { title: "روز جهانی زنان روستایی" },
    16: { title: "روز جهانی غذا" },
    17: { title: "روز جهانی ریشه‌کنی فقر" },
    24: { title: "روز ملل متحد" },
    29: { title: "روز جهانی اینترنت" },
  },
  11: {
    6: { title: "روز جهانی پیشگیری از بهره‌برداری از محیط‌زیست در جنگ" },
    10: { title: "روز جهانی علم در خدمت صلح و توسعه" },
    14: { title: "روز جهانی دیابت" },
    16: { title: "روز بین‌المللی بردباری" },
    19: { title: "روز جهانی مردان" },
    20: { title: "روز جهانی کودک" },
    21: { title: "روز جهانی تلویزیون" },
    25: { title: "روز جهانی مبارزه با خشونت علیه زنان" },
    29: { title: "روز جهانی همبستگی با مردم فلسطین" },
  },
  12: {
    1: { title: "روز جهانی ایدز" },
    2: { title: "روز جهانی لغو برده‌داری" },
    3: { title: "روز جهانی معلولان" },
    5: { title: "روز جهانی خاک و روز جهانی داوطلب" },
    7: { title: "روز جهانی هوانوردی کشوری" },
    9: { title: "روز جهانی مبارزه با فساد" },
    10: { title: "روز حقوق بشر" },
    11: { title: "روز بین‌المللی کوهستان" },
    18: { title: "روز جهانی مهاجران" },
    20: { title: "روز جهانی همبستگی انسانی" },
    28: { title: "روز جهانی سینما" },
  },
};

/**
 * LocalOccasionsRepository — builds an object shaped as
 * `{ [day]: { holiday, event: [{ title, holiday, tag }] } }` purely from
 * the local datasets above. This is now the ONLY data source
 * EventsService uses (previously named FallbackOccasionsRepository,
 * kept the same top-level output shape so nothing downstream needs to
 * change — only the shape of each item inside `event` gained a `tag`).
 */
class LocalOccasionsRepository {
  static getMonthData(jy, jm, daysInMonth) {
    const data = {};
    for (let d = 1; d <= daysInMonth; d += 1) {
      const jalaliDate = new JalaliDate(jy, jm, d);
      const gregorian = jalaliDate.toGregorian();
      const hijri = HijriDate.fromGregorian(gregorian);

      const events = []; // { title, holiday, tag }
      let isHoliday = false;

      const solar = SOLAR_OCCASIONS[jm] && SOLAR_OCCASIONS[jm][d];
      if (solar) {
        events.push({
          title: solar.title,
          holiday: !!solar.holiday,
          tag: "شمسی",
        });
        if (solar.holiday) isHoliday = true;
      }

      const lunar =
        LUNAR_OCCASIONS[hijri.month] && LUNAR_OCCASIONS[hijri.month][hijri.day];
      if (lunar) {
        events.push({
          title: lunar.title,
          holiday: !!lunar.holiday,
          tag: "قمری",
        });
        if (lunar.holiday) isHoliday = true;
      }

      const gm = gregorian.getMonth() + 1;
      const gd = gregorian.getDate();
      const intl = INTL_OCCASIONS[gm] && INTL_OCCASIONS[gm][gd];
      if (intl) {
        events.push({ title: intl.title, holiday: false, tag: "میلادی" });
      }

      if (events.length) {
        data[String(d)] = { holiday: isHoliday, event: events };
      }
    }
    return data;
  }

  static getDayData(jy, jm, jd) {
    const jalaliDate = new JalaliDate(jy, jm, jd);
    const daysInMonth = jalaliDate.daysInMonth();
    const monthData = LocalOccasionsRepository.getMonthData(
      jy,
      jm,
      daysInMonth,
    );
    return monthData[String(jd)] || null;
  }
}

class EventsService {
  static async getEventsForDay(jalaliDate) {
    const local = {
      solarEvents: EventRepository.getFixedJalaliEvents(
        jalaliDate.month,
        jalaliDate.day,
      ),
      gregorianEvents: [],
      hijriEvents: [],
      isHoliday: jalaliDate.weekDay === 5,
    };

    const g = jalaliDate.toGregorian();
    local.gregorianEvents = EventRepository.getFixedGregorianEvents(
      g.getMonth() + 1,
      g.getDate(),
    );

    const dayData = LocalOccasionsRepository.getDayData(
      jalaliDate.year,
      jalaliDate.month,
      jalaliDate.day,
    );
    if (dayData) {
      local.isHoliday = local.isHoliday || !!dayData.holiday;
      if (Array.isArray(dayData.event) && dayData.event.length) {
        local.hijriEvents = dayData.event.map((e) => e.title);
      }
    }

    return local;
  }

  static async getMonthHolidayMap(jy, jm) {
    const daysInMonth = new JalaliDate(jy, jm, 1).daysInMonth();
    const monthData = LocalOccasionsRepository.getMonthData(
      jy,
      jm,
      daysInMonth,
    );
    const map = {};
    Object.keys(monthData).forEach((day) => {
      map[day] = !!monthData[day].holiday;
    });
    return map;
  }

  static async getMonthEventsList(jy, jm, daysInMonth) {
    const monthData = LocalOccasionsRepository.getMonthData(
      jy,
      jm,
      daysInMonth,
    );
    const results = [];

    for (let d = 1; d <= daysInMonth; d += 1) {
      const dateObj = new JalaliDate(jy, jm, d);
      const items = [];

      EventRepository.getFixedJalaliEvents(jm, d).forEach((e) => {
        items.push({ text: e.title, holiday: e.holiday, tag: "شمسی" });
      });

      const g = dateObj.toGregorian();
      EventRepository.getFixedGregorianEvents(
        g.getMonth() + 1,
        g.getDate(),
      ).forEach((e) => {
        items.push({ text: e.title, holiday: e.holiday, tag: "میلادی" });
      });

      const dayData = monthData[String(d)];
      if (dayData && Array.isArray(dayData.event)) {
        dayData.event.forEach((e) => {
          items.push({
            text: e.title,
            holiday: !!e.holiday,
            tag: e.tag, // منشأ واقعی، بدون حدس‌زدن روی متن
          });
        });
      }

      if (items.length) {
        const isHoliday =
          dateObj.weekDay === 5 ||
          (dayData && !!dayData.holiday) ||
          items.some((it) => it.holiday);
        results.push({ day: d, isHoliday, items });
      }
    }

    return results;
  }
}

window.EventsService = EventsService;
window.detectOccasionTag = detectOccasionTag;
window.LocalOccasionsRepository = LocalOccasionsRepository;
