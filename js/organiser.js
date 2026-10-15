/**
 * WorkshopHub Organiser Module
 * Handles conflict/clash detection, duplicate checking, auto-status, and smart grouping.
 */

const Organiser = {
  // Check for time clashes between events
  detectConflicts(events) {
    const conflicts = {}; // eventId -> Array of conflicting event titles

    // Group events by date
    const byDate = {};
    events.forEach(e => {
      if (!e.date) return;
      if (!byDate[e.date]) byDate[e.date] = [];
      byDate[e.date].push(e);
    });

    Object.keys(byDate).forEach(date => {
      const dayEvents = byDate[date];
      if (dayEvents.length < 2) return;

      for (let i = 0; i < dayEvents.length; i++) {
        for (let j = i + 1; j < dayEvents.length; j++) {
          const a = dayEvents[i];
          const b = dayEvents[j];

          const startA = this.timeToMinutes(a.startTime || '00:00');
          const endA = this.timeToMinutes(a.endTime || a.startTime || '23:59');
          const startB = this.timeToMinutes(b.startTime || '00:00');
          const endB = this.timeToMinutes(b.endTime || b.startTime || '23:59');

          // Overlap condition
          if (Math.max(startA, startB) < Math.min(endA, endB)) {
            if (!conflicts[a.id]) conflicts[a.id] = [];
            if (!conflicts[b.id]) conflicts[b.id] = [];
            conflicts[a.id].push({ id: b.id, title: b.title, time: `${b.startTime || ''} - ${b.endTime || ''}` });
            conflicts[b.id].push({ id: a.id, title: a.title, time: `${a.startTime || ''} - ${a.endTime || ''}` });
          }
        }
      }
    });

    return conflicts;
  },

  // Check for potential duplicate event
  findPotentialDuplicates(candidate, existingEvents) {
    const cleanCandTitle = (candidate.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    return existingEvents.filter(e => {
      if (candidate.id && e.id === candidate.id) return false;
      const cleanExisting = (e.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
      const sameDate = candidate.date && e.date && candidate.date === e.date;
      const titleMatch = cleanCandTitle && cleanExisting && (cleanCandTitle.includes(cleanExisting) || cleanExisting.includes(cleanCandTitle));
      return sameDate || titleMatch;
    });
  },

  // Group events into smart timeline sections for Agenda view
  groupByTimeline(events) {
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const tomorrowStr = tomorrow.toISOString().split('T')[0];

    const weekEnd = new Date();
    weekEnd.setDate(weekEnd.getDate() + 7);
    const weekEndStr = weekEnd.toISOString().split('T')[0];

    const sections = {
      today: [],
      tomorrow: [],
      thisWeek: [],
      later: [],
      needsInfo: [],
      past: []
    };

    events.forEach(e => {
      if (!e.date) {
        sections.needsInfo.push(e);
        return;
      }

      const isPast = this.isPast(e.date, e.endTime || e.startTime);
      if (isPast) {
        sections.past.push(e);
      } else if (e.date === todayStr) {
        sections.today.push(e);
      } else if (e.date === tomorrowStr) {
        sections.tomorrow.push(e);
      } else if (e.date <= weekEndStr) {
        sections.thisWeek.push(e);
      } else {
        sections.later.push(e);
      }
    });

    return sections;
  },

  isPast(dateStr, timeStr = '23:59') {
    if (!dateStr) return false;
    const eventTime = new Date(`${dateStr}T${timeStr || '23:59'}`);
    return eventTime < new Date();
  },

  timeToMinutes(timeStr) {
    if (!timeStr) return 0;
    const [h, m] = timeStr.split(':').map(n => parseInt(n, 10));
    return (h || 0) * 60 + (m || 0);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Organiser;
}
