/**
 * WorkshopHub AI Module
 * Supports Bring-Your-Own Gemini API Key (Multimodal Vision & Text) + Chrome On-Device AI (window.ai)
 * Privacy: API keys are stored only in client localStorage and sent directly to Google via HTTPS header.
 */

const AI = {
  // Check available AI engines
  async getCapabilities() {
    const geminiKey = Store.getSetting('geminiApiKey');
    let hasChromeAi = false;
    try {
      if (typeof window !== 'undefined' && (window.ai?.languageModel || window.ai?.assistant)) {
        hasChromeAi = true;
      }
    } catch (e) {
      hasChromeAi = false;
    }

    return {
      hasGeminiKey: Boolean(geminiKey && geminiKey.trim().length > 10),
      hasChromeAi: hasChromeAi,
      activeEngine: (geminiKey && geminiKey.trim().length > 10) ? 'gemini' : (hasChromeAi ? 'chrome' : 'offline')
    };
  },

  // 1. Multimodal or Text Extraction with Gemini / Chrome AI
  async extractEventDetails({ text = '', imageBase64 = null, mimeType = 'image/png' }) {
    const caps = await this.getCapabilities();

    // Strategy 1: Gemini API (Cloud, full multimodal, high accuracy)
    if (caps.hasGeminiKey) {
      try {
        return await this.extractWithGemini({ text, imageBase64, mimeType });
      } catch (err) {
        console.warn('Gemini API extraction failed, attempting fallbacks:', err);
        // If it was text-only and Gemini failed, try Chrome AI or offline parser
        if (!imageBase64 && caps.hasChromeAi) {
          return await this.extractWithChromeAi(text);
        }
        return Parser.parse(text);
      }
    }

    // Strategy 2: Chrome On-Device AI (text only)
    if (caps.hasChromeAi && text) {
      try {
        return await this.extractWithChromeAi(text);
      } catch (err) {
        console.warn('Chrome on-device AI failed:', err);
      }
    }

    // Strategy 3: Offline heuristic parser
    return Parser.parse(text);
  },

  async extractWithGemini({ text, imageBase64, mimeType }) {
    const apiKey = Store.getSetting('geminiApiKey');
    const model = Store.getSetting('aiModel') || 'gemini-2.0-flash';
    const now = new Date();
    const todayStr = now.toISOString().split('T')[0];
    const userTz = Store.getSetting('userTimezone');

    const promptText = `
You are an intelligent calendar and workshop assistant.
Analyze the following event announcement, confirmation email, or registration receipt.
Current date reference: ${todayStr} (Timezone: ${userTz}).
Extract structured workshop/programme details. Return ONLY valid JSON adhering strictly to this schema:

{
  "title": "Clear workshop name",
  "organizer": "Host organization or speaker name",
  "category": "One of: AI & Data, Web & Software, Career & Professional, Cloud & DevOps, Design & UI/UX, Academic & Research, Other",
  "mode": "online or in-person",
  "date": "YYYY-MM-DD (must be 4-digit year, 2-digit month, 2-digit day)",
  "startTime": "HH:MM in 24-hour format (e.g. 14:00, 09:30)",
  "endTime": "HH:MM in 24-hour format (e.g. 16:30, 12:00)",
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
          mime_type: mimeType,
          data: imageBase64
        }
      });
    }

    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey // Secure header: not in URL query string
      },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: parts }],
        generationConfig: {
          responseMimeType: 'application/json',
          temperature: 0.1
        }
      })
    });

    if (!response.ok) {
      const errBody = await response.text();
      throw new Error(`Gemini API error (${response.status}): ${errBody}`);
    }

    const data = await response.json();
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
    const apiKey = Store.getSetting('geminiApiKey');

    // Prepare a compact, sanitized view of the user's events
    const sanitizedSchedule = events.map(e => ({
      title: e.title,
      organizer: e.organizer,
      category: e.category,
      mode: e.mode,
      date: e.date,
      startTime: e.startTime,
      endTime: e.endTime,
      venue: e.venue,
      status: e.status,
      description: e.description,
      notes: e.notes
    }));

    const systemPrompt = `You are a helpful workshop & programme schedule assistant.
Current date: ${new Date().toISOString().split('T')[0]}.
Here is the user's schedule of registered events (JSON format):
${JSON.stringify(sanitizedSchedule, null, 2)}

User Question: "${userQuery}"
Provide a clear, friendly, and concise response answering their question accurately based on the schedule above. If there are conflicts or missing details, highlight them politely.`;

    if (caps.hasGeminiKey) {
      const model = Store.getSetting('aiModel') || 'gemini-2.0-flash';
      const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-goog-api-key': apiKey
        },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: systemPrompt }] }],
          generationConfig: { temperature: 0.2 }
        })
      });

      if (!response.ok) {
        throw new Error(`Gemini error: ${response.status}`);
      }
      const data = await response.json();
      return data.candidates?.[0]?.content?.parts?.[0]?.text || 'No response generated.';
    }

    // Heuristic offline fallback if no API key
    return this.offlineScheduleSearch(userQuery, events);
  },

  offlineScheduleSearch(query, events) {
    const q = query.toLowerCase();
    const matches = events.filter(e =>
      e.title.toLowerCase().includes(q) ||
      (e.venue && e.venue.toLowerCase().includes(q)) ||
      (e.category && e.category.toLowerCase().includes(q)) ||
      (e.organizer && e.organizer.toLowerCase().includes(q))
    );

    if (matches.length === 0) {
      return `(Offline Search) I couldn't find any events matching "${query}". Tip: Set your free Gemini API key in Settings for smart natural language queries!`;
    }

    return `(Offline Search) Found ${matches.length} matching event(s):\n` +
      matches.map(m => `• **${m.title}** on ${m.date} at ${m.startTime || 'TBD'} (${m.mode === 'online' ? 'Online' : m.venue || 'In-person'})`).join('\n');
  },

  sanitizeExtractedEvent(data) {
    return {
      title: data.title || '',
      organizer: data.organizer || '',
      category: data.category || 'Other',
      mode: data.mode === 'in-person' ? 'in-person' : 'online',
      date: data.date || '',
      startTime: data.startTime || '',
      endTime: data.endTime || '',
      venue: data.venue || '',
      meetingLink: Safe.safeUrl(data.meetingLink || ''),
      passcode: data.passcode || '',
      description: data.description || '',
      formLink: Safe.safeUrl(data.formLink || ''),
      materialsLink: Safe.safeUrl(data.materialsLink || ''),
      notes: Array.isArray(data.checklist) ? data.checklist.join('; ') : (data.notes || ''),
      checklist: Array.isArray(data.checklist) ? data.checklist : []
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = AI;
}
