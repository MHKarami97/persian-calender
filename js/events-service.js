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
 * Datasets: month -> day -> [titles]. Holidays are kept in separate
 * Sets ("month-day") so the tables stay compact and readable.
 * Only fixed-date occasions live here; moving ones are computed rules.
 * ------------------------------------------------------------------ */

const SOLAR_OCCASIONS = {
  1: {
    1: ["جشن نوروز", "جشن سال نو"],
    2: ["عید نوروز"],
    3: ["عید نوروز"],
    4: ["عید نوروز"],
    6: ["روز امید", "روز شادباش‌نویسی", "زادروز زرتشت"],
    10: ["جشن آبانگاه"],
    12: ["روز جمهوری اسلامی"],
    13: ["جشن سیزده‌به‌در", "روز طبیعت"],
    15: ["روز ذخایر ژنتیکی و زیستی"],
    17: ["سروش روز", "جشن سروشگان"],
    19: ["فروردین روز", "جشن فروردینگان"],
    20: ["روز ملی فناوری هسته‌ای"],
    23: ["روز دندان‌پزشک"],
    25: ["روز بزرگداشت عطار نیشابوری", "روز ملی منابع انسانی"],
    29: ["روز ارتش جمهوری اسلامی ایران"],
    30: ["روز علوم آزمایشگاهی", "زادروز حکیم سید اسماعیل جرجانی"],
  },
  2: {
    1: ["روز بزرگداشت سعدی"],
    2: ["جشن گیاه‌آوری"],
    3: ["روز بزرگداشت شیخ بهایی", "روز ملی کارآفرینی", "روز معمار"],
    7: ["روز ایمنی حمل و نقل"],
    9: ["روز شوراها"],
    10: ["جشن چهلم نوروز", "روز ملی خلیج فارس"],
    12: ["کشته شدن مرتضی مطهری", "روز معلم"],
    15: ["جشن میانه بهار", "جشن بهاربد", "روز شیراز"],
    18: ["روز بیماری‌های خاص و صعب‌العلاج"],
    19: ["روز اسناد ملی و میراث مکتوب", "روز بزرگداشت شیخ کلینی"],
    25: ["روز بزرگداشت فردوسی"],
    27: ["روز ارتباطات و روابط عمومی"],
    28: ["روز بزرگداشت حکیم عمر خیام"],
    30: ["روز ملی جمعیت"],
    31: ["روز اهدای عضو، اهدای زندگی"],
  },
  3: {
    1: ["روز بهره‌وری و بهینه‌سازی مصرف", "روز بزرگداشت ملاصدرا"],
    3: ["فتح خرمشهر در عملیات بیت‌المقدس", "روز مقاومت، ایثار و پیروزی"],
    4: ["روز دزفول", "روز مقاومت و پایداری"],
    6: ["جشن خردادگان"],
    8: ["روز مشاوران املاک", "روز فرهنگ پهلوانی و ورزش زورخانه‌ای"],
    14: ["رحلت امام خمینی (ره)"],
    15: ["قیام ۱۵ خرداد"],
    22: ["روز دختران"],
    25: ["روز ملی گل و گیاه"],
    27: ["روز جهاد کشاورزی"],
    29: ["درگذشت دکتر علی شریعتی"],
  },
  4: {
    1: ["جشن آب‌پاشونک", "جشن آغاز تابستان", "روز اصناف"],
    7: [
      "انفجار دفتر حزب جمهوری اسلامی و شهادت دکتر بهشتی و ۷۲ تن از یارانش",
      "روز قوه قضاییه",
    ],
    8: ["روز مبارزه با سلاح‌های شیمیایی و میکروبی"],
    10: ["روز صنعت و معدن"],
    13: ["تیر روز", "جشن تیرگان"],
    14: ["روز قلم"],
    15: ["جشن خام‌خواری"],
    22: ["بزرگداشت خوارزمی"],
    25: ["روز بهزیستی و تأمین اجتماعی"],
    27: ["اعلام پذیرش قطعنامه ۵۹۸ شورای امنیت از سوی ایران"],
  },
  5: {
    6: ["روز ترویج آموزش‌های فنی و حرفه‌ای"],
    7: ["مرداد روز", "جشن مردادگان"],
    8: ["روز بزرگداشت شیخ شهاب‌الدین سهروردی"],
    10: ["جشن چله تابستان"],
    14: ["صدور فرمان مشروطیت"],
    17: ["روز خبرنگار"],
    26: ["سالروز ورود اسیران جنگ به ایران"],
    28: ["سالروز کودتای ۲۸ مرداد", "سالروز فاجعه آتش‌زدن سینما رکس آبادان"],
  },
  6: {
    1: ["روز بزرگداشت ابوعلی سینا", "روز پزشک"],
    2: ["آغاز هفته دولت"],
    4: ["زادروز داراب", "شهریور روز", "جشن شهریورگان", "روز کارمند"],
    5: ["روز بزرگداشت محمد بن زکریای رازی", "روز داروساز"],
    8: ["انفجار در دفتر نخست‌وزیری", "روز مبارزه با تروریسم"],
    11: ["روز صنعت چاپ"],
    13: ["روز بزرگداشت ابوریحان بیرونی", "روز تعاون"],
    17: ["واقعه ۱۷ شهریور"],
    19: ["درگذشت سید محمود طالقانی"],
    21: ["روز سینما"],
    27: ["روز شعر و ادب پارسی", "روز بزرگداشت شهریار"],
    30: ["روز گفتگوی تمدن‌ها"],
    31: ["آغاز هفته دفاع مقدس"],
  },
  7: {
    1: ["آغاز حمله مغول به ایران در پاییز ۵۹۸ خورشیدی"],
    7: [
      "روز آتش‌نشانی و ایمنی",
      "سقوط هواپیمای حامل جمعی از فرماندهان جنگ در سال ۱۳۶۰",
    ],
    8: ["روز بزرگداشت مولوی"],
    13: ["روز نیروی انتظامی"],
    14: ["روز دامپزشکی"],
    16: ["مهر روز", "جشن مهرگان", "روز ملی کودک"],
    20: ["روز بزرگداشت حافظ"],
    21: ["جشن پیروزی کاوه و فریدون"],
    26: ["روز تربیت بدنی و ورزش"],
  },
  8: {
    1: ["روز آمار و برنامه‌ریزی"],
    7: ["سالروز ورود کوروش بزرگ به بابل در سال ۵۳۹ پیش از میلاد"],
    8: ["روز نوجوان"],
    10: ["آبان روز", "جشن آبانگان"],
    13: ["روز دانش‌آموز"],
    14: ["روز فرهنگ عمومی"],
    15: ["جشن میانه پاییز"],
    18: ["روز ملی کیفیت"],
    24: ["روز کتاب و کتابخوانی"],
  },
  9: {
    1: ["روز اصفهان", "آذر جشن"],
    5: ["روز بسیج مستضعفان"],
    7: ["روز نیروی دریایی"],
    9: ["جشن آذرگان", "آذر روز"],
    10: ["روز مجلس"],
    13: ["روز بیمه"],
    15: ["روز حسابدار"],
    16: ["روز دانشجو"],
    25: ["روز پژوهش"],
    26: ["روز حمل و نقل"],
    30: ["جشن شب یلدا"],
  },
  10: {
    1: ["روز میلاد خورشید", "جشن خرم‌روز", "نخستین جشن دیگان"],
    3: ["روز ثبت احوال"],
    5: ["سالروز زمین‌لرزه بم در سال ۱۳۸۲", "سالروز درگذشت زرتشت"],
    8: ["دی به آذر روز", "دومین جشن دیگان"],
    14: ["روز مادر و زن"],
    15: ["دی به مهر روز", "سومین جشن دیگان"],
    20: ["سالروز قتل امیرکبیر به دستور ناصرالدین شاه قاجار"],
    23: ["دی به دین روز", "چهارمین جشن دیگان"],
    29: ["روز ملی هوای پاک"],
  },
  11: {
    1: ["زادروز فردوسی"],
    2: ["بهمن روز", "جشن بهمنگان"],
    5: ["جشن نوسره", "روز پدر و مرد"],
    10: ["جشن سده"],
    12: ["بازگشت امام خمینی (ره) به ایران"],
    15: ["جشن میانه زمستان"],
    19: ["روز نیروی هوایی"],
    22: ["پیروزی انقلاب اسلامی"],
    29: ["جشن سپندارمذگان", "روز عشق"],
  },
  12: {
    5: [
      "روز بزرگداشت خواجه نصیرالدین طوسی",
      "روز مهندس",
      "روز بزرگداشت زمین و بانوان",
    ],
    7: [
      "سالروز استقلال کانون وکلای دادگستری",
      "روز وکیل مدافع",
      "سالروز درگذشت علی‌اکبر دهخدا",
    ],
    15: ["روز درختکاری"],
    25: ["پایان سرایش شاهنامه"],
    29: ["روز ملی شدن صنعت نفت ایران"],
  },
};

