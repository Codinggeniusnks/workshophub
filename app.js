/**
 * WorkshopHub - Programme & Workshop Tracking Dashboard
 * Privacy-first: All data is stored in the user's browser localStorage.
 * Zero leaks, zero external telemetry, zero API credentials required.
 */

// Key constants
const STORAGE_KEY = 'workshophub_user_events';
const DEMO_FLAG_KEY = 'workshophub_demo_mode';

// Default categories with color accents
const CATEGORY_COLORS = {
  'AI & Data': { bg: 'bg-purple-100', text: 'text-purple-800', border: 'border-purple-200' },
  'Web & Software': { bg: 'bg-blue-100', text: 'text-blue-800', border: 'border-blue-200' },
  'Career & Professional': { bg: 'bg-amber-100', text: 'text-amber-800', border: 'border-amber-200' },
  'Cloud & DevOps': { bg: 'bg-cyan-100', text: 'text-cyan-800', border: 'border-cyan-200' },
  'Design & UI/UX': { bg: 'bg-pink-100', text: 'text-pink-800', border: 'border-pink-200' },
  'Academic & Research': { bg: 'bg-emerald-100', text: 'text-emerald-800', border: 'border-emerald-200' },
  'Other': { bg: 'bg-slate-100', text: 'text-slate-800', border: 'border-slate-200' }
};

// Generates dynamic dates relative to current date so demo data is always fresh
function getRelativeDateStr(offsetDays) {
  const d = new Date();
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

// 6 Realistic Demo events (safe for public repository demo)
const SAMPLE_EVENTS = [
  {
    id: 'demo-1',
    title: 'Hands-on Generative AI & LLM Prompting Workshop',
    organizer: 'Google Developer Group (GDG)',
    category: 'AI & Data',
    mode: 'online',
    date: getRelativeDateStr(1),
    startTime: '14:00',
    endTime: '16:30',
    venue: 'Google Meet',
    meetingLink: 'https://meet.google.com/abc-defg-hij',
    passcode: 'GDG-AI-2026',
    description: 'Learn fine-tuning basics, multi-modal prompt engineering with Gemini API, and building real-world AI assistants.',
    formLink: 'https://forms.gle/sampleGoogleForm1',
    materialsLink: 'https://github.com/example/gdg-workshop-slides',
    notes: 'Prerequisites: Basic Python familiarity. Set up a free Google AI Studio account beforehand.',
    status: 'registered',
    createdAt: new Date().toISOString()
  },
  {
    id: 'demo-2',
    title: 'Full-Stack Web Dev & Modern API Architecture',
    organizer: 'Tech Innovators Community',
    category: 'Web & Software',
    mode: 'in-person',
    date: getRelativeDateStr(3),
    startTime: '09:30',
    endTime: '13:00',
    venue: 'Innovation Hub, Hall B, Level 3, Cyberjaya',
    meetingLink: '',
    passcode: '',
    description: 'Comprehensive walkthrough on modern frontend component patterns, REST/GraphQL design, and deployment optimizations.',
    formLink: 'https://forms.gle/sampleGoogleForm2',
    materialsLink: 'https://drive.google.com/drive/folders/sampleMaterials',
    notes: 'Bring your laptop and laptop charger. Registration desk opens at 09:00 AM.',
    status: 'confirmed',
    createdAt: new Date().toISOString()
  },
  {
    id: 'demo-3',
    title: 'Resume Review & Tech Interview Prep Masterclass',
    organizer: 'Career Services & Alumni Network',
    category: 'Career & Professional',
    mode: 'online',
    date: getRelativeDateStr(5),
    startTime: '20:00',
    endTime: '21:30',
    venue: 'Zoom Meeting',
    meetingLink: 'https://zoom.us/j/9876543210',
    passcode: 'CAREER2026',
    description: 'Live technical resume roasting, portfolio optimization tips, and behavioural STAR method mock questions with senior engineering leads.',
    formLink: 'https://forms.gle/sampleGoogleForm3',
    materialsLink: '',
    notes: 'Submit your 1-page PDF resume via the form before the session if you want live feedback.',
    status: 'registered',
    createdAt: new Date().toISOString()
  },
  {
    id: 'demo-4',
    title: 'Docker & Kubernetes Containerization Bootcamp',
    organizer: 'Cloud Native Computing Group',
    category: 'Cloud & DevOps',
    mode: 'online',
    date: getRelativeDateStr(8),
    startTime: '10:00',
    endTime: '15:00',
    venue: 'Microsoft Teams',
    meetingLink: 'https://teams.microsoft.com/l/meetup-join/sample',
    passcode: '',
    description: 'Zero to hero container lifecycle, Dockerfile optimization, multi-stage builds, and basic Kubernetes pod deployment.',
    formLink: 'https://forms.gle/sampleGoogleForm4',
    materialsLink: 'https://github.com/example/docker-k8s-lab',
    notes: 'Install Docker Desktop on your machine before the session.',
    status: 'registered',
    createdAt: new Date().toISOString()
  },
  {
    id: 'demo-5',
    title: 'UI/UX Design Systems with Figma',
    organizer: 'Designers Guild',
    category: 'Design & UI/UX',
    mode: 'in-person',
    date: getRelativeDateStr(-2),
    startTime: '13:00',
    endTime: '17:00',
    venue: 'Creative Media Studio, Block C',
    meetingLink: '',
    passcode: '',
    description: 'Tokens, auto-layout 5.0, variables, and scalable design components across cross-functional teams.',
    formLink: 'https://forms.gle/sampleGoogleForm5',
    materialsLink: 'https://www.figma.com/community/file/sample',
    notes: 'Attended. Slides and exercise templates downloaded.',
    status: 'attended',
    createdAt: new Date().toISOString()
  }
];

// App State
let currentEvents = [];
let isDemoMode = false;
let currentSearch = '';
let currentModeFilter = 'all';
let currentStatusFilter = 'all';
let currentCategoryFilter = 'all';
let currentView = 'cards'; // 'cards' | 'table'

// Initialize
document.addEventListener('DOMContentLoaded', () => {
  initStorage();
  bindEvents();
  render();
});

function initStorage() {
  const storedEvents = localStorage.getItem(STORAGE_KEY);
  const demoFlag = localStorage.getItem(DEMO_FLAG_KEY);

  if (demoFlag === 'true' || storedEvents === null) {
    // Default to demo mode if first time or explicitly selected
    isDemoMode = true;
    currentEvents = JSON.parse(JSON.stringify(SAMPLE_EVENTS));
  } else {
    isDemoMode = false;
    try {
      currentEvents = JSON.parse(storedEvents) || [];
    } catch (e) {
      currentEvents = [];
    }
  }
  updateDemoToggleUI();
}

function saveEvents() {
  if (!isDemoMode) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(currentEvents));
  }
}

