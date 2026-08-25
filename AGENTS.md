# Repository Guidelines

## Project Structure & Module Organization

iTabs is a React/Vite Chrome new-tab extension. `src/main.jsx` mounts the page and `src/App.jsx` coordinates state. Reusable UI belongs in `src/components/`; hooks, browser services, and helpers belong in `src/hooks/`, `src/services/`, and `src/utils/`. The popup entry point is under `src/popup/`. Static extension files live in `public/`. `workers/workers.js` contains the optional Cloudflare sync Worker. Vite writes distributable files to untracked `dist/`.

## Build, Test, and Development Commands

- `npm install` installs project dependencies.
- `npm run dev` starts the Vite development server with hot reload.
- `npm run build` produces the extension bundle in `dist/`.
- `npm run preview` serves the production bundle for a quick browser check.
- `npm run lint` runs ESLint across JavaScript and JSX sources.

After building, open `chrome://extensions`, enable Developer mode, and load `dist/` as an unpacked extension. Rebuild before testing the popup or new-tab override.

## Coding Style & Naming Conventions

Use ES modules and functional React components. Follow the surrounding style, using two-space indentation in JSX and configuration files, single quotes in JavaScript, and trailing commas in multiline constructs. Name components and their files in PascalCase (`TodoPanel.jsx`), hooks with a `use` prefix (`useIconSource.js`), and utilities/services in camelCase. Keep state ownership near `App.jsx`, but extract reusable presentation or browser-integration logic. ESLint enforces recommended JavaScript, React Hooks, and Vite refresh rules; resolve warnings before submitting.

## Testing Guidelines

No automated test framework is currently configured. Every change must pass `npm run lint` and `npm run build`. Manually verify the new-tab page and popup in Chrome. For UI or persistence changes, test reload behavior, `localStorage` migration, drag-and-drop, and relevant sync/offline paths. If adding tests, place them beside the source as `*.test.jsx` or under `src/__tests__/`, and add the runner command to `package.json`.

## Commit & Pull Request Guidelines

Recent commits use short, imperative, sentence-case summaries such as `Fix unsplash wallpaper load effect`. Keep each commit focused and explain behavior rather than implementation trivia. Pull requests should include a concise description, validation steps, and linked issues when applicable. Add before/after screenshots for visual changes and call out changes to `public/manifest.json`, storage formats, permissions, or Worker API behavior.

## Security & Configuration

Never commit tokens, Worker URLs, `.env*` files, private keys, or packaged `.crx` artifacts. Keep requested Chrome permissions and host permissions minimal, and document any new permission in the pull request.