const SOLAR_HOLIDAYS = new Set([
  "1-1",
  "1-2",
  "1-3",
  "1-4",
  "1-12",
  "1-13",
  "3-14",
  "3-15",
  "11-22",
  "12-29",
]);

const LUNAR_OCCASIONS = {
  1: {
    1: ["آغاز سال قمری جدید"],
    9: ["تاسوعای حسینی"],
    10: ["عاشورای حسینی"],
    25: ["شهادت امام زین‌العابدین (ع)"],
  },
  2: {
    20: ["اربعین حسینی"],
    28: ["رحلت پیامبر اکرم (ص)", "شهادت امام حسن مجتبی (ع)"],
  },
  3: {
    8: ["شهادت امام حسن عسکری (ع)"],
    17: ["میلاد پیامبر اکرم (ص)", "میلاد امام جعفر صادق (ع)"],
  },
  6: {
    3: ["شهادت حضرت فاطمه زهرا (س)"],
  },
  7: {
    3: ["شهادت امام هادی (ع)"],
    13: ["ولادت امام علی (ع)", "روز پدر"],
    25: ["شهادت امام موسی کاظم (ع)"],
    27: ["مبعث پیامبر اکرم (ص)"],
  },
  8: {
    3: ["ولادت امام حسین (ع)"],
    15: ["ولادت امام زمان (عج)", "جشن نیمه شعبان"],
  },
  9: {
    21: ["شهادت امام علی (ع)"],
  },
  10: {
    1: ["عید سعید فطر"],
    2: ["تعطیل به مناسبت عید فطر"],
    25: ["شهادت امام جعفر صادق (ع)"],
  },
  11: {
    11: ["ولادت امام رضا (ع)"],
    29: ["شهادت امام جواد (ع)"],
  },
  12: {
    7: ["شهادت امام محمد باقر (ع)"],
    9: ["روز عرفه"],
    10: ["عید سعید قربان"],
    15: ["ولادت امام هادی (ع)"],
    18: ["عید سعید غدیر خم"],
  },
};