function updateDemoToggleUI() {
  const badge = document.getElementById('mode-indicator-badge');
  const toggleBtn = document.getElementById('demo-mode-toggle');
  
  if (isDemoMode) {
    badge.innerHTML = `
      <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
        <span class="w-2 h-2 mr-1.5 bg-amber-500 rounded-full animate-ping"></span>
        Demo Sample Data
      </span>
    `;
    toggleBtn.textContent = 'Switch to My Personal Data';
    toggleBtn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white shadow-sm transition';
  } else {
    badge.innerHTML = `
      <span class="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
        <span class="w-2 h-2 mr-1.5 bg-emerald-500 rounded-full"></span>
        My Personal Space (Private)
      </span>
    `;
    toggleBtn.textContent = 'View Sample Demo Events';
    toggleBtn.className = 'px-3 py-1.5 text-xs font-semibold rounded-lg bg-slate-200 hover:bg-slate-300 text-slate-800 transition';
  }
}

function toggleDemoMode() {
  if (isDemoMode) {
    // Switching to Personal Mode
    isDemoMode = false;
    localStorage.setItem(DEMO_FLAG_KEY, 'false');
    const stored = localStorage.getItem(STORAGE_KEY);
    currentEvents = stored ? JSON.parse(stored) : [];
  } else {
    // Switching to Demo Mode
    isDemoMode = true;
    localStorage.setItem(DEMO_FLAG_KEY, 'true');
    currentEvents = JSON.parse(JSON.stringify(SAMPLE_EVENTS));
  }
  updateDemoToggleUI();
  render();
}

// Bind DOM event listeners
function bindEvents() {
  // Search input
  const searchInput = document.getElementById('search-input');
  if (searchInput) {
    searchInput.addEventListener('input', (e) => {
      currentSearch = e.target.value.toLowerCase().trim();
      render();
    });
  }

  // Filters
  document.getElementById('filter-mode')?.addEventListener('change', (e) => {
    currentModeFilter = e.target.value;
    render();
  });
  document.getElementById('filter-status')?.addEventListener('change', (e) => {
    currentStatusFilter = e.target.value;
    render();
  });
  document.getElementById('filter-category')?.addEventListener('change', (e) => {
    currentCategoryFilter = e.target.value;
    render();
  });

  // View Switchers
  document.getElementById('view-cards-btn')?.addEventListener('click', () => {
    currentView = 'cards';
    document.getElementById('view-cards-btn').classList.add('bg-white', 'shadow-sm', 'text-indigo-700');
    document.getElementById('view-table-btn').classList.remove('bg-white', 'shadow-sm', 'text-indigo-700');
    render();
  });
  document.getElementById('view-table-btn')?.addEventListener('click', () => {
    currentView = 'table';
    document.getElementById('view-table-btn').classList.add('bg-white', 'shadow-sm', 'text-indigo-700');
    document.getElementById('view-cards-btn').classList.remove('bg-white', 'shadow-sm', 'text-indigo-700');
    render();
  });

  // Demo toggle
  document.getElementById('demo-mode-toggle')?.addEventListener('click', toggleDemoMode);

  // Modals open / close
  document.getElementById('open-add-modal-btn')?.addEventListener('click', () => openEventModal());
  document.getElementById('close-modal-btn')?.addEventListener('click', closeEventModal);
  document.getElementById('cancel-modal-btn')?.addEventListener('click', closeEventModal);

  // Form submit
  document.getElementById('event-form')?.addEventListener('submit', handleEventFormSubmit);

  // Smart Parse Modal
  document.getElementById('open-smart-parse-btn')?.addEventListener('click', openSmartParseModal);
  document.getElementById('close-parse-btn')?.addEventListener('click', closeSmartParseModal);
  document.getElementById('execute-parse-btn')?.addEventListener('click', handleSmartParse);

  // Backup / Data Actions
  document.getElementById('export-json-btn')?.addEventListener('click', exportToJson);
  document.getElementById('export-csv-btn')?.addEventListener('click', exportToCsv);
  document.getElementById('import-json-btn')?.addEventListener('click', () => document.getElementById('json-file-input').click());
  document.getElementById('json-file-input')?.addEventListener('change', handleImportJson);
  document.getElementById('clear-data-btn')?.addEventListener('click', handleClearData);
}

