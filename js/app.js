/**
 * WorkshopHub App Bootstrap
 * Initializes storage, registers PWA service worker, binds forms, and handles installations.
 */

document.addEventListener('DOMContentLoaded', () => {
  // 1. Initialize Storage & UI
  UI.init();
  if (typeof DriveSync !== 'undefined') {
    DriveSync.init();
  }

  // 2. Register Service Worker for PWA & offline support
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js')
      .then((reg) => console.log('Service Worker registered with scope:', reg.scope))
      .catch((err) => console.warn('Service Worker registration skipped or failed:', err));
  }

  // 3. PWA Installation Prompt (Android / Chrome Desktop)
  let deferredPrompt;
  const installBanner = document.getElementById('pwa-install-banner');
  const installBtn = document.getElementById('pwa-install-btn');

  window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    if (installBanner) installBanner.classList.remove('hidden');
  });

  if (installBtn) {
    installBtn.addEventListener('click', async () => {
      if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        console.log('PWA installation outcome:', outcome);
        deferredPrompt = null;
        if (installBanner) installBanner.classList.add('hidden');
      }
    });
  }

  // 4. Modal Close Buttons
  document.getElementById('close-event-modal-btn')?.addEventListener('click', () => UI.closeEventModal());
  document.getElementById('cancel-event-modal-btn')?.addEventListener('click', () => UI.closeEventModal());
  document.getElementById('close-smart-modal-btn')?.addEventListener('click', () => UI.closeSmartParseModal());
  document.getElementById('cancel-smart-modal-btn')?.addEventListener('click', () => UI.closeSmartParseModal());
  document.getElementById('close-settings-modal-btn')?.addEventListener('click', () => UI.closeSettingsModal());

  // 5. Insert / Edit Form Submit
  document.getElementById('event-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const id = document.getElementById('form-id').value;

    const eventPayload = {
      id: id || undefined,
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
      status: document.getElementById('form-status').value
    };

    if (id) {
      Store.updateEvent(id, eventPayload);
      UI.showToast('Programme updated successfully!');
    } else {
      Store.addEvent(eventPayload);
      UI.showToast('Programme inserted successfully!');
    }

    UI.closeEventModal();
    UI.refresh();

    if (typeof DriveSync !== 'undefined' && DriveSync.isSignedIn()) {
      DriveSync.sync().catch(err => console.warn('Auto-sync failed:', err));
    }
  });

  // 6. Smart Ingest Submission (Text or Screenshot Image OCR)
  let stagedImageBase64 = null;
  let stagedImageMime = 'image/png';

  function stageImageFile(file) {
    if (!file || !file.type.startsWith('image/')) return;
    stagedImageMime = file.type || 'image/png';
    const reader = new FileReader();
    reader.onload = (evt) => {
      const fullDataUrl = evt.target.result;
      stagedImageBase64 = fullDataUrl.split(',')[1];
      const preview = document.getElementById('smart-image-preview');
      const container = document.getElementById('smart-image-preview-container');
      if (preview && container) {
        preview.src = fullDataUrl;
        container.classList.remove('hidden');
      }
      UI.openSmartParseModal();
      UI.showToast('📸 Screenshot loaded! Tap Extract to auto-fill.');
    };
    reader.readAsDataURL(file);
  }
  window.stageImageFile = stageImageFile;

  const imageInput = document.getElementById('smart-parse-image-input');
  imageInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (file) stageImageFile(file);
  });

  // Global Clipboard Paste Support (Ctrl+V / Paste screenshot anywhere)
  window.addEventListener('paste', (e) => {
    const items = (e.clipboardData || window.clipboardData)?.items;
    if (!items) return;
    for (let i = 0; i < items.length; i++) {
      if (items[i].type.indexOf('image') !== -1) {
        const file = items[i].getAsFile();
        if (file) {
          e.preventDefault();
          stageImageFile(file);
          break;
        }
      }
    }
  });

  // Drag & Drop Screenshot Support
  window.addEventListener('dragover', (e) => e.preventDefault());
  window.addEventListener('drop', (e) => {
    e.preventDefault();
    if (e.dataTransfer && e.dataTransfer.files && e.dataTransfer.files[0]) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('image/')) {
        stageImageFile(file);
      }
    }
  });

  document.getElementById('smart-parse-submit-btn')?.addEventListener('click', async () => {
    const textInput = document.getElementById('smart-parse-text-input').value.trim();
    if (!textInput && !stagedImageBase64) {
      alert('Please paste confirmation text or upload a screenshot first!');
      return;
    }

    const submitBtn = document.getElementById('smart-parse-submit-btn');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML = '🤖 Analyzing details...';
    submitBtn.disabled = true;

    try {
      const extracted = await AI.extractEventDetails({
        text: textInput,
        imageBase64: stagedImageBase64,
        mimeType: stagedImageMime
      }, (status) => {
        submitBtn.innerHTML = status;
      });

      // Populate into Event Modal
      UI.closeSmartParseModal();
      UI.openEventModal(extracted);

      if (extracted._noTextDetected) {
        UI.showToast('⚠️ Could not read text in image. Tip: Add free Gemini key in Settings for AI vision, or type title above!');
      } else if (extracted.title) {
        UI.showToast(`✨ Pre-filled: ${extracted.title}`);
      } else {
        UI.showToast('✨ Details extracted & pre-filled! Review and click Save.');
      }
    } catch (err) {
      alert('Extraction failed: ' + err.message);
    } finally {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      stagedImageBase64 = null;
    }
  });

  // 7. Settings Save & Actions
  document.getElementById('settings-form')?.addEventListener('submit', (e) => {
    e.preventDefault();
    const apiKey = document.getElementById('settings-api-key').value.trim();
    const model = document.getElementById('settings-model').value;
    const tz = document.getElementById('settings-timezone').value;
    const gdriveClientId = document.getElementById('settings-gdrive-client-id')?.value.trim();

    Store.saveSettings({
      geminiApiKey: apiKey,
      aiModel: model,
      userTimezone: tz
    });

    if (typeof DriveSync !== 'undefined') {
      DriveSync.setClientId(gdriveClientId);
      DriveSync.initGis();
    }

    UI.showToast('Settings saved successfully!');
    UI.closeSettingsModal();
    UI.refresh();
  });

  // Google Drive Personal Sync Controls
  document.getElementById('settings-drive-connect-btn')?.addEventListener('click', () => {
    const inputId = document.getElementById('settings-gdrive-client-id')?.value.trim();
    if (inputId && typeof DriveSync !== 'undefined') {
      DriveSync.setClientId(inputId);
      DriveSync.initGis();
    }
    if (typeof DriveSync !== 'undefined') {
      DriveSync.requestSignIn();
    }
  });

  document.getElementById('settings-drive-sync-btn')?.addEventListener('click', async () => {
    if (typeof DriveSync === 'undefined' || !DriveSync.isSignedIn()) {
      alert('Please sign in to Google Drive first using your OAuth Client ID.');
      return;
    }
    await DriveSync.sync();
    UI.showToast('Google Drive synced successfully!');
  });

  document.getElementById('settings-drive-disconnect-btn')?.addEventListener('click', () => {
    if (confirm('Disconnect from Google Drive? Your local events will remain intact.')) {
      if (typeof DriveSync !== 'undefined') {
        DriveSync.signOut();
      }
    }
  });

  // Export JSON (Safe, no leaks)
  document.getElementById('settings-export-json-btn')?.addEventListener('click', () => {
    const jsonStr = Store.exportJson();
    const blob = new Blob([jsonStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workshophub_backup_${new Date().toISOString().split('T')[0]}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    UI.showToast('Backup JSON downloaded safely!');
  });

  // Export CSV
  document.getElementById('settings-export-csv-btn')?.addEventListener('click', () => {
    const events = Store.getEvents();
    if (events.length === 0) {
      alert('No events to export!');
      return;
    }
    const headers = ['Title', 'Organizer', 'Category', 'Mode', 'Date', 'Start Time', 'End Time', 'Venue', 'Meeting Link', 'Passcode', 'Status', 'Description'];
    const rows = events.map(e => [
      `"${(e.title || '').replace(/"/g, '""')}"`,
      `"${(e.organizer || '').replace(/"/g, '""')}"`,
      `"${(e.category || '').replace(/"/g, '""')}"`,
      `"${(e.mode || '').replace(/"/g, '""')}"`,
      `"${e.date || ''}"`,
      `"${e.startTime || ''}"`,
      `"${e.endTime || ''}"`,
      `"${(e.venue || '').replace(/"/g, '""')}"`,
      `"${(e.meetingLink || '').replace(/"/g, '""')}"`,
      `"${(e.passcode || '').replace(/"/g, '""')}"`,
      `"${(e.status || '').replace(/"/g, '""')}"`,
      `"${(e.description || '').replace(/"/g, '""')}"`
    ]);
    const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
    const a = document.createElement('a');
    a.href = encodeURI(csvContent);
    a.download = `workshophub_events_${new Date().toISOString().split('T')[0]}.csv`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    UI.showToast('CSV exported!');
  });

  // Import JSON file input
  const fileInput = document.getElementById('settings-import-file-input');
  document.getElementById('settings-import-json-btn')?.addEventListener('click', () => {
    fileInput?.click();
  });

  fileInput?.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (evt) => {
      const res = Store.importJson(evt.target.result);
      if (res.success) {
        UI.showToast(`Imported ${res.count} events!`);
        UI.closeSettingsModal();
        UI.refresh();
        if (typeof DriveSync !== 'undefined' && DriveSync.isSignedIn()) {
          DriveSync.sync().catch(err => console.warn('Auto-sync failed:', err));
        }
      } else {
        alert('Import failed: ' + res.error);
      }
    };
    reader.readAsText(file);
  });

  // Wipe personal data
  document.getElementById('settings-clear-data-btn')?.addEventListener('click', () => {
    if (confirm('Are you sure you want to wipe your personal events? Ensure you have downloaded a JSON backup first.')) {
      Store.clearPersonalEvents();
      UI.refresh();
      UI.closeSettingsModal();
      UI.showToast('Personal events cleared.');
    }
  });
});
