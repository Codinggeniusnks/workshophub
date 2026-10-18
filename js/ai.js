/**
 * WorkshopHub AI Module
 * Supports Bring-Your-Own Gemini API Key (Multimodal Vision & Text) + Chrome On-Device AI (window.ai)
 * Privacy: API keys are stored only in client localStorage and sent directly to Google via HTTPS header.
 */

const AI = {
  // Check available AI engines
  async getCapabilities() {
    const rawKey = (typeof Store !== 'undefined' && Store.getSetting) ? Store.getSetting('geminiApiKey') : '';
    const geminiKey = (rawKey || '').trim().replace(/^["']|["']$/g, '');
    let hasChromeAi = false;
    try {
      if (typeof window !== 'undefined' && (window.ai?.languageModel || window.ai?.assistant)) {
        hasChromeAi = true;
      }
    } catch (e) {
      hasChromeAi = false;
    }

    // Google API keys are at least 25 characters and start with AIza
    const isValidKeyFormat = Boolean(geminiKey && geminiKey.length >= 25 && geminiKey.startsWith('AIza'));

    return {
      hasGeminiKey: isValidKeyFormat,
      apiKey: geminiKey,
      hasChromeAi: hasChromeAi,
      activeEngine: isValidKeyFormat ? 'gemini' : (hasChromeAi ? 'chrome' : 'offline')
    };
  },

  async testApiKey(apiKey) {
    const key = (apiKey || '').trim().replace(/^["']|["']$/g, '');
    if (!key) {
      return { ok: false, message: 'No API key entered. WorkshopHub will run in 100% private offline mode.' };
    }
    let model = ((typeof Store !== 'undefined' && Store.getSetting) ? Store.getSetting('aiModel') : null) || 'gemini-3.8-flash';
    if (model === 'gemini-2.0-flash') model = 'gemini-3.8-flash';
    try {
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(key)}`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: 'Ping' }] }],
          generationConfig: { maxOutputTokens: 5 }
        })
      });
      const rawText = await response.text();
      if (!response.ok) {
        let msg = `Google API Error (${response.status})`;
        try {
          const errObj = JSON.parse(rawText);
          if (errObj.error?.message) msg = errObj.error.message;
        } catch (e) {}
        return { ok: false, message: msg };
      }
      return { ok: true, message: 'Connected to Gemini API successfully!' };
    } catch (e) {
      return { ok: false, message: e.message || 'Network request failed' };
    }
  },

  // 1. Multimodal or Text Extraction with Gemini / Chrome AI / Local OCR / Cloud OCR
  async extractEventDetails({ text = '', imageBase64 = null, mimeType = 'image/png' }, onProgress = null) {
    const caps = await this.getCapabilities();

    // Strategy 1: Gemini Multimodal Vision API (if API key is present)
    if (caps.hasGeminiKey) {
      try {
        if (onProgress) onProgress('🤖 Analyzing with Gemini Multimodal Vision...');
        return await this.extractWithGemini({ text, imageBase64, mimeType });
      } catch (err) {
        console.warn('Gemini vision API failed, falling back to local OCR:', err);
        if (typeof UI !== 'undefined' && UI.showToast) {
          UI.showToast(`Gemini note: ${err.message}. Trying built-in OCR...`);
        }
      }
    }

    // Strategy 2: Client-side High-Accuracy OCR (Tesseract.js)
    if (imageBase64 && typeof Tesseract !== 'undefined') {
      try {
        if (onProgress) onProgress('👁️ Initializing built-in OCR...');
        const imageSrc = `data:${mimeType};base64,${imageBase64}`;
        const ocrResult = await Tesseract.recognize(imageSrc, 'eng', {
          logger: m => {
            if (onProgress && m.status) {
              const pct = typeof m.progress === 'number' ? ` (${Math.round(m.progress * 100)}%)` : '';
              onProgress(`👁️ ${m.status}${pct}`);
            }
          }
        });
        const ocrText = (ocrResult.data && ocrResult.data.text) ? ocrResult.data.text : '';
        if (ocrText && ocrText.trim().length > 5) {
          const combined = text ? `${text}\n\n${ocrText}` : ocrText;
          if (caps.hasChromeAi) {
            try {
              return await this.extractWithChromeAi(combined);
            } catch (e) {
              console.warn('Chrome AI fallback failed:', e);
            }
          }
          return Parser.parse(combined);
        }
      } catch (ocrErr) {
        console.warn('Local OCR failed, trying cloud fallback:', ocrErr);
      }
    }

    // Strategy 3: Fast Cloud OCR fallback (free tier)
    if (imageBase64) {
      try {
        if (onProgress) onProgress('🌐 Trying Cloud OCR engine...');
        const formData = new FormData();
        formData.append('base64Image', `data:${mimeType};base64,${imageBase64}`);
        formData.append('apikey', 'helloworld');
        formData.append('language', 'eng');
        formData.append('OCREngine', '2');
        const ocrRes = await fetch('https://api.ocr.space/parse/image', {
          method: 'POST',
          body: formData
        });
        if (ocrRes.ok) {
          const json = await ocrRes.json();
          const parsed = json.ParsedResults?.[0]?.ParsedText;
          if (parsed && parsed.trim().length > 5) {
            const combined = text ? `${text}\n\n${parsed}` : parsed;
            return Parser.parse(combined);
          }
        }
      } catch (cloudErr) {
        console.warn('Cloud OCR unavailable:', cloudErr);
      }
    }

    // Strategy 4: Chrome On-Device AI (text only)
    if (caps.hasChromeAi && text) {
      try {
        return await this.extractWithChromeAi(text);
      } catch (err) {
        console.warn('Chrome on-device AI failed:', err);
      }
    }

    // Strategy 5: Offline heuristic parser
    if (text && text.trim().length > 0) {
      return Parser.parse(text);
    }

    // If only an image was submitted and no engine was able to extract text:
    const emptyResult = Parser.parse('');
    if (imageBase64) {
      emptyResult._noTextDetected = true;
    }
    return emptyResult;
  },

  async extractWithGemini({ text, imageBase64, mimeType }) {
    const apiKey = Store.getSetting('geminiApiKey');
    let model = ((typeof Store !== 'undefined' && Store.getSetting) ? Store.getSetting('aiModel') : null) || 'gemini-3.8-flash';
    if (model === 'gemini-2.0-flash') model = 'gemini-3.8-flash';
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const userTz = Store.getSetting('userTimezone') || 'UTC';

    const promptText = `
You are an intelligent calendar and workshop assistant.
Analyze the following event announcement, confirmation email, poster flyer, or registration receipt.
Current date reference: ${todayStr} (Timezone: ${userTz}).
Extract structured workshop/programme details. Return ONLY valid JSON adhering strictly to this schema:

{
  "title": "Clear workshop or event name",
  "organizer": "Host organization or speaker name",
  "category": "One of: AI & Data, Web & Software, Career & Professional, Cloud & DevOps, Design & UI/UX, Academic & Research, Other",
  "mode": "online or in-person",
  "date": "YYYY-MM-DD (must be 4-digit year, 2-digit month, 2-digit day)",
  "startTime": "HH:MM in 24-hour format (e.g. 13:30, 09:30)",
  "endTime": "HH:MM in 24-hour format (e.g. 17:00, 12:00)",
  "venue": "Meeting platform name (Google Meet / Zoom / MS Teams) OR physical room / building address",
  "meetingLink": "URL to join if online (e.g. meet.google.com/..., zoom.us/j/...), or empty string",
  "passcode": "Meeting password/PIN if present, or empty string",
  "description": "Concise 1-2 sentence summary of what this workshop covers",
  "formLink": "URL to registration form or confirmation ticket, or empty string",
  "materialsLink": "URL to slides, drive, or repo if present, or empty string",
  "checklist": ["prerequisite 1", "prerequisite 2"]
}
`;

    const parts = [{ text: promptText }];
    if (text) {
      parts.push({ text: `\nInput text to extract from:\n${text}` });
    }
    if (imageBase64) {
      parts.push({
        inline_data: {
          mime_type: mimeType || 'image/png',
          data: imageBase64
        }
      });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      })
    });

    const rawBody = await response.text();

    if (!response.ok) {
      let msg = `Gemini API error (${response.status})`;
      try {
        const parsedErr = JSON.parse(rawBody);
        if (parsedErr.error?.message) msg = parsedErr.error.message;
      } catch (e) {}
      throw new Error(msg);
    }

    if (!rawBody.trim().startsWith('{')) {
      throw new Error('Received unexpected non-JSON response from Gemini endpoint.');
    }

    const data = JSON.parse(rawBody);
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!candidateText) {
      throw new Error('Gemini returned an empty response.');
    }

    const parsedJson = JSON.parse(candidateText);
    return this.sanitizeExtractedEvent(parsedJson);
  },

  async extractWithChromeAi(text) {
    let session;
    if (window.ai?.languageModel) {
      session = await window.ai.languageModel.create();
    } else if (window.ai?.assistant) {
      session = await window.ai.assistant.create();
    } else {
      throw new Error('Chrome AI not ready');
    }

    const prompt = `Extract JSON event details with keys: title, organizer, category, mode (online/in-person), date (YYYY-MM-DD), startTime (HH:MM), endTime (HH:MM), venue, meetingLink, description.\nText:\n${text}`;
    const resultText = await session.prompt(prompt);
    session.destroy();

    const jsonMatch = resultText.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      return this.sanitizeExtractedEvent(JSON.parse(jsonMatch[0]));
    }
    return Parser.parse(text);
  },

  // 2. "Ask Your Schedule" Natural Language Querying
  async askSchedule(userQuery, events) {
    const caps = await this.getCapabilities();
    const apiKey = (typeof Store !== 'undefined' && Store.getSetting) ? (Store.getSetting('geminiApiKey') || '').trim() : '';

    if (caps.hasGeminiKey) {
      try {
        let model = ((typeof Store !== 'undefined' && Store.getSetting) ? Store.getSetting('aiModel') : null) || 'gemini-3.8-flash';
        if (model === 'gemini-2.0-flash') model = 'gemini-3.8-flash';

        // Prepare a compact, sanitized view of the user's events
        const sanitizedSchedule = (events || []).map(e => ({
          title: e.title,
          organizer: e.organizer,
          category: e.category,
          mode: e.mode,
          date: e.date,
          startTime: e.startTime,
          endTime: e.endTime,
          venue: e.venue,
          meetingLink: e.meetingLink,
          status: e.status,
          description: e.description,
          notes: e.notes,
          checklist: e.checklist || []
        }));

        const systemPrompt = `You are a helpful workshop & programme schedule assistant.
Current date: ${new Date().toISOString().split('T')[0]}.
Here is the user's schedule of registered events (JSON format):
${JSON.stringify(sanitizedSchedule, null, 2)}

User Question: "${userQuery}"
Provide a clear, friendly, and concise response answering their question accurately based on the schedule above. If they ask about preparation, tools, checklist, materials, or links, extract those specific details from their events. If there are conflicts or missing details, highlight them politely.`;

        // Pass API key via query parameter (?key=...) to avoid CORS preflight failures on mobile devices
        const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent?key=${encodeURIComponent(apiKey)}`;
        const response = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
            generationConfig: { temperature: 0.2 }
          })
        });

        const rawText = await response.text();

        if (!response.ok) {
          let errorMsg = `Gemini API error (${response.status})`;
          try {
            const errObj = JSON.parse(rawText);
            if (errObj.error?.message) errorMsg = errObj.error.message;
          } catch (e) {}
          throw new Error(errorMsg);
        }

        if (!rawText.trim().startsWith('{')) {
          throw new Error('Received unexpected non-JSON response from server.');
        }

        const data = JSON.parse(rawText);
        const reply = data.candidates?.[0]?.content?.parts?.[0]?.text;
        if (reply && reply.trim()) {
          return reply.trim();
        }
        return 'No response generated from AI.';
      } catch (geminiErr) {
        console.warn('Gemini chat request failed, falling back to local schedule search:', geminiErr);
        const offlineResult = this.offlineScheduleSearch(userQuery, events);
        return `⚠️ Notice: Gemini API was unavailable (${geminiErr.message}).\n\n📱 Local schedule answer:\n\n${offlineResult}`;
      }
    }

    // Heuristic offline fallback if no API key
    return this.offlineScheduleSearch(userQuery, events);
  },

  offlineScheduleSearch(query, events) {
    if (!events || events.length === 0) {
      return "You don't have any registered workshops or programmes yet.\n\nTip: Click '+ Add Programme' or paste an event poster screenshot in 'Quick Paste' to add your first session!";
    }

    const q = (query || '').toLowerCase().trim();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];

    // Chronologically sorted events
    const sortedEvents = events.slice().sort((a, b) => {
      const dtA = (a.date || '') + 'T' + (a.startTime || '00:00');
      const dtB = (b.date || '') + 'T' + (b.startTime || '00:00');
      return dtA.localeCompare(dtB);
    });
    const upcomingEvents = sortedEvents.filter(e => e.date >= todayStr);
    const activePool = upcomingEvents.length > 0 ? upcomingEvents : sortedEvents;

    // Detect if user asks specifically about "next session", "next workshop", "upcoming event"
    const isNextOnly = ['next session', 'next workshop', 'next event', 'next programme', 'my next', 'next upcoming', 'first upcoming'].some(k => q.includes(k));

    // Helper: calculate start and end of current week (Monday to Sunday)
    const dayOfWeek = today.getDay(); // 0 is Sunday, 1 is Monday...
    const mondayOffset = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
    const monday = new Date(today);
    monday.setDate(today.getDate() + mondayOffset);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    const mondayStr = monday.toISOString().split('T')[0];
    const sundayStr = sunday.toISOString().split('T')[0];

    // Helper: format event for display
    const formatEvent = (e) => {
      const timeStr = e.startTime ? (e.endTime ? `${e.startTime} - ${e.endTime}` : e.startTime) : 'Time TBD';
      const locStr = e.mode === 'online' ? (e.meetingLink ? `Online (${e.meetingLink})` : 'Online') : (e.venue || 'In-person');
      let out = `• **${e.title}**\n  📅 Date: ${e.date} | ⏰ ${timeStr}\n  📍 Location: ${locStr}`;
      if (e.organizer) out += `\n  👤 Organizer: ${e.organizer}`;
      if (e.status && e.status !== 'confirmed') out += `\n  🏷️ Status: ${e.status.toUpperCase()}`;
      return out;
    };

    // 1. Conflict / Overlap queries
    if (q.includes('conflict') || q.includes('clash') || q.includes('overlap')) {
      const org = (typeof Organiser !== 'undefined') ? Organiser : (typeof require !== 'undefined' ? require('./organiser.js') : null);
      if (org && org.detectConflicts) {
        const conflicts = org.detectConflicts(events);
        const conflictKeys = Object.keys(conflicts);
        if (conflictKeys.length === 0) {
          return "✅ Great news! No schedule conflicts or time overlaps were detected in your registered programmes.";
        }
        let conflictMsg = `⚠️ Found ${conflictKeys.length} schedule conflict(s):\n\n`;
        const reportedPairs = new Set();
        conflictKeys.forEach(id => {
          const ev = events.find(x => x.id === id);
          if (!ev) return;
          (conflicts[id] || []).forEach(clashEv => {
            const pairKey = [ev.id, clashEv.id].sort().join('_');
            if (!reportedPairs.has(pairKey)) {
              reportedPairs.add(pairKey);
              conflictMsg += `• **${ev.title}** (${ev.date} ${ev.startTime || ''}) clashes with **${clashEv.title}** (${clashEv.date} ${clashEv.startTime || ''})\n`;
            }
          });
        });
        return conflictMsg.trim();
      }
    }

    // 2. Links, Passcode & Online Joining queries
    const isLinkQuery = ['link', 'passcode', 'password', 'zoom', 'meet', 'teams', 'join', 'how to join', 'url'].some(k => q.includes(k));
    if (isLinkQuery) {
      const targetList = isNextOnly ? [activePool[0]] : activePool.slice(0, 5);
      let out = isNextOnly ? `🔗 **Online Joining Details for Your Next Session:**\n\n` : `🔗 **Meeting Links & Access Details for Upcoming Sessions:**\n\n`;

      targetList.forEach(ev => {
        const timeStr = ev.startTime ? (ev.endTime ? `${ev.startTime} - ${ev.endTime}` : ev.startTime) : 'Time TBD';
        out += `• **${ev.title}** (${ev.date} at ${timeStr})\n`;
        if (ev.mode === 'online') {
          if (ev.meetingLink) {
            out += `  🔗 **Meeting Link:** ${ev.meetingLink}\n`;
            out += `  🔑 **Passcode:** ${ev.passcode || 'None required'}\n`;
            out += `  💻 **Platform:** ${ev.venue || 'Google Meet / Zoom'}\n`;
          } else {
            out += `  📍 **Format:** Online\n`;
            out += `  ⚠️ **No meeting link or passcode has been saved for this workshop yet.**\n`;
            out += `  💡 *Tip: Check your confirmation email from the organizer, or click "Edit" on this workshop card to paste the Zoom/Google Meet link!*\n`;
          }
        } else {
          out += `  🏢 **Format:** In-Person (This is not held online)\n`;
          out += `  📍 **Physical Venue:** ${ev.venue || 'Hall / Address TBD'}\n`;
        }
        out += `\n`;
      });
      return out.trim();
    }

    // 3. Preparation, Checklist, Tools, Materials queries
    const isPrepQuery = ['prep', 'tool', 'checklist', 'material', 'bring', 'equipment', 'require', 'prerequisite'].some(k => q.includes(k));
    if (isPrepQuery) {
      const targetList = isNextOnly ? [activePool[0]] : activePool.slice(0, 5);
      let prepMsg = isNextOnly ? `📋 **Preparation & Tools for Your Next Session:**\n\n` : `📋 **Preparation & Tools for Upcoming Sessions:**\n\n`;

      targetList.forEach(e => {
        prepMsg += `• **${e.title}** (${e.date} at ${e.startTime || 'TBD'})\n`;
        prepMsg += `  📍 Location: ${e.mode === 'online' ? 'Online' : (e.venue || 'In-person')}\n`;

        let hasItem = false;
        if (e.mode === 'online' && e.meetingLink) {
          prepMsg += `  🔗 Join Link: ${e.meetingLink}\n`;
          if (e.passcode) prepMsg += `  🔑 Passcode: ${e.passcode}\n`;
          hasItem = true;
        }
        if (Array.isArray(e.checklist) && e.checklist.length > 0) {
          prepMsg += `  ✅ Checklist / Tools:\n`;
          e.checklist.forEach(item => { prepMsg += `     - ${item}\n`; });
          hasItem = true;
        }
        if (e.materialsLink) {
          prepMsg += `  📁 Materials / Slides: ${e.materialsLink}\n`;
          hasItem = true;
        }
        if (e.notes) {
          prepMsg += `  📝 Notes: ${e.notes}\n`;
          hasItem = true;
        }
        if (!hasItem) {
          prepMsg += `  ℹ️ No special equipment or notes recorded yet. Keep your confirmation email handy!\n`;
        }
        prepMsg += `\n`;
      });

      return prepMsg.trim();
    }

    // 4. Physical Venue & Travel queries
    const isVenueQuery = ['where', 'location', 'venue', 'travel', 'address', 'hall', 'room', 'in-person'].some(k => q.includes(k));
    if (isVenueQuery) {
      const targetList = isNextOnly ? [activePool[0]] : activePool.slice(0, 5);
      let out = isNextOnly ? `📍 **Location Details for Your Next Session:**\n\n` : `📍 **Venue & Location Details:**\n\n`;
      targetList.forEach(e => {
        out += `• **${e.title}** (${e.date} at ${e.startTime || 'TBD'})\n`;
        if (e.mode === 'online') {
          out += `  🌐 Online event: ${e.meetingLink ? e.meetingLink : 'Meeting link pending'}\n`;
        } else {
          out += `  🏢 Physical Venue: **${e.venue || 'Address TBD'}** (Requires travel)\n`;
        }
        out += `\n`;
      });
      return out.trim();
    }

    // 5. "next session" / "my next" standalone query
    if (isNextOnly) {
      const nextEvent = activePool[0];
      return `📅 **Your Next Upcoming Session:**\n\n${formatEvent(nextEvent)}`;
    }

    // 6. Time-scoped queries: "this week"
    if (q.includes('this week') || q.includes('week')) {
      const thisWeekEvents = events.filter(e => e.date >= mondayStr && e.date <= sundayStr)
        .sort((a, b) => a.date.localeCompare(b.date));
      if (thisWeekEvents.length === 0) {
        const nextEvent = events.filter(e => e.date > sundayStr).sort((a, b) => a.date.localeCompare(b.date))[0];
        let reply = `📅 You have no workshops scheduled for this week (${mondayStr} to ${sundayStr}).`;
        if (nextEvent) {
          reply += `\n\nYour next upcoming session is:\n${formatEvent(nextEvent)}`;
        }
        return reply;
      }
      return `📅 **Workshops & Programmes This Week (${mondayStr} to ${sundayStr}):**\n\n` +
        thisWeekEvents.map(formatEvent).join('\n\n');
    }

    // 7. "today"
    if (q.includes('today')) {
      const todayEvents = events.filter(e => e.date === todayStr);
      if (todayEvents.length === 0) {
        return `📅 You have no workshops scheduled for today (${todayStr}). Enjoy your day!`;
      }
      return `📅 **Workshops Scheduled for Today (${todayStr}):**\n\n` +
        todayEvents.map(formatEvent).join('\n\n');
    }

    // 8. "tomorrow"
    if (q.includes('tomorrow')) {
      const tomorrow = new Date(today);
      tomorrow.setDate(today.getDate() + 1);
      const tomorrowStr = tomorrow.toISOString().split('T')[0];
      const tomorrowEvents = events.filter(e => e.date === tomorrowStr);
      if (tomorrowEvents.length === 0) {
        return `📅 You have no workshops scheduled for tomorrow (${tomorrowStr}).`;
      }
      return `📅 **Workshops Scheduled for Tomorrow (${tomorrowStr}):**\n\n` +
        tomorrowEvents.map(formatEvent).join('\n\n');
    }

    // 9. "upcoming", "what workshop", "sessions", "schedule", "all"
    if (q.includes('upcoming') || q.includes('what workshop') || q.includes('sessions') || q.includes('schedule') || q.includes('all')) {
      return `📅 **Your Registered Programme Schedule:**\n\n` +
        activePool.slice(0, 7).map(formatEvent).join('\n\n') +
        (activePool.length > 7 ? `\n\n... and ${activePool.length - 7} more session(s).` : '');
    }

    // 10. Keyword matching
    const stopWords = new Set(['what', 'which', 'when', 'where', 'how', 'give', 'me', 'the', 'a', 'an', 'and', 'or', 'for', 'to', 'in', 'on', 'at', 'is', 'are', 'my', 'do', 'i', 'have', 'any']);
    const tokens = q.split(/\s+/).map(t => t.replace(/[^a-z0-9]/g, '')).filter(t => t.length > 2 && !stopWords.has(t));

    const matches = events.filter(e => {
      const haystack = `${e.title} ${e.organizer || ''} ${e.category || ''} ${e.venue || ''} ${e.description || ''} ${e.notes || ''}`.toLowerCase();
      return tokens.some(tok => haystack.includes(tok));
    });

    if (matches.length > 0) {
      return `🔍 Found ${matches.length} matching event(s) for your query:\n\n` +
        matches.map(formatEvent).join('\n\n');
    }

    return `I couldn't find a direct match for "${query}".\n\nHere is your next upcoming session:\n\n${formatEvent(activePool[0])}`;
  },

  sanitizeExtractedEvent(data) {
    const safeUrl = (u) => (typeof Safe !== 'undefined' && Safe.safeUrl) ? Safe.safeUrl(u) : ((typeof require !== 'undefined') ? require('./safe.js').safeUrl(u) : (u || ''));
    return {
      title: data.title || '',
      organizer: data.organizer || '',
      category: data.category || 'Other',
      mode: data.mode === 'in-person' ? 'in-person' : 'online',
      date: data.date || '',
      startTime: data.startTime || '',
      endTime: data.endTime || '',
      venue: data.venue || '',
      meetingLink: safeUrl(data.meetingLink || ''),
      passcode: data.passcode || '',
      description: data.description || '',
      formLink: safeUrl(data.formLink || ''),
      materialsLink: safeUrl(data.materialsLink || ''),
      notes: Array.isArray(data.checklist) ? data.checklist.join('; ') : (data.notes || ''),
      checklist: Array.isArray(data.checklist) ? data.checklist : []
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AI;
}
