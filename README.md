# BBA Brochure Library

Static site for **brochures.bbaarchitect.com**, hosted on Azure Static Web Apps.

## What's in here

| Path | What it is |
|---|---|
| `index.html` | Public brochure library (shows only brochures marked visible) |
| `viewer.html` | Flipbook viewer, opened as `/viewer.html?b=<id>` |
| `staff/index.html` | Staff library: every brochure, including hidden ones (staff sign-in required) |
| `brochures.json` | **The brochure list.** Titles, descriptions, markets, page captions, and the `visible` switch |
| `brochures/<id>/pages/p01.jpg …` | Page images (1600 px wide) |
| `brochures/<id>/BBA-<id>.pdf` | Web-sized PDF for download |
| `site-config.js` | HubSpot form IDs and contact details |
| `staticwebapp.config.json` | Azure security rules: staff-only pages, sign-in, caching, headers |
| `assets/` | Styles, scripts, logos |

## First deployment

1. Upload everything in this folder to the root of the private `bba-brochures` GitHub repository (GitHub: **Add file → Upload files**, drag the contents in, **Commit changes**).
2. In the Azure portal: **Create a resource → Static Web App**.
   - Plan: **Free** (switch to Standard later under Settings → Hosting plan if you want an SLA).
   - Source: **GitHub**, repository `bba-brochures`, branch `main`.
   - Build preset: **HTML** (or Custom). App location `/`. Leave API and output location blank.
3. Azure adds a workflow file to the repository and deploys. Check progress in the repo's **Actions** tab. When it's green, open the `*.azurestaticapps.net` address Azure shows.
4. **Custom domain:** Static Web App → **Custom domains → Add → Custom domain on other DNS**, enter `brochures.bbaarchitect.com`, and create the CNAME record it shows at your DNS host (Squarespace: **Domains → bbaarchitect.com → DNS settings**). The certificate is issued automatically once it validates.
5. **Staff access:** Static Web App → **Role management → Invite**. Provider **Microsoft Entra ID**, the person's BBA email, role `staff`. They open the invitation link and sign in with their BBA Microsoft 365 account. Staff pages: `/staff/`.
6. **Squarespace link:** add a navigation link named *Brochures* pointing to `https://brochures.bbaarchitect.com`.

## Show or hide a brochure

Open `brochures.json` on GitHub, click the pencil icon, change `"visible": true` to `false` (or back), and **Commit changes**. The site updates in about a minute.

Hidden brochures disappear from the public library and their viewer link says "not available yet." Staff can still open them from `/staff/`.

**Note:** hiding removes a brochure from the site, but its image files stay at their web addresses. For anything confidential, keep its files under `brochures/drafts/<id>/` (set `"folder"` and `"pdf"` to match). That folder is staff-only.

## Add a new brochure

1. Create `brochures/<id>/pages/` with page images named `p01.jpg`, `p02.jpg`, … (1600 px wide JPEGs) and the web PDF `brochures/<id>/BBA-<id>.pdf`.
2. Add an entry to `brochures.json`:
   ```json
   {
     "id": "resort-hospitality",
     "title": "Resort & Hospitality",
     "sector": "resort & hospitality",
     "also": [],
     "visible": false,
     "description": "One or two sentences naming the strongest projects.",
     "pdf": "brochures/resort-hospitality/BBA-resort-hospitality.pdf",
     "folder": "brochures/resort-hospitality/pages",
     "pages": ["Cover: …", "Page 2: …", "Back cover: …"]
   }
   ```
   `pages` holds one caption per page (used by screen readers); its length sets the page count. `also` lists other markets the brochure should appear under.
3. Review it at `/staff/`, then set `"visible": true`.

The placeholder entries already in the file (Resort & Hospitality, Retail & Restaurant, Master & Site Planning, Custom Residential, Light Industrial) only need `pages`, `pdf`, and `folder` added.

If you replace a page image with an updated one under the same file name, visitors may see the old image for up to an hour (browser caching).

## HubSpot lead form

1. In HubSpot, create a form with fields **First name, Last name, Email, Company**.
2. Copy the **portal ID** and **form ID** (in the form's embed code) into `site-config.js`.
3. Optional: a HubSpot workflow that emails the PDF and notifies a principal.

Until the IDs are filled in, *Download PDF* offers the file directly with no form.

## Before launch

- Hide or replace any brochure with open content questions.
- Add a privacy notice for the lead form (Cynthia).
- Add analytics if wanted (Squarespace analytics don't cover this subdomain). Any analytics script needs its domain added to the Content-Security-Policy in `staticwebapp.config.json`.
