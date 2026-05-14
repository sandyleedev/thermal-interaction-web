# Thermal Interaction Web

This is a static single-page website for exploring thermal interaction research papers using interactive filters and a body-map visualisation.

There is no backend server. Everything runs locally in the browser.

## Opening the website locally

To open the website on your computer, Node.js and npm are required. No IDE or code editor is required.

### 1. Install Node.js

Please install the current LTS version of Node.js from [nodejs.org](https://nodejs.org/).

After installing Node.js, you can check that it is available by opening a terminal and running:

```bash
node -v
npm -v
```

Recommended versions:

| Tool    | Version          |
| ------- | ---------------- |
| Node.js | 20.19+ or 22.12+ |
| npm     | 10+              |

### 2. Open a terminal in the `frontend` folder

On macOS:
<br>
<img src="/docs/open-in-terminal.png" alt="Open in Terminal on macOS" width="400">

1. Open the unzipped project folder in Finder.
2. Right-click the `frontend` folder.
3. Select `Open in Terminal`.

On Windows:

1. Open the unzipped project folder.
2. Open the `frontend` folder.
3. Click the address bar at the top of File Explorer.
4. Type `cmd` and press Enter.

After this, the terminal should be opened in the correct `frontend` folder.

### 3. Install the required packages

Run:

```bash
npm install
```

This may take a few minutes the first time.

### 4. Start the website

Run:

```bash
npm run dev
```

### 5. Open the website in your browser

After the command starts successfully, the terminal will show a local URL, usually:

```text
http://localhost:5173
```

Open this URL in your browser.

The website should then be available locally on your computer.

### 6. Stop the local server

To stop the website, go back to the terminal window and press `Ctrl + C`.

## Developer commands

All commands should be run from the `frontend` folder.

| Command           | Description                               |
| ----------------- | ----------------------------------------- |
| `npm run dev`     | Start the local development server        |
| `npm run build`   | Typecheck and create the production build |
| `npm run preview` | Preview the production build locally      |
| `npm run lint`    | Run ESLint                                |

## Troubleshooting

### Node.js version warning

If installation fails or Vite shows a Node.js warning, please install a newer LTS version of Node.js.

The recommended versions are Node.js 20.19+ or 22.12+.

### Port already in use

If port `5173` is already being used, Vite may open the website on another port.

Please use the URL shown in the terminal.
