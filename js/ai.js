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
    const model = Store.getSetting('aiModel') || 'gemini-2.0-flash';
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

    if (!response.ok) {
      const errBody = await response.text();
      let msg = `Gemini API error (${response.status})`;
      try {
        const parsedErr = JSON.parse(errBody);
        if (parsedErr.error?.message) msg = parsedErr.error.message;
      } catch (e) {}
      throw new Error(msg);
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
