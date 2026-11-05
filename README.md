# Bobby's Links

A static, vanilla HTML/CSS/JavaScript links site for Cloudflare Pages. The public pages are `index.html` and `links.html`; `staff.html` provides the unlisted staff panel at `/staff`.

## Deploy

Deploy this directory as the Cloudflare Pages project root. No build command or framework is required. The `functions/` directory provides the internal Pages API routes, and the site uses root-relative asset and navigation URLs, so deploy it at the domain root.

Before shared publishing works, configure the Pages project:

1. Create a Cloudflare KV namespace and bind it as `SITE_CONTENT` for both Production and Preview.
2. Add `ADMIN_PASSWORD` as a secret for the staff sign-in.
3. Add `SESSION_SECRET` as a secret containing at least 32 characters of random data. Keep both secrets out of the repository.
4. Redeploy Pages so the Functions receive the bindings and secrets.

The public pages fetch the latest KV content on load and refresh every 15 seconds. KV is globally distributed, though updates may take a short time to reach every region.

## Staff panel

Open `/staff` to sign in and manage link entries, announcements, and website availability. Each entry can contain multiple URLs pasted one per line; use `Name | URL` to set a custom link name. Edits are saved directly to KV and shared with public visitors. If the current browser has a draft from the static-only version, sign in and choose **Import local draft** once.

## Shared publishing

The public site reads content from the Pages API, which reads and writes the `SITE_CONTENT` KV namespace. Staff changes do not require a static file download or redeployment once the KV binding and secrets are configured.