// Filtering logic
function getFilteredEvents() {
  return currentEvents.filter(event => {
    // Search match
    if (currentSearch) {
      const matchSearch =
        (event.title || '').toLowerCase().includes(currentSearch) ||
        (event.organizer || '').toLowerCase().includes(currentSearch) ||
        (event.venue || '').toLowerCase().includes(currentSearch) ||
        (event.description || '').toLowerCase().includes(currentSearch) ||
        (event.category || '').toLowerCase().includes(currentSearch);
      if (!matchSearch) return false;
    }

    // Mode filter
    if (currentModeFilter !== 'all' && event.mode !== currentModeFilter) {
      return false;
    }

    // Status filter
    if (currentStatusFilter !== 'all') {
      const isPast = isEventPast(event.date, event.endTime || event.startTime);
      if (currentStatusFilter === 'past' && !isPast) return false;
      if (currentStatusFilter === 'upcoming' && isPast) return false;
      if (currentStatusFilter !== 'past' && currentStatusFilter !== 'upcoming') {
        if (event.status !== currentStatusFilter) return false;
      }
    }

    // Category filter
    if (currentCategoryFilter !== 'all' && event.category !== currentCategoryFilter) {
      return false;
    }

    return true;
  }).sort((a, b) => {
    // Sort upcoming events first by date ascending, then past
    const dateA = new Date(`${a.date}T${a.startTime || '00:00'}`);
    const dateB = new Date(`${b.date}T${b.startTime || '00:00'}`);
    return dateA - dateB;
  });
}

// Helpers for dates
function isEventPast(dateStr, timeStr = '23:59') {
  if (!dateStr) return false;
  const eventDate = new Date(`${dateStr}T${timeStr}`);
  return eventDate < new Date();
}

function getCountdownBadge(dateStr, startTime = '00:00', endTime = '23:59') {
  if (!dateStr) return { text: 'Date TBD', color: 'bg-slate-100 text-slate-700' };

  const now = new Date();
  const start = new Date(`${dateStr}T${startTime}`);
  const end = new Date(`${dateStr}T${endTime}`);

  if (now > end) {
    return { text: 'Concluded', color: 'bg-slate-100 text-slate-600 border border-slate-200' };
  }

  // Same day check
  const isToday = now.toDateString() === start.toDateString();
  if (isToday) {
    if (now >= start && now <= end) {
      return { text: '⚡ In Progress Now!', color: 'bg-red-500 text-white font-bold pulse-badge' };
    }
    return { text: `🚨 Today at ${formatTime(startTime)}`, color: 'bg-amber-500 text-white font-semibold' };
  }

  // Tomorrow check
  const tomorrow = new Date();
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (tomorrow.toDateString() === start.toDateString()) {
    return { text: `Tomorrow (${formatTime(startTime)})`, color: 'bg-orange-100 text-orange-800 border border-orange-200 font-medium' };
  }

  // Diff in days
  const diffTime = start.getTime() - now.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (diffDays > 0 && diffDays <= 7) {
    return { text: `In ${diffDays} days`, color: 'bg-blue-100 text-blue-800 border border-blue-200 font-medium' };
  }

  return { text: `${diffDays} days away`, color: 'bg-indigo-50 text-indigo-700 border border-indigo-200' };
}

function formatDate(dateStr) {
  if (!dateStr) return 'Date TBD';
  const parts = dateStr.split('-');
  if (parts.length !== 3) return dateStr;
  const dateObj = new Date(parts[0], parts[1] - 1, parts[2]);
  return dateObj.toLocaleDateString('en-US', {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric'
  });
}

function formatTime(timeStr) {
  if (!timeStr) return '';
  const [hour, min] = timeStr.split(':');
  if (!hour) return timeStr;
  const h = parseInt(hour, 10);
  const ampm = h >= 12 ? 'PM' : 'AM';
  const formattedHour = h % 12 === 0 ? 12 : h % 12;
  return `${formattedHour}:${min || '00'} ${ampm}`;
}

