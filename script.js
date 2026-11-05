const CONFIG_STORAGE_KEY = 'bobbys-links-api';

// Preview content. Replace this object with the response returned by the staff API.
// Expected response: { siteStatus: 'online' | 'offline', links: [], announcements: [] }.
const MOCK_SITE = {
  siteStatus: 'online',
  links: [
    { id: 'daily-brief', title: 'The Daily Brief', description: 'A quick read to get the day moving.', url: 'https://example.com/daily-brief', pinned: true, featured: true },
    { id: 'workspace', title: 'Team Workspace', description: 'Everything we are working on, in one place.', url: 'https://example.com/workspace', pinned: true, featured: true },
    { id: 'calendar', title: 'Shared Calendar', description: 'The dates and details worth keeping close.', url: 'https://example.com/calendar', pinned: false, featured: true },
    { id: 'resources', title: 'Useful Resources', description: 'A short list of tools and references.', url: 'https://example.com/resources', pinned: false, featured: false },
    { id: 'contact', title: 'Get in Touch', description: 'Need a hand? Start here.', url: 'https://example.com/contact', pinned: false, featured: false }
  ],
  announcements: [
    { id: 'welcome', title: 'A quick heads-up', message: 'This is a pinned announcement. Staff updates will show here.', pinned: true },
    { id: 'updates', title: 'Fresh links', message: 'New links are added as they come in.', pinned: false }
  ]
};

function readApiConfig() {
  try {
    const stored = localStorage.getItem(CONFIG_STORAGE_KEY);
    return stored ? JSON.parse(stored) : null;
  } catch {
    return null;
  }
}

async function getSiteData() {
  const config = readApiConfig();
  if (!config?.baseUrl) return MOCK_SITE;

  // Real API integration point: the staff site owns CRUD, pinning, announcements, and site status.
  // Keep the response shape aligned with MOCK_SITE; never put staff write credentials in this public client.
  const endpoint = new URL('/api/site', config.baseUrl);
  const headers = { Accept: 'application/json' };
  if (config.apiKey) headers.Authorization = `Bearer ${config.apiKey}`;
  const response = await fetch(endpoint, { headers, cache: 'no-store' });
  if (!response.ok) throw new Error(`The content service returned ${response.status}.`);
  return response.json();
}

function escapeHtml(value = '') {
  return String(value).replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[character]);
}

