import axios from "axios";

// The backend is moving from Node to Java, one part at a time. This sends the
// calls of a moved part to the Java server; everything else stays on Node.
//
//   REACT_APP_JAVA_URL    the Java server. Not set = everything stays on Node.
//   REACT_APP_JAVA_PARTS  parts moved for everyone, e.g. "reports,auth"
//
// To try parts in one browser only, open the app once with ?java=reports,auth.
// ?java=off keeps that browser on Node, ?java=default forgets the choice.
//
// axios calls are redirected by themselves. A call made with fetch must wrap
// its address in backendUrl().
const JAVA = process.env.REACT_APP_JAVA_URL || "";
const NODE = process.env.REACT_APP_BASE_URL || "";

const PARTS = {
  // activity history, usage counting and the developer page
  reports: ["/api/activity", "/api/usage", "/api/developer"],
  // sign-up, login, passwords and email codes
  auth: ["/api/auth"],
};

const KEY = "javaParts";
const WAKE_EVERY = 10 * 60 * 1000; // a free server sleeps after 15 idle minutes

const chosenParts = () => {
  try {
    const asked = new URLSearchParams(window.location.search).get("java");
    if (asked === "default") localStorage.removeItem(KEY);
    else if (asked) localStorage.setItem(KEY, asked);
    const own = localStorage.getItem(KEY);
    if (own) return own;
  } catch {
    // no storage (private window): the setting for everyone applies
  }
  return process.env.REACT_APP_JAVA_PARTS || "";
};

// decided once, when the app is opened
let moved = [];

const matches = (url, path) => {
  const full = `${NODE}${path}`;
  return url === full || url.startsWith(`${full}/`) || url.startsWith(`${full}?`);
};

/** Where this call should go: the Java server for a moved part, else as it is. */
export const backendUrl = (url) =>
  moved.some((path) => matches(url, path)) ? JAVA + url.slice(NODE.length) : url;

// A sleeping Java server takes about 30 seconds to wake. Wake it when the app
// is opened, and keep it awake while the app is being looked at (as the open
// dashboard already does for Node), so a moved page does not keep anyone
// waiting. Someone about to log in has no login yet, so the shop's own pages
// wake it too when login has moved. Customers' pages use no moved part.
const keepAwake = () => {
  let woken = 0;
  const needed = () =>
    localStorage.getItem("token") ||
    (moved.includes("/api/auth") && window.location.pathname.startsWith("/shop"));
  const wake = () => {
    if (document.visibilityState !== "visible" || Date.now() - woken < WAKE_EVERY || !needed()) return;
    woken = Date.now();
    fetch(`${JAVA}/health`, { mode: "no-cors" }).catch(() => {});
  };
  document.addEventListener("visibilitychange", wake);
  setInterval(wake, 5 * 1000); // soon after reaching the login page, too
  wake();
};

export const routeMovedParts = () => {
  if (!JAVA || !NODE) return;
  moved = chosenParts()
    .split(",")
    .flatMap((part) => PARTS[part.trim()] || []);
  if (!moved.length) return;

  axios.interceptors.request.use((config) => {
    config.url = backendUrl(String(config.url || ""));
    return config;
  });
  keepAwake();
};
