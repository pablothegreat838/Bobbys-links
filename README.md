# Bobby's Links

A static, vanilla HTML/CSS/JavaScript links site for Cloudflare Pages. The public pages are `index.html` and `links.html`; `staff.html` provides the unlisted staff panel at `/staff`.

## Deploy

Deploy this directory as the Cloudflare Pages project root. No build command or framework is required. The site uses root-relative asset and navigation URLs, so deploy it at the domain root.

## Staff panel

Open `/staff` to manage link entries, announcements, and website availability. Each entry can contain multiple URLs pasted one per line; use `Name | URL` to set a custom link name. Entries can be added, edited, removed, pinned, or featured on the home page. Announcements can also be added, edited, removed, and pinned. Without saved content, the site uses the grouped preview data in `script.js`.

## Storage and access

This frontend-only version saves edits in the current browser's `localStorage`. Changes are visible to the public pages only in that same browser and origin; they do not sync to visitors, other devices, or browsers. `/staff` is unlisted but has no authentication, so anyone who knows the address can access its controls. A shared, protected staff system requires a server-side backend and authentication; browser storage alone cannot provide either.
