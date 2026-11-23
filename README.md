# Mode Digital Studio

Studio site for Mode Academy's digital production studio. Next.js (static export), TypeScript, Tailwind CSS 4, GSAP, React Three Fiber, Lenis, Motion.

## Run

```
npm install
npm run dev      # http://localhost:5173
npm run build    # static site in /out, upload that folder to any host
```

Add `?intro` to the URL to replay the opening sequence (it plays once per browser tab).

## Content

Everything on the page comes from three files in `data/`:

- `projects.ts`: the studio's websites. Each card plays a short muted recording of the live site: put the MP4 and a poster frame in `public/sites/loops/` and set `loop` and `cover`.
- `media.ts`: the video cards and the document notebook.
  - Videos stream from Google Drive. The file must be shared as "anyone with the link can view". Add `{ chapter, title, drive: "<file id>" }`; save a poster as `public/video/drive/<file id>.webp`, or set `poster: false` for a typographic cover.
  - The brochure pages are images in `public/docs/tanitim-kitapcigi/` rendered from the PDF's trim box; the PDF itself is `public/docs/mode-academy-tanitim-kitapcigi.pdf`.
- `studio.ts`: services, navigation, contact link.

The document notebook never turns on its own: pages move only with the Back/Next buttons, page corners, the arrow keys or a swipe.

## Before launch

- The intro presenter is an SVG illustration in `components/intro/Presenter.tsx` (no licence needed).

## Publish

Every push to `main` builds the site and publishes it to GitHub Pages (`.github/workflows/pages.yml`).
Live address: https://ahmetfarah22.github.io/modedigitalstudio/