// Primary Render function
function render() {
  const filtered = getFilteredEvents();
  renderStats();
  renderSpotlight(filtered);

  const container = document.getElementById('events-container');
  if (!container) return;

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="col-span-full py-16 text-center bg-white rounded-2xl border border-dashed border-slate-300 p-8 shadow-sm">
        <div class="w-16 h-16 mx-auto mb-4 bg-indigo-50 text-indigo-600 rounded-full flex items-center justify-center text-2xl font-bold">
          📅
        </div>
        <h3 class="text-lg font-bold text-slate-800 mb-1">No programmes or workshops found</h3>
        <p class="text-sm text-slate-500 max-w-md mx-auto mb-6">
          ${currentSearch || currentModeFilter !== 'all' || currentStatusFilter !== 'all' || currentCategoryFilter !== 'all'
            ? 'Try adjusting your search keywords or resetting active filters.'
            : 'You haven\'t added any workshops yet. Click below to add one or use the Google Form Smart Paste!'}
        </p>
        <div class="flex justify-center gap-3">
          <button onclick="openEventModal()" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-lg shadow-sm transition">
            + Insert New Programme
          </button>
          <button onclick="openSmartParseModal()" class="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 text-sm font-semibold rounded-lg transition">
            📋 Smart Paste Confirmation
          </button>
        </div>
      </div>
    `;
    return;
  }

  if (currentView === 'cards') {
    renderCardsView(filtered, container);
  } else {
    renderTableView(filtered, container);
  }
}

// Stat summary metrics
function renderStats() {
  const now = new Date();
  const total = currentEvents.length;

  let upcomingCount = 0;
  let onlineCount = 0;
  let inPersonCount = 0;
  let thisWeekCount = 0;

  const oneWeekLater = new Date();
  oneWeekLater.setDate(oneWeekLater.getDate() + 7);

  currentEvents.forEach(e => {
    const isPast = isEventPast(e.date, e.endTime || e.startTime);
    if (!isPast) {
      upcomingCount++;
      const eDate = new Date(`${e.date}T${e.startTime || '00:00'}`);
      if (eDate >= now && eDate <= oneWeekLater) {
        thisWeekCount++;
      }
    }
    if (e.mode === 'online') onlineCount++;
    if (e.mode === 'in-person') inPersonCount++;
  });

  document.getElementById('stat-total').textContent = total;
  document.getElementById('stat-upcoming').textContent = upcomingCount;
  document.getElementById('stat-this-week').textContent = thisWeekCount;
  document.getElementById('stat-online-inperson').textContent = `${onlineCount} / ${inPersonCount}`;
}

// Next upcoming event Spotlight Banner
function renderSpotlight(events) {
  const spotlightContainer = document.getElementById('spotlight-banner');
  if (!spotlightContainer) return;

  const now = new Date();
  // Find the next upcoming non-past event
  const upcoming = events.filter(e => !isEventPast(e.date, e.endTime || e.startTime));

  if (upcoming.length === 0) {
    spotlightContainer.classList.add('hidden');
    return;
  }

  const next = upcoming[0];
  const countdown = getCountdownBadge(next.date, next.startTime, next.endTime);
  const timeDisplay = next.startTime ? `${formatTime(next.startTime)} ${next.endTime ? '– ' + formatTime(next.endTime) : ''}` : 'Time TBD';

  spotlightContainer.classList.remove('hidden');
  spotlightContainer.innerHTML = `
    <div class="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-6 text-white shadow-xl border border-indigo-700/50">
      <div class="absolute -right-8 -bottom-8 w-48 h-48 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none"></div>
      <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
        <div>
          <div class="flex items-center gap-2 mb-2">
            <span class="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/30">
              ⚡ Next Upcoming Workshop
            </span>
            <span class="px-2.5 py-0.5 rounded-full text-xs ${countdown.color}">
              ${countdown.text}
            </span>
          </div>
          <h2 class="text-xl md:text-2xl font-extrabold tracking-tight">${escapeHtml(next.title)}</h2>
          <div class="flex flex-wrap items-center gap-y-1 gap-x-4 mt-2 text-sm text-indigo-100/80">
            <span>👤 <strong>${escapeHtml(next.organizer || 'Organized Community')}</strong></span>
            <span>📅 <strong>${formatDate(next.date)}</strong> (${timeDisplay})</span>
            <span>${next.mode === 'online' ? '🌐 Virtual' : '📍 In-Person'}: <strong>${escapeHtml(next.venue || 'Venue Pending')}</strong></span>
          </div>
        </div>
        <div class="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
          ${next.meetingLink ? `
            <a href="${escapeHtml(next.meetingLink)}" target="_blank" rel="noopener noreferrer" class="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-600 text-white font-semibold text-sm rounded-xl shadow-md transition flex items-center gap-1.5">
              🚀 Join Meeting
            </a>
          ` : ''}
          <a href="${generateGoogleCalendarUrl(next)}" target="_blank" rel="noopener noreferrer" class="px-4 py-2.5 bg-white/10 hover:bg-white/20 text-white font-semibold text-sm rounded-xl backdrop-blur-sm border border-white/20 transition flex items-center gap-1.5">
            📅 Google Calendar
          </a>
          <button onclick="downloadIcsFile('${next.id}')" class="px-3.5 py-2.5 bg-white/10 hover:bg-white/20 text-white text-sm font-semibold rounded-xl border border-white/20 transition" title="Download .ICS for Apple/Outlook Calendar">
            📥 .ics
          </button>
        </div>
      </div>
    </div>
  `;
}

// Render Cards Layout
function renderCardsView(events, container) {
  container.className = 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6';
  container.innerHTML = events.map(event => {
    const isPast = isEventPast(event.date, event.endTime || event.startTime);
    const countdown = getCountdownBadge(event.date, event.startTime, event.endTime);
    const catColor = CATEGORY_COLORS[event.category] || CATEGORY_COLORS['Other'];
    const timeDisplay = event.startTime ? `${formatTime(event.startTime)} ${event.endTime ? '– ' + formatTime(event.endTime) : ''}` : 'Time TBD';

    return `
      <div class="event-card bg-white rounded-2xl border ${isPast ? 'border-slate-200 opacity-80' : 'border-slate-200/80'} p-5 shadow-sm flex flex-col justify-between">
        <div>
          <!-- Header tags -->
          <div class="flex items-center justify-between gap-2 mb-3">
            <span class="px-2.5 py-0.5 rounded-md text-xs font-semibold ${catColor.bg} ${catColor.text} border ${catColor.border}">
              ${escapeHtml(event.category || 'General')}
            </span>
            <div class="flex items-center gap-1.5">
              <span class="px-2 py-0.5 rounded-md text-xs font-medium ${countdown.color}">
                ${countdown.text}
              </span>
              <span class="px-2 py-0.5 rounded-md text-xs font-semibold uppercase tracking-wider ${
                event.mode === 'online' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }">
                ${event.mode === 'online' ? '🌐 Online' : '📍 In-Person'}
              </span>
            </div>
          </div>

          <!-- Title -->
          <h3 class="text-base font-bold text-slate-900 leading-snug line-clamp-2 mb-1" title="${escapeHtml(event.title)}">
            ${escapeHtml(event.title)}
          </h3>
          <p class="text-xs text-slate-500 font-medium mb-3 flex items-center gap-1">
            <span>By ${escapeHtml(event.organizer || 'Unspecified Host')}</span>
          </p>

          <!-- Core details: Date, Time, Venue -->
          <div class="space-y-2 bg-slate-50/70 p-3 rounded-xl border border-slate-100 text-xs text-slate-700 mb-3">
            <div class="flex items-center gap-2">
              <span class="text-slate-400">📅</span>
              <span class="font-semibold text-slate-800">${formatDate(event.date)}</span>
              <span class="text-slate-400">•</span>
              <span>${timeDisplay}</span>
            </div>
            <div class="flex items-start gap-2">
              <span class="text-slate-400 mt-0.5">${event.mode === 'online' ? '🔗' : '📍'}</span>
              <div class="flex-1 truncate">
                <span class="font-medium">${escapeHtml(event.venue || (event.mode === 'online' ? 'Online Meeting Link' : 'Location TBD'))}</span>
                ${event.passcode ? `<span class="ml-1 text-[11px] text-slate-500 font-mono">(Passcode: ${escapeHtml(event.passcode)})</span>` : ''}
              </div>
            </div>
            ${event.meetingLink ? `
              <div class="pt-1 text-[11px]">
                <a href="${escapeHtml(event.meetingLink)}" target="_blank" rel="noopener noreferrer" class="text-indigo-600 hover:text-indigo-800 font-semibold underline truncate inline-block max-w-full">
                  Click to open meeting link ↗
                </a>
              </div>
            ` : ''}
          </div>

          <!-- What is it about / Description -->
          ${event.description ? `
            <div class="mb-3">
              <p class="text-xs text-slate-600 line-clamp-3 leading-relaxed">
                ${escapeHtml(event.description)}
              </p>
            </div>
          ` : ''}

          <!-- Notes / Reminders badge if any -->
          ${event.notes ? `
            <div class="mb-3 bg-amber-50/70 border border-amber-200/60 rounded-lg p-2 text-[11px] text-amber-900">
              <span class="font-semibold">💡 Note:</span> ${escapeHtml(event.notes)}
            </div>
          ` : ''}

          <!-- External Links: Google Form, Materials -->
          <div class="flex flex-wrap gap-2 mb-4 text-xs">
            ${event.formLink ? `
              <a href="${escapeHtml(event.formLink)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition text-[11px]">
                <span>📝 Google Form / Ticket</span> ↗
              </a>
            ` : ''}
            ${event.materialsLink ? `
              <a href="${escapeHtml(event.materialsLink)}" target="_blank" rel="noopener noreferrer" class="inline-flex items-center gap-1 text-slate-600 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 px-2 py-1 rounded transition text-[11px]">
                <span>📂 Slides / Repo</span> ↗
              </a>
            ` : ''}
          </div>
        </div>

        <!-- Card Footer Actions -->
        <div class="pt-3 border-t border-slate-100 flex items-center justify-between gap-2">
          <!-- Calendar 1-Click buttons -->
          <div class="flex items-center gap-1.5">
            <a href="${generateGoogleCalendarUrl(event)}" target="_blank" rel="noopener noreferrer" class="text-[11px] font-semibold text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 px-2 py-1 rounded transition" title="Add to Google Calendar">
              + Google Cal
            </a>
            <button onclick="downloadIcsFile('${event.id}')" class="text-[11px] font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-100 px-2 py-1 rounded transition" title="Download .ICS file">
              .ics
            </button>
          </div>

          <!-- Edit / Delete actions -->
          <div class="flex items-center gap-1">
            <button onclick="openEventModal('${event.id}')" class="p-1.5 text-slate-400 hover:text-indigo-600 hover:bg-slate-100 rounded-lg transition" title="Edit Workshop">
              ✏️
            </button>
            <button onclick="deleteEvent('${event.id}')" class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition" title="Delete Workshop">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;
  }).join('');
}