const LUNAR_HOLIDAYS = new Set([
  "1-9",
  "1-10",
  "2-20",
  "2-28",
  "3-17",
  "6-3",
  "7-13",
  "7-25",
  "7-27",
  "8-15",
  "9-21",
  "10-1",
  "10-2",
  "10-25",
  "12-10",
  "12-18",
]);

/** Occasions pinned to the LAST day of a hijri month (month length is 29 or 30). */
const LUNAR_LAST_DAY_OCCASIONS = {
  2: { titles: ["شهادت امام رضا (ع)"], holiday: true },
};

/** Gregorian-date observances: month -> day -> [titles]. Fixed dates only. */
const INTL_OCCASIONS = {
  1: {
    1: ["آغاز سال نو میلادی"],
    4: ["روز جهانی خط بریل"],
    11: ["درگذشت کارل دیوید اندرسون، برنده نوبل فیزیک ۱۹۳۶", "روز جهانی خنده"],
    14: ["روز جهانی جوک"],
    27: ["روز جهانی کمک به جذامیان"],
  },
  2: {
    1: ["روز جهانی حجاب"],
    2: ["روز جهانی تالاب‌ها"],
    4: ["روز جهانی سرطان"],
    6: ["روز جهانی مقابله با ناقص‌سازی زنان"],
    11: ["حمله به سفارت روسیه و قتل گریبایدوف"],
    12: ["زادروز چارلز داروین"],
    14: ["روز ولنتاین"],
    18: ["سالروز درگذشت میکل‌آنژ", "روز جهانی مجسمه‌سازی"],
    20: ["روز جهانی عدالت اجتماعی"],
    21: ["روز جهانی زبان مادری"],
    22: ["روز جهانی راهنمایان گردشگری"],
  },
  3: {
    1: ["روز جهانی اختراعات و اکتشافات"],
    6: ["روز جهانی گلوکوم"],
    8: ["روز جهانی زن"],
    12: ["روز جهانی کلیه"],
    21: [
      "روز جهانی جنگل",
      "روز جهانی رفع تبعیض نژادی",
      "روز جهانی شعر",
      "روز جهانی سندرم داون",
    ],
    22: ["روز جهانی آب"],
    23: ["روز جهانی هواشناسی"],
    24: ["روز جهانی مبارزه با سل"],
    27: ["روز جهانی تئاتر"],
  },
  4: {
    2: ["روز جهانی کتاب کودک"],
    7: ["روز جهانی بهداشت", "روز جهانی کاریکاتور و کاریکاتوریست‌ها"],
    17: ["روز جهانی هموفیلی"],
    22: ["روز جهانی زمین پاک"],
    23: ["روز جهانی کتاب و حق مولف"],
    25: ["روز جهانی مالاریا"],
    27: ["روز جهانی گرافیک"],
    28: ["روز جهانی بهداشت حرفه‌ای"],
    29: ["روز جهانی رقص", "روز جهانی روان‌شناس و مشاور"],
  },
  5: {
    1: ["روز جهانی کارگر"],
    3: ["روز جهانی آزادی مطبوعات"],
    5: ["روز جهانی ماما", "روز جهانی آسم"],
    7: ["روز جهانی یتیمان مبتلا به ویروس ایدز"],
    8: ["روز جهانی صلیب سرخ و هلال احمر", "روز جهانی تالاسمی"],
    15: ["روز جهانی خانواده"],
    17: ["روز جهانی ارتباطات"],
    18: ["روز جهانی موزه و میراث فرهنگی"],
    21: ["روز جهانی توسعه فرهنگی"],
    22: ["روز جهانی تنوع زیستی", "روز جهانی مو فرفری‌ها"],
    27: ["روز جهانی ام‌اس"],
    29: ["روز جهانی حافظان صلح ملل متحد"],
    31: ["روز جهانی بدون دخانیات"],
  },
  6: {
    5: ["روز جهانی محیط زیست"],
    8: ["روز جهانی اقیانوس‌ها"],
    10: ["روز جهانی صنایع دستی"],
    12: ["روز جهانی مبارزه با کار کودکان"],
    14: ["روز جهانی اهدای خون"],
    15: ["روز جهانی گل"],
    17: ["روز جهانی بیابان‌زدایی"],
    20: ["روز جهانی پناهندگان"],
    26: ["روز جهانی مبارزه با مواد مخدر", "روز جهانی قربانیان خشونت"],
  },
  7: {
    11: ["روز جهانی جمعیت"],
    23: ["روز جهانی لغو برده‌داری"],
  },
  8: {
    1: ["آغاز هفته جهانی شیردهی", "روز جهانی دوست دختر"],
    9: ["روز جهانی مردم بومی"],
    12: ["روز جهانی جوانان"],
    13: ["روز جهانی چپ‌دستان"],
    19: ["روز جهانی انسان‌دوستی", "روز جهانی عکاسی"],
  },
  9: {
    8: ["روز جهانی سوادآموزی"],
    10: ["روز جهانی پیشگیری از خودکشی"],
    11: ["حمله به برج‌های دوقلوی مرکز تجارت جهانی"],
    16: ["روز جهانی حفظ لایه ازن"],
    21: ["روز جهانی صلح", "روز جهانی آلزایمر"],
    27: ["روز جهانی جهانگردی"],
    30: [
      "روز جهانی دریانوردی",
      "روز جهانی ناشنوایان",
      "روز جهانی ترجمه و مترجم",
    ],
  },
  10: {
    1: ["روز جهانی سالمندان"],
    2: ["روز جهانی اقدامات همدلانه", "روز جهانی بدون خشونت"],
    5: ["روز جهانی معلم"],
    8: ["روز جهانی کودک"],
    9: ["روز جهانی پست"],
    10: ["روز جهانی بهداشت روان", "روز جهانی مبارزه با حکم اعدام"],
    11: ["روز جهانی دختر"],
    12: ["روز اسکان معلولان و سالمندان"],
    14: ["روز جهانی استاندارد"],
    15: ["روز جهانی نابینایان (عصای سفید)"],
    16: ["روز جهانی غذا"],
    17: ["روز جهانی ریشه‌کنی فقر"],
    20: ["روز جهانی پوکی استخوان"],
    24: ["روز ملل متحد", "روز جهانی توسعه اطلاعات"],
    27: ["روز جهانی میراث سمعی و بصری"],
    29: ["روز جهانی پسوریازیس"],
  },
  11: {
    6: [
      "روز جهانی پیشگیری از سوءاستفاده از محیط زیست در جنگ و مناقشات مسلحانه",
    ],
    10: ["روز جهانی علم در خدمت صلح و توسعه"],
    14: ["روز جهانی دیابت"],
    15: ["روز نان و پنیر"],
    16: ["روز جهانی بردباری"],
    17: ["روز جهانی دانشجو"],
    20: ["روز جهانی کودک", "روز صنعتی‌سازی آفریقا"],
    21: ["روز جهانی تلویزیون"],
    25: ["روز جهانی مبارزه با خشونت علیه زنان"],
    29: ["روز جهانی همبستگی با مردم فلسطین"],
  },
  12: {
    1: ["روز جهانی مبارزه با ایدز"],
    2: ["روز جهانی لغو برده‌داری"],
    3: ["روز جهانی معلولان"],
    5: ["روز جهانی داوطلبان برای توسعه اقتصادی و اجتماعی"],
    7: ["روز جهانی هوانوردی غیرنظامی"],
    10: ["روز جهانی حقوق بشر", "روز جهانی مبارزه با فساد"],
    11: ["روز جهانی کوهستان"],
    12: ["روز جهانی حمایت از بیماران کلیوی"],
    18: ["روز بین‌المللی مهاجران"],
    20: ["روز بین‌المللی همبستگی بشر"],
    25: ["جشن کریسمس"],
    29: ["روز بین‌المللی تنوع زیستی"],
  },
};

