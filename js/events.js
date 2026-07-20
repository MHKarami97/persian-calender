/**
 * Fixed Solar/Gregorian Occasions — Iranian national days & world days
 * that don't shift year to year. Embedded locally to avoid any network
 * dependency for these. Source basis: time.ir official calendar and
 * common UN/UNESCO World Days lists.
 * Design pattern: Repository Pattern (static in-memory repository)
 */
'use strict';

const FIXED_JALALI_EVENTS = {
  '1-1':  [{ title: 'جشن نوروز / آغاز سال نو', holiday: true }],
  '1-2':  [{ title: 'عید نوروز', holiday: true }],
  '1-3':  [{ title: 'عید نوروز', holiday: true }],
  '1-4':  [{ title: 'عید نوروز', holiday: true }],
  '1-12': [{ title: 'روز جمهوری اسلامی ایران', holiday: true }],
  '1-13': [{ title: 'جشن سیزده‌به‌در / روز طبیعت', holiday: true }],
  '3-14': [{ title: 'رحلت امام خمینی (ره)', holiday: true }],
  '3-15': [{ title: 'قیام پانزده خرداد', holiday: true }],
  '11-22': [{ title: 'پیروزی انقلاب اسلامی', holiday: true }],
  '11-29': [{ title: 'روز ملی شدن صنعت نفت ایران', holiday: false }],
};

const FIXED_GREGORIAN_EVENTS = {
  '1-1':  [{ title: 'روز جهانی صلح', holiday: false }],
  '3-8':  [{ title: 'روز جهانی زن', holiday: false }],
  '3-20': [{ title: 'روز جهانی خوشحالی', holiday: false }],
  '3-21': [{ title: 'روز جهانی نوروز (ثبت یونسکو)', holiday: false }],
  '4-7':  [{ title: 'روز جهانی بهداشت', holiday: false }],
  '4-22': [{ title: 'روز جهانی زمین', holiday: false }],
  '5-1':  [{ title: 'روز جهانی کارگر', holiday: false }],
  '6-5':  [{ title: 'روز جهانی محیط زیست', holiday: false }],
  '9-21': [{ title: 'روز جهانی صلح (سازمان ملل)', holiday: false }],
  '10-1': [{ title: 'روز جهانی سالمندان', holiday: false }],
  '10-16': [{ title: 'روز جهانی غذا', holiday: false }],
  '12-10': [{ title: 'روز جهانی حقوق بشر', holiday: false }],
};

class EventRepository {
  static getFixedJalaliEvents(month, day) { return FIXED_JALALI_EVENTS[`${month}-${day}`] || []; }
  static getFixedGregorianEvents(month, day) { return FIXED_GREGORIAN_EVENTS[`${month}-${day}`] || []; }
}

window.EventRepository = EventRepository;