// Render Table Layout
function renderTableView(events, container) {
  container.className = 'w-full overflow-x-auto bg-white rounded-2xl border border-slate-200 shadow-sm';
  container.innerHTML = `
    <table class="w-full text-left text-sm text-slate-700">
      <thead class="bg-slate-50/80 text-xs uppercase font-semibold text-slate-500 border-b border-slate-200">
        <tr>
          <th class="px-4 py-3.5">Programme & Topic</th>
          <th class="px-4 py-3.5">Date & Time</th>
          <th class="px-4 py-3.5">Venue / Mode</th>
          <th class="px-4 py-3.5">Status</th>
          <th class="px-4 py-3.5 text-right">Actions</th>
        </tr>
      </thead>
      <tbody class="divide-y divide-slate-100">
        ${events.map(event => {
          const isPast = isEventPast(event.date, event.endTime || event.startTime);
          const timeDisplay = event.startTime ? `${formatTime(event.startTime)} ${event.endTime ? '– ' + formatTime(event.endTime) : ''}` : '';
          const countdown = getCountdownBadge(event.date, event.startTime, event.endTime);

          return `
            <tr class="hover:bg-slate-50/60 transition ${isPast ? 'opacity-70' : ''}">
              <td class="px-4 py-3.5">
                <div class="font-bold text-slate-900">${escapeHtml(event.title)}</div>
                <div class="text-xs text-slate-500">${escapeHtml(event.organizer || '')} • <span class="font-medium text-indigo-600">${escapeHtml(event.category || 'General')}</span></div>
              </td>
              <td class="px-4 py-3.5 whitespace-nowrap">
                <div class="font-semibold text-slate-800">${formatDate(event.date)}</div>
                <div class="text-xs text-slate-500">${timeDisplay}</div>
              </td>
              <td class="px-4 py-3.5">
                <div class="flex items-center gap-1.5">
                  <span class="text-xs font-semibold px-2 py-0.5 rounded ${event.mode === 'online' ? 'bg-cyan-100 text-cyan-800' : 'bg-emerald-100 text-emerald-800'}">
                    ${event.mode === 'online' ? 'Online' : 'In-Person'}
                  </span>
                  <span class="text-xs truncate max-w-[180px] text-slate-600">${escapeHtml(event.venue || '')}</span>
                </div>
                ${event.meetingLink ? `
                  <a href="${escapeHtml(event.meetingLink)}" target="_blank" rel="noopener noreferrer" class="text-[11px] text-indigo-600 hover:underline block truncate max-w-[200px]">
                    Meeting Link ↗
                  </a>
                ` : ''}
              </td>
              <td class="px-4 py-3.5 whitespace-nowrap">
                <span class="px-2.5 py-1 rounded-md text-xs font-medium ${countdown.color}">
                  ${countdown.text}
                </span>
              </td>
              <td class="px-4 py-3.5 text-right whitespace-nowrap">
                <div class="flex items-center justify-end gap-2">
                  <a href="${generateGoogleCalendarUrl(event)}" target="_blank" rel="noopener noreferrer" class="px-2 py-1 text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 rounded font-medium">
                    + Cal
                  </a>
                  <button onclick="openEventModal('${event.id}')" class="px-2 py-1 text-xs bg-slate-100 text-slate-700 hover:bg-slate-200 rounded font-medium">
                    Edit
                  </button>
                  <button onclick="deleteEvent('${event.id}')" class="px-2 py-1 text-xs bg-red-50 text-red-600 hover:bg-red-100 rounded font-medium">
                    Delete
                  </button>
                </div>
              </td>
            </tr>
          `;
        }).join('')}
      </tbody>
    </table>
  `;
}

