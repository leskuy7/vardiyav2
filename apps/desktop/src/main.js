const { app, BrowserWindow, ipcMain, Menu, nativeTheme, shell } = require("electron");
const { spawn, execFile } = require("node:child_process");
const path = require("node:path");
const { promisify } = require("node:util");

const execFileAsync = promisify(execFile);
const rootDir = path.resolve(__dirname, "../../..");
const splashPath = path.join(__dirname, "splash.html");
const appUrl = process.env.VARDIYA_DESKTOP_URL || "http://localhost:3000";
const apiHealthUrl = process.env.VARDIYA_DESKTOP_API_HEALTH_URL || "http://localhost:4000/api/health";
const mode = process.argv.includes("--mode=development") ? "development" : "production";
const manageServers = process.env.VARDIYA_DESKTOP_MANAGED_SERVERS !== "false";

/** @type {import('child_process').ChildProcess[]} */
const managedChildren = [];
let mainWindow = null;
let quitting = false;

function getNpmCommand() {
  return process.platform === "win32" ? "npm.cmd" : "npm";
}

function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function isUrlReady(url) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 1500);

  try {
    const response = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      cache: "no-store",
    });
    return response.ok || response.status < 500;
  } catch {
    return false;
  } finally {
    clearTimeout(timeoutId);
  }
}

async function waitForUrl(url, attempts = 90, delayMs = 1000) {
  for (let index = 0; index < attempts; index += 1) {
    if (await isUrlReady(url)) {
      return true;
    }
    await delay(delayMs);
  }
  return false;
}

function spawnManagedProcess(label, scriptName) {
  const child = spawn(getNpmCommand(), ["run", scriptName], {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
    windowsHide: false,
  });

  child.on("exit", (code) => {
    if (!quitting && code && mainWindow && !mainWindow.isDestroyed()) {
      showSplash("error", `${label} sureci beklenmedik sekilde kapandi (kod: ${code}).`);
    }
  });

  managedChildren.push(child);
  return child;
}

async function ensureService(label, checkUrl, scriptName) {
  if (await isUrlReady(checkUrl)) {
    return;
  }

  spawnManagedProcess(label, scriptName);
  const ready = await waitForUrl(checkUrl, 120, 1000);

  if (!ready) {
    throw new Error(`${label} servisi zamaninda hazir olmadi`);
  }
}

async function stopManagedProcesses() {
  const children = managedChildren.splice(0, managedChildren.length);
  if (children.length === 0) {
    return;
  }

  if (process.platform === "win32") {
    await Promise.all(
      children
        .filter((child) => child.pid)
        .map((child) =>
          execFileAsync("taskkill", ["/pid", String(child.pid), "/t", "/f"]).catch(() => undefined)
        )
    );
    return;
  }

  for (const child of children) {
    if (child.killed) {
      continue;
    }
    child.kill("SIGTERM");
  }
}

function showSplash(status = "loading", message = "") {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  return mainWindow.loadFile(splashPath, {
    query: {
      status,
      message,
      mode,
    },
  });
}

async function connectWindow() {
  if (!mainWindow || mainWindow.isDestroyed()) {
    return;
  }

  showSplash("loading", "Vardiya masaustu uygulamasi hazirlaniyor...");

  try {
    if (manageServers) {
      await ensureService("API", apiHealthUrl, mode === "development" ? "dev:api" : "start:api");
      await ensureService("Web", appUrl, mode === "development" ? "dev:web" : "start:web");
    } else {
      const ready = await waitForUrl(appUrl, 60, 1000);
      if (!ready) {
        throw new Error("Web uygulamasi ulasilabilir degil");
      }
    }

    await mainWindow.loadURL(appUrl);
  } catch (error) {
    const message =
      error instanceof Error
        ? error.message
        : "Masaustu uygulama baslatilamadi";
    await showSplash("error", message);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    title: "Vardiya Desktop",
    width: 1480,
    height: 960,
    minWidth: 1180,
    minHeight: 760,
    show: false,
    autoHideMenuBar: true,
    backgroundColor: nativeTheme.shouldUseDarkColors ? "#0b1220" : "#f3f6fb",
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false,
    },
  });

  mainWindow.once("ready-to-show", () => {
    if (mainWindow && !mainWindow.isDestroyed()) {
      mainWindow.show();
    }
  });

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: "deny" };
  });

  mainWindow.webContents.on("will-navigate", (event, targetUrl) => {
    const currentOrigin = new URL(appUrl).origin;
    const nextOrigin = new URL(targetUrl).origin;
    if (currentOrigin !== nextOrigin) {
      event.preventDefault();
      shell.openExternal(targetUrl);
    }
  });

  void connectWindow();
}

ipcMain.handle("desktop:retry", async () => {
  await connectWindow();
  return true;
});

ipcMain.handle("desktop:open-browser", async () => {
  await shell.openExternal(appUrl);
  return true;
});

if (!app.requestSingleInstanceLock()) {
  app.quit();
} else {
  app.on("second-instance", () => {
    if (!mainWindow) {
      return;
    }
    if (mainWindow.isMinimized()) {
      mainWindow.restore();
    }
    mainWindow.focus();
  });

  app.whenReady().then(() => {
    Menu.setApplicationMenu(null);
    createWindow();
  });

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });

  app.on("before-quit", () => {
    quitting = true;
    void stopManagedProcesses();
  });

  app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
      app.quit();
    }
  });
}
