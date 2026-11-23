/**
 * Application Controller
 *
 * Responsibilities:
 * - Calendar rendering with sub-dates (Gregorian & Hijri) and status dots
 * - Personal notes and reminders management (offline localStorage)
 * - Quick Month/Year picker modal
 * - Search in occasions and notes
 * - Extended date tools (Conversion, Difference, Add/Subtract days)
 * - Prayer times calculation with city selector, live countdown & Qibla compass
 * - Hero "Today" summary card
 * - Touch swipe gestures for month navigation
 * - Haptic feedback and hardware back button (popstate) navigation
 * - AMOLED / Dark / Light theme management
 * - Backup export / import of user notes
 * - PWA Service Worker lifecycle and updates
 */

"use strict";

/* -------------------------------------------------------------------------- */
/* Haptic & Feedback Service                                                  */
/* -------------------------------------------------------------------------- */

class HapticService {
  static trigger(duration = 10) {
    if (
      typeof navigator !== "undefined" &&
      typeof navigator.vibrate === "function"
    ) {
      try {
        navigator.vibrate(duration);
      } catch (_) {}
    }
  }
}

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
/* Modal Manager & Back Button Handling                                       */
/* -------------------------------------------------------------------------- */

class ModalManager {
  static activeModals = [];

  static open(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.add("is-active");
    if (!ModalManager.activeModals.includes(modalId)) {
      ModalManager.activeModals.push(modalId);
      try {
        window.history.pushState({ modalId }, "");
      } catch (_) {}
    }
    HapticService.trigger(8);
  }

  static close(modalId) {
    const modal = document.getElementById(modalId);
    if (!modal) return;

    modal.classList.remove("is-active");
    ModalManager.activeModals = ModalManager.activeModals.filter(
      (id) => id !== modalId,
    );
  }

  static closeTopModal() {
    if (ModalManager.activeModals.length > 0) {
      const topModalId = ModalManager.activeModals.pop();
      const modal = document.getElementById(topModalId);
      if (modal) {
        modal.classList.remove("is-active");
        return true;
      }
    }
    return false;
  }
}

function getEventTagClass(tag) {
  if (tag === "شمسی") return "event-item__tag--solar";
  if (tag === "قمری") return "event-item__tag--hijri";
  if (tag === "میلادی") return "event-item__tag--gregorian";
  return "";
}

/* -------------------------------------------------------------------------- */
/* Navigation Controller                                                      */
/* -------------------------------------------------------------------------- */

class NavigationController {
  constructor() {
    this.buttons = Array.from(document.querySelectorAll(".bottom-nav__item"));
    this.pages = Array.from(document.querySelectorAll(".page"));
    this.activePageId = "page-calendar";

    this.buttons.forEach((button) => {
      button.addEventListener("click", () => {
        const pageId = button.dataset.page;
        if (pageId !== this.activePageId) {
          try {
            window.history.pushState({ pageId }, "");
          } catch (_) {}
          this.activate(pageId);
        } else {
          // If already on this page, tapping the active tab smoothly scrolls back to the top
          window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
          if (document.scrollingElement) {
            document.scrollingElement.scrollTo({ top: 0, left: 0, behavior: "smooth" });
          }
        }
      });
    });

    // Hardware Back Button & Popstate handler
    window.addEventListener("popstate", (event) => {
      // 1. If a modal is open, close it first
      if (ModalManager.closeTopModal()) {
        return;
      }

      // 2. If user is in another tab, return to calendar
      if (this.activePageId !== "page-calendar") {
        this.activate("page-calendar", false);
        return;
      }
    });
  }