/* ------------------------------------------------------------------ *
 * Computed rules (dates that move relative to the fixed tables)
 * ------------------------------------------------------------------ */

const WEDNESDAY = 4; // JalaliDate.weekDay: Saturday = 0 ... Friday = 6
const PROGRAMMER_DAY_OF_YEAR = 256;
const MS_PER_DAY = 86400000;

class OccasionRules {
  /** Last Wednesday of Esfand. */
  static isChaharshanbeSuri(jm, jalaliDate, daysInMonth) {
    return (
      jm === 12 &&
      jalaliDate.weekDay === WEDNESDAY &&
      jalaliDate.day > daysInMonth - 7
    );
  }

  /** 256th day of the Gregorian year (13 Sep, or 12 Sep in leap years). */
  static isProgrammerDay(gregorian) {
    const dayOfYear = Math.round(
      (Date.UTC(
        gregorian.getFullYear(),
        gregorian.getMonth(),
        gregorian.getDate(),
      ) -
        Date.UTC(gregorian.getFullYear(), 0, 0)) /
        MS_PER_DAY,
    );
    return dayOfYear === PROGRAMMER_DAY_OF_YEAR;
  }

  /** True when the next Gregorian day already belongs to another hijri month. */
  static isLastDayOfHijriMonth(gregorian, hijri) {
    const next = new Date(gregorian.getTime() + MS_PER_DAY);
    return HijriDate.fromGregorian(next).month !== hijri.month;
  }
}

