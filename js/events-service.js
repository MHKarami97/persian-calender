/**
 * Events Service — Fetches lunar/day-specific Iranian occasions from a
 * free public API (pnldev.com Jalali Calendar API) and caches results
 * in localStorage for 30 days to avoid repeated network calls.
 * API: https://pnldev.com/fa/api-doc/calender
 * Design pattern: Decorator (caching over HTTP repository) + Cache-Aside
 */
'use strict';

const CACHE_PREFIX = 'shamsi_events_cache_v1_';
const CACHE_TTL_DAYS = 30;
const CACHE_TTL_MS = CACHE_TTL_DAYS * 24 * 60 * 60 * 1000;
const API_BASE = 'https://pnldev.com/api/calender';

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
    } catch (e) { return null; }
  }

  static write(key, data) {
    try {
      localStorage.setItem(key, JSON.stringify({ savedAt: Date.now(), data }));
    } catch (e) { /* storage unavailable — app still works without cache */ }
  }

  static purgeExpired() {
    const now = Date.now();
    for (let i = localStorage.length - 1; i >= 0; i -= 1) {
      const key = localStorage.key(i);
      if (!key || !key.startsWith(CACHE_PREFIX)) continue;
      try {
        const parsed = JSON.parse(localStorage.getItem(key));
        if (now - parsed.savedAt > CACHE_TTL_MS) localStorage.removeItem(key);
      } catch (e) { localStorage.removeItem(key); }
    }
  }
}

class EventsApiRepository {
  static async getMonthEvents(jy, jm) {
    const cacheKey = `${CACHE_PREFIX}${jy}_${jm}`;
    const cached = LocalCacheStore.read(cacheKey);
    if (cached) return cached;

    try {
      const url = `${API_BASE}?year=${jy}&month=${jm}`;
      const res = await fetch(url, { method: 'GET' });
      if (!res.ok) throw new Error('network error ' + res.status);
      const json = await res.json();
      if (!json.status) throw new Error('api returned failure');
      LocalCacheStore.write(cacheKey, json.result);
      return json.result;
    } catch (err) {
      console.warn('[EventsApiRepository] fetch failed, using local data only:', err.message);
      return null;
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
      isHoliday: jalaliDate.weekDay === 5,
    };

    const g = jalaliDate.toGregorian();
    local.gregorianEvents = EventRepository.getFixedGregorianEvents(g.getMonth() + 1, g.getDate());

    const apiDay = await EventsApiRepository.getDayEvents(jalaliDate.year, jalaliDate.month, jalaliDate.day);
    if (apiDay) {
      local.isHoliday = local.isHoliday || !!apiDay.holiday;
      if (Array.isArray(apiDay.event) && apiDay.event.length) local.hijriEvents = apiDay.event;
    }
    return local;
  }

  static async getMonthHolidayMap(jy, jm) {
    const monthData = await EventsApiRepository.getMonthEvents(jy, jm);
    const map = {};
    if (monthData) {
      Object.keys(monthData).forEach((day) => { map[day] = !!monthData[day].holiday; });
    }
    return map;
  }
}

LocalCacheStore.purgeExpired();

window.EventsService = EventsService;
window.LocalCacheStore = LocalCacheStore;
