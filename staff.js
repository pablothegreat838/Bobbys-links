const DRAFT_STORAGE_KEY = 'bobbys-links-draft';
const LEGACY_STORAGE_KEY = 'bobbys-links-content';
let staffSite;
let staffPanelInitialized = false;
const staffFeedback = document.querySelector('#staff-feedback');

async function saveStaffSite(message) {
  staffFeedback.textContent = 'Publishing update...';
  try {
    const response = await fetch('/api/site', {
      method: 'PUT',
      credentials: 'same-origin',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(staffSite)
    });
    const result = await response.json();
    if (response.status === 401) {
      showStaffLogin('Your session expired. Sign in again.');
      return false;
    }
    if (!response.ok) throw new Error(result.error || 'Could not publish the update.');
    staffSite = { ...result, links: normalizeLinkEntries(result.links) };
  } catch (error) {
    staffFeedback.textContent = error.message || 'Could not publish the update.';
    return false;
  }
  updateStaffSummary();
  renderStaffEntries();
  renderStaffAnnouncements();
  staffFeedback.textContent = message;
  return true;
}

function updateStaffSummary() {
  const links = staffSite.links || [];
  const announcements = staffSite.announcements || [];
  const isOffline = ['offline', 'shutdown'].includes(String(staffSite.siteStatus).toLowerCase());
  document.querySelector('#summary-link-count').textContent = links.length;
  document.querySelector('#summary-announcement-count').textContent = announcements.length;
  document.querySelector('#summary-pinned-count').textContent = [...links, ...announcements].filter((item) => item.pinned).length;
  document.querySelector('#site-status-label').textContent = isOffline ? 'Offline' : 'Online';
  const chip = document.querySelector('#staff-status-chip');
  chip.textContent = isOffline ? 'Website offline' : 'Website online';
  chip.classList.toggle('is-offline', isOffline);
}

function renderStaffEntries() {
  const container = document.querySelector('#staff-entries-list');
  const entries = [...staffSite.links].sort((first, second) => Number(Boolean(second.pinned)) - Number(Boolean(first.pinned)));
  document.querySelector('#staff-entry-count').textContent = `${entries.length}`;
  container.innerHTML = entries.map((entry) => `
    <article class="staff-item">
      <div class="staff-item-copy">
        <h3>${escapeHtml(entry.title || 'Untitled entry')}</h3>
        <p>${escapeHtml(entry.description || 'No description')}</p>
        <ul class="staff-entry-link-list">
          ${(entry.links || []).map((destination) => destination.url
            ? `<li><span>${escapeHtml(destination.title || 'Link')}</span><span>${escapeHtml(destination.url)}</span></li>`
            : `<li class="staff-entry-plain">${escapeHtml(destination.text || destination.title || '')}</li>`
          ).join('')}
        </ul>
        <div class="staff-item-tags">
          ${entry.pinned ? '<span class="staff-tag">Pinned</span>' : ''}
          ${entry.featured ? '<span class="staff-tag">Home page</span>' : ''}
        </div>
      </div>
      <div class="staff-item-actions">
        <button class="staff-action-button" type="button" data-action="toggle-entry-pin" data-id="${escapeHtml(entry.id)}">${entry.pinned ? 'Unpin' : 'Pin'}</button>
        <button class="staff-action-button" type="button" data-action="edit-entry" data-id="${escapeHtml(entry.id)}">Edit</button>
        <button class="staff-action-button is-destructive" type="button" data-action="delete-entry" data-id="${escapeHtml(entry.id)}">Remove</button>
      </div>
    </article>
  `).join('') || '<p class="empty-state">No entries added yet.</p>';
}

