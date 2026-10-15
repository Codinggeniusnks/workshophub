/**
 * WorkshopHub Offline Regex Parser
 * Fast, offline, deterministic text extraction from Google Form receipts and emails.
 */

const Parser = {
  parse(rawText) {
    if (!rawText || typeof rawText !== 'string') {
      return this.emptyResult();
    }

    const text = rawText.trim();
    const result = this.emptyResult();
    result.description = text.slice(0, 500);

    // 1. Detect Meeting Links & Venue
    const meetMatch = text.match(/https?:\/\/meet\.google\.com\/[a-z0-9\-]+/i);
    const zoomMatch = text.match(/https?:\/\/[a-z0-9\-.]*zoom\.us\/j\/[0-9?=\w\-]+/i);
    const teamsMatch = text.match(/https?:\/\/teams\.microsoft\.com\/[^\s"')]+/i);
    const formMatch = text.match(/https?:\/\/forms\.gle\/[a-zA-Z0-9_\-]+/i) || text.match(/https?:\/\/docs\.google\.com\/forms\/[^\s"')]+/i);
    const driveMatch = text.match(/https?:\/\/(?:drive\.google\.com|github\.com|figma\.com)\/[^\s"')]+/i);

    if (meetMatch) {
      result.meetingLink = meetMatch[0];
      result.venue = 'Google Meet';
      result.mode = 'online';
    } else if (zoomMatch) {
      result.meetingLink = zoomMatch[0];
      result.venue = 'Zoom Meeting';
      result.mode = 'online';
    } else if (teamsMatch) {
      result.meetingLink = teamsMatch[0];
      result.venue = 'Microsoft Teams';
      result.mode = 'online';
    }

    if (formMatch) {
      result.formLink = formMatch[0];
    }
    if (driveMatch) {
      result.materialsLink = driveMatch[0];
    }

    // 2. Passcode / Meeting ID
    const passcodeMatch = text.match(/(?:passcode|password|pin|code)\s*[:=]\s*([a-zA-Z0-9_\-]+)/i);
    if (passcodeMatch) {
      result.passcode = passcodeMatch[1];
    }

    // 3. Physical Venue (if no online link detected, check for keywords)
    if (!result.meetingLink) {
      const venueMatch = text.match(/(?:venue|location|address|held at|place)\s*[:=]\s*([^\n\r]+)/i);
      if (venueMatch) {
        result.venue = venueMatch[1].trim();
        result.mode = 'in-person';
      }
    }

    // 4. Dates
    // YYYY-MM-DD
    const isoDateMatch = text.match(/\b(20\d{2})[-/](0[1-9]|1[0-2])[-/](0[1-9]|[12]\d|3[01])\b/);
    // DD/MM/YYYY
    const dmyMatch = text.match(/\b(0[1-9]|[12]\d|3[01])[-/](0[1-9]|1[0-2])[-/](20\d{2})\b/);
    // Month Day, Year or Day Month Year
    const textDateMatch = text.match(/\b([A-Z][a-z]+)\s+([0-9]{1,2})(?:st|nd|rd|th)?,?\s+(20\d{2})\b/) ||
                          text.match(/\b([0-9]{1,2})(?:st|nd|rd|th)?\s+([A-Z][a-z]+),?\s+(20\d{2})\b/);

    if (isoDateMatch) {
      result.date = `${isoDateMatch[1]}-${isoDateMatch[2]}-${isoDateMatch[3]}`;
    } else if (dmyMatch) {
      result.date = `${dmyMatch[3]}-${dmyMatch[2]}-${dmyMatch[1]}`;
    } else if (textDateMatch) {
      const monthNames = ["january","february","march","april","may","june","july","august","september","october","november","december"];
      let monthStr = textDateMatch[1];
      let dayStr = textDateMatch[2];
      let yearStr = textDateMatch[3];

      // If pattern was Day Month Year
      if (/^\d+$/.test(monthStr)) {
        dayStr = textDateMatch[1];
        monthStr = textDateMatch[2];
      }

      const mIndex = monthNames.indexOf(monthStr.toLowerCase());
      if (mIndex !== -1) {
        const mm = String(mIndex + 1).padStart(2, '0');
        const dd = String(dayStr).padStart(2, '0');
        result.date = `${yearStr}-${mm}-${dd}`;
      }
    }

    // 5. Time extraction (ranges & single times)
    const timeRangeMatch = text.match(/\b([0-1]?[0-9]|2[0-3]):([0-5][0-9])\s*(AM|PM)?\s*(?:-|–|to)\s*([0-1]?[0-9]|2[0-3]):([0-5][0-9])\s*(AM|PM)?\b/i);
    if (timeRangeMatch) {
      result.startTime = this.convertTo24h(timeRangeMatch[1], timeRangeMatch[2], timeRangeMatch[3] || timeRangeMatch[6]);
      result.endTime = this.convertTo24h(timeRangeMatch[4], timeRangeMatch[5], timeRangeMatch[6]);
    } else {
      const singleTime = text.match(/\b([0-1]?[0-9]|2[0-3]):([0-5][0-9])\s*(AM|PM)?\b/i);
      if (singleTime) {
        result.startTime = this.convertTo24h(singleTime[1], singleTime[2], singleTime[3]);
      }
    }

    // 6. Title heuristic
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 3);
    for (const line of lines) {
      // Exclude greeting lines, URLs, dates
      if (!/^(dear|hi|hello|thank you|regards|sincerely|date|time|venue)/i.test(line) &&
          !line.includes('http') && line.length < 100) {
        result.title = line.replace(/^(workshop|event|programme|webinar|title)\s*[:\-]\s*/i, '');
        break;
      }
    }

    // 7. Auto categorize heuristic
    result.category = this.detectCategory(text);

    return result;
  },

  convertTo24h(hourStr, minStr, ampm) {
    let h = parseInt(hourStr, 10);
    if (ampm) {
      const upper = ampm.toUpperCase();
      if (upper === 'PM' && h < 12) h += 12;
      if (upper === 'AM' && h === 12) h = 0;
    }
    return `${String(h).padStart(2, '0')}:${minStr}`;
  },

  detectCategory(text) {
    const lower = text.toLowerCase();
    if (lower.match(/\b(ai|llm|machine learning|deep learning|chatgpt|gemini|data science|nlp)\b/)) return 'AI & Data';
    if (lower.match(/\b(web|javascript|react|vue|node|frontend|backend|api|fullstack|css|html)\b/)) return 'Web & Software';
    if (lower.match(/\b(cloud|docker|kubernetes|aws|devops|azure|gcp|ci\/cd|terraform)\b/)) return 'Cloud & DevOps';
    if (lower.match(/\b(career|resume|cv|interview|job|linkedin|soft skills|networking)\b/)) return 'Career & Professional';
    if (lower.match(/\b(ui|ux|figma|design|user experience|prototyping)\b/)) return 'Design & UI/UX';
    if (lower.match(/\b(thesis|academic|research|paper|journal|university)\b/)) return 'Academic & Research';
    return 'Other';
  },

  emptyResult() {
    return {
      title: '',
      organizer: '',
      category: 'Other',
      mode: 'online',
      date: '',
      startTime: '',
      endTime: '',
      venue: '',
      meetingLink: '',
      passcode: '',
      description: '',
      formLink: '',
      materialsLink: '',
      notes: ''
    };
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Parser;
}
