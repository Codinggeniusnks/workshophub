/**
 * WorkshopHub Unit Test Suite
 * Zero-dependency automated verification.
 */

const assert = require('assert');
const Safe = require('../js/safe.js');
const Parser = require('../js/parser.js');
const Organiser = require('../js/organiser.js');
const Calendar = require('../js/calendar.js');
const DriveSync = require('../js/driveSync.js');

let passed = 0;
let failed = 0;

function test(name, fn) {
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passed++;
  } catch (err) {
    console.error(`  ✗ ${name}:`, err.message);
    failed++;
  }
}

console.log('--- Running WorkshopHub Test Suite ---');

// 1. Safe Utilities Test
test('Safe.safeUrl rejects javascript: and malicious protocols', () => {
  assert.strictEqual(Safe.safeUrl('javascript:alert(1)'), '');
  assert.strictEqual(Safe.safeUrl('data:text/html;base64,PHNjcmlwdD4='), '');
  assert.strictEqual(Safe.safeUrl('vbscript:msgbox'), '');
  assert.strictEqual(Safe.safeUrl('https://meet.google.com/abc-defg-hij'), 'https://meet.google.com/abc-defg-hij');
  assert.strictEqual(Safe.safeUrl('http://zoom.us/j/12345'), 'http://zoom.us/j/12345');
});

test('Safe.escapeHtml escapes XSS vectors', () => {
  assert.strictEqual(Safe.escapeHtml('<script>alert("xss")</script>'), '&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  assert.strictEqual(Safe.escapeHtml("Tom's Event"), 'Tom&#039;s Event');
});

// 2. Parser Test
test('Parser extracts Google Meet, Date, Time, and Category', () => {
  const sampleEmail = `
    Thank you for registering for the Generative AI & Prompting Workshop!
    Date: 2026-10-25
    Time: 14:00 - 16:30
    Meeting Link: https://meet.google.com/abc-defg-hij
    Organized by Google Developer Group
  `;
  const parsed = Parser.parse(sampleEmail);
  assert.strictEqual(parsed.meetingLink, 'https://meet.google.com/abc-defg-hij');
  assert.strictEqual(parsed.venue, 'Google Meet');
  assert.strictEqual(parsed.date, '2026-10-25');
  assert.strictEqual(parsed.startTime, '14:00');
  assert.strictEqual(parsed.endTime, '16:30');
  assert.strictEqual(parsed.mode, 'online');
  assert.strictEqual(parsed.category, 'AI & Data');
});

test('Parser extracts Zoom with Passcode and 12-hour format', () => {
  const sampleZoom = `
    Hi Kai Sheng,
    Workshop: React FullStack Architecture
    Date: 18/11/2026
    Time: 2:00 PM to 4:30 PM
    Join Zoom: https://zoom.us/j/987654321
    Passcode: 998877
  `;
  const parsed = Parser.parse(sampleZoom);
  assert.strictEqual(parsed.meetingLink, 'https://zoom.us/j/987654321');
  assert.strictEqual(parsed.passcode, '998877');
  assert.strictEqual(parsed.date, '2026-11-18');
  assert.strictEqual(parsed.startTime, '14:00');
  assert.strictEqual(parsed.endTime, '16:30');
  assert.strictEqual(parsed.category, 'Web & Software');
});

// 3. Organiser Test
test('Organiser detects schedule time clashes on same day', () => {
  const events = [
    { id: '1', title: 'Session A', date: '2026-10-20', startTime: '10:00', endTime: '12:00' },
    { id: '2', title: 'Session B', date: '2026-10-20', startTime: '11:00', endTime: '13:00' },
    { id: '3', title: 'Session C', date: '2026-10-20', startTime: '14:00', endTime: '15:00' }
  ];
  const conflicts = Organiser.detectConflicts(events);
  assert.ok(conflicts['1']);
  assert.ok(conflicts['2']);
  assert.strictEqual(conflicts['3'], undefined);
  assert.strictEqual(conflicts['1'][0].id, '2');
});

test('Organiser detects potential duplicate workshops', () => {
  const existing = [
    { id: '1', title: 'Docker Masterclass', date: '2026-10-20' }
  ];
  const candidate = { title: 'Docker Masterclass Online', date: '2026-10-20' };
  const dupes = Organiser.findPotentialDuplicates(candidate, existing);
  assert.strictEqual(dupes.length, 1);
});

// 4. Calendar Test
test('Calendar generates valid Google Calendar URL without API key', () => {
  const event = {
    title: 'Docker Masterclass',
    date: '2026-10-20',
    startTime: '10:00',
    endTime: '12:00',
    venue: 'Google Meet',
    meetingLink: 'https://meet.google.com/xyz',
    description: 'Learn containers'
  };
  const url = Calendar.generateGoogleCalendarUrl(event);
  assert.ok(url.startsWith('https://calendar.google.com/calendar/render?'));
  assert.ok(url.includes('text=Docker%20Masterclass'));
  assert.ok(url.includes('dates=20261020T100000%2F20261020T120000'));
});

// 5. Google Drive Sync Merge Test
test('DriveSync.mergeEvents merges remote and local events by updatedAt without data loss', () => {
  const local = [
    { id: '1', title: 'Local newer', date: '2026-10-21', updatedAt: '2026-10-21T10:00:00Z' },
    { id: '2', title: 'Only local', date: '2026-10-22', updatedAt: '2026-10-21T09:00:00Z' }
  ];
  const remote = [
    { id: '1', title: 'Remote older', date: '2026-10-21', updatedAt: '2026-10-21T08:00:00Z' },
    { id: '3', title: 'Only remote', date: '2026-10-23', updatedAt: '2026-10-21T07:00:00Z' }
  ];
  const merged = DriveSync.mergeEvents(local, remote);
  assert.strictEqual(merged.length, 3);
  const item1 = merged.find(x => x.id === '1');
  assert.strictEqual(item1.title, 'Local newer');
  assert.ok(merged.find(x => x.id === '2'));
  assert.ok(merged.find(x => x.id === '3'));
});

console.log(`\nResults: ${passed} passed, ${failed} failed.`);
if (failed > 0) process.exit(1);
