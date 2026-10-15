/**
 * WorkshopHub Google Drive Personal Cloud Sync Module
 * Zero-Database Architecture: Data is saved directly into the user's personal Google Drive
 * hidden App Data folder (spaces=appDataFolder).
 * 
 * Guarantee: The developer has ZERO server, ZERO database, and CANNOT access the user's data.
 * All communication happens client-side between the user's browser and Google Drive API.
 */

const DriveSync = {
  // Config
  CLIENT_ID_KEY: 'workshophub_gdrive_client_id',
  SYNC_FILE_NAME: 'workshophub_personal_schedule.json',
  APP_DATA_SCOPE: 'https://www.googleapis.com/auth/drive.appdata',
  
  tokenClient: null,
  accessToken: null,
  tokenExpiration: null,
  userProfile: null,
  isSyncing: false,

  init() {
    this.loadCachedToken();
    this.initGis();
  },

  // Load cached token if still valid
  loadCachedToken() {
    try {
      const cached = localStorage.getItem('workshophub_gdrive_token');
      const exp = localStorage.getItem('workshophub_gdrive_token_exp');
      const profile = localStorage.getItem('workshophub_gdrive_profile');
      if (cached && exp && Date.now() < parseInt(exp, 10)) {
        this.accessToken = cached;
        this.tokenExpiration = parseInt(exp, 10);
        if (profile) this.userProfile = JSON.parse(profile);
      }
    } catch (e) {
      console.warn('Could not read cached Google Drive token:', e);
    }
  },

  getClientId() {
    return localStorage.getItem(this.CLIENT_ID_KEY) || '';
  },

  setClientId(clientId) {
    if (clientId) {
      localStorage.setItem(this.CLIENT_ID_KEY, clientId.trim());
    } else {
      localStorage.removeItem(this.CLIENT_ID_KEY);
    }
  },

  isSignedIn() {
    return Boolean(this.accessToken && Date.now() < this.tokenExpiration);
  },

  initGis() {
    if (typeof google === 'undefined' || !google.accounts || !google.accounts.oauth2) {
      // Retry in 500ms if GIS script is still loading asynchronously
      setTimeout(() => this.initGis(), 500);
      return;
    }

    const clientId = this.getClientId();
    if (!clientId) return;

    try {
      this.tokenClient = google.accounts.oauth2.initTokenClient({
        client_id: clientId,
        scope: `${this.APP_DATA_SCOPE} https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/userinfo.email`,
        callback: async (tokenResponse) => {
          if (tokenResponse && tokenResponse.access_token) {
            this.accessToken = tokenResponse.access_token;
            // Token typically valid for 3600 seconds
            this.tokenExpiration = Date.now() + ((tokenResponse.expires_in || 3600) * 1000) - 60000;
            localStorage.setItem('workshophub_gdrive_token', this.accessToken);
            localStorage.setItem('workshophub_gdrive_token_exp', String(this.tokenExpiration));

            await this.fetchUserProfile();
            await this.sync();
            UI.showToast(`Signed in to Google Drive as ${this.userProfile?.email || 'User'}`);
            UI.refresh();
          }
        }
      });
    } catch (err) {
      console.warn('Failed to initialize Google Token Client:', err);
    }
  },

  async requestSignIn() {
    const clientId = this.getClientId();
    if (!clientId) {
      alert('Please configure your Google Cloud OAuth Client ID in Settings first!');
      UI.openSettingsModal();
      return;
    }

    if (!this.tokenClient) {
      this.initGis();
    }

    if (this.tokenClient) {
      // Prompt user to sign in and grant access to their private hidden AppData folder
      this.tokenClient.requestAccessToken({ prompt: '' });
    } else {
      alert('Google Sign-In library is loading. Please try again in a few seconds.');
    }
  },

  signOut() {
    if (this.accessToken && typeof google !== 'undefined' && google.accounts && google.accounts.oauth2) {
      google.accounts.oauth2.revoke(this.accessToken, () => {});
    }
    this.accessToken = null;
    this.tokenExpiration = null;
    this.userProfile = null;
    localStorage.removeItem('workshophub_gdrive_token');
    localStorage.removeItem('workshophub_gdrive_token_exp');
    localStorage.removeItem('workshophub_gdrive_profile');
    UI.showToast('Disconnected from Google Drive.');
    UI.refresh();
  },

  async fetchUserProfile() {
    if (!this.accessToken) return;
    try {
      const res = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
        headers: { Authorization: `Bearer ${this.accessToken}` }
      });
      if (res.ok) {
        this.userProfile = await res.json();
        localStorage.setItem('workshophub_gdrive_profile', JSON.stringify(this.userProfile));
      }
    } catch (e) {
      console.warn('Could not fetch user profile:', e);
    }
  },

  // Two-way sync: Merge local events with Google Drive AppData folder
  async sync() {
    if (!this.isSignedIn() || this.isSyncing) return;
    this.isSyncing = true;
    this.updateSyncStatusUI('syncing');

    try {
      // 1. Locate existing file in hidden appDataFolder
      const fileId = await this.findDriveSyncFile();
      let remoteEvents = [];

      if (fileId) {
        // Download remote file
        remoteEvents = await this.readDriveFile(fileId);
      }

      // 2. Smart merge: merge local and remote events by ID & latest updatedAt
      const localEvents = Store.getEvents();
      const mergedEvents = this.mergeEvents(localEvents, remoteEvents);

      // Save merged result locally
      Store.saveEvents(mergedEvents);

      // 3. Upload merged result back to Google Drive
      if (fileId) {
        await this.updateDriveFile(fileId, mergedEvents);
      } else {
        await this.createDriveFile(mergedEvents);
      }

      const syncTime = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      localStorage.setItem('workshophub_last_sync_time', syncTime);
      this.updateSyncStatusUI('synced', syncTime);
      UI.refresh();
    } catch (err) {
      console.error('Drive sync failed:', err);
      this.updateSyncStatusUI('error', err.message);
    } finally {
      this.isSyncing = false;
    }
  },

  mergeEvents(local, remote) {
    const map = new Map();

    // Index remote items
    (remote || []).forEach(e => {
      if (e && e.id) map.set(e.id, e);
    });

    // Merge or overwrite with local if newer
    (local || []).forEach(localItem => {
      if (!localItem || !localItem.id) return;
      if (!map.has(localItem.id)) {
        map.set(localItem.id, localItem);
      } else {
        const remoteItem = map.get(localItem.id);
        const localTime = new Date(localItem.updatedAt || localItem.createdAt || 0).getTime();
        const remoteTime = new Date(remoteItem.updatedAt || remoteItem.createdAt || 0).getTime();
        if (localTime >= remoteTime) {
          map.set(localItem.id, localItem);
        }
      }
    });

    return Array.from(map.values()).sort((a, b) => new Date(`${a.date}T${a.startTime || '00:00'}`) - new Date(`${b.date}T${b.startTime || '00:00'}`));
  },

  async findDriveSyncFile() {
    const query = encodeURIComponent(`name = '${this.SYNC_FILE_NAME}' and trashed = false`);
    const res = await fetch(`https://www.googleapis.com/drive/v3/files?spaces=appDataFolder&q=${query}&fields=files(id,name,modifiedTime)`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });
    if (!res.ok) throw new Error(`Drive list failed: ${res.status}`);
    const data = await res.json();
    return data.files && data.files.length > 0 ? data.files[0].id : null;
  },

  async readDriveFile(fileId) {
    const res = await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`, {
      headers: { Authorization: `Bearer ${this.accessToken}` }
    });
    if (!res.ok) throw new Error(`Drive read failed: ${res.status}`);
    const data = await res.json();
    return Array.isArray(data) ? data : (data.events || []);
  },

  async createDriveFile(events) {
    const metadata = {
      name: this.SYNC_FILE_NAME,
      parents: ['appDataFolder'],
      mimeType: 'application/json'
    };

    const boundary = '-------314159265358979323846';
    const delimiter = "\r\n--" + boundary + "\r\n";
    const closeDelimiter = "\r\n--" + boundary + "--";

    const payload = JSON.stringify({
      version: '2.0',
      syncedAt: new Date().toISOString(),
      events: events
    }, null, 2);

    const body = delimiter +
      'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
      JSON.stringify(metadata) +
      delimiter +
      'Content-Type: application/json\r\n\r\n' +
      payload +
      closeDelimiter;

    const res = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`
      },
      body: body
    });

    if (!res.ok) throw new Error(`Drive file creation failed: ${res.status}`);
  },

  async updateDriveFile(fileId, events) {
    const payload = JSON.stringify({
      version: '2.0',
      syncedAt: new Date().toISOString(),
      events: events
    }, null, 2);

    const res = await fetch(`https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${this.accessToken}`,
        'Content-Type': 'application/json'
      },
      body: payload
    });

    if (!res.ok) throw new Error(`Drive file update failed: ${res.status}`);
  },

  updateSyncStatusUI(status, detail = '') {
    const container = document.getElementById('drive-sync-status-indicator');
    if (!container) return;

    if (!this.isSignedIn()) {
      container.innerHTML = `
        <button data-action="drive-signin" class="px-2.5 py-1 text-[11px] font-semibold bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 hover:bg-slate-50 text-slate-700 dark:text-slate-200 rounded-xl transition flex items-center gap-1.5 shadow-xs">
          <span>☁️</span> <span>Sign In & Sync</span>
        </button>
      `;
      return;
    }

    if (status === 'syncing') {
      container.innerHTML = `
        <div class="px-2.5 py-1 text-[11px] font-medium bg-indigo-50 text-indigo-700 rounded-xl flex items-center gap-1.5 animate-pulse">
          <span class="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-ping"></span>
          <span>Syncing...</span>
        </div>
      `;
    } else if (status === 'synced') {
      container.innerHTML = `
        <button data-action="drive-sync-now" class="px-2.5 py-1 text-[11px] font-medium bg-emerald-50 text-emerald-800 rounded-xl flex items-center gap-1.5 border border-emerald-200 hover:bg-emerald-100 transition" title="Tap to sync now with Google Drive">
          <span class="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Synced (${detail || 'Just now'})</span>
        </button>
      `;
    } else if (status === 'error') {
      container.innerHTML = `
        <button data-action="drive-sync-now" class="px-2.5 py-1 text-[11px] font-medium bg-red-50 text-red-700 rounded-xl flex items-center gap-1.5 border border-red-200" title="Sync failed. Tap to retry.">
          <span>⚠️</span> <span>Sync Retry</span>
        </button>
      `;
    }
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = DriveSync;
}