/**
 * LocalOccasionsRepository — builds
 * `{ [day]: { holiday, event: [{ title, holiday, tag }] } }` from the local
 * datasets. `tag` is set at the source (شمسی / قمری / میلادی).
 */
const monthCache = new Map();

class LocalOccasionsRepository {
  static #collect(events, titles, tag, holiday) {
    for (const title of titles) {
      events.push({ title, holiday, tag });
    }
    return holiday;
  }

  static getMonthData(jy, jm, daysInMonth) {
    const cacheKey = `${jy}-${jm}`;
    const cached = monthCache.get(cacheKey);
    if (cached) return cached;

    const data = {};
    for (let d = 1; d <= daysInMonth; d += 1) {
      const jalaliDate = new JalaliDate(jy, jm, d);
      const gregorian = jalaliDate.toGregorian();
      const hijri = HijriDate.fromGregorian(gregorian);
      const events = [];
      let isHoliday = false;

      const solarTitles = SOLAR_OCCASIONS[jm]?.[d];
      if (solarTitles) {
        isHoliday =
          LocalOccasionsRepository.#collect(
            events,
            solarTitles,
            "شمسی",
            SOLAR_HOLIDAYS.has(`${jm}-${d}`),
          ) || isHoliday;
      }
      if (OccasionRules.isChaharshanbeSuri(jm, jalaliDate, daysInMonth)) {
        events.push({ title: "چهارشنبه‌سوری", holiday: false, tag: "شمسی" });
      }

      const lunarTitles = LUNAR_OCCASIONS[hijri.month]?.[hijri.day];
      if (lunarTitles) {
        isHoliday =
          LocalOccasionsRepository.#collect(
            events,
            lunarTitles,
            "قمری",
            LUNAR_HOLIDAYS.has(`${hijri.month}-${hijri.day}`),
          ) || isHoliday;
      }
      const lastDayRule = LUNAR_LAST_DAY_OCCASIONS[hijri.month];
      if (
        lastDayRule &&
        hijri.day >= 29 &&
        OccasionRules.isLastDayOfHijriMonth(gregorian, hijri)
      ) {
        isHoliday =
          LocalOccasionsRepository.#collect(
            events,
            lastDayRule.titles,
            "قمری",
            lastDayRule.holiday,
          ) || isHoliday;
      }

      const intlTitles =
        INTL_OCCASIONS[gregorian.getMonth() + 1]?.[gregorian.getDate()];
      if (intlTitles) {
        LocalOccasionsRepository.#collect(events, intlTitles, "میلادی", false);
      }
      if (OccasionRules.isProgrammerDay(gregorian)) {
        events.push({
          title: "روز گرامیداشت برنامه‌نویسان",
          holiday: false,
          tag: "میلادی",
        });
      }

      if (events.length) {
        data[String(d)] = { holiday: isHoliday, event: events };
      }
    }

    monthCache.set(cacheKey, data);
    return data;
  }

  static getDayData(jy, jm, jd) {
    const daysInMonth = new JalaliDate(jy, jm, jd).daysInMonth();
    const monthData = LocalOccasionsRepository.getMonthData(
      jy,
      jm,
      daysInMonth,
    );
    return monthData[String(jd)] || null;
  }
}