function renderStaffAnnouncements() {
  const container = document.querySelector('#staff-announcements-list');
  const announcements = [...staffSite.announcements].sort((first, second) => Number(Boolean(second.pinned)) - Number(Boolean(first.pinned)));
  document.querySelector('#staff-announcement-count').textContent = `${announcements.length}`;
  container.innerHTML = announcements.map((announcement) => `
    <article class="staff-item">
      <div class="staff-item-copy">
        <h3>${escapeHtml(announcement.title || 'Update')}</h3>
        <p>${escapeHtml(announcement.message || '')}</p>
        ${announcement.pinned ? '<div class="staff-item-tags"><span class="staff-tag">Pinned</span></div>' : ''}
      </div>
      <div class="staff-item-actions">
        <button class="staff-action-button" type="button" data-action="toggle-announcement-pin" data-id="${escapeHtml(announcement.id)}">${announcement.pinned ? 'Unpin' : 'Pin'}</button>
        <button class="staff-action-button" type="button" data-action="edit-announcement" data-id="${escapeHtml(announcement.id)}">Edit</button>
        <button class="staff-action-button is-destructive" type="button" data-action="delete-announcement" data-id="${escapeHtml(announcement.id)}">Remove</button>
      </div>
    </article>
  `).join('') || '<p class="empty-state">No announcements yet.</p>';
}

