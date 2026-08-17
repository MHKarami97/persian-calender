/**
 * Application Controller
 *
 * Responsibilities:
 * - Calendar rendering
 * - Tab navigation
 * - Date conversion
 * - Prayer times
 * - Age calculator
 * - Theme toggle
 * - Toast notifications
 * - PWA installation
 * - Service Worker registration and update flow
 */

"use strict";

/* -------------------------------------------------------------------------- */
/* Toast Service                                                              */
/* -------------------------------------------------------------------------- */

class ToastService {
  static _timer = null;

  static show(message, duration = 2500) {
    const element = document.getElementById("toast");

    if (!element) {
      return;
    }

    element.textContent = message;
    element.classList.add("is-visible");

    clearTimeout(ToastService._timer);

    ToastService._timer = setTimeout(() => {
      element.classList.remove("is-visible");
    }, duration);
  }
}

/* -------------------------------------------------------------------------- */
/* Navigation Controller                                                      */
/* -------------------------------------------------------------------------- */

class NavigationController {
  constructor() {
    this.buttons = Array.from(
      document.querySelectorAll(".bottom-nav__item"),
    );

    this.pages = Array.from(document.querySelectorAll(".page"));

    this.buttons.forEach((button) => {
      button.addEventListener("click", () => {
        this.activate(button.dataset.page);
      });
    });
  }

