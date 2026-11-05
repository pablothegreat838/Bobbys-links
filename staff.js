const staffSite = getSiteData();
const staffFeedback = document.querySelector('#staff-feedback');

function saveStaffSite(message) {
  try {
    localStorage.setItem(SITE_STORAGE_KEY, JSON.stringify(staffSite));
    updateStaffSummary();
    renderStaffEntries();
    renderStaffAnnouncements();
    staffFeedback.textContent = message;
  } catch {
    staffFeedback.textContent = 'Could not save changes in this browser.';
  }
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
          ${(entry.links || []).map((destination) => `<li><span>${escapeHtml(destination.title || 'Link')}</span><span>${escapeHtml(destination.url || '')}</span></li>`).join('')}
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
    if (!url) {
      invalidLines.push(index + 1);
      return;
    }
    links.push({ title: title || inferEntryLinkTitle(url), url });
  });
  return { links, invalidLines };
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
    if (!parsedLinks.links.length || parsedLinks.invalidLines.length) {
      const message = parsedLinks.invalidLines.length
        ? `Check the URL on line${parsedLinks.invalidLines.length === 1 ? '' : 's'} ${parsedLinks.invalidLines.join(', ')}.`
        : 'Paste at least one URL, one per line.';
      entryLinksInput.setCustomValidity(message);
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
        url: destination.url
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
      entryLinksInput.value = (entry.links || []).map((destination) => `${destination.title} | ${destination.url}`).join('\n');
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

initializeStaffPanel();
