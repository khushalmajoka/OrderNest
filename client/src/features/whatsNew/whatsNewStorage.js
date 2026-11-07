import { WHATS_NEW_VERSION } from "./updates";

// Remembers (in this browser) which update each user has already read.
// Kept per user, so two shop owners on one computer each see it once.
const keyFor = (userId) => `whatsNewSeen:${userId}`;

export const hasSeenWhatsNew = (userId) => {
  if (!userId) return true; // not logged in: nothing to show
  try {
    return localStorage.getItem(keyFor(userId)) === WHATS_NEW_VERSION;
  } catch {
    return false;
  }
};

export const markWhatsNewSeen = (userId) => {
  if (!userId) return;
  try {
    localStorage.setItem(keyFor(userId), WHATS_NEW_VERSION);
  } catch {
    // storage blocked: the popup may show again next time, nothing else breaks
  }
};

// Log out: remove the login details but keep the "already read" notes,
// otherwise the popup would come back after every login.
export const clearSession = () => {
  ["token", "userId", "shopId", "shop"].forEach((key) =>
    localStorage.removeItem(key)
  );
};
