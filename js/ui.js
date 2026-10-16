/**
 * WorkshopHub UI Module
 * Handles mobile-first rendering, bottom sheets, navigation, toasts, and event delegation.
 */

const UI = {
  currentTab: 'agenda', // 'agenda' | 'cards' | 'calendar' | 'ai'
  currentFilterMode: 'all',
  currentFilterCategory: 'all',
  currentFilterStatus: 'all',
  searchQuery: '',
  selectedCalendarDate: null,
  activeEvents: [],

  init() {
    this.bindGlobalEvents();
    this.checkSharedTargetUrl();
    this.refresh();
  },

  refresh() {
    this.activeEvents = Store.getEvents();
    this.renderMetrics();
    this.renderSpotlight();
    this.renderActiveTab();
    if (typeof DriveSync !== 'undefined' && DriveSync.updateSyncStatusUI) {
      DriveSync.updateSyncStatusUI(DriveSync.isSignedIn() ? 'synced' : 'disconnected', localStorage.getItem('workshophub_last_sync_time') || '');
    }
  },

  // 2. Metrics Bar
  renderMetrics() {
    const events = this.activeEvents;
    const now = new Date();
    const oneWeekLater = new Date();
    oneWeekLater.setDate(oneWeekLater.getDate() + 7);

    let upcomingCount = 0;
    let thisWeekCount = 0;
    let onlineCount = 0;
    let inPersonCount = 0;

    events.forEach(e => {
      const isPast = Organiser.isPast(e.date, e.endTime || e.startTime);
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

    const elTotal = document.getElementById('stat-total');
    const elUpcoming = document.getElementById('stat-upcoming');
    const elWeek = document.getElementById('stat-this-week');
    const elRatio = document.getElementById('stat-ratio');

    if (elTotal) elTotal.textContent = events.length;
    if (elUpcoming) elUpcoming.textContent = upcomingCount;
    if (elWeek) elWeek.textContent = thisWeekCount;
    if (elRatio) elRatio.textContent = `${onlineCount} 🌐 / ${inPersonCount} 📍`;
  },

  // 3. Spotlight Banner (Next immediate upcoming workshop)
  renderSpotlight() {
    const banner = document.getElementById('spotlight-banner');
    if (!banner) return;

    const upcoming = this.activeEvents
      .filter(e => !Organiser.isPast(e.date, e.endTime || e.startTime))
      .sort((a, b) => new Date(`${a.date}T${a.startTime || '00:00'}`) - new Date(`${b.date}T${b.startTime || '00:00'}`));

    if (upcoming.length === 0) {
      banner.classList.add('hidden');
      return;
    }

    const next = upcoming[0];
    const countdown = this.getCountdownBadge(next.date, next.startTime, next.endTime);
    const timeDisplay = next.startTime ? `${this.formatTime(next.startTime)} ${next.endTime ? '– ' + this.formatTime(next.endTime) : ''}` : 'Time TBD';

    banner.classList.remove('hidden');
    banner.innerHTML = `
      <div class="relative overflow-hidden bg-gradient-to-r from-indigo-900 via-indigo-800 to-slate-900 rounded-2xl p-5 text-white shadow-lg border border-indigo-700/60">
        <div class="flex flex-col md:flex-row md:items-center justify-between gap-4 relative z-10">
          <div>
            <div class="flex items-center gap-2 mb-1.5">
              <span class="px-2 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider bg-indigo-500/30 text-indigo-200 border border-indigo-400/40">
                ⚡ Next Up
              </span>
              <span class="px-2 py-0.5 rounded-full text-[11px] font-bold ${countdown.color}">
                ${countdown.text}
              </span>
            </div>
            <h2 class="text-lg md:text-xl font-extrabold tracking-tight">${Safe.escapeHtml(next.title)}</h2>
            <div class="flex flex-wrap items-center gap-x-4 gap-y-1 mt-1 text-xs text-indigo-100/90">
              <span>👤 <strong>${Safe.escapeHtml(next.organizer || 'Organized Community')}</strong></span>
              <span>📅 <strong>${this.formatDate(next.date)}</strong> (${timeDisplay})</span>
              <span>${next.mode === 'online' ? '🌐 Virtual' : '📍 In-Person'}: <strong>${Safe.escapeHtml(next.venue || 'Venue Pending')}</strong></span>
            </div>
          </div>
          <div class="flex flex-wrap items-center gap-2 pt-2 md:pt-0">
            ${next.meetingLink ? `
              <a href="${Safe.safeUrl(next.meetingLink)}" target="_blank" rel="noopener noreferrer" class="px-3.5 py-2 bg-emerald-500 hover:bg-emerald-600 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5">
                🚀 Join Meeting
              </a>
            ` : ''}
            <a href="${Calendar.generateGoogleCalendarUrl(next)}" target="_blank" rel="noopener noreferrer" class="px-3.5 py-2 bg-white/10 hover:bg-white/20 text-white font-semibold text-xs rounded-xl border border-white/20 transition flex items-center gap-1.5">
              📅 Add to Calendar
            </a>
            <button data-action="download-ics" data-id="${next.id}" class="px-3 py-2 bg-white/10 hover:bg-white/20 text-white text-xs font-semibold rounded-xl border border-white/20 transition">
              📥 .ics
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // 4. Render Active View
  renderActiveTab() {
    const container = document.getElementById('main-tab-content');
    if (!container) return;

    // Filter events
    const filtered = this.getFilteredEvents();
    const conflicts = Organiser.detectConflicts(this.activeEvents);

    if (this.currentTab === 'agenda') {
      this.renderAgendaView(filtered, conflicts, container);
    } else if (this.currentTab === 'cards') {
      this.renderCardsView(filtered, conflicts, container);
    } else if (this.currentTab === 'calendar') {
      this.renderCalendarView(filtered, container);
    } else if (this.currentTab === 'ai') {
      this.renderAiChatView(container);
    }
  },

  // 5. Agenda View (Mobile-First, grouped by timeline)
  renderAgendaView(events, conflicts, container) {
    if (events.length === 0) {
      container.innerHTML = this.getEmptyStateHtml();
      return;
    }

    const sections = Organiser.groupByTimeline(events);
    const sectionConfig = [
      { key: 'today', title: '🚨 Today', items: sections.today, accent: 'text-red-600 border-red-500' },
      { key: 'tomorrow', title: '⏳ Tomorrow', items: sections.tomorrow, accent: 'text-amber-600 border-amber-500' },
      { key: 'thisWeek', title: '📅 This Week', items: sections.thisWeek, accent: 'text-indigo-600 border-indigo-500' },
      { key: 'later', title: '✨ Later / Upcoming', items: sections.later, accent: 'text-slate-700 border-slate-400' },
      { key: 'needsInfo', title: '❓ Needs Date / Info', items: sections.needsInfo, accent: 'text-purple-600 border-purple-400' },
      { key: 'past', title: '✓ Past / Concluded', items: sections.past, accent: 'text-slate-400 border-slate-300' }
    ];

    let html = '<div class="space-y-6">';

    sectionConfig.forEach(sec => {
      if (sec.items.length === 0) return;

      html += `
        <div class="space-y-3">
          <div class="flex items-center gap-2 border-b border-slate-200 dark:border-slate-800 pb-1.5">
            <h3 class="text-sm font-extrabold uppercase tracking-wider ${sec.accent}">${sec.title}</h3>
            <span class="text-xs px-2 py-0.5 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-600 font-bold">${sec.items.length}</span>
          </div>
          <div class="space-y-3">
            ${sec.items.map(e => this.renderAgendaItem(e, conflicts[e.id])).join('')}
          </div>
        </div>
      `;
    });

    html += '</div>';
    container.innerHTML = html;
  },

  renderAgendaItem(event, conflictList) {
    const countdown = this.getCountdownBadge(event.date, event.startTime, event.endTime);
    const isPast = Organiser.isPast(event.date, event.endTime || event.startTime);
    const timeDisplay = event.startTime ? `${this.formatTime(event.startTime)} ${event.endTime ? '– ' + this.formatTime(event.endTime) : ''}` : 'Time TBD';

    return `
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200/80 dark:border-slate-700 p-4 shadow-xs transition hover:shadow-md">
        ${conflictList && conflictList.length > 0 ? `
          <div class="mb-2.5 px-3 py-1.5 rounded-xl bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-xs text-red-700 dark:text-red-300 font-semibold flex items-center gap-1.5">
            <span>⚠️ Schedule Clash:</span>
            <span>Overlaps with <strong>${Safe.escapeHtml(conflictList[0].title)}</strong> (${conflictList[0].time})</span>
          </div>
        ` : ''}

        <div class="flex items-start justify-between gap-3">
          <div class="flex-1">
            <div class="flex flex-wrap items-center gap-2 mb-1">
              <span class="px-2 py-0.5 rounded-md text-[10px] font-bold uppercase tracking-wider ${
                event.mode === 'online' ? 'bg-cyan-50 text-cyan-700 border border-cyan-200' : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
              }">
                ${event.mode === 'online' ? '🌐 Online' : '📍 In-Person'}
              </span>
              <span class="px-2 py-0.5 rounded-md text-[10px] font-semibold bg-indigo-50 text-indigo-700 border border-indigo-200">
                ${Safe.escapeHtml(event.category || 'General')}
              </span>
              <span class="px-2 py-0.5 rounded-md text-[10px] font-medium ${countdown.color}">
                ${countdown.text}
              </span>
            </div>

            <h4 class="text-base font-bold text-slate-900 dark:text-white leading-snug">
              ${Safe.escapeHtml(event.title)}
            </h4>
            <div class="text-xs text-slate-500 mt-0.5 font-medium">
              By ${Safe.escapeHtml(event.organizer || 'Unspecified Host')}
            </div>

            <div class="mt-2.5 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs text-slate-700 dark:text-slate-300">
              <div class="flex items-center gap-1.5">
                <span>📅</span>
                <span class="font-semibold">${this.formatDate(event.date)}</span>
                <span>•</span>
                <span>${timeDisplay}</span>
              </div>
              <div class="flex items-center gap-1.5 truncate">
                <span>${event.mode === 'online' ? '🔗' : '📍'}</span>
                <span class="truncate font-medium">${Safe.escapeHtml(event.venue || (event.mode === 'online' ? 'Online Link' : 'Location TBD'))}</span>
                ${event.passcode ? `<span class="text-[11px] font-mono text-slate-400">(PIN: ${Safe.escapeHtml(event.passcode)})</span>` : ''}
              </div>
            </div>

            ${event.description ? `
              <p class="mt-2 text-xs text-slate-600 dark:text-slate-400 line-clamp-2 leading-relaxed">
                ${Safe.escapeHtml(event.description)}
              </p>
            ` : ''}

            ${event.notes ? `
              <div class="mt-2 px-2.5 py-1.5 rounded-lg bg-amber-50/80 dark:bg-amber-900/20 border border-amber-200/60 dark:border-amber-800 text-[11px] text-amber-900 dark:text-amber-200">
                💡 <strong>Prep Note:</strong> ${Safe.escapeHtml(event.notes)}
              </div>
            ` : ''}
          </div>
        </div>

        <!-- Action Row -->
        <div class="mt-3 pt-3 border-t border-slate-100 dark:border-slate-700/60 flex flex-wrap items-center justify-between gap-2 text-xs">
          <div class="flex flex-wrap items-center gap-1.5">
            ${event.meetingLink ? `
              <a href="${Safe.safeUrl(event.meetingLink)}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-lg transition inline-flex items-center gap-1">
                🚀 Join
              </a>
              <button data-action="copy-link" data-url="${Safe.safeUrl(event.meetingLink)}" class="px-2 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg font-medium transition" title="Copy meeting link">
                📋 Copy Link
              </button>
            ` : ''}
            <a href="${Calendar.generateGoogleCalendarUrl(event)}" target="_blank" rel="noopener noreferrer" class="px-2.5 py-1 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-lg font-semibold transition">
              + Google Cal
            </a>
            <button data-action="download-ics" data-id="${event.id}" class="px-2 py-1 text-slate-500 hover:text-slate-800 font-medium transition">
              .ics
            </button>
          </div>

          <div class="flex items-center gap-1">
            <button data-action="edit-event" data-id="${event.id}" class="p-1.5 text-slate-400 hover:text-indigo-600 rounded-lg transition" title="Edit">
              ✏️
            </button>
            <button data-action="delete-event" data-id="${event.id}" class="p-1.5 text-slate-400 hover:text-red-600 rounded-lg transition" title="Delete">
              🗑️
            </button>
          </div>
        </div>
      </div>
    `;
  },

  // 6. Cards View
  renderCardsView(events, conflicts, container) {
    if (events.length === 0) {
      container.innerHTML = this.getEmptyStateHtml();
      return;
    }

    container.innerHTML = `
      <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        ${events.map(e => this.renderAgendaItem(e, conflicts[e.id])).join('')}
      </div>
    `;
  },

  // 7. Calendar / Month View
  renderCalendarView(events, container) {
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonth = now.getMonth(); // 0-indexed

    // Count events per date
    const dateCounts = {};
    events.forEach(e => {
      if (e.date) {
        dateCounts[e.date] = (dateCounts[e.date] || 0) + 1;
      }
    });

    const firstDayIndex = new Date(currentYear, currentMonth, 1).getDay();
    const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
    const monthName = now.toLocaleString('default', { month: 'long' });

    let calHtml = `
      <div class="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 p-5 shadow-xs max-w-2xl mx-auto">
        <div class="flex items-center justify-between mb-4">
          <h3 class="text-base font-extrabold text-slate-900 dark:text-white">${monthName} ${currentYear}</h3>
          <span class="text-xs text-slate-500">Tap a date to view workshops</span>
        </div>

        <div class="grid grid-cols-7 gap-1 text-center text-xs font-bold text-slate-400 mb-2">
          <div>Su</div><div>Mo</div><div>Tu</div><div>We</div><div>Th</div><div>Fr</div><div>Sa</div>
        </div>

        <div class="grid grid-cols-7 gap-1.5 text-center text-xs">
    `;

    // Blank preceding days
    for (let i = 0; i < firstDayIndex; i++) {
      calHtml += '<div class="h-10"></div>';
    }

    // Days in current month
    for (let day = 1; day <= daysInMonth; day++) {
      const monthStr = String(currentMonth + 1).padStart(2, '0');
      const dayStr = String(day).padStart(2, '0');
      const dateKey = `${currentYear}-${monthStr}-${dayStr}`;
      const count = dateCounts[dateKey] || 0;
      const isToday = now.toISOString().split('T')[0] === dateKey;

      calHtml += `
        <button 
          data-action="select-cal-date" 
          data-date="${dateKey}"
          class="h-10 rounded-xl flex flex-col items-center justify-center transition ${
            isToday ? 'bg-indigo-600 text-white font-black' : 'hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300'
          } ${count > 0 && !isToday ? 'font-bold bg-indigo-50 text-indigo-700 border border-indigo-200' : ''}"
        >
          <span>${day}</span>
          ${count > 0 ? `<span class="w-1.5 h-1.5 rounded-full ${isToday ? 'bg-white' : 'bg-indigo-600'}"></span>` : ''}
        </button>
      `;
    }

    calHtml += `
        </div>
      </div>
      <div id="calendar-day-events" class="mt-6 space-y-3 max-w-2xl mx-auto"></div>
    `;

    container.innerHTML = calHtml;
  },

  // 8. "Ask AI" Chat View
  renderAiChatView(container) {
    container.innerHTML = `
      <div class="max-w-2xl mx-auto bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 shadow-sm flex flex-col h-[560px]">
        <div class="p-4 border-b border-slate-100 dark:border-slate-700 flex items-center justify-between">
          <div class="flex items-center gap-2">
            <span class="text-xl">🤖</span>
            <div>
              <h3 class="text-sm font-bold text-slate-900 dark:text-white">Workshop Assistant</h3>
              <p class="text-[11px] text-slate-500">Ask anything about your registered programmes & workshops</p>
            </div>
          </div>
          <button data-action="open-settings" class="text-xs text-indigo-600 font-semibold hover:underline">
            AI Settings ⚙️
          </button>
        </div>

        <div id="ai-chat-messages" class="flex-1 p-4 overflow-y-auto space-y-3 text-xs">
          <div class="bg-indigo-50/70 dark:bg-indigo-900/30 text-indigo-950 dark:text-indigo-200 p-3 rounded-2xl border border-indigo-100 dark:border-indigo-800">
            👋 <strong>Hi! I am your Schedule Organizer.</strong><br>
            You can ask me questions like:
            <ul class="list-disc pl-4 mt-1.5 space-y-0.5">
              <li><em>"What workshops do I have this week?"</em></li>
              <li><em>"Do I have any schedule clashes?"</em></li>
              <li><em>"Give me a checklist for my next upcoming event"</em></li>
              <li><em>"Are there any in-person sessions I need to travel for?"</em></li>
            </ul>
          </div>
        </div>

        <!-- Quick prompt chips -->
        <div class="px-4 py-2 bg-slate-50 dark:bg-slate-800/80 border-t border-slate-100 dark:border-slate-700 flex flex-wrap gap-1.5 text-[11px]">
          <button data-action="quick-prompt" data-text="What workshops do I have this week?" class="px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-indigo-50">
            📅 This week's workshops
          </button>
          <button data-action="quick-prompt" data-text="Check my schedule for any clashes or overlapping times." class="px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-indigo-50">
            ⚠️ Check clashes
          </button>
          <button data-action="quick-prompt" data-text="Give me preparation tips and required tools for my upcoming sessions." class="px-2.5 py-1 rounded-full bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 text-slate-700 dark:text-slate-200 hover:bg-indigo-50">
            💡 Preparation checklist
          </button>
        </div>

        <div class="p-3 border-t border-slate-100 dark:border-slate-700 flex gap-2">
          <input 
            type="text" 
            id="ai-chat-input" 
            placeholder="Ask a question about your workshops..." 
            class="flex-1 px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-700 rounded-xl text-xs focus:ring-2 focus:ring-indigo-500 focus:outline-none"
          >
          <button id="ai-chat-send-btn" class="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow transition">
            Send
          </button>
        </div>
      </div>
    `;

    // Bind chat send
    document.getElementById('ai-chat-send-btn')?.addEventListener('click', () => this.handleAiChatSubmit());
    document.getElementById('ai-chat-input')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') this.handleAiChatSubmit();
    });
  },

  async handleAiChatSubmit(customText = null) {
    const input = document.getElementById('ai-chat-input');
    const text = customText || (input ? input.value.trim() : '');
    if (!text) return;

    if (input) input.value = '';

    const messages = document.getElementById('ai-chat-messages');
    if (!messages) return;

    // Append user message
    messages.innerHTML += `
      <div class="text-right">
        <div class="inline-block bg-indigo-600 text-white p-2.5 rounded-2xl max-w-[85%] text-left">
          ${Safe.escapeHtml(text)}
        </div>
      </div>
      <div id="ai-loading-indicator" class="text-left text-slate-400 italic">
        🤖 Analyzing your schedule...
      </div>
    `;
    messages.scrollTop = messages.scrollHeight;

    try {
      const response = await AI.askSchedule(text, this.activeEvents);
      document.getElementById('ai-loading-indicator')?.remove();
      messages.innerHTML += `
        <div class="text-left">
          <div class="inline-block bg-slate-100 dark:bg-slate-700 text-slate-800 dark:text-slate-200 p-3 rounded-2xl max-w-[90%] whitespace-pre-line leading-relaxed">
            ${Safe.escapeHtml(response)}
          </div>
        </div>
      `;
    } catch (err) {
      document.getElementById('ai-loading-indicator')?.remove();
      messages.innerHTML += `
        <div class="text-left text-red-600 bg-red-50 p-2.5 rounded-xl border border-red-200">
          ❌ Failed to get response: ${Safe.escapeHtml(err.message)}
        </div>
      `;
    }
    messages.scrollTop = messages.scrollHeight;
  },

  // 9. Global Event Delegation
  bindGlobalEvents() {
    // Navigation tabs
    document.querySelectorAll('[data-nav-tab]').forEach(btn => {
      btn.addEventListener('click', (e) => {
        const targetTab = btn.getAttribute('data-nav-tab');
        this.switchTab(targetTab);
      });
    });

    // Delegate actions on body
    document.body.addEventListener('click', (e) => {
      const target = e.target.closest('[data-action]');
      if (!target) return;

      const action = target.getAttribute('data-action');
      const id = target.getAttribute('data-id');

      switch (action) {
        case 'open-add-modal':
          this.openEventModal();
          break;
        case 'open-smart-parse':
          this.openSmartParseModal();
          break;
        case 'open-settings':
          this.openSettingsModal();
          break;
        case 'edit-event':
          this.openEventModal(id);
          break;
        case 'delete-event':
          this.deleteEventWithToast(id);
          break;
        case 'download-ics':
          const ev = this.activeEvents.find(x => x.id === id);
          if (ev) Calendar.downloadIcsFile(ev);
          break;
        case 'copy-link':
          const url = target.getAttribute('data-url');
          if (url) {
            navigator.clipboard.writeText(url).then(() => this.showToast('Meeting link copied!'));
          }
          break;
        case 'quick-prompt':
          const promptText = target.getAttribute('data-text');
          this.handleAiChatSubmit(promptText);
          break;
        case 'select-cal-date':
          const date = target.getAttribute('data-date');
          this.renderCalendarDayEvents(date);
          break;
        case 'drive-signin':
          if (typeof DriveSync !== 'undefined') DriveSync.requestSignIn();
          break;
        case 'drive-sync-now':
          if (typeof DriveSync !== 'undefined') {
            DriveSync.sync().then(() => UI.showToast('Google Drive synced!'));
          }
          break;
      }
    });

    // Search and filter inputs
    document.getElementById('search-input')?.addEventListener('input', (e) => {
      this.searchQuery = e.target.value.toLowerCase().trim();
      this.refresh();
    });
    document.getElementById('filter-mode')?.addEventListener('change', (e) => {
      this.currentFilterMode = e.target.value;
      this.refresh();
    });
    document.getElementById('filter-category')?.addEventListener('change', (e) => {
      this.currentFilterCategory = e.target.value;
      this.refresh();
    });
  },

  switchTab(tabName) {
    this.currentTab = tabName;
    document.querySelectorAll('[data-nav-tab]').forEach(btn => {
      const isActive = btn.getAttribute('data-nav-tab') === tabName;
      if (isActive) {
        btn.classList.add('bg-indigo-600', 'text-white');
        btn.classList.remove('text-slate-600', 'hover:bg-slate-100');
      } else {
        btn.classList.remove('bg-indigo-600', 'text-white');
        btn.classList.add('text-slate-600', 'hover:bg-slate-100');
      }
    });
    this.renderActiveTab();
  },

  // 10. Modals: Insert / Edit Event
  openEventModal(eventIdOrData = null) {
    const modal = document.getElementById('event-modal');
    const form = document.getElementById('event-form');
    if (!modal || !form) return;

    form.reset();
    document.getElementById('form-id').value = '';

    if (typeof eventIdOrData === 'string') {
      const event = this.activeEvents.find(e => e.id === eventIdOrData);
      if (event) {
        this.populateEventForm(event, 'Edit Programme Details');
      }
    } else if (typeof eventIdOrData === 'object' && eventIdOrData !== null) {
      this.populateEventForm(eventIdOrData, 'Insert New Programme / Workshop');
    } else {
      document.getElementById('modal-title').textContent = 'Insert New Programme / Workshop';
      document.getElementById('form-date').value = Store.getRelativeDate(1);
      document.getElementById('form-start-time').value = '10:00';
      document.getElementById('form-end-time').value = '12:00';
    }

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
    form.scrollTop = 0;

    const titleInput = document.getElementById('form-title');
    if (titleInput) {
      setTimeout(() => {
        form.scrollTop = 0;
        titleInput.focus();
      }, 50);
    }
  },

  populateEventForm(event, modalTitle) {
    document.getElementById('modal-title').textContent = modalTitle;
    document.getElementById('form-id').value = event.id || '';
    document.getElementById('form-title').value = event.title || '';
    document.getElementById('form-organizer').value = event.organizer || '';
    document.getElementById('form-category').value = event.category || 'Web & Software';
    document.getElementById('form-mode').value = event.mode || 'in-person';
    document.getElementById('form-date').value = event.date || Store.getRelativeDate(1);
    document.getElementById('form-start-time').value = event.startTime || '10:00';
    document.getElementById('form-end-time').value = event.endTime || '12:00';
    document.getElementById('form-venue').value = event.venue || '';
    document.getElementById('form-meeting-link').value = event.meetingLink || '';
    document.getElementById('form-passcode').value = event.passcode || '';
    document.getElementById('form-description').value = event.description || '';
    document.getElementById('form-form-link').value = event.formLink || '';
    document.getElementById('form-materials-link').value = event.materialsLink || '';
    document.getElementById('form-notes').value = event.notes || '';
    document.getElementById('form-status').value = event.status || 'registered';
  },

  closeEventModal() {
    document.getElementById('event-modal')?.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  },

  // 11. Smart Ingest Modal (Text + Vision Screenshot OCR)
  openSmartParseModal() {
    const modal = document.getElementById('smart-parse-modal');
    if (!modal) return;
    document.getElementById('smart-parse-text-input').value = '';
    document.getElementById('smart-parse-image-input').value = '';
    document.getElementById('smart-image-preview-container').classList.add('hidden');
    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  },

  closeSmartParseModal() {
    document.getElementById('smart-parse-modal')?.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  },

  // 12. Settings Modal
  openSettingsModal() {
    const modal = document.getElementById('settings-modal');
    if (!modal) return;

    document.getElementById('settings-api-key').value = Store.getSetting('geminiApiKey') || '';
    document.getElementById('settings-model').value = Store.getSetting('aiModel') || 'gemini-2.0-flash';
    document.getElementById('settings-timezone').value = Store.getSetting('userTimezone') || 'UTC';

    // Google Drive Sync fields
    if (typeof DriveSync !== 'undefined') {
      const gdriveInput = document.getElementById('settings-gdrive-client-id');
      if (gdriveInput) gdriveInput.value = DriveSync.getClientId();

      const connectBtn = document.getElementById('settings-drive-connect-btn');
      const disconnectBtn = document.getElementById('settings-drive-disconnect-btn');
      if (DriveSync.isSignedIn()) {
        if (connectBtn) connectBtn.textContent = `Connected (${DriveSync.userProfile?.email || 'Active'})`;
        if (disconnectBtn) disconnectBtn.classList.remove('hidden');
      } else {
        if (connectBtn) connectBtn.textContent = 'Sign In with Google';
        if (disconnectBtn) disconnectBtn.classList.add('hidden');
      }
    }

    modal.classList.remove('hidden');
    document.body.classList.add('overflow-hidden');
  },

  closeSettingsModal() {
    document.getElementById('settings-modal')?.classList.add('hidden');
    document.body.classList.remove('overflow-hidden');
  },

  // 13. Toast with Undo
  showToast(message, undoAction = null) {
    const container = document.getElementById('toast-container');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = 'px-4 py-3 bg-slate-900 text-white rounded-xl shadow-xl flex items-center justify-between gap-4 text-xs font-semibold animate-bounce';
    toast.innerHTML = `
      <span>${Safe.escapeHtml(message)}</span>
      ${undoAction ? '<button id="toast-undo-btn" class="text-amber-400 hover:underline font-bold">UNDO</button>' : ''}
    `;

    container.appendChild(toast);

    if (undoAction) {
      toast.querySelector('#toast-undo-btn')?.addEventListener('click', () => {
        undoAction();
        toast.remove();
      });
    }

    setTimeout(() => {
      toast.remove();
    }, 4500);
  },

  deleteEventWithToast(id) {
    const eventToDelete = this.activeEvents.find(e => e.id === id);
    if (!eventToDelete) return;

    Store.deleteEvent(id);
    this.refresh();

    if (typeof DriveSync !== 'undefined' && DriveSync.isSignedIn()) {
      DriveSync.sync().catch(err => console.warn('Auto-sync failed:', err));
    }

    this.showToast(`Deleted: "${Safe.truncate(eventToDelete.title, 25)}"`, () => {
      Store.addEvent(eventToDelete);
      this.refresh();
      if (typeof DriveSync !== 'undefined' && DriveSync.isSignedIn()) {
        DriveSync.sync().catch(err => console.warn('Auto-sync failed:', err));
      }
    });
  },

  // 14. Helper methods
  getFilteredEvents() {
    return this.activeEvents.filter(e => {
      if (this.searchQuery) {
        const text = `${e.title || ''} ${e.organizer || ''} ${e.venue || ''} ${e.description || ''}`.toLowerCase();
        if (!text.includes(this.searchQuery)) return false;
      }
      if (this.currentFilterMode !== 'all' && e.mode !== this.currentFilterMode) return false;
      if (this.currentFilterCategory !== 'all' && e.category !== this.currentFilterCategory) return false;
      return true;
    }).sort((a, b) => new Date(`${a.date}T${a.startTime || '00:00'}`) - new Date(`${b.date}T${b.startTime || '00:00'}`));
  },

  getCountdownBadge(dateStr, startTime = '00:00', endTime = '23:59') {
    if (!dateStr) return { text: 'Date TBD', color: 'bg-slate-100 text-slate-600' };

    const now = new Date();
    const start = new Date(`${dateStr}T${startTime}`);
    const end = new Date(`${dateStr}T${endTime}`);

    if (now > end) {
      return { text: 'Concluded', color: 'bg-slate-100 text-slate-500' };
    }

    if (now.toDateString() === start.toDateString()) {
      if (now >= start && now <= end) {
        return { text: '⚡ Live Now!', color: 'bg-red-500 text-white font-bold' };
      }
      return { text: `🚨 Today (${this.formatTime(startTime)})`, color: 'bg-amber-500 text-white font-semibold' };
    }

    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    if (tomorrow.toDateString() === start.toDateString()) {
      return { text: `Tomorrow (${this.formatTime(startTime)})`, color: 'bg-orange-100 text-orange-800' };
    }

    const diffDays = Math.ceil((start.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays <= 7) {
      return { text: `In ${diffDays} days`, color: 'bg-blue-100 text-blue-800' };
    }
    return { text: `${diffDays} days away`, color: 'bg-slate-100 text-slate-700' };
  },

  formatDate(dateStr) {
    if (!dateStr) return 'Date TBD';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const d = new Date(parts[0], parts[1] - 1, parts[2]);
    return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
  },

  formatTime(timeStr) {
    if (!timeStr) return '';
    const [h, m] = timeStr.split(':');
    const hour = parseInt(h, 10);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const formattedH = hour % 12 === 0 ? 12 : hour % 12;
    return `${formattedH}:${m || '00'} ${ampm}`;
  },

  getEmptyStateHtml() {
    return `
      <div class="py-16 text-center bg-white dark:bg-slate-800 rounded-2xl border border-dashed border-slate-300 dark:border-slate-700 p-8">
        <div class="text-3xl mb-3">📅</div>
        <h3 class="text-base font-bold text-slate-800 dark:text-white">No workshops scheduled</h3>
        <p class="text-xs text-slate-500 max-w-sm mx-auto mt-1 mb-4">
          Add a workshop using the form, or paste your Google Form confirmation / screenshot!
        </p>
        <div class="flex justify-center gap-2">
          <button data-action="open-add-modal" class="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow transition">
            + Insert Programme
          </button>
          <button data-action="open-smart-parse" class="px-3.5 py-2 bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs font-bold rounded-xl transition">
            📋 Smart Ingest
          </button>
        </div>
      </div>
    `;
  },

  // Web Share Target handler (Text & Shared Screenshot Files)
  checkSharedTargetUrl() {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const sharedText = params.get('share_text') || params.get('share_title') || params.get('share_url');
    if (sharedText) {
      window.history.replaceState({}, document.title, window.location.pathname);
      this.openSmartParseModal();
      const input = document.getElementById('smart-parse-text-input');
      if (input) input.value = sharedText;
    }

    if (params.get('shared_image') === '1') {
      window.history.replaceState({}, document.title, window.location.pathname);
      if ('caches' in window) {
        caches.open('workshophub-shared-files').then(cache => {
          cache.match('last-shared-image').then(res => {
            if (res) {
              res.blob().then(blob => {
                const file = new File([blob], 'shared_screenshot.png', { type: blob.type || 'image/png' });
                if (window.stageImageFile) {
                  window.stageImageFile(file);
                }
              });
            }
          });
        });
      }
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = UI;
}
