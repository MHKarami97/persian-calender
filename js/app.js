/**
 * Application Controller (Controller / Facade over services)
 * Wires up: calendar rendering, tab navigation, converter, prayer times,
 * age calculator, theme toggle, toast notifications, Service Worker.
 */
'use strict';

class ToastService {
  static show(message, duration = 2500) {
    const el = document.getElementById('toast');
    el.textContent = message;
    el.classList.add('is-visible');
    clearTimeout(ToastService._timer);
    ToastService._timer = setTimeout(() => el.classList.remove('is-visible'), duration);
  }
}

class NavigationController {
  constructor() {
    this.buttons = Array.from(document.querySelectorAll('.bottom-nav__item'));
    this.pages = Array.from(document.querySelectorAll('.page'));
    this.buttons.forEach((btn) => btn.addEventListener('click', () => this.activate(btn.dataset.page)));
  }

  activate(pageId) {
    this.pages.forEach((p) => p.classList.toggle('is-active', p.id === pageId));
    this.buttons.forEach((b) => b.setAttribute('aria-current', String(b.dataset.page === pageId)));
  }
}

class CalendarController {
  constructor() {
    this.viewDate = JalaliDate.today();
    this.selectedDate = JalaliDate.today();
    this.monthYearLabel = document.getElementById('month-year-label');
    this.weekdayRow = document.getElementById('weekday-row');
    this.daysGrid = document.getElementById('days-grid');
    this.subDateRow = document.getElementById('sub-date-row');
    this.eventsListEl = document.getElementById('day-events-list');
    this.holidayMap = {};

    document.getElementById('prev-month-btn').addEventListener('click', () => this.shiftMonth(1));
    document.getElementById('next-month-btn').addEventListener('click', () => this.shiftMonth(-1));

    this._renderWeekdayHeader();
    this.renderMonth();
    this.renderDayDetail(this.selectedDate);
  }

  _renderWeekdayHeader() {
    this.weekdayRow.innerHTML = PERSIAN_WEEKDAY_NAMES.map((w) => `<span>${w.slice(0, 1)}</span>`).join('');
  }

  shiftMonth(direction) {
    let { year, month } = this.viewDate;
    month += direction;
    if (month > 12) { month = 1; year += 1; }
    if (month < 1) { month = 12; year -= 1; }
    this.viewDate = new JalaliDate(year, month, 1);
    this.renderMonth();
  }

  async renderMonth() {
    const { year, month } = this.viewDate;
    this.monthYearLabel.textContent = `${PERSIAN_MONTH_NAMES[month - 1]} ${year}`;

    const firstDay = new JalaliDate(year, month, 1);
    const totalDays = firstDay.daysInMonth();
    const leadingEmpty = (firstDay.weekDay + 1) % 7;

    this.holidayMap = await EventsService.getMonthHolidayMap(year, month);

    const cells = [];
    for (let i = 0; i < leadingEmpty; i += 1) cells.push('<span class="day-cell day-cell--empty"></span>');
    for (let d = 1; d <= totalDays; d += 1) {
      const dateObj = new JalaliDate(year, month, d);
      const isToday = dateObj.equals(JalaliDate.today());
      const isSelected = dateObj.equals(this.selectedDate);
      const isFriday = dateObj.weekDay === 5;
      const isHoliday = isFriday || this.holidayMap[String(d)];
      const classes = ['day-cell'];
      if (isToday) classes.push('day-cell--today');
      if (isHoliday) classes.push('day-cell--holiday');
      if (isSelected) classes.push('day-cell--selected');
      cells.push(`<button class="${classes.join(' ')}" data-day="${d}" aria-label="${dateObj.format()}">${d}</button>`);
    }
    this.daysGrid.innerHTML = cells.join('');

    this.daysGrid.querySelectorAll('.day-cell[data-day]').forEach((btn) => {
      btn.addEventListener('click', () => {
        const day = Number(btn.dataset.day);
        this.selectedDate = new JalaliDate(this.viewDate.year, this.viewDate.month, day);
        this.renderMonth();
        this.renderDayDetail(this.selectedDate);
      });
    });

    this.renderSubDates(this.viewDate);
  }

