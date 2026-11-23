/**
 * User Personal Notes & Reminders Service
 * Manages custom user events, reminders, and notes per day in localStorage.
 * Provides backup export/import as JSON.
 */
'use strict';

const NOTES_STORAGE_KEY = 'user_calendar_notes_v1';

const NOTE_CATEGORIES = {
  reminder: { label: 'یادآور', color: '#f59e0b' },
  personal: { label: 'شخصی', color: '#10b981' },
  work: { label: 'کاری', color: '#3b82f6' },
  birthday: { label: 'تولد و مناسبت', color: '#ec4899' },
};

class NotesService {
  static _getAll() {
    try {
      const raw = localStorage.getItem(NOTES_STORAGE_KEY);
      return raw ? JSON.parse(raw) : {};
    } catch (e) {
      console.error('Failed to parse notes from storage:', e);
      return {};
    }
  }

  static _saveAll(data) {
    try {
      localStorage.setItem(NOTES_STORAGE_KEY, JSON.stringify(data));
      return true;
    } catch (e) {
      console.error('Failed to save notes to storage:', e);
      return false;
    }
  }

  static _dateKey(year, month, day) {
    const p = (n) => String(n).padStart(2, '0');
    return `${year}-${p(month)}-${p(day)}`;
  }

  static getNotes(year, month, day) {
    const all = NotesService._getAll();
    const key = NotesService._dateKey(year, month, day);
    return Array.isArray(all[key]) ? all[key] : [];
  }

  static hasNotes(year, month, day) {
    const list = NotesService.getNotes(year, month, day);
    return list.length > 0;
  }

  static getMonthNotesMap(year, month) {
    const all = NotesService._getAll();
    const p = (n) => String(n).padStart(2, '0');
    const prefix = `${year}-${p(month)}-`;
    const map = {};

    for (const key of Object.keys(all)) {
      if (key.startsWith(prefix) && Array.isArray(all[key]) && all[key].length > 0) {
        const day = Number(key.split('-')[2]);
        map[day] = all[key].length;
      }
    }
    return map;
  }

  static addNote(year, month, day, { title, text = '', category = 'reminder' }) {
    if (!title || !title.trim()) return null;

    const all = NotesService._getAll();
    const key = NotesService._dateKey(year, month, day);
    if (!Array.isArray(all[key])) {
      all[key] = [];
    }

    const note = {
      id: 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
      title: title.trim(),
      text: (text || '').trim(),
      category: NOTE_CATEGORIES[category] ? category : 'reminder',
      createdAt: Date.now(),
    };

    all[key].unshift(note);
    NotesService._saveAll(all);
    return note;
  }

  static deleteNote(year, month, day, noteId) {
    const all = NotesService._getAll();
    const key = NotesService._dateKey(year, month, day);
    if (!Array.isArray(all[key])) return false;

    all[key] = all[key].filter((n) => n.id !== noteId);
    if (all[key].length === 0) {
      delete all[key];
    }
    return NotesService._saveAll(all);
  }

  static searchNotes(keyword) {
    if (!keyword || !keyword.trim()) return [];
    const query = keyword.trim().toLowerCase();
    const all = NotesService._getAll();
    const results = [];

    for (const [key, notes] of Object.entries(all)) {
      if (!Array.isArray(notes)) continue;
      const [y, m, d] = key.split('-').map(Number);

      for (const note of notes) {
        if (
          note.title.toLowerCase().includes(query) ||
          (note.text && note.text.toLowerCase().includes(query))
        ) {
          results.push({
            year: y,
            month: m,
            day: d,
            note,
          });
        }
      }
    }

    return results;
  }

  static exportAsJson() {
    const all = NotesService._getAll();
    return JSON.stringify(all, null, 2);
  }

  static importFromJson(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      if (typeof parsed !== 'object' || parsed === null) return { success: false, count: 0 };

      const all = NotesService._getAll();
      let importedCount = 0;

      for (const [key, notes] of Object.entries(parsed)) {
        if (!/^\d{4}-\d{2}-\d{2}$/.test(key) || !Array.isArray(notes)) continue;
        if (!Array.isArray(all[key])) all[key] = [];

        for (const n of notes) {
          if (n && n.title) {
            // Avoid duplicate ids
            const exists = all[key].some((existing) => existing.id === n.id);
            if (!exists) {
              all[key].push({
                id: n.id || 'note_' + Date.now() + '_' + Math.random().toString(36).substr(2, 5),
                title: n.title,
                text: n.text || '',
                category: NOTE_CATEGORIES[n.category] ? n.category : 'reminder',
                createdAt: n.createdAt || Date.now(),
              });
              importedCount += 1;
            }
          }
        }
      }

      NotesService._saveAll(all);
      return { success: true, count: importedCount };
    } catch (e) {
      console.error('Import notes failed:', e);
      return { success: false, count: 0 };
    }
  }

  static clearAll() {
    localStorage.removeItem(NOTES_STORAGE_KEY);
  }
}

if (typeof window !== "undefined") {
  window.NotesService = NotesService;
  window.NOTE_CATEGORIES = NOTE_CATEGORIES;
}

if (typeof module !== "undefined" && module.exports) {
  module.exports = { NotesService, NOTE_CATEGORIES };
}
