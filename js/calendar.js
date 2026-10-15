/**
 * WorkshopHub Calendar Module
 * Generates dynamic 1-click Google Calendar links and RFC 5545 compliant iCalendar (.ics) files.
 * Zero API keys or Google Cloud configurations required.
 */

const Calendar = {
  generateGoogleCalendarUrl(event) {
    const title = encodeURIComponent(event.title || 'Programme / Workshop');
    
    // Build descriptive body
    const detailsArr = [
      event.description || '',
      '',
      `👤 Organizer: ${event.organizer || 'Unspecified'}`,
      `🌐 Mode: ${event.mode === 'online' ? 'Online Virtual' : 'In-Person Physical'}`,
      `📍 Location/Platform: ${event.venue || 'TBD'}`,
      event.meetingLink ? `🔗 Meeting Link: ${event.meetingLink}` : '',
      event.passcode ? `🔑 Passcode / PIN: ${event.passcode}` : '',
      event.materialsLink ? `📂 Slides / Materials: ${event.materialsLink}` : '',
      event.formLink ? `📝 Registration Reference: ${event.formLink}` : '',
      event.notes ? `💡 Preparation Notes: ${event.notes}` : '',
      '',
      'Allocated & tracked via WorkshopHub.'
    ].filter(Boolean);

    const details = encodeURIComponent(detailsArr.join('\n'));
    const location = encodeURIComponent(event.meetingLink || event.venue || '');

    const dateStr = (event.date || '').replace(/-/g, '');
    const startTimeStr = (event.startTime || '09:00').replace(/:/g, '') + '00';
    const endTimeStr = (event.endTime || '10:00').replace(/:/g, '') + '00';

    const datesParam = encodeURIComponent(`${dateStr}T${startTimeStr}/${dateStr}T${endTimeStr}`);
    return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}&location=${location}`;
  },

  downloadIcsFile(event) {
    if (!event) return;

    const dateClean = (event.date || '').replace(/-/g, '');
    const startClean = (event.startTime || '09:00').replace(/:/g, '') + '00';
    const endClean = (event.endTime || '10:00').replace(/:/g, '') + '00';
    const tz = Store.getSetting('userTimezone') || 'UTC';

    const descriptionEscaped = (event.description || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,')
      .replace(/\n/g, '\\n');

    const summaryEscaped = (event.title || 'Workshop')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,');

    const locationEscaped = (event.meetingLink || event.venue || '')
      .replace(/\\/g, '\\\\')
      .replace(/;/g, '\\;')
      .replace(/,/g, '\\,');

    const icsContent = [
      'BEGIN:VCALENDAR',
      'VERSION:2.0',
      'PRODID:-//WorkshopHub//Event and Programme Tracker v2.0//EN',
      'CALSCALE:GREGORIAN',
      'METHOD:PUBLISH',
      'BEGIN:VEVENT',
      `UID:${event.id || Date.now()}@workshophub.local`,
      `DTSTAMP:${dateClean}T000000Z`,
      `DTSTART;TZID=${tz}:${dateClean}T${startClean}`,
      `DTEND;TZID=${tz}:${dateClean}T${endClean}`,
      `SUMMARY:${summaryEscaped}`,
      `DESCRIPTION:${descriptionEscaped}\\nHost: ${event.organizer || ''}`,
      `LOCATION:${locationEscaped}`,
      'STATUS:CONFIRMED',
      'END:VEVENT',
      'END:VCALENDAR'
    ].join('\r\n');

    const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${(event.title || 'workshop').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Calendar;
}