class EventsService {
  /**
   * Returns { solarEvents, gregorianEvents, hijriEvents, isHoliday }.
   * All three arrays come from LocalOccasionsRepository, split by `tag`.
   */
  static async getEventsForDay(jalaliDate) {
    const result = {
      solarEvents: [],
      gregorianEvents: [],
      hijriEvents: [],
      isHoliday: jalaliDate.weekDay === 5,
    };

    const dayData = LocalOccasionsRepository.getDayData(
      jalaliDate.year,
      jalaliDate.month,
      jalaliDate.day,
    );
    if (!dayData) return result;

    result.isHoliday = result.isHoliday || !!dayData.holiday;

    for (const e of dayData.event) {
      const item = { title: e.title, holiday: !!e.holiday };
      if (e.tag === "شمسی") result.solarEvents.push(item);
      else if (e.tag === "قمری") result.hijriEvents.push(item);
      else if (e.tag === "میلادی") result.gregorianEvents.push(item);
    }

    return result;
  }

  static async getMonthHolidayMap(jy, jm) {
    const daysInMonth = new JalaliDate(jy, jm, 1).daysInMonth();
    const monthData = LocalOccasionsRepository.getMonthData(jy, jm, daysInMonth);
    const map = {};

    for (const day of Object.keys(monthData)) {
      map[day] = !!monthData[day].holiday;
    }
    return map;
  }

  static async getMonthEventsList(jy, jm, daysInMonth) {
    const monthData = LocalOccasionsRepository.getMonthData(jy, jm, daysInMonth);
    const results = [];

    for (let d = 1; d <= daysInMonth; d += 1) {
      const dayData = monthData[String(d)];
      if (!dayData || !Array.isArray(dayData.event)) continue;

      const items = dayData.event.map((e) => ({
        text: e.title,
        holiday: !!e.holiday,
        tag: e.tag,
      }));

      const isHoliday =
        new JalaliDate(jy, jm, d).weekDay === 5 ||
        !!dayData.holiday ||
        items.some((it) => it.holiday);

      results.push({ day: d, isHoliday, items });
    }

    return results;
  }
}

window.EventsService = EventsService;
window.detectOccasionTag = detectOccasionTag;
window.LocalOccasionsRepository = LocalOccasionsRepository;