  activate(pageId) {
    this.pages.forEach((page) => {
      page.classList.toggle("is-active", page.id === pageId);
    });

    this.buttons.forEach((button) => {
      const isCurrent = button.dataset.page === pageId;

      if (isCurrent) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Calendar Controller                                                        */
/* -------------------------------------------------------------------------- */

class CalendarController {
  constructor() {
    this.viewDate = JalaliDate.today();
    this.selectedDate = JalaliDate.today();

    this.monthYearLabel = document.getElementById("month-year-label");
    this.weekdayRow = document.getElementById("weekday-row");
    this.daysGrid = document.getElementById("days-grid");
    this.subDateRow = document.getElementById("sub-date-row");
    this.eventsListElement = document.getElementById("day-events-list");
    this.todayButton = document.getElementById("today-btn");

    this.holidayMap = {};

    this.monthEventsToggleButton = document.getElementById(
      "month-events-toggle-btn",
    );

    this.monthEventsBody = document.getElementById("month-events-body");
    this.monthEventsList = document.getElementById("month-events-list");

    this.monthEventsRequestId = 0;
    this.dayEventsRequestId = 0;

    this.registerEvents();

    this.renderWeekdayHeader();
    this.renderMonth();
    this.renderDayDetail(this.selectedDate);
    this.renderSubDates(this.selectedDate);
    this.updateTodayButtonVisibility();
  }

  registerEvents() {
    this.monthEventsToggleButton?.addEventListener("click", () => {
      const isOpen =
        this.monthEventsToggleButton.getAttribute("aria-expanded") === "true";

      this.monthEventsToggleButton.setAttribute(
        "aria-expanded",
        String(!isOpen),
      );

      if (this.monthEventsBody) {
        this.monthEventsBody.hidden = isOpen;
      }
    });

    document
      .getElementById("prev-month-btn")
      ?.addEventListener("click", () => {
        this.shiftMonth(1);
      });

    document
      .getElementById("next-month-btn")
      ?.addEventListener("click", () => {
        this.shiftMonth(-1);
      });

    this.todayButton?.addEventListener("click", () => {
      this.goToToday();
    });
  }

  goToToday() {
    const today = JalaliDate.today();

    this.viewDate = new JalaliDate(today.year, today.month, 1);
    this.selectedDate = today;

    this.renderMonth();
    this.renderDayDetail(this.selectedDate);
    this.renderSubDates(this.selectedDate);
    this.updateTodayButtonVisibility();
  }

  updateTodayButtonVisibility() {
    if (!this.todayButton) {
      return;
    }

    const isTodaySelected = this.selectedDate.equals(JalaliDate.today());

    this.todayButton.disabled = isTodaySelected;
    this.todayButton.style.display = isTodaySelected ? "none" : "flex";
  }

  renderWeekdayHeader() {
    if (!this.weekdayRow) {
      return;
    }

    this.weekdayRow.innerHTML = PERSIAN_WEEKDAY_NAMES.map(
      (weekday) => `<span>${weekday.slice(0, 1)}</span>`,
    ).join("");
  }

  shiftMonth(direction) {
    let { year, month } = this.viewDate;

    month += direction;

    if (month > 12) {
      month = 1;
      year += 1;
    }

    if (month < 1) {
      month = 12;
      year -= 1;
    }

    this.viewDate = new JalaliDate(year, month, 1);
    this.renderMonth();
  }

  async renderMonth() {
    const { year, month } = this.viewDate;

    if (this.monthYearLabel) {
      this.monthYearLabel.textContent =
        `${PERSIAN_MONTH_NAMES[month - 1]} ${year}`;
    }

    const firstDay = new JalaliDate(year, month, 1);
    const totalDays = firstDay.daysInMonth();
    const leadingEmpty = (firstDay.weekDay + 1) % 7;

    const requestId = ++this.monthEventsRequestId;

    try {
      this.holidayMap = await EventsService.getMonthHolidayMap(year, month);

      if (requestId !== this.monthEventsRequestId) {
        return;
      }
    } catch (error) {
      console.error("Failed to load holiday map:", error);
      this.holidayMap = {};
    }

    this.renderMonthEvents(year, month);

    const cells = [];

    for (let index = 0; index < leadingEmpty; index += 1) {
      cells.push('<span class="day-cell day-cell--empty"></span>');
    }

    for (let day = 1; day <= totalDays; day += 1) {
      const date = new JalaliDate(year, month, day);
      const isToday = date.equals(JalaliDate.today());
      const isSelected = date.equals(this.selectedDate);
      const isFriday = date.weekDay === 5;
      const isHoliday = isFriday || Boolean(this.holidayMap[String(day)]);

      const classes = ["day-cell"];

      if (isToday) {
        classes.push("day-cell--today");
      }

      if (isHoliday) {
        classes.push("day-cell--holiday");
      }

      if (isSelected) {
        classes.push("day-cell--selected");
      }

      cells.push(`
        <button
          type="button"
          class="${classes.join(" ")}"
          data-day="${day}"
          aria-label="${date.format()}"
        >
          ${day}
        </button>
      `);
    }

    if (this.daysGrid) {
      this.daysGrid.innerHTML = cells.join("");

      this.daysGrid
        .querySelectorAll(".day-cell[data-day]")
        .forEach((button) => {
          button.addEventListener("click", () => {
            const day = Number(button.dataset.day);

            this.selectedDate = new JalaliDate(
              this.viewDate.year,
              this.viewDate.month,
              day,
            );

            this.renderMonth();
            this.renderDayDetail(this.selectedDate);
            this.renderSubDates(this.selectedDate);
            this.updateTodayButtonVisibility();
          });
        });
    }

    this.renderSubDates(this.selectedDate);
    this.updateTodayButtonVisibility();
  }

  async renderMonthEvents(year, month) {
    const requestId = ++this.monthEventsRequestId;
    const daysInMonth = new JalaliDate(year, month, 1).daysInMonth();

    try {
      const monthList = await EventsService.getMonthEventsList(
        year,
        month,
        daysInMonth,
      );

      if (requestId !== this.monthEventsRequestId) {
        return;
      }

      if (!this.monthEventsList) {
        return;
      }

      if (!monthList.length) {
        this.monthEventsList.innerHTML = `
          <div class="empty-state">
            مناسبتی برای این ماه ثبت نشده است.
          </div>
        `;

        return;
      }

      this.monthEventsList.innerHTML = monthList
        .map(
          (dayItem) => `
            <div class="month-events-day${
              dayItem.isHoliday ? " month-events-day--holiday" : ""
            }">
              <div class="month-events-day__label">
                <span class="day-number">${dayItem.day}</span>
                <span>${PERSIAN_MONTH_NAMES[month - 1]}</span>
              </div>

              ${dayItem.items
                .map(
                  (item) => `
                    <div class="event-item${
                      item.holiday ? " event-item--holiday" : ""
                    }">
                      <span class="badge"></span>
                      <span class="text">${item.text}</span>
                      <span class="tag">${item.tag}</span>
                    </div>
                  `,
                )
                .join("")}
            </div>
          `,
        )
        .join("");
    } catch (error) {
      console.error("Failed to load month events:", error);

      if (this.monthEventsList) {
        this.monthEventsList.innerHTML = `
          <div class="empty-state">
            بارگذاری مناسبت‌های این ماه ممکن نیست.
          </div>
        `;
      }
    }
  }

  renderSubDates(jalaliDate) {
    if (!this.subDateRow) {
      return;
    }

    const gregorianDate = jalaliDate.toGregorian();
    const hijriDate = HijriDate.fromGregorian(gregorianDate);

    const gregorianString = [
      gregorianDate.getFullYear(),
      String(gregorianDate.getMonth() + 1).padStart(2, "0"),
      String(gregorianDate.getDate()).padStart(2, "0"),
    ].join("/");

    this.subDateRow.innerHTML = `
      <span class="sub-date-row__jalali">
        شمسی: ${jalaliDate.format()}
      </span>
      <span>میلادی: ${gregorianString}</span>
      <span>قمری: ${hijriDate.format()}</span>
    `;
  }

  async renderDayDetail(jalaliDate) {
    if (!this.eventsListElement) {
      return;
    }

    const requestId = ++this.dayEventsRequestId;

    this.eventsListElement.innerHTML = `
      <div class="empty-state">
        در حال بارگذاری مناسبت‌ها...
      </div>
    `;

    try {
      const data = await EventsService.getEventsForDay(jalaliDate);

      if (requestId !== this.dayEventsRequestId) {
        return;
      }

      const items = [];

      data.solarEvents.forEach((event) => {
        items.push({
          text: event.title,
          holiday: event.holiday,
          tag: "شمسی",
        });
      });

      data.hijriEvents.forEach((event) => {
        items.push({
          text: event,
          holiday: false,
          tag: detectOccasionTag(event),
        });
      });

      data.gregorianEvents.forEach((event) => {
        items.push({
          text: event.title,
          holiday: event.holiday,
          tag: "میلادی",
        });
      });

      if (!items.length) {
        this.eventsListElement.innerHTML = `
          <div class="empty-state">
            مناسبت خاصی برای این روز ثبت نشده است.
          </div>
        `;

        return;
      }

      this.eventsListElement.innerHTML = items
        .map(
          (item) => `
            <div class="event-item${
              item.holiday ? " event-item--holiday" : ""
            }">
              <span class="event-item__badge"></span>
              <span class="event-item__text">
                ${item.text}
                <span class="event-item__tag">${item.tag}</span>
              </span>
            </div>
          `,
        )
        .join("");
    } catch (error) {
      console.error("Failed to load day events:", error);

      this.eventsListElement.innerHTML = `
        <div class="empty-state">
          بارگذاری مناسبت‌های این روز ممکن نیست.
        </div>
      `;
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Converter Controller                                                       */
/* -------------------------------------------------------------------------- */

class ConverterController {
  constructor() {
    this.fromSystem = "jalali";

    this.dayInput = document.getElementById("conv-day");
    this.monthInput = document.getElementById("conv-month");
    this.yearInput = document.getElementById("conv-year");
    this.resultBox = document.getElementById("conv-result");

    document.querySelectorAll("[data-conv-from]").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll("[data-conv-from]").forEach((item) => {
          item.setAttribute("aria-selected", "false");
        });

        chip.setAttribute("aria-selected", "true");
        this.fromSystem = chip.dataset.convFrom;
      });
    });

    document
      .getElementById("conv-submit-btn")
      ?.addEventListener("click", () => {
        this.convert();
      });
  }

  convert() {
    const day = Number(this.dayInput?.value);
    const month = Number(this.monthInput?.value);
    const year = Number(this.yearInput?.value);

    if (!day || !month || !year) {
      ToastService.show("لطفاً همه فیلدها را کامل وارد کنید");
      return;
    }

    try {
      let jalaliDate;
      let gregorianDate;
      let hijriDate;

      if (this.fromSystem === "jalali") {
        jalaliDate = new JalaliDate(year, month, day);
        gregorianDate = jalaliDate.toGregorian();
        hijriDate = HijriDate.fromGregorian(gregorianDate);
      } else if (this.fromSystem === "gregorian") {
        gregorianDate = new Date(year, month - 1, day);
        jalaliDate = JalaliDate.fromGregorian(gregorianDate);
        hijriDate = HijriDate.fromGregorian(gregorianDate);
      } else {
        const gregorian = HijriAlgorithm.hijriToGregorian(
          year,
          month,
          day,
        );

        gregorianDate = new Date(
          gregorian.gy,
          gregorian.gm - 1,
          gregorian.gd,
        );

        jalaliDate = JalaliDate.fromGregorian(gregorianDate);
        hijriDate = new HijriDate(year, month, day);
      }

      if (!this.resultBox) {
        return;
      }

      this.resultBox.style.display = "block";
      this.resultBox.innerHTML = `
        <div class="result-box__highlight">
          ${jalaliDate.format()}
        </div>

        <div style="margin-top: 8px;">
          میلادی:
          ${gregorianDate.getFullYear()}/
          ${gregorianDate.getMonth() + 1}/
          ${gregorianDate.getDate()}
        </div>

        <div>قمری: ${hijriDate.format()}</div>
      `;
    } catch (error) {
      console.error("Date conversion failed:", error);
      ToastService.show("تاریخ وارد شده معتبر نیست");
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Age Controller                                                             */
/* -------------------------------------------------------------------------- */

class AgeController {
  constructor() {
    document
      .getElementById("age-submit-btn")
      ?.addEventListener("click", () => {
        this.calculate();
      });
  }

  calculate() {
    const day = Number(document.getElementById("age-day")?.value);
    const month = Number(document.getElementById("age-month")?.value);
    const year = Number(document.getElementById("age-year")?.value);

    if (!day || !month || !year) {
      ToastService.show("لطفاً تاریخ تولد را کامل وارد کنید");
      return;
    }

    try {
      const birthDate = new JalaliDate(year, month, day);
      const result = AgeCalculatorService.calculate(birthDate);
      const nextBirthday = AgeCalculatorService.nextBirthday(birthDate);
      const resultBox = document.getElementById("age-result");

      if (!resultBox) {
        return;
      }

      resultBox.style.display = "block";
      resultBox.innerHTML = `
        <div class="result-box__highlight">
          ${result.years} سال و
          ${result.months} ماه و
          ${result.days} روز
        </div>

        <div class="stat-grid">
          <div class="stat-box">
            <div class="stat-box__value">
              ${result.totalDays.toLocaleString("fa-IR")}
            </div>
            <div class="stat-box__label">کل روزها</div>
          </div>

          <div class="stat-box">
            <div class="stat-box__value">
              ${result.totalMonths.toLocaleString("fa-IR")}
            </div>
            <div class="stat-box__label">کل ماه‌ها</div>
          </div>

          <div class="stat-box">
            <div class="stat-box__value">
              ${result.totalWeeks.toLocaleString("fa-IR")}
            </div>
            <div class="stat-box__label">کل هفته‌ها</div>
          </div>

          <div class="stat-box">
            <div class="stat-box__value">
              ${nextBirthday.daysLeft.toLocaleString("fa-IR")}
            </div>
            <div class="stat-box__label">روز تا تولد بعدی</div>
          </div>
        </div>
      `;
    } catch (error) {
      console.error("Age calculation failed:", error);
      ToastService.show("تاریخ تولد معتبر نیست");
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Prayer Times Controller                                                    */
/* -------------------------------------------------------------------------- */

class PrayerTimesController {
  constructor() {
    this.location = window.DEFAULT_LOCATION;
    this.calculator = new PrayerTimesCalculator("jafari");
    this.grid = document.getElementById("prayer-times-grid");

    document
      .getElementById("use-location-btn")
      ?.addEventListener("click", () => {
        this.requestLocation();
      });

    this.render();
  }

  requestLocation() {
    if (!navigator.geolocation) {
      ToastService.show("مرورگر شما از موقعیت مکانی پشتیبانی نمی‌کند");
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        this.location = {
          lat: position.coords.latitude,
          lng: position.coords.longitude,
          timezone: -new Date().getTimezoneOffset() / 60,
          name: "موقعیت فعلی شما",
        };

        const locationLabel = document.getElementById(
          "prayer-location-label",
        );

        if (locationLabel) {
          locationLabel.textContent = `مکان: ${this.location.name}`;
        }

        this.render();
        ToastService.show("موقعیت به‌روزرسانی شد");
      },
      () => {
        ToastService.show(
          "دسترسی به موقعیت رد شد؛ از موقعیت پیش‌فرض استفاده می‌شود",
        );
      },
    );
  }

  render() {
    if (!this.grid || !this.location) {
      return;
    }

    const times = this.calculator.getTimesForDate(
      new Date(),
      this.location.lat,
      this.location.lng,
      this.location.timezone,
    );

    const labels = [
      ["imsak", "اذان صبح (امساک)"],
      ["fajr", "طلوع فجر"],
      ["sunrise", "طلوع آفتاب"],
      ["noon", "اذان ظهر"],
      ["sunset", "غروب آفتاب"],
      ["maghrib", "اذان مغرب"],
      ["isha", "اذان عشا"],
      ["midnight", "نیمه شب شرعی"],
    ];

    this.grid.innerHTML = labels
      .map(
        ([key, label]) => `
          <div class="prayer-time-item">
            <span class="prayer-time-item__name">${label}</span>
            <span class="prayer-time-item__value">${times[key]}</span>
          </div>
        `,
      )
      .join("");
  }
}

/* -------------------------------------------------------------------------- */
/* Theme                                                                      */
/* -------------------------------------------------------------------------- */

function initThemeToggle() {
  document
    .getElementById("theme-toggle-btn")
    ?.addEventListener("click", () => {
      window.themeManagerInstance.toggle();
    });
}

/* -------------------------------------------------------------------------- */
/* PWA Install Prompt                                                         */
/* -------------------------------------------------------------------------- */

let deferredPrompt = null;

function initializeInstallPrompt() {
  const installPromptDismissed = localStorage.getItem(
    "installPromptDismissed",
  );

  window.addEventListener("beforeinstallprompt", (event) => {
    event.preventDefault();
    deferredPrompt = event;

    if (!installPromptDismissed) {
      showInstallPrompt();
    }
  });

  window.addEventListener("appinstalled", () => {
    console.log("App installed successfully");
    deferredPrompt = null;
  });
}

function showInstallPrompt() {
  if (document.querySelector(".install-prompt")) {
    return;
  }

  const prompt = document.createElement("div");

  prompt.className = "install-prompt";
  prompt.innerHTML = `
    <div class="install-prompt-text">
      <div class="install-prompt-title">نصب اپلیکیشن</div>
    </div>

    <button
      type="button"
      class="install-btn"
      id="installBtn"
    >
      نصب
    </button>

    <button
      type="button"
      class="close-install"
      id="closeInstall"
      aria-label="بستن پنجره نصب"
    >
      ×
    </button>
  `;

  document.body.appendChild(prompt);

  document.getElementById("installBtn")?.addEventListener("click", async () => {
    if (!deferredPrompt) {
      return;
    }

    deferredPrompt.prompt();

    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === "accepted") {
      console.log("User accepted the install prompt");
    }

    deferredPrompt = null;
    prompt.remove();
  });

  document.getElementById("closeInstall")?.addEventListener("click", () => {
    localStorage.setItem("installPromptDismissed", "true");
    prompt.remove();
  });
}

/* -------------------------------------------------------------------------- */
/* Service Worker Update Manager                                              */
/* -------------------------------------------------------------------------- */

class ServiceWorkerUpdateManager {
  constructor() {
    this.registration = null;
    this.waitingWorker = null;
    this.isRefreshing = false;
    this.updateNotificationShown = false;

    this.updateButton = document.getElementById("updateButton");
    this.dismissButton = document.getElementById("dismissUpdate");
    this.notification = document.getElementById("updateNotification");

    this.registerButtonEvents();
  }

  async initialize() {
    if (!("serviceWorker" in navigator)) {
      return;
    }

    try {
      this.registration = await navigator.serviceWorker.register("/sw.js", {
        updateViaCache: "none",
      });

      console.log("Service Worker registered:", this.registration);

      this.registerServiceWorkerEvents();
      this.registerControllerChangeEvent();

      await this.registration.update();

      this.checkWaitingWorker();
      this.startPeriodicUpdateCheck();
    } catch (error) {
      console.warn("Service Worker registration failed:", error);
    }
  }

  registerServiceWorkerEvents() {
    this.registration.addEventListener("updatefound", () => {
      const installingWorker = this.registration.installing;

      if (!installingWorker) {
        return;
      }

      console.log("New Service Worker found");

      installingWorker.addEventListener("statechange", () => {
        console.log(
          "Service Worker state changed:",
          installingWorker.state,
        );

        if (
          installingWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          this.waitingWorker =
            this.registration.waiting || installingWorker;

          this.showUpdateNotification();
        }
      });
    });

    navigator.serviceWorker.addEventListener("message", (event) => {
      if (!event.data) {
        return;
      }

      if (event.data.type === "SW_UPDATED") {
        this.checkWaitingWorker();
      }
    });
  }

  registerControllerChangeEvent() {
    navigator.serviceWorker.addEventListener("controllerchange", () => {
      if (this.isRefreshing) {
        return;
      }

      this.isRefreshing = true;
      window.location.reload();
    });
  }

  checkWaitingWorker() {
    if (this.registration?.waiting) {
      this.waitingWorker = this.registration.waiting;
      this.showUpdateNotification();
    }
  }

  startPeriodicUpdateCheck() {
    setInterval(() => {
      this.registration?.update().catch((error) => {
        console.log("Service Worker update check failed:", error);
      });
    }, 60000);
  }

  showUpdateNotification() {
    if (!this.notification || this.updateNotificationShown) {
      return;
    }

    this.updateNotificationShown = true;

    this.notification.classList.remove("hidden");
    this.notification.classList.add("show");
  }

  hideUpdateNotification() {
    if (!this.notification) {
      return;
    }

    this.notification.classList.remove("show");
    this.notification.classList.add("hidden");
    this.updateNotificationShown = false;
  }

  async updateApplication() {
    if (!this.waitingWorker && this.registration?.waiting) {
      this.waitingWorker = this.registration.waiting;
    }

    if (this.waitingWorker) {
      this.waitingWorker.postMessage({
        type: "SKIP_WAITING",
      });

      return;
    }

    await this.registration?.update();

    if (this.registration?.waiting) {
      this.waitingWorker = this.registration.waiting;

      this.waitingWorker.postMessage({
        type: "SKIP_WAITING",
      });

      return;
    }

    window.location.reload();
  }

  registerButtonEvents() {
    this.updateButton?.addEventListener("click", async () => {
      this.updateButton.disabled = true;

      try {
        await this.updateApplication();
      } catch (error) {
        console.error("Application update failed:", error);
        this.updateButton.disabled = false;
        window.location.reload();
      }
    });

    this.dismissButton?.addEventListener("click", () => {
      this.hideUpdateNotification();
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Application Bootstrap                                                      */
/* -------------------------------------------------------------------------- */

document.addEventListener("DOMContentLoaded", async () => {
  new NavigationController();
  new CalendarController();
  new ConverterController();
  new AgeController();
  new PrayerTimesController();

  initThemeToggle();
  initializeInstallPrompt();

  const serviceWorkerUpdateManager = new ServiceWorkerUpdateManager();
  await serviceWorkerUpdateManager.initialize();
});