function safeUrl(value = '') {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

function isPinnedFirst(first, second) {
  return Number(Boolean(second.pinned)) - Number(Boolean(first.pinned));
}

function renderAnnouncements(announcements = []) {
  const container = document.querySelector('#announcements');
  if (!container) return;

  const items = [...announcements].sort(isPinnedFirst);
  if (!items.length) {
    container.hidden = true;
    return;
  }

  container.innerHTML = items.map((item) => `
    <article class="announcement${item.pinned ? ' announcement-pinned' : ''}">
      <span class="announcement-mark" aria-hidden="true">${item.pinned ? '!' : 'i'}</span>
      <div class="announcement-copy">
        <p class="announcement-label">${item.pinned ? 'Pinned announcement' : 'Announcement'}</p>
        <h2>${escapeHtml(item.title || 'Update')}</h2>
        <p>${escapeHtml(item.message || item.description || '')}</p>
      </div>
    </article>
  `).join('');
  container.hidden = false;
}

function renderLinkCard(link) {
  const href = safeUrl(link.url || link.href);
  if (!href) return '';
  return `
    <article class="link-card${link.pinned ? ' is-pinned' : ''}">
      <div class="card-topline">
        <span class="card-index" aria-hidden="true">${escapeHtml(String(link.id || '↗').slice(0, 2))}</span>
        ${link.pinned ? '<span class="pin-label"><span aria-hidden="true">◆</span> Pinned</span>' : ''}
      </div>
      <div class="card-copy">
        <h3>${escapeHtml(link.title || 'Untitled link')}</h3>
        <p>${escapeHtml(link.description || '')}</p>
      </div>
      <a class="button button-card" href="${escapeHtml(href)}" target="_blank" rel="noopener noreferrer">
        Open link <span aria-hidden="true">↗</span>
      </a>
    </article>
  `;
}

function renderLinks(links = []) {
  const page = document.body.dataset.page;
  const allLinks = [...links].sort(isPinnedFirst);
  if (page === 'home') {
    const featured = allLinks.filter((link) => link.pinned || link.featured);
    const container = document.querySelector('#featured-links');
    if (container) container.innerHTML = featured.map(renderLinkCard).join('') || '<p class="empty-state">No featured links yet.</p>';
    return;
  }

  const container = document.querySelector('#all-links');
  const count = document.querySelector('#link-count');
  const search = document.querySelector('#link-search');
  if (!container) return;

  const updateList = () => {
    const query = search.value.trim().toLowerCase();
    const matches = allLinks.filter((link) => safeUrl(link.url || link.href)
      && `${link.title || ''} ${link.description || ''}`.toLowerCase().includes(query));
    container.innerHTML = matches.map(renderLinkCard).join('') || '<p class="empty-state">No links match that search.</p>';
    if (count) count.textContent = `${matches.length} ${matches.length === 1 ? 'link' : 'links'}`;
  };
  search.addEventListener('input', updateList);
  updateList();
}

function showOffline(message = 'We are making a few updates. Please check back soon.') {
  document.body.innerHTML = `
    <main class="offline-page">
      <div class="offline-brand"><span class="wordmark-mark" aria-hidden="true">b.</span> Bobby's Links</div>
      <div class="offline-content">
        <p class="eyebrow">A short pause</p>
        <h1>Back in a <span>moment.</span></h1>
        <p>${escapeHtml(message)}</p>
        <a class="button button-primary" href="/">Try again <span aria-hidden="true">↻</span></a>
      </div>
      <p class="offline-foot">Thanks for your patience.</p>
    </main>
  `;
}

function initializeConfigPage() {
  const form = document.querySelector('#api-config-form');
  const baseUrl = document.querySelector('#api-base-url');
  const apiKey = document.querySelector('#api-key');
  const status = document.querySelector('#config-status');
  const clearButton = document.querySelector('#clear-config');
  const config = readApiConfig();

  if (config) {
    baseUrl.value = config.baseUrl || '';
    apiKey.value = config.apiKey || '';
    status.textContent = 'Connection settings are saved in this browser.';
    status.classList.add('is-saved');
  }

  form.addEventListener('submit', (event) => {
    event.preventDefault();
    let parsedUrl;
    try {
      parsedUrl = new URL(baseUrl.value.trim());
      if (!['http:', 'https:'].includes(parsedUrl.protocol)) throw new Error('Unsupported protocol');
    } catch {
      status.textContent = 'Enter a valid API base URL beginning with http:// or https://.';
      status.classList.remove('is-saved');
      baseUrl.focus();
      return;
    }

    const nextConfig = { baseUrl: parsedUrl.origin, apiKey: apiKey.value.trim() };
    try {
      localStorage.setItem(CONFIG_STORAGE_KEY, JSON.stringify(nextConfig));
      status.textContent = 'Connection settings are saved in this browser.';
      status.classList.add('is-saved');
    } catch {
      status.textContent = 'Could not save settings. Check your browser storage permissions.';
      status.classList.remove('is-saved');
    }
  });

  clearButton.addEventListener('click', () => {
    try {
      localStorage.removeItem(CONFIG_STORAGE_KEY);
      baseUrl.value = '';
      apiKey.value = '';
      status.textContent = 'No API connection saved.';
      status.classList.remove('is-saved');
    } catch {
      status.textContent = 'Could not clear settings. Check your browser storage permissions.';
      status.classList.remove('is-saved');
    }
  });
}

async function initializeSite() {
  if (document.body.dataset.page === 'config') {
    initializeConfigPage();
    return;
  }

  try {
    const site = await getSiteData();
    const siteStatus = String(site.siteStatus || 'online').toLowerCase();
    if (site.offline === true || site.isOffline === true || ['offline', 'shutdown'].includes(siteStatus)) {
      showOffline(site.offlineMessage || site.message || 'We are making a few updates. Please check back soon.');
      return;
    }
    renderAnnouncements(Array.isArray(site.announcements) ? site.announcements : []);
    renderLinks(Array.isArray(site.links) ? site.links : []);
  } catch (error) {
    showOffline('We cannot reach the content service right now. Please try again shortly.');
  }
}

initializeSite();
