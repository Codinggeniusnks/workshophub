/**
 * WorkshopHub Store
 * Manages localStorage, settings, demo mode, and safe backup/export.
 */

const Store = {
  KEYS: {
    EVENTS: 'workshophub_events_v2',
    SETTINGS: 'workshophub_settings_v2',
    DEMO_FLAG: 'workshophub_demo_mode_v2'
  },

  DEFAULT_SETTINGS: {
    geminiApiKey: '',
    aiModel: 'gemini-2.0-flash',
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

  getSampleEvents() {
    return [
      {
        id: 'demo-1',
        title: 'Generative AI & Multimodal Prompting Workshop',
        organizer: 'Google Developer Group (GDG)',
        category: 'AI & Data',
        mode: 'online',
        date: this.getRelativeDate(1),
        startTime: '14:00',
        endTime: '16:30',
        venue: 'Google Meet',
        meetingLink: 'https://meet.google.com/abc-defg-hij',
        passcode: 'GDG-AI-2026',
        description: 'Explore multimodal prompt engineering, Gemini API integrations, and hands-on LLM assistant building.',
        formLink: 'https://forms.gle/sampleGDGForm',
        materialsLink: 'https://github.com/example/gdg-workshop-slides',
        notes: 'Pre-requisite: Set up free Google AI Studio account beforehand.',
        status: 'registered',
        createdAt: new Date().toISOString()
      },
      {
        id: 'demo-2',
        title: 'Full-Stack Web Dev & Modern API Architecture',
        organizer: 'Tech Innovators Community',
        category: 'Web & Software',
        mode: 'in-person',
        date: this.getRelativeDate(3),
        startTime: '09:30',
        endTime: '13:00',
        venue: 'Innovation Hub, Hall B, Level 3, Cyberjaya',
        meetingLink: '',
        passcode: '',
        description: 'Frontend component patterns, REST & GraphQL design, caching strategies, and deployment pipelines.',
        formLink: 'https://forms.gle/sampleWebForm',
        materialsLink: 'https://drive.google.com/drive/folders/sampleMaterials',
        notes: 'Bring your laptop with Node.js LTS installed. Registration starts at 9:00 AM.',
        status: 'confirmed',
        createdAt: new Date().toISOString()
      },
      {
        id: 'demo-3',
        title: 'Technical Resume & Interview Masterclass',
        organizer: 'Career Services & Alumni Network',
        category: 'Career & Professional',
        mode: 'online',
        date: this.getRelativeDate(5),
        startTime: '20:00',
        endTime: '21:30',
        venue: 'Zoom Meeting',
        meetingLink: 'https://zoom.us/j/9876543210',
        passcode: 'CAREER2026',
        description: 'Live resume roasting, GitHub portfolio optimization, and STAR method mock questions with tech hiring leads.',
        formLink: 'https://forms.gle/sampleCareerForm',
        materialsLink: '',
        notes: 'Submit 1-page PDF resume before session if you want live feedback.',
        status: 'registered',
        createdAt: new Date().toISOString()
      },
      {
        id: 'demo-4',
        title: 'Docker & Kubernetes Containerization Lab',
        organizer: 'Cloud Native Computing Group',
        category: 'Cloud & DevOps',
        mode: 'online',
        date: this.getRelativeDate(8),
        startTime: '10:00',
        endTime: '15:00',
        venue: 'Microsoft Teams',
        meetingLink: 'https://teams.microsoft.com/l/meetup-join/sample',
        passcode: '',
        description: 'Container lifecycle, Dockerfile optimization, multi-stage builds, and basic Kubernetes pod deployment.',
        formLink: 'https://forms.gle/sampleDockerForm',
        materialsLink: 'https://github.com/example/docker-k8s-lab',
        notes: 'Have Docker Desktop running prior to joining.',
        status: 'registered',
        createdAt: new Date().toISOString()
      },
      {
        id: 'demo-5',
        title: 'UI/UX Design Systems in Figma',
        organizer: 'Designers Guild',
        category: 'Design & UI/UX',
        mode: 'in-person',
        date: this.getRelativeDate(-2),
        startTime: '13:00',
        endTime: '17:00',
        venue: 'Creative Media Studio, Block C',
        meetingLink: '',
        passcode: '',
        description: 'Tokens, auto-layout, variables, and scalable design components across cross-functional teams.',
        formLink: 'https://forms.gle/sampleDesignForm',
        materialsLink: 'https://www.figma.com/community/file/sample',
        notes: 'Session completed. Slides and exercise templates downloaded.',
        status: 'attended',
        createdAt: new Date().toISOString()
      }
    ];
  },

  // Settings
  getSettings() {
    try {
      const raw = localStorage.getItem(this.KEYS.SETTINGS);
      if (!raw) return { ...this.DEFAULT_SETTINGS };
      return { ...this.DEFAULT_SETTINGS, ...JSON.parse(raw) };
    } catch (e) {
      return { ...this.DEFAULT_SETTINGS };
    }
  },

  getSetting(key) {
    const settings = this.getSettings();
    return settings[key] !== undefined ? settings[key] : this.DEFAULT_SETTINGS[key];
  },

  saveSettings(newSettings) {
    const current = this.getSettings();
    const updated = { ...current, ...newSettings };
    localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(updated));
    return updated;
  },

  setSetting(key, value) {
    const settings = this.getSettings();
    settings[key] = value;
    localStorage.setItem(this.KEYS.SETTINGS, JSON.stringify(settings));
  },

  // Demo Mode
  isDemoMode() {
    const flag = localStorage.getItem(this.KEYS.DEMO_FLAG);
    // If user has never used the app, default to demo mode so it doesn't look empty
    if (flag === null) {
      const userEvents = localStorage.getItem(this.KEYS.EVENTS);
      return userEvents === null;
    }
    return flag === 'true';
  },

  setDemoMode(isDemo) {
    localStorage.setItem(this.KEYS.DEMO_FLAG, isDemo ? 'true' : 'false');
  },

  // Events
  getEvents() {
    if (this.isDemoMode()) {
      return this.getSampleEvents();
    }
    try {
      const raw = localStorage.getItem(this.KEYS.EVENTS);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error('Failed to parse stored events:', e);
      return [];
    }
  },

  saveEvents(events) {
    if (this.isDemoMode()) {
      // If user edits while in demo mode, automatically switch to personal mode
      this.setDemoMode(false);
    }
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

  // Export JSON (CRITICAL: Zero leak - strictly strips API keys and personal tokens)
  exportJson() {
    const events = this.getEvents();
    // Exclude API keys or private settings from export
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

      this.setDemoMode(false);
      this.saveEvents(existing);
      return { success: true, count: importedCount };
    } catch (err) {
      return { success: false, error: err.message };
    }
  },

  // Clear Personal Events
  clearPersonalEvents() {
    localStorage.removeItem(this.KEYS.EVENTS);
    this.setDemoMode(false);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Store;
}
