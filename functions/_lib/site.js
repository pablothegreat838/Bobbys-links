export const DEFAULT_SITE = {
  siteStatus: 'online',
  offlineMessage: 'We are making a few updates. Please check back soon.',
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

function boundedText(value, maxLength) {
  return String(value || '').trim().slice(0, maxLength);
}

function normalizeUrl(value) {
  const input = String(value || '').trim();
  if (!input) return '';
  const hasScheme = /^[a-z][a-z\d+.-]*:/i.test(input);
  const candidate = !hasScheme && /^[^\s.]+(?:\.[^\s.]+)+(?:[/?#][^\s]*)?$/.test(input)
    ? `https://${input}`
    : input;
  try {
    const url = new URL(candidate);
    return ['http:', 'https:', 'mailto:', 'tel:', 'ftp:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

export function validateSite(value) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  if (!Array.isArray(value.links) || value.links.length > 500) return null;
  if (!Array.isArray(value.announcements) || value.announcements.length > 200) return null;

  const links = [];
  for (const [entryIndex, entry] of value.links.entries()) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry)) return null;
    const title = boundedText(entry.title, 100);
    const destinations = Array.isArray(entry.links)
      ? entry.links
      : entry.url || entry.href
        ? [{ title: 'Open link', url: entry.url || entry.href }]
        : [];
    if (!title || !destinations.length || destinations.length > 300) return null;

    const normalizedDestinations = [];
    for (const [destinationIndex, destination] of destinations.entries()) {
      if (!destination || typeof destination !== 'object' || Array.isArray(destination)) return null;
      const destinationTitle = boundedText(destination.title, 100);
      const url = normalizeUrl(destination.url || destination.href || '');
      const text = boundedText(destination.text, 500) || (!url ? destinationTitle : '');
      if (!destinationTitle && !text) return null;
      normalizedDestinations.push({
        id: boundedText(destination.id, 120) || `entry-${entryIndex + 1}-link-${destinationIndex + 1}`,
        title: destinationTitle || text.slice(0, 100) || `Link ${destinationIndex + 1}`,
        url,
        text
      });
    }

    links.push({
      id: boundedText(entry.id, 120) || `entry-${entryIndex + 1}`,
      title,
      description: boundedText(entry.description, 180),
      pinned: Boolean(entry.pinned),
      featured: Boolean(entry.featured),
      links: normalizedDestinations
    });
  }

  const announcements = [];
  for (const [index, announcement] of value.announcements.entries()) {
    if (!announcement || typeof announcement !== 'object' || Array.isArray(announcement)) return null;
    const title = boundedText(announcement.title, 100);
    const message = boundedText(announcement.message || announcement.description, 500);
    if (!title || !message) return null;
    announcements.push({
      id: boundedText(announcement.id, 120) || `announcement-${index + 1}`,
      title,
      message,
      pinned: Boolean(announcement.pinned)
    });
  }

  const siteStatus = String(value.siteStatus || 'online').toLowerCase();
  return {
    siteStatus: ['offline', 'shutdown'].includes(siteStatus) ? 'offline' : 'online',
    offlineMessage: boundedText(value.offlineMessage, 180),
    links,
    announcements
  };
}