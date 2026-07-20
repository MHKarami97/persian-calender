/**
 * Theme Manager — Observer Pattern for dark/light mode.
 * Persists in localStorage, respects prefers-color-scheme on first load.
 */
'use strict';

const THEME_STORAGE_KEY = 'app_theme_preference';

class ThemeManager {
  constructor() {
    this.observers = [];
    this.current = this._resolveInitialTheme();
    this._applyToDom();
  }

  _resolveInitialTheme() {
    const saved = localStorage.getItem(THEME_STORAGE_KEY);
    if (saved === 'dark' || saved === 'light') return saved;
    return window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
  }

  subscribe(callback) { this.observers.push(callback); }

  toggle() {
    this.current = this.current === 'dark' ? 'light' : 'dark';
    localStorage.setItem(THEME_STORAGE_KEY, this.current);
    this._applyToDom();
    this._notify();
  }

  _applyToDom() {
    document.documentElement.setAttribute('data-theme', this.current);
    const meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute('content', this.current === 'dark' ? '#0f172a' : '#f8fafc');
  }

  _notify() { this.observers.forEach((cb) => cb(this.current)); }
}

window.ThemeManager = ThemeManager;
window.themeManagerInstance = new ThemeManager();
