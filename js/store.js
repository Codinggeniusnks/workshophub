/**
 * WorkshopHub Store
 * Manages client-side storage, settings, and safe JSON/CSV export.
 * Clean, personal storage with zero demo data.
 */

const Store = {
  KEYS: {
    EVENTS: 'workshophub_events_v2',
    SETTINGS: 'workshophub_settings_v2'
  },

  DEFAULT_SETTINGS: {
    geminiApiKey: '',
    aiModel: 'gemini-3.8-flash',
    preferOnDeviceAi: true,
    darkMode: false,
    notificationsEnabled: false,
    userTimezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC'
  },

  getRelativeDate(offsetDays) {
    const d = new Date();
    d.setDate(d.getDate() + offsetDays);
    return d.toISOString().split('T')[0];
  },

  // Settings
  getSettings() {
    try {
      const raw = localStorage.getItem(this.KEYS.SETTINGS);
      if (!raw) return { ...this.DEFAULT_SETTINGS };
      const parsed = { ...this.DEFAULT_SETTINGS, ...JSON.parse(raw) };
      // Auto-migrate retired gemini-2.0-flash
      if (parsed.aiModel === 'gemini-2.0-flash' || !parsed.aiModel) {
        parsed.aiModel = 'gemini-3.8-flash';
        try { localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(parsed)); } catch (e) {}
      }
      return parsed;
    } catch (e) {
      return { ...this.DEFAULT_SETTINGS };
    }
  },

  getSetting(key) {
    const settings = this.getSettings();
    let val = settings[key] !== undefined ? settings[key] : this.DEFAULT_SETTINGS[key];
    if (key === 'aiModel' && (val === 'gemini-2.0-flash' || !val)) {
      val = 'gemini-3.8-flash';
    }
    if (key === 'geminiApiKey' && typeof val === 'string') {
      val = val.trim().replace(/^["']|["']$/g, '').trim();
    }
    return val;
  },

  saveSettings(newSettings) {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    if (typeof updated.geminiApiKey === 'string') {
      updated.geminiApiKey = updated.geminiApiKey.trim().replace(/^["']|["']$/g, '').trim();
    }
    localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  },

  setSetting(key, value) {
    const settings = this.getSettings();
    let cleanVal = value;
    if (key === 'geminiApiKey' && typeof value === 'string') {
      cleanVal = value.trim().replace(/^["']|["']$/g, '').trim();
    }
    settings[key] = cleanVal;
    localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
  },

  // Events (Clean personal storage - no sample/demo data)
  getEvents() {
    try {
      const raw = localStorage.getItem(this.KEYS.EVENTS);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      if (!Array.isArray(parsed)) return [];
      // Clean out any legacy demo data entries
      const cleaned = parsed.filter(e => e && e.id && !e.id.startsWith('demo-'));
      if (cleaned.length !== parsed.length) {
        this.saveEvents(cleaned);
      }
      return cleaned;
    } catch (e) {
      console.error('Failed to parse stored events:', e);
      return [];
    }
  },

  saveEvents(events) {
    localStorage.setItem(this.KEYS.EVENTS, JSON.stringify(events));
  },

  addEvent(eventData) {
    const events = this.getEvents();
    const cleanEvent = {
      id: Safe.safeId(eventData.id || 'evt_' + Date.now()),
      title: eventData.title || 'Untitled Programme',
      organizer: eventData.organizer || '',
      category: eventData.category || 'Other',
      mode: eventData.mode === 'in-person' ? 'in-person' : 'online',
      date: eventData.date || new Date().toISOString().split('T')[0],
      startTime: eventData.startTime || '09:00',
      endTime: eventData.endTime || '10:00',
      venue: eventData.venue || '',
      meetingLink: Safe.safeUrl(eventData.meetingLink || ''),
      passcode: eventData.passcode || '',
      description: eventData.description || '',
      formLink: Safe.safeUrl(eventData.formLink || ''),
      materialsLink: Safe.safeUrl(eventData.materialsLink || ''),
      notes: eventData.notes || '',
      status: eventData.status || 'registered',
      tags: Array.isArray(eventData.tags) ? eventData.tags : [],
      checklist: Array.isArray(eventData.checklist) ? eventData.checklist : [],
      createdAt: eventData.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    events.unshift(cleanEvent);
    this.saveEvents(events);
    return cleanEvent;
  },

  updateEvent(id, updatedFields) {
    const events = this.getEvents();
    const index = events.findIndex(e => e.id === id);
    if (index === -1) return null;

    events[index] = {
      ...events[index],
      ...updatedFields,
      meetingLink: updatedFields.meetingLink !== undefined ? Safe.safeUrl(updatedFields.meetingLink) : events[index].meetingLink,
      formLink: updatedFields.formLink !== undefined ? Safe.safeUrl(updatedFields.formLink) : events[index].formLink,
      materialsLink: updatedFields.materialsLink !== undefined ? Safe.safeUrl(updatedFields.materialsLink) : events[index].materialsLink,
      updatedAt: new Date().toISOString()
    };

    this.saveEvents(events);
    return events[index];
  },

  deleteEvent(id) {
    const events = this.getEvents();
    const filtered = events.filter(e => e.id !== id);
    this.saveEvents(filtered);
    return filtered;
  },

  // Export JSON (Strict zero-leak: API keys are excluded)
  exportJson() {
    const events = this.getEvents();
    const exportData = {
      version: '2.0',
      exportedAt: new Date().toISOString(),
      events: events
    };
    return JSON.stringify(exportData, null, 2);
  },

  // Import JSON
  importJson(jsonString) {
    try {
      const parsed = JSON.parse(jsonString);
      let items = [];
      if (Array.isArray(parsed)) {
        items = parsed;
      } else if (parsed && Array.isArray(parsed.events)) {
        items = parsed.events;
      } else {
        throw new Error('Unrecognized JSON format. Expected array of events.');
      }

      const existing = this.getEvents();
      const existingIds = new Set(existing.map(e => e.id));
      let importedCount = 0;

      items.forEach(item => {
        if (!item.title) return;
        const newId = (!item.id || existingIds.has(item.id)) ? 'evt_' + Math.random().toString(36).substr(2, 9) : Safe.safeId(item.id);
        existing.unshift({
          ...item,
          id: newId,
          meetingLink: Safe.safeUrl(item.meetingLink || ''),
          formLink: Safe.safeUrl(item.formLink || ''),
          materialsLink: Safe.safeUrl(item.materialsLink || ''),
          createdAt: item.createdAt || new Date().toISOString()
        });
        existingIds.add(newId);
        importedCount++;
      });

      this.saveEvents(existing);
      return { success: true, count: importedCount };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Clear Personal Events
  clearPersonalEvents() {
    localStorage.removeItem(this.KEYS.EVENTS);
    localStorage.removeItem('workshophub_demo_mode_v2');
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Store;
}
