# SideWeb

[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Bun](https://img.shields.io/badge/Bun-%23000000.svg?logo=bun&logoColor=white)](https://bun.sh)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.9-3178C6?logo=typescript&logoColor=white)](https://www.typescriptlang.org)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4-06B6D4?logo=tailwindcss&logoColor=white)](https://tailwindcss.com)
[![Biome](https://img.shields.io/badge/Biome-Linter%20%26%20Formatter-60A5FA?logo=biome&logoColor=white)](https://biomejs.dev)

SideWeb is a browser-based WebADB sideloader, custom repository manager, and device exploration suite designed for Meta Quest headsets and Android devices. It runs client-side using WebUSB and the File System Access API, enabling high-speed package installation, app lifecycle management, OBB file transfers, and interactive shell access without native desktop software or third-party cloud intermediaries.

---

## Key Features

### 🚀 Sideloading Engine
- **Broad Package Support**: Install standalone `.apk` binaries, split package archives (`.xapk`, `.apks`), raw `.obb` assets, or combined ZIP archives containing both APK and OBB folders.
- **Visual Pipeline Stepper**: Live progress tracking across four stages: package inspection, APK transfer, system installation, and OBB filesystem synchronization.
- **Abort Control**: Gracefully cancel in-flight uploads and installations with automatic device cleanup.

### 🌐 Custom Repositories & App Catalog
- **Custom Repositories**: Connect to custom 7-Zip encrypted or plain HTTP repository endpoints.
- **Game Catalog**: Browse, search, and sort available releases with metadata, file sizes, package names, version codes, release notes, and cover thumbnails.
- **Sequential Queue**: 1-by-1 installation queue with progress indicators to prevent device bus contention.
- **Direct PC Downloads**: Stream games from the repository directly to local storage as ZIP archives.
- **Offline Meta Import**: Import local `meta.7z` or `VRP-GameList.txt` files when direct network access is restricted or behind captive portals.
- **Device Version Comparison & Upload**: Detect newer software releases installed on connected headsets and upload extracted packages to repository servers.

### 📦 Application Manager
- **Installed Package Browser**: View all third-party and system applications with package IDs, version codes, and labels.
- **Batch Operations**: Select multiple applications for simultaneous batch uninstallation.
- **App Launcher & Extractor**: Launch applications directly inside the headset or pull/dump installed `.apk` binaries to your computer.
- **System Package Guard**: Filter core Meta and Android system services behind a safety confirmation banner to prevent accidental OS destabilization.

### 📂 OBB Storage Explorer
- **Directory Management**: Explore `/sdcard/Android/obb` directories, delete folders, or inspect contained asset files.
- **ZIP Bundling & Pull**: Export entire game OBB directories directly to your local computer packaged as `.zip` archives.
- **Zero-RAM Disk Streaming**: Leverages the Native File System Access API (`showSaveFilePicker`) to stream multi-gigabyte transfers directly to disk without browser memory spikes.

### 💻 WebADB Terminal
- **Interactive Shell**: Execute direct `adb shell` commands from the browser with real-time output streaming and command history.
- **Quick Presets**: One-click actions for common diagnostics (`dumpsys battery`, `pm list packages -3`, `getprop ro.product.model`, `df -h /sdcard`, `reboot`).

### 📊 Diagnostics & System Metrics
- **Real-Time Hardware Telemetry**: Live battery status, Meta Quest OS version, Android build, internal storage utilization, Wi-Fi IP address, screen resolution, and chipset architecture.
- **Theme Support**: Dark, Light, and automatic system theme detection.

---

## Security & Privacy Architecture

- **100% Client-Side WebUSB**: ADB communication occurs directly between your browser and the headset over raw USB. Device keys and data never leave your local environment.
- **SSRF Mitigation**: The backend proxy strictly validates upstream URLs, disallowing loopback addresses (`127.0.0.1`, `localhost`), link-local cloud metadata IPs (`169.254.169.254`), and private RFC 1918 subnets (`10.0.0.0/8`, `172.16.0.0/12`, `192.168.0.0/16`).
- **Shell Injection Hardening**: All shell arguments are validated against strict POSIX single-quote escaping standards.
- **Strict Headers & Sandboxing**: Server responses enforce strict `Content-Security-Policy`, `X-Frame-Options: SAMEORIGIN`, `X-Content-Type-Options: nosniff`, and `Permissions-Policy: usb=(self)`.
- **Hardened Distroless Container**: Docker deployment runs on a distroless runtime with a read-only root filesystem, dropped privileges, non-root user (UID 65532), and restricted memory-backed tmpfs mounts.

---

## Browser Support

SideWeb requires the **WebUSB API**, available in modern Chromium-based desktop browsers:

| Browser | Supported | Notes |
| :--- | :---: | :--- |
| **Google Chrome** | ✅ Yes | Full support (Recommended) |
| **Microsoft Edge** | ✅ Yes | Full support |
| **Brave** | ✅ Yes | Full support (Ensure WebUSB is not blocked in Brave Shields) |
| **Opera** | ✅ Yes | Full support |
| **Mozilla Firefox** | ❌ No | WebUSB standard is not implemented by Mozilla |
| **Apple Safari** | ❌ No | WebUSB standard is not implemented by Apple |
| **iOS / iPadOS Browsers** | ❌ No | WebKit on iOS does not support WebUSB |

---

## Prerequisites

1. **Meta Quest Headset**: Meta Quest 3, Quest 2, or Quest Pro.
2. **Developer Mode**: Enabled via the Meta Horizon mobile companion app under *Devices > Headset Settings > Developer Mode*.
3. **USB-C Cable**: USB 3.0+ data cable recommended for optimal transfer throughput.
4. **USB Debugging Authorization**: When prompted inside your headset upon connection, select **"Always allow from this computer"**.

---

## Getting Started

### Local Development

Prerequisites: [Bun](https://bun.sh) (v1.1+ recommended).

```bash
# Clone the repository
git clone https://github.com/ket0x4/SideWeb.git
cd SideWeb

# Install dependencies
bun install

# Start Vite development server
bun run dev
```

Open the local development URL (typically `http://localhost:3000`) in a supported Chromium browser.

---

### Production Build & Server

```bash
# Run type check and build static production bundle
bun run build

# Start the secure Bun production server
bun run start
```

---

### Docker & Docker Compose

Run using Docker Compose:

```bash
docker compose up -d --build
```

Or build and run manually:

```bash
docker build -t sideweb .
docker run -d --name sideweb -p 3000:3000 --read-only sideweb
```

Access the application at `http://localhost:3000`.

---

## Environment Variables

Configure optional settings using environment variables or a `.env` file (see [`.env.example`](.env.example)):

| Variable | Default | Description |
| :--- | :--- | :--- |
| `PORT` | `3000` | Port for the HTTP server |
| `HOST` | `127.0.0.1` | Host address for binding (use `0.0.0.0` in Docker) |
| `REPO_API_KEY` | *(empty)* | Optional API token attached as `Authorization: Bearer` and `X-API-Key` to trusted upstream repo requests |
| `REPO_UPLOAD_URL` | *(empty)* | Optional HTTP endpoint for forwarding extracted package contributions |

---

## Available Scripts

| Command | Action |
| :--- | :--- |
| `bun run dev` | Starts Vite development server with HMR |
| `bun run build` | Runs TypeScript compilation (`tsc`) and bundles production assets |
| `bun run preview` | Previews the compiled production bundle locally |
| `bun run start` | Runs the Bun production HTTP server (`server.ts`) |
| `bun test` | Executes the unit and integration test suite |
| `bun run check` | Runs Biome code diagnostics and lint checks |
| `bun run format` | Automatically formats codebase with Biome |

---

## Tech Stack

- **Frontend**: React 19, TypeScript, Tailwind CSS v4, Lucide React
- **ADB & WebUSB Protocol**: `@yume-chan/adb`, `@yume-chan/adb-daemon-webusb`, `@yume-chan/adb-credential-web`
- **Compression & Archives**: `fflate`, `7zip-bin`
- **Tooling & Runtime**: Bun, Vite, Biome

---

## Legal Disclaimer

SideWeb is an independent, open-source project and is not affiliated with, authorized by, maintained by, or in any way officially associated with Meta Platforms, Inc., Oculus, or Google LLC.

SideWeb does not host, store, index, or distribute any copyrighted software, firmware, or games. Users are solely responsible for ensuring they possess the legal rights to inspect, backup, install, or modify software on their own hardware.

---

## License

This project is licensed under the [MIT License](LICENSE).

