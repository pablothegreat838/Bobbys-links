const SITE_STORAGE_KEY = 'bobbys-links-content';

// Preview content used until staff changes are saved in this browser.
const MOCK_SITE = {
  siteStatus: 'online',
  links: [
    { id: 'daily', title: 'Daily essentials', description: 'A few useful places to start the day.', pinned: true, featured: true, links: [
      { id: 'daily-brief', title: 'The Daily Brief', url: 'https://example.com/daily-brief' },
      { id: 'workspace', title: 'Team Workspace', url: 'https://example.com/workspace' }
    ] },
    { id: 'planning', title: 'Planning', description: 'Keep up with dates and upcoming work.', pinned: false, featured: true, links: [
      { id: 'calendar', title: 'Shared Calendar', url: 'https://example.com/calendar' },
      { id: 'roadmap', title: 'Project Roadmap', url: 'https://example.com/roadmap' }
    ] },
    { id: 'resources', title: 'Useful resources', description: 'Tools and references worth keeping close.', pinned: false, featured: false, links: [
      { id: 'resource-list', title: 'Resource Library', url: 'https://example.com/resources' }
    ] },
    { id: 'contact', title: 'Get in touch', description: 'Need a hand? Start here.', pinned: false, featured: false, links: [
      { id: 'contact-team', title: 'Contact the Team', url: 'https://example.com/contact' }
    ] }
  ],
  announcements: [
    { id: 'welcome', title: 'A quick heads-up', message: 'This is a pinned announcement. Staff updates will show here.', pinned: true },
    { id: 'updates', title: 'Fresh links', message: 'New links are added as they come in.', pinned: false }
  ]
};

function normalizeLinkEntries(items = []) {
  return items.map((item, index) => {
    const id = item.id || `entry-${index + 1}`;
    if (Array.isArray(item.links)) {
      return {
        ...item,
        id,
        links: item.links.map((destination, destinationIndex) => {
          if (typeof destination === 'string') {
            return { id: `${id}-link-${destinationIndex + 1}`, title: `Link ${destinationIndex + 1}`, url: destination };
          }
          return {
            ...destination,
            id: destination.id || `${id}-link-${destinationIndex + 1}`,
            title: destination.title || `Link ${destinationIndex + 1}`,
            url: destination.url || destination.href || ''
          };
        })
      };
    }

    return {
      id,
      title: item.title || 'Untitled entry',
      description: item.description || '',
      pinned: Boolean(item.pinned),
      featured: Boolean(item.featured),
      links: item.url || item.href ? [{ id: `${id}-link-1`, title: 'Open link', url: item.url || item.href }] : []
    };
  });
}

function getSiteData() {
  try {
    const stored = localStorage.getItem(SITE_STORAGE_KEY);
    if (stored) {
      const site = JSON.parse(stored);
      return {
        ...MOCK_SITE,
        ...site,
        links: normalizeLinkEntries(Array.isArray(site.links) ? site.links : MOCK_SITE.links),
        announcements: Array.isArray(site.announcements) ? site.announcements : []
      };
    }
  } catch {
    // Use the preview content if saved data is unavailable or invalid.
  }
  return { ...MOCK_SITE, links: normalizeLinkEntries(MOCK_SITE.links) };
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

function renderLinkCard(entry) {
  const destinations = (entry.links || []).map((destination) => ({
    ...destination,
    href: safeUrl(destination.url || destination.href)
  })).filter((destination) => destination.href);
  if (!destinations.length) return '';
  return `
    <article class="link-card${entry.pinned ? ' is-pinned' : ''}">
      <div class="card-topline">
        <span class="card-index" aria-hidden="true">${escapeHtml(String(entry.id || '↗').slice(0, 2))}</span>
        <span class="card-meta">${destinations.length} ${destinations.length === 1 ? 'link' : 'links'}${entry.pinned ? ' · Pinned' : ''}</span>
      </div>
      <div class="card-copy">
        <h3>${escapeHtml(entry.title || 'Untitled entry')}</h3>
        <p>${escapeHtml(entry.description || '')}</p>
      </div>
      <div class="entry-links">
        ${destinations.map((destination) => `
          <a class="entry-link" href="${escapeHtml(destination.href)}" target="_blank" rel="noopener noreferrer">
            <span>${escapeHtml(destination.title || 'Open link')}</span><span aria-hidden="true">↗</span>
          </a>
        `).join('')}
      </div>
    </article>
  `;
}

function renderLinks(links = []) {
  const page = document.body.dataset.page;
  const allLinks = normalizeLinkEntries(links).sort(isPinnedFirst);
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
    const matches = allLinks.filter((entry) => entry.links.some((destination) => safeUrl(destination.url || destination.href))
      && [entry.title, entry.description, ...entry.links.flatMap((destination) => [destination.title, destination.url])]
        .join(' ').toLowerCase().includes(query));
    container.innerHTML = matches.map(renderLinkCard).join('') || '<p class="empty-state">No entries match that search.</p>';
    if (count) count.textContent = `${matches.length} ${matches.length === 1 ? 'entry' : 'entries'}`;
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

function initializePublicSite() {
  const site = getSiteData();
  const siteStatus = String(site.siteStatus || 'online').toLowerCase();
  if (site.offline === true || site.isOffline === true || ['offline', 'shutdown'].includes(siteStatus)) {
    showOffline(site.offlineMessage || 'We are making a few updates. Please check back soon.');
    return;
  }
  renderAnnouncements(Array.isArray(site.announcements) ? site.announcements : []);
  renderLinks(Array.isArray(site.links) ? site.links : []);
}

if (document.body.dataset.page !== 'staff') initializePublicSite();