// 1-Click Google Calendar URL Generator (Zero-API required!)
function generateGoogleCalendarUrl(event) {
  const title = encodeURIComponent(event.title || 'Workshop');
  const details = encodeURIComponent(
    `${event.description || ''}\n\nOrganizer: ${event.organizer || 'N/A'}\nMode: ${event.mode}\nMeeting/Venue: ${event.venue || ''}\n${event.meetingLink ? 'Link: ' + event.meetingLink : ''}\n${event.passcode ? 'Passcode: ' + event.passcode : ''}\n${event.materialsLink ? 'Materials: ' + event.materialsLink : ''}\n\nTracked via WorkshopHub.`
  );
  const location = encodeURIComponent(event.meetingLink || event.venue || '');

  // Dates formatting YYYYMMDDTHHmmSSZ
  const dateStr = (event.date || '').replace(/-/g, '');
  const startTimeStr = (event.startTime || '09:00').replace(/:/g, '') + '00';
  const endTimeStr = (event.endTime || '10:00').replace(/:/g, '') + '00';

  const datesParam = `${dateStr}T${startTimeStr}/${dateStr}T${endTimeStr}`;
  return `https://calendar.google.com/calendar/render?action=TEMPLATE&text=${title}&dates=${datesParam}&details=${details}&location=${location}`;
}