function createStaffId() {
  return globalThis.crypto?.randomUUID ? globalThis.crypto.randomUUID() : `item-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function parseEntryLinks(value) {
  const lines = value.split(/\r?\n/);
  const invalidLines = [];
  const links = [];
  lines.forEach((rawLine, index) => {
    const line = rawLine.trim();
    if (!line) return;
    const separator = line.indexOf('|');
    const title = separator >= 0 ? line.slice(0, separator).trim() : '';
    const rawUrl = separator >= 0 ? line.slice(separator + 1).trim() : line;
    const url = safeUrl(rawUrl);
    links.push(url
      ? { title: title || inferEntryLinkTitle(url), url, text: '' }
      : { title: title || rawUrl, url: '', text: rawUrl });
  });
  return { links };
}

function inferEntryLinkTitle(url) {
  const parsedUrl = new URL(url);
  const lastPathPart = parsedUrl.pathname.split('/').filter(Boolean).pop();
  if (!lastPathPart) return parsedUrl.hostname.replace(/^www\./, '');
  try {
    return decodeURIComponent(lastPathPart).replace(/[-_]+/g, ' ').replace(/\.[^.]+$/, '');
  } catch {
    return lastPathPart;
  }
}

function initializeStaffPanel() {
  const entryForm = document.querySelector('#staff-entry-form');
  const entryIdInput = document.querySelector('#staff-entry-id');
  const entryTitleInput = document.querySelector('#staff-entry-title');
  const entryDescriptionInput = document.querySelector('#staff-entry-description');
  const entryFeaturedInput = document.querySelector('#staff-entry-featured');
  const entryFormTitle = document.querySelector('#entry-form-title');
  const entrySubmit = document.querySelector('#staff-entry-submit');
  const entryCancel = document.querySelector('#staff-entry-cancel');
  const entryLinksInput = document.querySelector('#staff-entry-link-list');
  const announcementForm = document.querySelector('#staff-announcement-form');
  const announcementIdInput = document.querySelector('#staff-announcement-id');
  const announcementTitleInput = document.querySelector('#staff-announcement-title');
  const announcementMessageInput = document.querySelector('#staff-announcement-message');
  const announcementPinnedInput = document.querySelector('#staff-announcement-pinned');
  const announcementFormTitle = document.querySelector('#announcement-form-title');
  const announcementSubmit = document.querySelector('#staff-announcement-submit');
  const announcementCancel = document.querySelector('#staff-announcement-cancel');
  function resetEntryForm() {
    entryForm.reset();
    entryIdInput.value = '';
    entryFormTitle.textContent = 'Add an entry';
    entrySubmit.textContent = 'Add entry';
    entryCancel.hidden = true;
    entryLinksInput.value = '';
  }

  function resetAnnouncementForm() {
    announcementForm.reset();
    announcementIdInput.value = '';
    announcementFormTitle.textContent = 'Add an announcement';
    announcementSubmit.textContent = 'Add announcement';
    announcementCancel.hidden = true;
  }

  document.querySelectorAll('[data-staff-view]').forEach((button) => {
    button.addEventListener('click', () => {
      const viewName = button.dataset.staffView;
      document.querySelectorAll('[data-staff-view]').forEach((item) => {
        item.classList.toggle('is-active', item === button);
        if (item === button) item.setAttribute('aria-current', 'page');
        else item.removeAttribute('aria-current');
      });
      document.querySelectorAll('.staff-view').forEach((view) => {
        view.hidden = view.id !== `staff-view-${viewName}`;
      });
    });
  });

  document.querySelectorAll('[data-set-site-status]').forEach((button) => {
    button.addEventListener('click', () => {
      staffSite.siteStatus = button.dataset.setSiteStatus;
      saveStaffSite(`Website set ${staffSite.siteStatus}.`);
      updateStaffSummary();
    });
  });

  document.querySelector('#offline-message-form').addEventListener('submit', (event) => {
    event.preventDefault();
    staffSite.offlineMessage = document.querySelector('#offline-message').value.trim();
    saveStaffSite('Maintenance message saved.');
  });

  entryForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const parsedLinks = parseEntryLinks(entryLinksInput.value);
    if (!parsedLinks.links.length) {
      entryLinksInput.setCustomValidity('Paste at least one item, one per line.');
      entryLinksInput.reportValidity();
      entryLinksInput.setCustomValidity('');
      return;
    }

    const existingIndex = staffSite.links.findIndex((entry) => entry.id === entryIdInput.value);
    const existingEntry = staffSite.links[existingIndex];
    const entry = {
      id: existingEntry?.id || createStaffId(),
      title: entryTitleInput.value.trim(),
      description: entryDescriptionInput.value.trim(),
      pinned: Boolean(existingEntry?.pinned),
      featured: entryFeaturedInput.checked,
      links: parsedLinks.links.map((destination, index) => ({
        id: existingEntry?.links?.[index]?.id || createStaffId(),
        title: destination.title,
        url: destination.url,
        text: destination.text
      }))
    };
    if (existingIndex >= 0) staffSite.links[existingIndex] = entry;
    else staffSite.links.push(entry);
    saveStaffSite(existingEntry ? 'Entry updated.' : 'Entry added.');
    resetEntryForm();
  });

  entryCancel.addEventListener('click', resetEntryForm);
  document.querySelector('#staff-entries-list').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const entry = staffSite.links.find((item) => item.id === button.dataset.id);
    if (!entry) return;

    if (button.dataset.action === 'toggle-entry-pin') {
      entry.pinned = !entry.pinned;
      saveStaffSite(entry.pinned ? 'Entry pinned.' : 'Entry unpinned.');
    } else if (button.dataset.action === 'edit-entry') {
      entryIdInput.value = entry.id;
      entryTitleInput.value = entry.title;
      entryDescriptionInput.value = entry.description || '';
      entryFeaturedInput.checked = Boolean(entry.featured);
      entryLinksInput.value = (entry.links || []).map((destination) => destination.url
        ? `${destination.title} | ${destination.url}`
        : destination.text || destination.title
      ).join('\n');
      entryFormTitle.textContent = 'Edit an entry';
      entrySubmit.textContent = 'Save entry';
      entryCancel.hidden = false;
      entryTitleInput.focus();
    } else if (button.dataset.action === 'delete-entry' && window.confirm(`Remove "${entry.title}" and its links?`)) {
      staffSite.links = staffSite.links.filter((item) => item.id !== entry.id);
      saveStaffSite('Entry removed.');
    }
  });

  announcementForm.addEventListener('submit', (event) => {
    event.preventDefault();
    const existingIndex = staffSite.announcements.findIndex((item) => item.id === announcementIdInput.value);
    const existingAnnouncement = staffSite.announcements[existingIndex];
    const announcement = {
      id: existingAnnouncement?.id || createStaffId(),
      title: announcementTitleInput.value.trim(),
      message: announcementMessageInput.value.trim(),
      pinned: announcementPinnedInput.checked
    };
    if (existingIndex >= 0) staffSite.announcements[existingIndex] = announcement;
    else staffSite.announcements.push(announcement);
    saveStaffSite(existingAnnouncement ? 'Announcement updated.' : 'Announcement added.');
    resetAnnouncementForm();
  });

  announcementCancel.addEventListener('click', resetAnnouncementForm);
  document.querySelector('#staff-announcements-list').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-action]');
    if (!button) return;
    const announcement = staffSite.announcements.find((item) => item.id === button.dataset.id);
    if (!announcement) return;

    if (button.dataset.action === 'toggle-announcement-pin') {
      announcement.pinned = !announcement.pinned;
      saveStaffSite(announcement.pinned ? 'Announcement pinned.' : 'Announcement unpinned.');
    } else if (button.dataset.action === 'edit-announcement') {
      announcementIdInput.value = announcement.id;
      announcementTitleInput.value = announcement.title;
      announcementMessageInput.value = announcement.message;
      announcementPinnedInput.checked = Boolean(announcement.pinned);
      announcementFormTitle.textContent = 'Edit an announcement';
      announcementSubmit.textContent = 'Save announcement';
      announcementCancel.hidden = false;
      announcementTitleInput.focus();
    } else if (button.dataset.action === 'delete-announcement' && window.confirm(`Remove "${announcement.title}"?`)) {
      staffSite.announcements = staffSite.announcements.filter((item) => item.id !== announcement.id);
      saveStaffSite('Announcement removed.');
    }
  });

  document.querySelector('#offline-message').value = staffSite.offlineMessage || '';
  updateStaffSummary();
  renderStaffEntries();
  renderStaffAnnouncements();
}

function showStaffLogin(message = '') {
  document.querySelector('#staff-panel').hidden = true;
  document.querySelector('#staff-login').hidden = false;
  document.querySelector('#staff-login-status').textContent = message;
  document.querySelector('#staff-password').value = '';
}

async function showStaffPanel() {
  const response = await fetch('/api/site', { cache: 'no-store', credentials: 'same-origin' });
  const result = await response.json();
  if (!response.ok) throw new Error(result.error || 'Could not load shared site content.');
  staffSite = { ...result, links: normalizeLinkEntries(result.links) };
  document.querySelector('#staff-login').hidden = true;
  document.querySelector('#staff-panel').hidden = false;
  updateStaffSummary();
  renderStaffEntries();
  renderStaffAnnouncements();
  if (!staffPanelInitialized) {
    initializeStaffPanel();
    staffPanelInitialized = true;
  }
  document.querySelector('#import-local-draft').hidden = !readLocalDraft();
}

function readLocalDraft() {
  try {
    const stored = localStorage.getItem(DRAFT_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

async function initializeStaffAuthentication() {
  const login = document.querySelector('#staff-login-form');
  const password = document.querySelector('#staff-password');
  const status = document.querySelector('#staff-login-status');
  const importButton = document.querySelector('#import-local-draft');

  login.addEventListener('submit', async (event) => {
    event.preventDefault();
    status.textContent = 'Signing in...';
    try {
      const response = await fetch('/api/login', {
        method: 'POST',
        credentials: 'same-origin',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password: password.value })
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Could not sign in.');
      await showStaffPanel();
    } catch (error) {
      status.textContent = error.message || 'Could not reach staff sign-in.';
      password.value = '';
      password.focus();
    }
  });

  document.querySelector('#staff-logout').addEventListener('click', async () => {
    try {
      await fetch('/api/logout', { method: 'POST', credentials: 'same-origin' });
    } finally {
      showStaffLogin('Signed out.');
    }
  });

  importButton.addEventListener('click', async () => {
    const draft = readLocalDraft();
    if (!draft || !window.confirm('Replace the shared site content with this browser’s saved draft?')) return;
    const currentSite = staffSite;
    staffSite = {
      ...currentSite,
      ...draft,
      links: normalizeLinkEntries(Array.isArray(draft.links) ? draft.links : []),
      announcements: Array.isArray(draft.announcements) ? draft.announcements : []
    };
    if (await saveStaffSite('Local draft imported and published.')) {
      localStorage.removeItem(DRAFT_STORAGE_KEY);
      localStorage.removeItem(LEGACY_STORAGE_KEY);
      importButton.hidden = true;
    } else {
      staffSite = currentSite;
      updateStaffSummary();
      renderStaffEntries();
      renderStaffAnnouncements();
    }
  });

  try {
    const response = await fetch('/api/login', { cache: 'no-store', credentials: 'same-origin' });
    const result = await response.json();
    if (!response.ok) throw new Error(result.error || 'Staff sign-in is unavailable.');
    if (result.authenticated) await showStaffPanel();
  } catch (error) {
    status.textContent = error.message || 'Staff sign-in is unavailable.';
  }
}

initializeStaffAuthentication();