  renderSubDates(jalaliDate) {
    const g = jalaliDate.toGregorian();
    const hijri = HijriDate.fromGregorian(g);
    this.subDateRow.innerHTML = `
      <span>میلادی: ${g.getFullYear()}/${g.getMonth() + 1}/${g.getDate()}</span>
      <span>قمری: ${hijri.format()}</span>
    `;
  }

  async renderDayDetail(jalaliDate) {
    this.eventsListEl.innerHTML = '<div class="empty-state">در حال بارگذاری مناسبت\u200cها...</div>';
    const data = await EventsService.getEventsForDay(jalaliDate);

    const items = [];
    data.solarEvents.forEach((e) => items.push({ text: e.title, holiday: e.holiday, tag: 'شمسی' }));
    data.hijriEvents.forEach((e) => items.push({ text: e, holiday: false, tag: 'قمری/رسمی' }));
    data.gregorianEvents.forEach((e) => items.push({ text: e.title, holiday: e.holiday, tag: 'میلادی' }));

    if (!items.length) {
      this.eventsListEl.innerHTML = '<div class="empty-state">مناسبت خاصی برای این روز ثبت نشده است.</div>';
      return;
    }

    this.eventsListEl.innerHTML = items.map((item) => `
      <div class="event-item ${item.holiday ? 'event-item--holiday' : ''}">
        <span class="event-item__badge"></span>
        <span class="event-item__text">${item.text}<span class="event-item__tag">${item.tag}</span></span>
      </div>
    `).join('');
  }
}

class ConverterController {
  constructor() {
    this.fromSystem = 'jalali';
    this.dayInput = document.getElementById('conv-day');
    this.monthInput = document.getElementById('conv-month');
    this.yearInput = document.getElementById('conv-year');
    this.resultBox = document.getElementById('conv-result');

    document.querySelectorAll('[data-conv-from]').forEach((chip) => {
      chip.addEventListener('click', () => {
        document.querySelectorAll('[data-conv-from]').forEach((c) => c.setAttribute('aria-selected', 'false'));
        chip.setAttribute('aria-selected', 'true');
        this.fromSystem = chip.dataset.convFrom;
      });
    });

    document.getElementById('conv-submit-btn').addEventListener('click', () => this.convert());
  }

  convert() {
    const day = Number(this.dayInput.value);
    const month = Number(this.monthInput.value);
    const year = Number(this.yearInput.value);
    if (!day || !month || !year) { ToastService.show('لطفاً همه فیلدها را کامل وارد کنید'); return; }

    try {
      let jalali, gregorian, hijri;
      if (this.fromSystem === 'jalali') {
        jalali = new JalaliDate(year, month, day);
        gregorian = jalali.toGregorian();
        hijri = HijriDate.fromGregorian(gregorian);
      } else if (this.fromSystem === 'gregorian') {
        gregorian = new Date(year, month - 1, day);
        jalali = JalaliDate.fromGregorian(gregorian);
        hijri = HijriDate.fromGregorian(gregorian);
      } else {
        const g = HijriAlgorithm.hijriToGregorian(year, month, day);
        gregorian = new Date(g.gy, g.gm - 1, g.gd);
        jalali = JalaliDate.fromGregorian(gregorian);
        hijri = new HijriDate(year, month, day);
      }

      this.resultBox.style.display = 'block';
      this.resultBox.innerHTML = `
        <div class="result-box__highlight">${jalali.format()}</div>
        <div style="margin-top:8px;">میلادی: ${gregorian.getFullYear()}/${gregorian.getMonth() + 1}/${gregorian.getDate()}</div>
        <div>قمری: ${hijri.format()}</div>
      `;
    } catch (e) {
      ToastService.show('تاریخ وارد شده معتبر نیست');
    }
  }
}