// 1-Click .ICS File Generator for Apple / Outlook / Mobile Calendar
function downloadIcsFile(eventId) {
  const event = currentEvents.find(e => e.id === eventId);
  if (!event) return;

  const dateClean = (event.date || '').replace(/-/g, '');
  const startClean = (event.startTime || '09:00').replace(/:/g, '') + '00';
  const endClean = (event.endTime || '10:00').replace(/:/g, '') + '00';

  const icsContent = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//WorkshopHub//Programme Tracker//EN',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    'BEGIN:VEVENT',
    `UID:${event.id}@workshophub.local`,
    `DTSTAMP:${dateClean}T000000Z`,
    `DTSTART:${dateClean}T${startClean}`,
    `DTEND:${dateClean}T${endClean}`,
    `SUMMARY:${event.title}`,
    `DESCRIPTION:${(event.description || '').replace(/\n/g, '\\n')} - Host: ${event.organizer || ''}`,
    `LOCATION:${event.meetingLink || event.venue || ''}`,
    'STATUS:CONFIRMED',
    'END:VEVENT',
    'END:VCALENDAR'
  ].join('\r\n');

  const blob = new Blob([icsContent], { type: 'text/calendar;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${(event.title || 'event').replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// Modal management
function openEventModal(eventId = null) {
  const modal = document.getElementById('event-modal');
  const modalTitle = document.getElementById('modal-title');
  const form = document.getElementById('event-form');
  form.reset();

  if (eventId) {
    const event = currentEvents.find(e => e.id === eventId);
    if (event) {
      modalTitle.textContent = 'Edit Programme / Workshop';
      document.getElementById('form-id').value = event.id;
      document.getElementById('form-title').value = event.title || '';
      document.getElementById('form-organizer').value = event.organizer || '';
      document.getElementById('form-category').value = event.category || 'AI & Data';
      document.getElementById('form-mode').value = event.mode || 'online';
      document.getElementById('form-date').value = event.date || '';
      document.getElementById('form-start-time').value = event.startTime || '';
      document.getElementById('form-end-time').value = event.endTime || '';
      document.getElementById('form-venue').value = event.venue || '';
      document.getElementById('form-meeting-link').value = event.meetingLink || '';
      document.getElementById('form-passcode').value = event.passcode || '';
      document.getElementById('form-description').value = event.description || '';
      document.getElementById('form-form-link').value = event.formLink || '';
      document.getElementById('form-materials-link').value = event.materialsLink || '';
      document.getElementById('form-notes').value = event.notes || '';
      document.getElementById('form-status').value = event.status || 'registered';
    }
  } else {
    modalTitle.textContent = 'Insert New Programme / Workshop';
    document.getElementById('form-id').value = '';
    // default to tomorrow
    document.getElementById('form-date').value = getRelativeDateStr(1);
    document.getElementById('form-start-time').value = '10:00';
    document.getElementById('form-end-time').value = '12:00';
  }

  modal.classList.remove('hidden');
}

function closeEventModal() {
  document.getElementById('event-modal')?.classList.add('hidden');
}

function handleEventFormSubmit(e) {
  e.preventDefault();
  const id = document.getElementById('form-id').value;

  const eventData = {
    id: id || 'evt_' + Date.now(),
    title: document.getElementById('form-title').value.trim(),
    organizer: document.getElementById('form-organizer').value.trim(),
    category: document.getElementById('form-category').value,
    mode: document.getElementById('form-mode').value,
    date: document.getElementById('form-date').value,
    startTime: document.getElementById('form-start-time').value,
    endTime: document.getElementById('form-end-time').value,
    venue: document.getElementById('form-venue').value.trim(),
    meetingLink: document.getElementById('form-meeting-link').value.trim(),
    passcode: document.getElementById('form-passcode').value.trim(),
    description: document.getElementById('form-description').value.trim(),
    formLink: document.getElementById('form-form-link').value.trim(),
    materialsLink: document.getElementById('form-materials-link').value.trim(),
    notes: document.getElementById('form-notes').value.trim(),
    status: document.getElementById('form-status').value,
    updatedAt: new Date().toISOString()
  };

  if (isDemoMode) {
    // If user creates an event while in demo mode, automatically switch to personal mode so their data saves!
    if (confirm('You are currently viewing Sample Demo Data. Would you like to switch to your Personal Space and save this event?')) {
      isDemoMode = false;
      localStorage.setItem(DEMO_FLAG_KEY, 'false');
      const stored = localStorage.getItem(STORAGE_KEY);
      currentEvents = stored ? JSON.parse(stored) : [];
      updateDemoToggleUI();
    }
  }

  if (id) {
    const index = currentEvents.findIndex(e => e.id === id);
    if (index !== -1) currentEvents[index] = eventData;
  } else {
    eventData.createdAt = new Date().toISOString();
    currentEvents.unshift(eventData);
  }

  saveEvents();
  closeEventModal();
  render();
}

function deleteEvent(eventId) {
  if (confirm('Are you sure you want to delete this programme entry?')) {
    currentEvents = currentEvents.filter(e => e.id !== eventId);
    saveEvents();
    render();
  }
}

// Smart Parse (Google Form & Confirmation Email text extractor)
function openSmartParseModal() {
  document.getElementById('smart-parse-modal')?.classList.remove('hidden');
  document.getElementById('smart-parse-input').value = '';
  document.getElementById('parse-preview-box')?.classList.add('hidden');
}

function closeSmartParseModal() {
  document.getElementById('smart-parse-modal')?.classList.add('hidden');
}

function handleSmartParse() {
  const rawText = document.getElementById('smart-parse-input').value;
  if (!rawText.trim()) {
    alert('Please paste some confirmation text or email content first!');
    return;
  }

  // Regex and pattern extractors
  let extracted = {
    title: '',
    organizer: '',
    date: '',
    startTime: '',
    endTime: '',
    venue: '',
    meetingLink: '',
    description: '',
    category: 'Other'
  };

  // 1. Check for URLs (Google Meet, Zoom, Teams, Forms)
  const meetMatch = rawText.match(/https?:\/\/meet\.google\.com\/[a-z0-9\-]+/i);
  const zoomMatch = rawText.match(/https?:\/\/[a-z0-9\-.]*zoom\.us\/j\/[0-9?=\w\-]+/i);
  const teamsMatch = rawText.match(/https?:\/\/teams\.microsoft\.com\/[^\s]+/i);
  const formMatch = rawText.match(/https?:\/\/forms\.gle\/[a-zA-Z0-9]+/i) || rawText.match(/https?:\/\/docs\.google\.com\/forms\/[^\s]+/i);

  if (meetMatch) {
    extracted.meetingLink = meetMatch[0];
    extracted.venue = 'Google Meet';
  } else if (zoomMatch) {
    extracted.meetingLink = zoomMatch[0];
    extracted.venue = 'Zoom Meeting';
  } else if (teamsMatch) {
    extracted.meetingLink = teamsMatch[0];
    extracted.venue = 'Microsoft Teams';
  }

  // 2. Check for Date formats: YYYY-MM-DD or DD/MM/YYYY or "15 October 2026"
  const isoDateMatch = rawText.match(/\b(20\d{2})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/);
  const dmyMatch = rawText.match(/\b(0[1-9]|[12]\d|3[01])[-/](0[1-9]|1[0-2])[-/](20\d{2})\b/);
  const textDateMatch = rawText.match(/\b([A-Z][a-z]+)\s+([0-9]{1,2}),?\s+(20\d{2})\b/);

  if (isoDateMatch) {
    extracted.date = `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`;
  } else if (dmyMatch) {
    extracted.date = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
  } else if (textDateMatch) {
    const monthNames = ["january","february","march","april","may","june","july","august","september","october","november","december"];
    const mIndex = monthNames.indexOf(textDateMatch[1].toLowerCase());
    if (mIndex !== -1) {
      const monthPadded = String(mIndex + 1).padStart(2, '0');
      const dayPadded = String(textDateMatch[2]).padStart(2, '0');
      extracted.date = `${textDateMatch[3]}-${monthPadded}-${dayPadded}`;
    }
  }

  // 3. Check for Time: e.g. "14:00", "2:30 PM", "9:00 AM - 12:00 PM"
  const timeRangeMatch = rawText.match(/\b([0-1]?[0-9]|2[0-3]):([0-5][0-9])\s*(AM|PM)?\s*(?:-|–|to)\s*([0-1]?[0-9]|2[0-3]):([0-5][0-9])\s*(AM|PM)?\b/i);
  if (timeRangeMatch) {
    extracted.startTime = convertTo24Hour(timeRangeMatch[1], timeRangeMatch[2], timeRangeMatch[3]);
    extracted.endTime = convertTo24Hour(timeRangeMatch[4], timeRangeMatch[5], timeRangeMatch[6]);
  } else {
    const singleTimeMatch = rawText.match(/\b([0-1]?[0-9]|2[0-3]):([0-5][0-9])\s*(AM|PM)?\b/i);
    if (singleTimeMatch) {
      extracted.startTime = convertTo24Hour(singleTimeMatch[1], singleTimeMatch[2], singleTimeMatch[3]);
    }
  }

  // 4. Try first non-empty lines for Title
  const lines = rawText.split('\n').map(l => l.trim()).filter(l => l.length > 3);
  for (let line of lines) {
    if (!line.toLowerCase().includes('http') && !line.toLowerCase().includes('registered') && line.length < 90) {
      extracted.title = line.replace(/^(workshop|event|programme|webinar|title)\s*[:\-]\s*/i, '');
      break;
    }
  }

  // Pre-fill the Add modal with extracted values
  closeSmartParseModal();
  openEventModal();

  if (extracted.title) document.getElementById('form-title').value = extracted.title;
  if (extracted.date) document.getElementById('form-date').value = extracted.date;
  if (extracted.startTime) document.getElementById('form-start-time').value = extracted.startTime;
  if (extracted.endTime) document.getElementById('form-end-time').value = extracted.endTime;
  if (extracted.venue) document.getElementById('form-venue').value = extracted.venue;
  if (extracted.meetingLink) {
    document.getElementById('form-meeting-link').value = extracted.meetingLink;
    document.getElementById('form-mode').value = 'online';
  }
  if (formMatch) document.getElementById('form-form-link').value = formMatch[0];
  document.getElementById('form-description').value = rawText.slice(0, 300);
}

function convertTo24Hour(hourStr, minStr, ampm) {
  let h = parseInt(hourStr, 10);
  if (ampm) {
    const upper = ampm.toUpperCase();
    if (upper === 'PM' && h < 12) h += 12;
    if (upper === 'AM' && h === 12) h = 0;
  }
  return `${String(h).padStart(2, '0')}:${minStr}`;
}

// Backup & Export / Import
function exportToJson() {
  const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(currentEvents, null, 2));
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", dataStr);
  dlAnchor.setAttribute("download", `workshophub_backup_${new Date().toISOString().split('T')[0]}.json`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
}

function exportToCsv() {
  if (currentEvents.length === 0) {
    alert('No events to export!');
    return;
  }

  const headers = ['Title', 'Organizer', 'Category', 'Mode', 'Date', 'Start Time', 'End Time', 'Venue', 'Meeting Link', 'Status', 'Description'];
  const rows = currentEvents.map(e => [
    `"${(e.title || '').replace(/"/g, '""')}"`,
    `"${(e.organizer || '').replace(/"/g, '""')}"`,
    `"${(e.category || '').replace(/"/g, '""')}"`,
    `"${(e.mode || '').replace(/"/g, '""')}"`,
    `"${e.date || ''}"`,
    `"${e.startTime || ''}"`,
    `"${e.endTime || ''}"`,
    `"${(e.venue || '').replace(/"/g, '""')}"`,
    `"${(e.meetingLink || '').replace(/"/g, '""')}"`,
    `"${(e.status || '').replace(/"/g, '""')}"`,
    `"${(e.description || '').replace(/"/g, '""')}"`
  ]);

  const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  const dlAnchor = document.createElement('a');
  dlAnchor.setAttribute("href", encodeURI(csvContent));
  dlAnchor.setAttribute("download", `workshophub_events_${new Date().toISOString().split('T')[0]}.csv`);
  document.body.appendChild(dlAnchor);
  dlAnchor.click();
  dlAnchor.remove();
}

function handleImportJson(e) {
  const file = e.target.files[0];
  if (!file) return;

  const reader = new FileReader();
  reader.onload = (event) => {
    try {
      const imported = JSON.parse(event.target.result);
      if (Array.isArray(imported)) {
        if (confirm(`Import ${imported.length} events? This will merge with your current list.`)) {
          isDemoMode = false;
          localStorage.setItem(DEMO_FLAG_KEY, 'false');
          // Merge avoiding ID collisions
          const existingIds = new Set(currentEvents.map(e => e.id));
          imported.forEach(item => {
            if (!item.id || existingIds.has(item.id)) {
              item.id = 'imported_' + Math.random().toString(36).substr(2, 9);
            }
            currentEvents.unshift(item);
          });
          saveEvents();
          updateDemoToggleUI();
          render();
          alert('Events imported successfully!');
        }
      } else {
        alert('Invalid backup file structure: expected a JSON array.');
      }
    } catch (err) {
      alert('Failed to parse JSON file: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function handleClearData() {
  if (confirm('Are you sure you want to wipe all your personal events? This action cannot be undone unless you have a JSON backup.')) {
    currentEvents = [];
    localStorage.removeItem(STORAGE_KEY);
    render();
  }
}

function escapeHtml(str) {
  if (!str) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}
