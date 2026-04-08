const { contextBridge, ipcRenderer } = require("electron");

const appUrl = process.env.VARDIYA_DESKTOP_URL || "http://localhost:3000";
const mode = process.argv.includes("--mode=development") ? "development" : "production";

contextBridge.exposeInMainWorld("vardiyaDesktop", {
  mode,
  appUrl,
  electronVersion: process.versions.electron,
  retryConnection: () => ipcRenderer.invoke("desktop:retry"),
  openInBrowser: () => ipcRenderer.invoke("desktop:open-browser"),
});