class AgeController {
  constructor() {
    document.getElementById('age-submit-btn').addEventListener('click', () => this.calculate());
  }

  calculate() {
    const day = Number(document.getElementById('age-day').value);
    const month = Number(document.getElementById('age-month').value);
    const year = Number(document.getElementById('age-year').value);
    if (!day || !month || !year) { ToastService.show('لطفاً تاریخ تولد را کامل وارد کنید'); return; }
    try {
      const birth = new JalaliDate(year, month, day);
      const result = AgeCalculatorService.calculate(birth);
      const next = AgeCalculatorService.nextBirthday(birth);
      const box = document.getElementById('age-result');
      box.style.display = 'block';
      box.innerHTML = `
        <div class="result-box__highlight">${result.years} سال و ${result.months} ماه و ${result.days} روز</div>
        <div class="stat-grid">
          <div class="stat-box"><div class="stat-box__value">${result.totalDays.toLocaleString('fa-IR')}</div><div class="stat-box__label">کل روزها</div></div>
          <div class="stat-box"><div class="stat-box__value">${result.totalMonths.toLocaleString('fa-IR')}</div><div class="stat-box__label">کل ماه\u200cها</div></div>
          <div class="stat-box"><div class="stat-box__value">${result.totalWeeks.toLocaleString('fa-IR')}</div><div class="stat-box__label">کل هفته\u200cها</div></div>
          <div class="stat-box"><div class="stat-box__value">${next.daysLeft.toLocaleString('fa-IR')}</div><div class="stat-box__label">روز تا تولد بعدی</div></div>
        </div>
      `;
    } catch (e) {
      ToastService.show('تاریخ تولد معتبر نیست');
    }
  }
}

class PrayerTimesController {
  constructor() {
    this.location = window.DEFAULT_LOCATION;
    this.calculator = new PrayerTimesCalculator('jafari');
    this.grid = document.getElementById('prayer-times-grid');
    document.getElementById('use-location-btn').addEventListener('click', () => this.requestLocation());
    this.render();
  }

  requestLocation() {
    if (!navigator.geolocation) { ToastService.show('مرورگر شما از موقعیت مکانی پشتیبانی نمی\u200cکند'); return; }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        this.location = {
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          timezone: -new Date().getTimezoneOffset() / 60,
          name: 'موقعیت فعلی شما',
        };
        document.getElementById('prayer-location-label').textContent = `مکان: ${this.location.name}`;
        this.render();
        ToastService.show('موقعیت به\u200cروزرسانی شد');
      },
      () => ToastService.show('دسترسی به موقعیت رد شد؛ از تهران استفاده می\u200cشود')
    );
  }

  render() {
    const times = this.calculator.getTimesForDate(new Date(), this.location.lat, this.location.lng, this.location.timezone);
    const labels = [
      ['imsak', 'اذان صبح (امساک)'], ['fajr', 'طلوع فجر'], ['sunrise', 'طلوع آفتاب'],
      ['noon', 'اذان ظهر'], ['sunset', 'غروب آفتاب'], ['maghrib', 'اذان مغرب'],
      ['isha', 'اذان عشا'], ['midnight', 'نیمه شب شرعی'],
    ];
    this.grid.innerHTML = labels.map(([key, label]) => `
      <div class="prayer-time-item">
        <span class="prayer-time-item__name">${label}</span>
        <span class="prayer-time-item__value">${times[key]}</span>
      </div>
    `).join('');
  }
}

function initThemeToggle() {
  document.getElementById('theme-toggle-btn').addEventListener('click', () => window.themeManagerInstance.toggle());
}

function registerServiceWorker() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('sw.js').catch(() => console.warn('Service worker registration failed'));
    });
  }
}

document.addEventListener('DOMContentLoaded', () => {
  new NavigationController();
  new CalendarController();
  new ConverterController();
  new AgeController();
  new PrayerTimesController();
  initThemeToggle();
  registerServiceWorker();
});
