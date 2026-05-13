# Thermal interaction web

Static single-page app (React + Vite) for exploring research papers and interactive body-map filters. There is no backend in this repo; everything runs in the browser.

## Requirements

| Tool        | Version                                                                                                                                                                                       |
| ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Node.js** | **20.x ≥20.19** or **22.x ≥22.12** ([Vite 8](https://vitejs.dev/) supported ranges).<br>Easiest: install current **LTS** from [nodejs.org](https://nodejs.org/).<br>Node 18 is not supported. |
| **npm**     | **10+** (ships with Node 20+). `pnpm` / `yarn` work if you prefer, from the `frontend` directory.                                                                                             |

Check your versions:

```bash
node -v   # e.g. v20.19.0 or v22.12.0
npm -v    # e.g. 10.8.2
```

## Run locally

All install and dev commands are run from the **`frontend`** folder (that is where `package.json` lives).

```bash
cd thermal-interaction-web/frontend
npm install
npm run dev
```

Then open the URL Vite prints (usually **http://localhost:5173**). Edit code and the page hot-reloads.

## Other scripts

| Command           | Description                                             |
| ----------------- | ------------------------------------------------------- |
| `npm run build`   | Typecheck + production bundle into `frontend/dist/`.    |
| `npm run preview` | Serve the production build locally (run after `build`). |
| `npm run lint`    | ESLint.                                                 |

## Troubleshooting

- **`npm install` fails or Vite warns about Node** — Upgrade to Node **20.19+** or **22.12+** (e.g. via [nvm](https://github.com/nvm-sh/nvm) or the installer from [nodejs.org](https://nodejs.org/)).
- **Port already in use** — Vite will try another port, or run `npm run dev -- --port 5174`.
