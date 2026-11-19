# Intelligent Adaptive Traffic Control System for Dhaka City

Project website for the BRTC, BUET adaptive traffic signal project.
A single page (Home, Team, Resources, Contact) with smooth scrolling, an image carousel, a gallery,
and an interactive **signal-timing optimization simulator**.

**Live site (after deploy):** https://aitrafficbuet.github.io

## Deploy on GitHub Pages

1. Create a repository named **`aitrafficbuet.github.io`** under the `aitrafficbuet` account.
2. Upload / push everything in this folder to the `main` branch:
   ```bash
   git init
   git add .
   git commit -m "Project website"
   git branch -M main
   git remote add origin https://github.com/aitrafficbuet/aitrafficbuet.github.io.git
   git push -u origin main
   ```
3. In the repo: **Settings → Pages → Build and deployment → Source: GitHub Actions**.
   The included workflow (`.github/workflows/pages.yml`) publishes the site on every push.
   (Alternatively choose *Deploy from a branch → main / root*; both work, no build step needed.)

If you use a different repo name (e.g. `website`), the URL becomes `https://aitrafficbuet.github.io/website/`. All paths are relative, so it works either way.

## Editing content

Almost everything lives in **`js/data.js`**:

| What | Key in `data.js` |
|---|---|
| Carousel slides (5 dots) | `slides` |
| Gallery images | `gallery` |
| Team leaders / PIs | `leaders` |
| Sub-teams CS · Civil · Elec · ME | `teams` |
| Funding (GoB, DSCC, DNCC, BUET) | `funding` |
| Tech stack, documents | `tech`, `documents` |
| Address, email, map | `contact` |

- Add photos to `assets/img/photos/` and point to them (`photo: "assets/img/photos/name.jpg"`). Members without a photo get an initials avatar.
- **Set `contact.email`** — the contact form opens the visitor's mail app addressed to it.
- The illustrations (`*.svg`) are placeholders drawn for the site. Swap them for real photos as you collect them.

## The simulator (`js/simulation.js`)

Two identical 4-arm intersections (left-hand traffic, with cars, buses, CNGs and rickshaws) receive the **same seeded random arrivals**, so only the controller differs:

- **Fixed-time**: user-set N–S / E–W greens
- **Webster optimal**: cycle `C₀ = (1.5L + 5) / (1 − Y)`, greens split by flow ratio, recomputed each cycle
- **Actuated**: min/max green with 3 s gap-out
- **Adaptive (AI · queue pressure)**: switches when the competing phase's queue (plus a waiting-time term that prevents starvation) clearly exceeds the current one. This is the kind of control camera-based queue measurement makes possible.

Metrics: average delay per vehicle, current and max queue, vehicles served, and a live queue-over-time chart.
Constants (amber, all-red, saturation flow, vehicle mix) are at the top of the file.

## Structure
```
index.html          page markup (all sections)
css/style.css       styles
js/data.js          ← edit content here
js/main.js          carousel, nav scroll-spy, team tabs, gallery lightbox
js/simulation.js    traffic simulator
assets/img/         images
```
