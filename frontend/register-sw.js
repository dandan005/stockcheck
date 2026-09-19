// register-sw.js
// Import/run this once from your app's entry point (e.g. main.jsx / main.ts)

export function registerServiceWorker() {
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", () => {
      navigator.serviceWorker
        .register("/service-worker.js")
        .then((reg) => console.log("Service worker registered:", reg.scope))
        .catch((err) => console.error("SW registration failed:", err));
    });
  }

  // Listen for the flush signal from the service worker's sync event
  navigator.serviceWorker?.addEventListener("message", (event) => {
    if (event.data?.type === "SYNC_STOCK_CHECKS") {
      // TODO: read queued checks from IndexedDB (Dexie) and POST to /api/checks
      console.log("Flushing queued stock checks...");
    }
  });
}

// --- Install prompt handling (custom "Add to Home Screen" UX) ---
let deferredPrompt;

export function listenForInstallPrompt(onPromptAvailable) {
  window.addEventListener("beforeinstallprompt", (e) => {
    e.preventDefault();
    deferredPrompt = e;
    onPromptAvailable?.(); // e.g. show your own "Install App" button
  });
}

export async function triggerInstallPrompt() {
  if (!deferredPrompt) return false;
  deferredPrompt.prompt();
  const { outcome } = await deferredPrompt.userChoice;
  deferredPrompt = null;
  return outcome === "accepted";
}