  activate(pageId, vibrate = true) {
    this.activePageId = pageId;

    this.pages.forEach((page) => {
      const isTarget = page.id === pageId;
      if (isTarget) {
        page.classList.remove("is-active");
        void page.offsetWidth;
        page.classList.add("is-active");
      } else {
        page.classList.remove("is-active");
      }
    });

    this.buttons.forEach((button) => {
      const isCurrent = button.dataset.page === pageId;
      if (isCurrent) {
        button.setAttribute("aria-current", "page");
      } else {
        button.removeAttribute("aria-current");
      }
    });

    if (vibrate) {
      HapticService.trigger(10);
    }

    // Smoothly scroll to the very top on page switch
    window.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    if (document.scrollingElement) {
      document.scrollingElement.scrollTo({ top: 0, left: 0, behavior: "smooth" });
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Calendar Controller                                                        */
/* -------------------------------------------------------------------------- */

class CalendarController {
  constructor() {
    this.viewDate = JalaliDate.today();
    this.selectedDate = JalaliDate.today();

    this.monthYearText = document.getElementById("month-year-text");
    this.monthYearLabel = document.getElementById("month-year-label");
    this.weekdayRow = document.getElementById("weekday-row");
    this.daysGrid = document.getElementById("days-grid");
    this.subDateRow = document.getElementById("sub-date-row");
    this.eventsListElement = document.getElementById("day-events-list");
    this.notesListElement = document.getElementById("day-notes-list");
    this.todayButton = document.getElementById("today-btn");

    this.holidayMap = {};
    this.notesMap = {};

    this.monthEventsToggleButton = document.getElementById(
      "month-events-toggle-btn",
    );
    this.monthEventsBody = document.getElementById("month-events-body");
    this.monthEventsList = document.getElementById("month-events-list");

    this.monthEventsRequestId = 0;
    this.dayEventsRequestId = 0;

    // Quick Picker state
    this.pickerSelectedYear = this.viewDate.year;
    this.pickerSelectedMonth = this.viewDate.month;

    this.registerEvents();
    this.initTouchGestures();
    this.initQuickPicker();
    this.initNotesDialog();

    this.renderWeekdayHeader();
    this.renderHeroCard();
    this.renderMonth();
    this.renderDayDetail(this.selectedDate);
    this.renderDayNotes(this.selectedDate);
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
      HapticService.trigger(8);
    });

    document.getElementById("prev-month-btn")?.addEventListener("click", () => {
      this.shiftMonth(-1, "slide-right");
    });

    document.getElementById("next-month-btn")?.addEventListener("click", () => {
      this.shiftMonth(1, "slide-left");
    });

    this.todayButton?.addEventListener("click", () => {
      this.goToToday();
    });

    this.monthYearLabel?.addEventListener("click", () => {
      this.openQuickPicker();
    });
  }

  /* --- Touch Swipe Gestures --- */
  initTouchGestures() {
    if (!this.daysGrid) return;

    let touchStartX = 0;
    let touchStartY = 0;

    this.daysGrid.addEventListener(
      "touchstart",
      (e) => {
        if (e.touches.length === 1) {
          touchStartX = e.touches[0].clientX;
          touchStartY = e.touches[0].clientY;
        }
      },
      { passive: true },
    );

    this.daysGrid.addEventListener(
      "touchend",
      (e) => {
        if (e.changedTouches.length === 1) {
          const deltaX = e.changedTouches[0].clientX - touchStartX;
          const deltaY = e.changedTouches[0].clientY - touchStartY;

          // Check if horizontal swipe was dominant
          if (
            Math.abs(deltaX) > 40 &&
            Math.abs(deltaX) > Math.abs(deltaY) * 1.5
          ) {
            // In RTL: Swipe to left means going forward to next month (+1)
            // Swipe to right means going back to prev month (-1)
            if (deltaX < 0) {
              this.shiftMonth(1, "slide-left");
            } else {
              this.shiftMonth(-1, "slide-right");
            }
          }
        }
      },
      { passive: true },
    );
  }

  /* --- Hero / Today Summary Card --- */
  renderHeroCard() {
    const today = JalaliDate.today();
    const gToday = today.toGregorian();
    const hToday = HijriDate.fromGregorian(gToday);

    const fullDateEl = document.getElementById("hero-full-date");
    const weekNumEl = document.getElementById("hero-week-num");
    const dayOfYearEl = document.getElementById("hero-day-of-year");
    const daysLeftEl = document.getElementById("hero-days-left");

    if (fullDateEl) {
      const weekdayName = PERSIAN_WEEKDAY_NAMES[(today.weekDay + 1) % 7];
      fullDateEl.textContent = `${weekdayName}، ${toPersianDigits(today.day)} ${today.monthName} ${toPersianDigits(today.year)}`;
    }

    if (weekNumEl) {
      weekNumEl.textContent = `${toPersianDigits(today.weekOfYear())}`;
    }

    if (dayOfYearEl) {
      const totalYearDays = today.isLeapYear ? 366 : 365;
      dayOfYearEl.textContent = `${toPersianDigits(today.dayOfYear())} از ${toPersianDigits(totalYearDays)}`;
    }

    if (daysLeftEl) {
      daysLeftEl.textContent = `${toPersianDigits(today.daysRemainingInYear())} روز`;
    }
  }

  /* --- Quick Month/Year Picker Modal --- */
  initQuickPicker() {
    const yearSelect = document.getElementById("picker-year-select");
    const monthsGrid = document.getElementById("picker-months-grid");
    const applyBtn = document.getElementById("picker-apply-btn");
    const closeBtn = document.getElementById("picker-close-btn");
    const backdrop = document.getElementById("picker-backdrop");

    if (yearSelect) {
      // Generate years 1350 to 1440
      const currentYear = JalaliDate.today().year;
      yearSelect.innerHTML = "";
      for (let y = currentYear - 40; y <= currentYear + 40; y++) {
        const option = document.createElement("option");
        option.value = y;
        option.textContent = `سال ${toPersianDigits(y)}`;
        if (y === this.viewDate.year) {
          option.selected = true;
        }
        yearSelect.appendChild(option);
      }

      yearSelect.addEventListener("change", () => {
        this.pickerSelectedYear = Number(yearSelect.value);
      });
    }

    if (monthsGrid) {
      monthsGrid.innerHTML = PERSIAN_MONTH_NAMES.map((name, index) => {
        const monthNum = index + 1;
        return `
          <button type="button" class="picker-month-btn" data-month="${monthNum}">
            ${name}
          </button>
        `;
      }).join("");

      monthsGrid.querySelectorAll(".picker-month-btn").forEach((btn) => {
        btn.addEventListener("click", () => {
          this.pickerSelectedMonth = Number(btn.dataset.month);
          this.updatePickerMonthButtons();
          HapticService.trigger(8);
        });
      });
    }

    applyBtn?.addEventListener("click", () => {
      this.viewDate = new JalaliDate(
        this.pickerSelectedYear,
        this.pickerSelectedMonth,
        1,
      );
      this.selectedDate = new JalaliDate(
        this.pickerSelectedYear,
        this.pickerSelectedMonth,
        1,
      );
      this.renderMonth();
      this.renderDayDetail(this.selectedDate);
      this.renderDayNotes(this.selectedDate);
      this.renderSubDates(this.selectedDate);
      this.updateTodayButtonVisibility();
      ModalManager.close("modal-picker");
      HapticService.trigger(10);
    });

    closeBtn?.addEventListener("click", () =>
      ModalManager.close("modal-picker"),
    );
    backdrop?.addEventListener("click", () =>
      ModalManager.close("modal-picker"),
    );
  }

  updatePickerMonthButtons() {
    const buttons = document.querySelectorAll(".picker-month-btn");
    buttons.forEach((btn) => {
      btn.classList.toggle(
        "is-selected",
        Number(btn.dataset.month) === this.pickerSelectedMonth,
      );
    });
  }

  openQuickPicker() {
    this.pickerSelectedYear = this.viewDate.year;
    this.pickerSelectedMonth = this.viewDate.month;

    const yearSelect = document.getElementById("picker-year-select");
    if (yearSelect) {
      yearSelect.value = String(this.pickerSelectedYear);
    }
    this.updatePickerMonthButtons();

    ModalManager.open("modal-picker");
  }

  goToToday() {
    const today = JalaliDate.today();
    this.viewDate = new JalaliDate(today.year, today.month, 1);
    this.selectedDate = today;

    this.renderMonth();
    this.renderDayDetail(this.selectedDate);
    this.renderDayNotes(this.selectedDate);
    this.renderSubDates(this.selectedDate);
    this.updateTodayButtonVisibility();
    HapticService.trigger(12);
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

  shiftMonth(direction, animClass = "") {
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

    if (animClass && this.daysGrid) {
      this.daysGrid.classList.remove("slide-left", "slide-right");
      // Force layout reflow for animation restart
      void this.daysGrid.offsetWidth;
      this.daysGrid.classList.add(animClass);
    }

    this.renderMonth();
    HapticService.trigger(8);
  }

  async renderMonth() {
    const { year, month } = this.viewDate;

    if (this.monthYearText) {
      this.monthYearText.textContent = `${PERSIAN_MONTH_NAMES[month - 1]} ${toPersianDigits(year)}`;
    }

    const firstDay = new JalaliDate(year, month, 1);
    const totalDays = firstDay.daysInMonth();
    const leadingEmpty = (firstDay.weekDay + 1) % 7;

    const requestId = ++this.monthEventsRequestId;

    try {
      this.holidayMap = await EventsService.getMonthHolidayMap(year, month);
      this.notesMap = NotesService.getMonthNotesMap(year, month);

      if (requestId !== this.monthEventsRequestId) {
        return;
      }
    } catch (error) {
      console.error("Failed to load holiday or notes map:", error);
      this.holidayMap = {};
      this.notesMap = {};
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
      const hasNotes = Boolean(this.notesMap[day]);

      // Calculate Gregorian and Hijri day numbers for sub-display
      const gDate = date.toGregorian();
      const hDate = HijriDate.fromGregorian(gDate);

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

      // Prepare dots
      const dots = [];
      if (isHoliday) {
        dots.push('<span class="cell-dot cell-dot--holiday"></span>');
      }
      if (hasNotes) {
        dots.push('<span class="cell-dot cell-dot--note"></span>');
      }

      cells.push(`
        <button
          type="button"
          class="${classes.join(" ")}"
          data-day="${day}"
          aria-label="${date.format()}"
        >
          <span class="day-cell__num">${toPersianDigits(day)}</span>
          <span class="day-cell__sub">
            <span class="day-cell__gregorian">${gDate.getDate()}</span>
            <span class="day-cell__hijri">${toPersianDigits(hDate.day)}</span>
          </span>
          <span class="day-cell__dots">${dots.join("")}</span>
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
            this.renderDayNotes(this.selectedDate);
            this.renderSubDates(this.selectedDate);
            this.updateTodayButtonVisibility();
            HapticService.trigger(8);
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
        .map((dayItem) => {
          const date = new JalaliDate(year, month, dayItem.day);
          const weekdayName = PERSIAN_WEEKDAY_NAMES[(date.weekDay + 1) % 7];
          return `
            <div class="month-events-day${
              dayItem.isHoliday ? " month-events-day--holiday" : ""
            }">
              <div class="month-events-day__label">
                <div class="month-events-day__label-left">
                  <span class="day-number">${toPersianDigits(dayItem.day)}</span>
                  <span>${weekdayName}، ${toPersianDigits(dayItem.day)} ${PERSIAN_MONTH_NAMES[month - 1]}</span>
                </div>
                ${
                  dayItem.isHoliday
                    ? '<span class="month-events-day__holiday-badge">تعطیل</span>'
                    : ""
                }
              </div>

              ${dayItem.items
                .map(
                  (item) => `
                    <div class="event-item${
                      item.holiday ? " event-item--holiday" : ""
                    }">
                      <span class="event-item__badge"></span>
                      <span class="event-item__text">${item.text}</span>
                      <span class="event-item__tag ${getEventTagClass(item.tag)}">${item.tag}</span>
                    </div>
                  `,
                )
                .join("")}
            </div>
          `;
        })
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
        شمسی: ${toPersianDigits(jalaliDate.year)}/${toPersianDigits(String(jalaliDate.month).padStart(2, "0"))}/${toPersianDigits(String(jalaliDate.day).padStart(2, "0"))}
      </span>
      <span>میلادی: <bdi dir="ltr">${gregorianString}</bdi></span>
      <span>قمری: ${toPersianDigits(hijriDate.format())}</span>
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
        const isString = typeof event === "string";
        const title = isString ? event : (event && event.title) || "";
        const holiday = isString ? false : Boolean(event && event.holiday);

        if (!title) return;

        items.push({
          text: title,
          holiday,
          tag: "قمری",
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
              <span class="event-item__text">${item.text}</span>
              <span class="event-item__tag ${getEventTagClass(item.tag)}">${item.tag}</span>
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

  /* --- Personal Notes Management --- */
  initNotesDialog() {
    const openBtn = document.getElementById("open-add-note-btn");
    const saveBtn = document.getElementById("note-save-btn");
    const closeBtn = document.getElementById("note-close-btn");
    const backdrop = document.getElementById("note-backdrop");
    const pills = document.querySelectorAll("#note-category-pills .category-pill");

    let currentCategory = "reminder";

    pills.forEach((pill) => {
      pill.addEventListener("click", () => {
        pills.forEach((p) => p.classList.remove("is-active"));
        pill.classList.add("is-active");
        currentCategory = pill.dataset.cat;
        HapticService.trigger(8);
      });
    });

    openBtn?.addEventListener("click", () => {
      const titleInput = document.getElementById("note-title-input");
      const textInput = document.getElementById("note-text-input");
      const modalTitle = document.getElementById("note-modal-title");

      if (titleInput) titleInput.value = "";
      if (textInput) textInput.value = "";
      if (modalTitle) {
        modalTitle.textContent = `ثبت یادداشت برای ${this.selectedDate.format()}`;
      }

      ModalManager.open("modal-note");
      titleInput?.focus();
    });

    saveBtn?.addEventListener("click", () => {
      const title = document.getElementById("note-title-input")?.value;
      const text = document.getElementById("note-text-input")?.value;

      if (!title || !title.trim()) {
        ToastService.show("لطفاً عنوان یادداشت را وارد کنید");
        return;
      }

      NotesService.addNote(
        this.selectedDate.year,
        this.selectedDate.month,
        this.selectedDate.day,
        {
          title,
          text,
          category: currentCategory,
        },
      );

      ToastService.show("یادداشت با موفقیت ثبت شد");
      HapticService.trigger(12);

      ModalManager.close("modal-note");
      this.renderDayNotes(this.selectedDate);
      this.renderMonth();
    });

    closeBtn?.addEventListener("click", () => ModalManager.close("modal-note"));
    backdrop?.addEventListener("click", () => ModalManager.close("modal-note"));
  }

  renderDayNotes(jalaliDate) {
    if (!this.notesListElement) return;

    const notes = NotesService.getNotes(
      jalaliDate.year,
      jalaliDate.month,
      jalaliDate.day,
    );

    if (!notes.length) {
      this.notesListElement.innerHTML = `
        <div class="empty-state">
          یادداشتی برای این روز ثبت نشده است.
        </div>
      `;
      return;
    }

    this.notesListElement.innerHTML = `
      <div class="notes-list">
        ${notes
          .map((n) => {
            const catInfo = NOTE_CATEGORIES[n.category] || NOTE_CATEGORIES.reminder;
            return `
              <div class="note-item note-item--${n.category}">
                <div class="note-item__body">
                  <div class="note-item__header">
                    <span class="note-item__title">${n.title}</span>
                    <span class="note-item__category">${catInfo.label}</span>
                  </div>
                  ${n.text ? `<p class="note-item__desc">${n.text}</p>` : ""}
                </div>
                <button type="button" class="note-item__del" data-id="${n.id}" aria-label="حذف یادداشت" title="حذف">
                  ✕
                </button>
              </div>
            `;
          })
          .join("")}
      </div>
    `;

    this.notesListElement.querySelectorAll(".note-item__del").forEach((delBtn) => {
      delBtn.addEventListener("click", () => {
        const id = delBtn.dataset.id;
        NotesService.deleteNote(
          jalaliDate.year,
          jalaliDate.month,
          jalaliDate.day,
          id,
        );
        ToastService.show("یادداشت حذف شد");
        HapticService.trigger(8);
        this.renderDayNotes(jalaliDate);
        this.renderMonth();
      });
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Search Controller                                                          */
/* -------------------------------------------------------------------------- */

class SearchController {
  constructor(calendarController, navigationController) {
    this.calendar = calendarController;
    this.nav = navigationController;

    this.openBtn = document.getElementById("search-open-btn");
    this.closeBtn = document.getElementById("search-close-btn");
    this.backdrop = document.getElementById("search-backdrop");
    this.input = document.getElementById("search-input");
    this.resultsList = document.getElementById("search-results");

    this._debounceTimer = null;

    this.registerEvents();
  }

  registerEvents() {
    this.openBtn?.addEventListener("click", () => {
      ModalManager.open("modal-search");
      if (this.input) {
        this.input.value = "";
        setTimeout(() => this.input.focus(), 100);
      }
      this.renderEmpty();
    });

    this.closeBtn?.addEventListener("click", () =>
      ModalManager.close("modal-search"),
    );
    this.backdrop?.addEventListener("click", () =>
      ModalManager.close("modal-search"),
    );

    this.input?.addEventListener("input", () => {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => {
        this.performSearch(this.input.value);
      }, 150);
    });
  }

  renderEmpty() {
    if (this.resultsList) {
      this.resultsList.innerHTML = `
        <div class="empty-state">
          عبارت مورد نظر خود را تایپ کنید...
        </div>
      `;
    }
  }

  performSearch(query) {
    if (!query || !query.trim() || !this.resultsList) {
      this.renderEmpty();
      return;
    }

    const cleanQuery = query.trim();
    const currentYear = this.calendar.viewDate.year;

    const occasionMatches = EventsService.searchOccasions(currentYear, cleanQuery);
    const noteMatches = NotesService.searchNotes(cleanQuery);

    if (!occasionMatches.length && !noteMatches.length) {
      this.resultsList.innerHTML = `
        <div class="empty-state">
          موردی برای «${cleanQuery}» یافت نشد.
        </div>
      `;
      return;
    }

    const results = [];

    // Format occasions
    occasionMatches.forEach((occ) => {
      results.push({
        year: occ.year,
        month: occ.month,
        day: occ.day,
        title: occ.title,
        tag: occ.tag,
        isHoliday: occ.holiday,
        type: "occasion",
      });
    });

    // Format notes
    noteMatches.forEach((m) => {
      results.push({
        year: m.year,
        month: m.month,
        day: m.day,
        title: m.note.title,
        tag: "یادداشت شخصی",
        isHoliday: false,
        type: "note",
      });
    });

    this.resultsList.innerHTML = results
      .map(
        (item) => `
        <div class="search-result-item" data-y="${item.year}" data-m="${item.month}" data-d="${item.day}">
          <span class="search-result-item__date">
            ${toPersianDigits(item.day)} ${PERSIAN_MONTH_NAMES[item.month - 1]}
          </span>
          <span class="search-result-item__text">
            ${item.title}
          </span>
          <span class="event-item__tag ${getEventTagClass(item.tag)}" style="${item.type === 'note' ? 'color:var(--color-accent);' : ''}">${item.tag}</span>
        </div>
      `,
      )
      .join("");

    this.resultsList
      .querySelectorAll(".search-result-item")
      .forEach((itemEl) => {
        itemEl.addEventListener("click", () => {
          const y = Number(itemEl.dataset.y);
          const m = Number(itemEl.dataset.m);
          const d = Number(itemEl.dataset.d);

          this.calendar.viewDate = new JalaliDate(y, m, 1);
          this.calendar.selectedDate = new JalaliDate(y, m, d);

          this.calendar.renderMonth();
          this.calendar.renderDayDetail(this.calendar.selectedDate);
          this.calendar.renderDayNotes(this.calendar.selectedDate);
          this.calendar.renderSubDates(this.calendar.selectedDate);
          this.calendar.updateTodayButtonVisibility();

          ModalManager.close("modal-search");
          this.nav.activate("page-calendar");
          HapticService.trigger(12);
        });
      });
  }
}

/* -------------------------------------------------------------------------- */
/* Date Tools Controller (Conversion, Difference, Add/Subtract)               */
/* -------------------------------------------------------------------------- */

class DateToolsController {
  constructor() {
    this.fromSystem = "jalali";

    // Subpage tabs
    this.subpageTabs = Array.from(document.querySelectorAll(".sub-nav-tab"));
    this.subpages = Array.from(document.querySelectorAll(".converter-subpage"));

    this.subpageTabs.forEach((tab) => {
      tab.addEventListener("click", () => {
        const targetId = tab.dataset.subpage;
        this.subpageTabs.forEach((t) => t.classList.toggle("is-active", t === tab));
        this.subpages.forEach((p) => p.classList.toggle("is-active", p.id === targetId));
        HapticService.trigger(8);
      });
    });

    this.initConverter();
    this.initDifferenceCalculator();
    this.initAddSubtractCalculator();
  }

  /* --- Tool 1: Conversion --- */
  initConverter() {
    this.dayInput = document.getElementById("conv-day");
    this.monthInput = document.getElementById("conv-month");
    this.yearInput = document.getElementById("conv-year");
    this.resultBox = document.getElementById("conv-result");

    // Populate with today
    const today = JalaliDate.today();
    if (this.dayInput) this.dayInput.value = today.day;
    if (this.monthInput) this.monthInput.value = today.month;
    if (this.yearInput) this.yearInput.value = today.year;

    document.querySelectorAll("[data-conv-from]").forEach((chip) => {
      chip.addEventListener("click", () => {
        document.querySelectorAll("[data-conv-from]").forEach((item) => {
          item.setAttribute("aria-selected", "false");
        });

        chip.setAttribute("aria-selected", "true");
        this.fromSystem = chip.dataset.convFrom;
        HapticService.trigger(8);
      });
    });

    document.getElementById("conv-submit-btn")?.addEventListener("click", () => {
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
        const gregorian = HijriAlgorithm.hijriToGregorian(year, month, day);
        gregorianDate = new Date(gregorian.gy, gregorian.gm - 1, gregorian.gd);
        jalaliDate = JalaliDate.fromGregorian(gregorianDate);
        hijriDate = new HijriDate(year, month, day);
      }

      if (!this.resultBox) return;

      this.resultBox.style.display = "block";
      this.resultBox.innerHTML = `
        <div class="result-box__highlight">
          ${toPersianDigits(jalaliDate.format())}
        </div>
        <div style="margin-top: 8px;">
          میلادی:
          <bdi dir="ltr">${gregorianDate.getFullYear()}/${String(gregorianDate.getMonth() + 1).padStart(2, "0")}/${String(gregorianDate.getDate()).padStart(2, "0")}</bdi>
        </div>
        <div>قمری: ${toPersianDigits(hijriDate.format())}</div>
      `;
      HapticService.trigger(10);
    } catch (error) {
      console.error("Date conversion failed:", error);
      ToastService.show("تاریخ وارد شده معتبر نیست");
    }
  }

  /* --- Tool 2: Date Difference --- */
  initDifferenceCalculator() {
    const today = JalaliDate.today();
    const d1 = document.getElementById("diff-day-1");
    const m1 = document.getElementById("diff-month-1");
    const y1 = document.getElementById("diff-year-1");

    if (d1) d1.value = today.day;
    if (m1) m1.value = today.month;
    if (y1) y1.value = today.year;

    document.getElementById("diff-submit-btn")?.addEventListener("click", () => {
      const day1 = Number(document.getElementById("diff-day-1")?.value);
      const month1 = Number(document.getElementById("diff-month-1")?.value);
      const year1 = Number(document.getElementById("diff-year-1")?.value);

      const day2 = Number(document.getElementById("diff-day-2")?.value);
      const month2 = Number(document.getElementById("diff-month-2")?.value);
      const year2 = Number(document.getElementById("diff-year-2")?.value);

      if (!day1 || !month1 || !year1 || !day2 || !month2 || !year2) {
        ToastService.show("لطفاً هر دو تاریخ را کامل وارد کنید");
        return;
      }

      try {
        const date1 = new JalaliDate(year1, month1, day1);
        const date2 = new JalaliDate(year2, month2, day2);

        const diffDays = Math.abs(date2.diffDays(date1));
        const weeks = Math.floor(diffDays / 7);
        const remDays = diffDays % 7;
        const approxMonths = Math.floor(diffDays / 30);

        const resultBox = document.getElementById("diff-result");
        if (!resultBox) return;

        resultBox.style.display = "block";
        resultBox.innerHTML = `
          <div class="result-box__highlight">
            ${toPersianDigits(diffDays)} روز فاصله
          </div>
          <div style="margin-top: 8px;">
            معادل <strong>${toPersianDigits(weeks)}</strong> هفته و <strong>${toPersianDigits(remDays)}</strong> روز
          </div>
          <div style="color:var(--color-text-muted);font-size:13px;margin-top:4px;">
            (حدوداً ${toPersianDigits(approxMonths)} ماه و ${toPersianDigits(diffDays % 30)} روز)
          </div>
        `;
        HapticService.trigger(10);
      } catch (err) {
        ToastService.show("تاریخ‌های وارد شده معتبر نیستند");
      }
    });
  }

  /* --- Tool 3: Add / Subtract Days --- */
  initAddSubtractCalculator() {
    const today = JalaliDate.today();
    const cd = document.getElementById("calc-day");
    const cm = document.getElementById("calc-month");
    const cy = document.getElementById("calc-year");

    if (cd) cd.value = today.day;
    if (cm) cm.value = today.month;
    if (cy) cy.value = today.year;

    document.getElementById("calc-submit-btn")?.addEventListener("click", () => {
      const day = Number(document.getElementById("calc-day")?.value);
      const month = Number(document.getElementById("calc-month")?.value);
      const year = Number(document.getElementById("calc-year")?.value);
      const op = document.getElementById("calc-op")?.value;
      const count = Number(document.getElementById("calc-days-count")?.value);

      if (!day || !month || !year || !count) {
        ToastService.show("لطفاً تاریخ و تعداد روزها را کامل وارد کنید");
        return;
      }

      try {
        const base = new JalaliDate(year, month, day);
        const target = base.addDays(op === "add" ? count : -count);
        const gTarget = target.toGregorian();
        const hTarget = HijriDate.fromGregorian(gTarget);
        const weekdayName = PERSIAN_WEEKDAY_NAMES[(target.weekDay + 1) % 7];

        const resultBox = document.getElementById("calc-result");
        if (!resultBox) return;

        resultBox.style.display = "block";
        resultBox.innerHTML = `
          <div class="result-box__highlight">
            ${weekdayName}، ${toPersianDigits(target.format())}
          </div>
          <div style="margin-top: 8px;">
            میلادی: <bdi dir="ltr">${gTarget.getFullYear()}/${String(gTarget.getMonth() + 1).padStart(2, "0")}/${String(gTarget.getDate()).padStart(2, "0")}</bdi>
          </div>
          <div>قمری: ${toPersianDigits(hTarget.format())}</div>
        `;
        HapticService.trigger(10);
      } catch (err) {
        ToastService.show("تاریخ یا مقدار وارد شده معتبر نیست");
      }
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Prayer Times & Qibla Controller                                            */
/* -------------------------------------------------------------------------- */

class PrayerTimesController {
  constructor() {
    this.calculator = new PrayerTimesCalculator("jafari");
    this.grid = document.getElementById("prayer-times-grid");
    this.citySelect = document.getElementById("prayer-city-select");
    this.countdownTimer = document.getElementById("prayer-countdown-timer");
    this.countdownLabel = document.getElementById("prayer-countdown-label");

    // Hero card elements
    this.heroPrayerLabel = document.getElementById("hero-prayer-label");
    this.heroPrayerCountdown = document.getElementById("hero-prayer-countdown");

    this.location = this.loadSavedLocation();

    this.initCitySelect();
    this.initCompass();
    this.startLiveTimer();

    document
      .getElementById("use-location-btn")
      ?.addEventListener("click", () => {
        this.requestLocation();
      });

    this.render();
  }

  loadSavedLocation() {
    try {
      const saved = localStorage.getItem("prayer_selected_location");
      if (saved) return JSON.parse(saved);
    } catch (_) {}
    return window.DEFAULT_LOCATION;
  }

  initCitySelect() {
    if (!this.citySelect) return;

    this.citySelect.innerHTML = IRAN_PROVINCE_CAPITALS.map((city) => {
      const isSelected = city.name === this.location.name;
      return `<option value="${city.name}" ${isSelected ? "selected" : ""}>${city.name}</option>`;
    }).join("");

    this.citySelect.addEventListener("change", () => {
      const selectedName = this.citySelect.value;
      const found = IRAN_PROVINCE_CAPITALS.find((c) => c.name === selectedName);
      if (found) {
        this.location = {
          lat: found.lat,
          lng: found.lng,
          timezone: 3.5,
          name: found.name,
        };
        try {
          localStorage.setItem(
            "prayer_selected_location",
            JSON.stringify(this.location),
          );
        } catch (_) {}

        this.render();
        ToastService.show(`مکان به ${found.name} تغییر یافت`);
        HapticService.trigger(10);
      }
    });
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
          name: "موقعیت جغرافیایی شما",
        };

        try {
          localStorage.setItem(
            "prayer_selected_location",
            JSON.stringify(this.location),
          );
        } catch (_) {}

        this.render();
        ToastService.show("موقعیت شما با موفقیت شناسایی شد");
        HapticService.trigger(12);
      },
      () => {
        ToastService.show(
          "دسترسی به موقعیت رد شد؛ از لیست شهرها انتخاب کنید",
        );
      },
    );
  }

  startLiveTimer() {
    setInterval(() => {
      this.updateCountdown();
    }, 1000);
  }

  updateCountdown() {
    if (!this.location) return;

    const times = this.calculator.getTimesForDate(
      new Date(),
      this.location.lat,
      this.location.lng,
      this.location.timezone,
    );

    const next = PrayerHelper.getNextPrayer(times);
    if (!next) return;

    const hrs = Math.floor(next.secondsRemaining / 3600);
    const mins = Math.floor((next.secondsRemaining % 3600) / 60);
    const secs = next.secondsRemaining % 60;
    const pad = (n) => String(n).padStart(2, "0");
    const formatted = `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;

    if (this.countdownLabel) {
      this.countdownLabel.textContent = `تا ${next.label}:`;
    }
    if (this.countdownTimer) {
      this.countdownTimer.textContent = toPersianDigits(formatted);
    }

    // Update Hero card countdown
    if (this.heroPrayerLabel) {
      this.heroPrayerLabel.textContent = `تا ${next.label}`;
    }
    if (this.heroPrayerCountdown) {
      this.heroPrayerCountdown.textContent = toPersianDigits(
        `${pad(hrs)}:${pad(mins)}`,
      );
    }

    // Highlight next prayer in grid
    document.querySelectorAll(".prayer-time-item").forEach((item) => {
      item.classList.toggle("is-next", item.dataset.key === next.key);
    });
  }

  initCompass() {
    const qiblaAngle = QiblaCalculator.calculate(
      this.location.lat,
      this.location.lng,
    );
    const angleEl = document.getElementById("qibla-angle-value");
    const kaabaMarker = document.getElementById("qibla-kaaba-marker");
    const needle = document.getElementById("qibla-needle");

    if (angleEl) {
      angleEl.textContent = `${toPersianDigits(qiblaAngle)}°`;
    }
    if (kaabaMarker) {
      kaabaMarker.style.transform = `rotate(${qiblaAngle}deg)`;
    }

    // Device orientation sensor (mobile compass)
    if (window.DeviceOrientationEvent) {
      window.addEventListener(
        "deviceorientation",
        (event) => {
          if (event.alpha !== null && needle) {
            // Compass heading
            const heading = event.webkitCompassHeading || 360 - event.alpha;
            needle.style.transform = `rotate(${heading}deg)`;
          }
        },
        true,
      );
    }
  }

  render() {
    if (!this.grid || !this.location) {
      return;
    }

    const locationLabel = document.getElementById("prayer-location-label");
    if (locationLabel) {
      locationLabel.textContent = `مکان: ${this.location.name}`;
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
          <div class="prayer-time-item" data-key="${key}">
            <span class="prayer-time-item__name">${label}</span>
            <span class="prayer-time-item__value">${toPersianDigits(times[key])}</span>
          </div>
        `,
      )
      .join("");

    this.initCompass();
    this.updateCountdown();
  }
}

/* -------------------------------------------------------------------------- */
/* Settings & Backup Controller                                               */
/* -------------------------------------------------------------------------- */

class SettingsController {
  constructor(calendarController) {
    this.calendar = calendarController;
    this.initThemeButtons();
    this.initBackupControls();
  }

  initThemeButtons() {
    const buttons = document.querySelectorAll("[data-theme-choice]");
    const updateActiveButton = (currentTheme) => {
      buttons.forEach((btn) => {
        btn.classList.toggle(
          "is-active",
          btn.dataset.themeChoice === currentTheme,
        );
      });
    };

    updateActiveButton(window.themeManagerInstance.current);

    buttons.forEach((btn) => {
      btn.addEventListener("click", () => {
        const choice = btn.dataset.themeChoice;
        window.themeManagerInstance.setTheme(choice);
        updateActiveButton(choice);
        HapticService.trigger(10);
      });
    });

    window.themeManagerInstance.subscribe((theme) => {
      updateActiveButton(theme);
    });
  }

  initBackupControls() {
    const exportBtn = document.getElementById("export-notes-btn");
    const importInput = document.getElementById("import-notes-file");

    exportBtn?.addEventListener("click", () => {
      const json = NotesService.exportAsJson();
      const blob = new Blob([json], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `persian-calendar-notes-${JalaliDate.today().toString().replace(/\//g, "-")}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      ToastService.show("فایل پشتیبان با موفقیت دانلود شد");
      HapticService.trigger(12);
    });

    importInput?.addEventListener("change", (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result;
        const result = NotesService.importFromJson(content);
        if (result.success) {
          ToastService.show(
            `${toPersianDigits(result.count)} یادداشت با موفقیت بازیابی شد`,
          );
          this.calendar.renderMonth();
          this.calendar.renderDayNotes(this.calendar.selectedDate);
          HapticService.trigger(12);
        } else {
          ToastService.show("قالب فایل پشتیبان نامعتبر است");
        }
      };
      reader.readAsText(file);
      importInput.value = "";
    });
  }
}

/* -------------------------------------------------------------------------- */
/* Age Controller                                                             */
/* -------------------------------------------------------------------------- */

class AgeController {
  constructor() {
    document.getElementById("age-submit-btn")?.addEventListener("click", () => {
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
          ${toPersianDigits(result.years)} سال و
          ${toPersianDigits(result.months)} ماه و
          ${toPersianDigits(result.days)} روز
        </div>

        <div class="stat-grid">
          <div class="stat-box">
            <div class="stat-box__value">
              ${toPersianDigits(result.totalDays.toLocaleString("fa-IR"))}
            </div>
            <div class="stat-box__label">کل روزها</div>
          </div>

          <div class="stat-box">
            <div class="stat-box__value">
              ${toPersianDigits(result.totalMonths.toLocaleString("fa-IR"))}
            </div>
            <div class="stat-box__label">کل ماه‌ها</div>
          </div>

          <div class="stat-box">
            <div class="stat-box__value">
              ${toPersianDigits(result.totalWeeks.toLocaleString("fa-IR"))}
            </div>
            <div class="stat-box__label">کل هفته‌ها</div>
          </div>

          <div class="stat-box">
            <div class="stat-box__value">
              ${toPersianDigits(nextBirthday.daysLeft.toLocaleString("fa-IR"))}
            </div>
            <div class="stat-box__label">روز تا تولد بعدی</div>
          </div>
        </div>
      `;
      HapticService.trigger(10);
    } catch (error) {
      console.error("Age calculation failed:", error);
      ToastService.show("تاریخ تولد معتبر نیست");
    }
  }
}

/* -------------------------------------------------------------------------- */
/* Theme Toggle Button Header Helper                                          */
/* -------------------------------------------------------------------------- */

function initThemeToggle() {
  document.getElementById("theme-toggle-btn")?.addEventListener("click", () => {
    window.themeManagerInstance.toggle();
    HapticService.trigger(8);
  });
}

/* -------------------------------------------------------------------------- */
/* PWA Install Prompt                                                         */
/* -------------------------------------------------------------------------- */

let deferredPrompt = null;

function initializeInstallPrompt() {
  const installPromptDismissed = localStorage.getItem("installPromptDismissed");

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

      installingWorker.addEventListener("statechange", () => {
        if (
          installingWorker.state === "installed" &&
          navigator.serviceWorker.controller
        ) {
          this.waitingWorker = this.registration.waiting || installingWorker;
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
  const navCtrl = new NavigationController();
  const calCtrl = new CalendarController();
  new SearchController(calCtrl, navCtrl);
  new DateToolsController();
  new AgeController();
  new PrayerTimesController();
  new SettingsController(calCtrl);

  initThemeToggle();
  initializeInstallPrompt();

  const serviceWorkerUpdateManager = new ServiceWorkerUpdateManager();
  await serviceWorkerUpdateManager.initialize();
});
