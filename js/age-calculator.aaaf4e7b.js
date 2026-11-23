/**
 * Age Calculator Module — computes calendar-aware age between two
 * Jalali dates (year/month/day diff, not naive day division).
 * Design pattern: Pure static Service (Single Responsibility)
 */
'use strict';

class AgeCalculatorService {
  static calculate(birth, reference = JalaliDate.today()) {
    let years = reference.year - birth.year;
    let months = reference.month - birth.month;
    let days = reference.day - birth.day;

    if (days < 0) {
      months -= 1;
      const prevMonth = reference.month === 1 ? 12 : reference.month - 1;
      const prevMonthYear = reference.month === 1 ? reference.year - 1 : reference.year;
      const prevMonthObj = new JalaliDate(prevMonthYear, prevMonth, 1);
      days += prevMonthObj.daysInMonth();
    }
    if (months < 0) { months += 12; years -= 1; }

    const totalDays = AgeCalculatorService.diffInDays(birth, reference);
    const totalMonths = years * 12 + months;

    return { years, months, days, totalDays, totalMonths, totalWeeks: Math.floor(totalDays / 7) };
  }

  static diffInDays(a, b) {
    const jdnA = JalaliAlgorithm.j2d(a.year, a.month, a.day);
    const jdnB = JalaliAlgorithm.j2d(b.year, b.month, b.day);
    return jdnB - jdnA;
  }

  static nextBirthday(birth, reference = JalaliDate.today()) {
    let next = new JalaliDate(
      reference.year, birth.month,
      Math.min(birth.day, new JalaliDate(reference.year, birth.month, 1).daysInMonth())
    );
    const refJdn = JalaliAlgorithm.j2d(reference.year, reference.month, reference.day);
    const nextJdn = JalaliAlgorithm.j2d(next.year, next.month, next.day);
    if (nextJdn < refJdn) {
      next = new JalaliDate(
        reference.year + 1, birth.month,
        Math.min(birth.day, new JalaliDate(reference.year + 1, birth.month, 1).daysInMonth())
      );
    }
    const daysLeft = AgeCalculatorService.diffInDays(reference, next);
    return { date: next, daysLeft };
  }
}

window.AgeCalculatorService = AgeCalculatorService;
