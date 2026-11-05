# Bobby's Links

A static, vanilla HTML/CSS/JavaScript links site for Cloudflare Pages. The pages are `index.html`, `links.html`, and the unlisted configuration page `ba.html`; Cloudflare Pages serves the clean routes `/`, `/links`, and `/ba` from these files.

## Deploy

Deploy this directory as the Cloudflare Pages project root. No build command or framework is required. The site uses root-relative asset and navigation URLs, so deploy it at the domain root.

## Staff API

Until an API connection is saved on `/ba`, the site renders the mock data in `script.js`. The public site makes a read-only `GET` request to `{API origin}/api/site`; the saved base URL is normalized to its origin. The staff service should return JSON in this shape:

```json
{
	"siteStatus": "online",
	"offlineMessage": "We are making a few updates. Please check back soon.",
	"links": [
		{
			"id": "daily-brief",
			"title": "The Daily Brief",
			"description": "A quick read to get the day moving.",
			"url": "https://example.com/daily-brief",
			"pinned": true,
			"featured": true
		}
	],
	"announcements": [
		{
			"id": "welcome",
			"title": "A quick heads-up",
			"message": "An update for visitors.",
			"pinned": true
		}
	]
}
```

Set `siteStatus` to `offline` (or `shutdown`) to show the maintenance screen. The site also shows that screen if the API cannot be reached. Link and announcement creation, editing, deletion, and pinning belong to the separate staff application; this public site only reads and displays the returned data.

If the API requires a key, `/ba` sends it as a Bearer token. The key is stored in this browser's `localStorage` and is visible to visitors through browser tools, so only use a public, read-only key. The API must allow cross-origin requests from the Pages domain (including `OPTIONS` if its deployment requires a preflight).
