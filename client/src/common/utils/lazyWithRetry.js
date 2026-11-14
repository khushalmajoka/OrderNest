import { lazy } from "react";

// React.lazy for a part of the app that is only downloaded when needed.
//
// After a new version of the app is put online, a browser that still has the
// old version open may ask for a file that no longer exists. Then the page is
// reloaded ONCE, which brings the new version. (If it fails again, the error
// is shown instead of reloading forever.)
const FLAG = "chunk-reload-at";

export const lazyWithRetry = (load) =>
  lazy(async () => {
    try {
      const module = await load();
      try {
        sessionStorage.removeItem(FLAG);
      } catch {
        /* storage blocked: fine */
      }
      return module;
    } catch (error) {
      let last = 0;
      try {
        last = Number(sessionStorage.getItem(FLAG)) || 0;
      } catch {
        /* storage blocked: fine */
      }
      // Reload only if we did not already reload in the last 30 seconds
      if (Date.now() - last > 30000) {
        try {
          sessionStorage.setItem(FLAG, String(Date.now()));
        } catch {
          /* storage blocked: fine */
        }
        window.location.reload();
        return new Promise(() => {}); // wait for the reload
      }
      throw error;
    }
  });
