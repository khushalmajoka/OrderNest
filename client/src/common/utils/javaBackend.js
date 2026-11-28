import axios from "axios";

// The backend is moving from Node to Java, one part at a time. This sends the
// calls of a moved part to the Java server; everything else stays on Node.
//
//   REACT_APP_JAVA_URL    the Java server. Not set = everything stays on Node.
//   REACT_APP_JAVA_PARTS  parts moved for everyone, e.g. "reports"
//
// To try a part in one browser only, open the app once with ?java=reports.
// ?java=off keeps that browser on Node, ?java=default forgets the choice.
const JAVA = process.env.REACT_APP_JAVA_URL || "";
const NODE = process.env.REACT_APP_BASE_URL || "";

// "reports" = activity history, usage counting and the developer page
const PARTS = {
  reports: ["/api/activity", "/api/usage", "/api/developer"],
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

const movedPaths = () =>
  chosenParts()
    .split(",")
    .flatMap((part) => PARTS[part.trim()] || []);

const matches = (url, path) => {
  const full = `${NODE}${path}`;
  return url === full || url.startsWith(`${full}/`) || url.startsWith(`${full}?`);
};

// A sleeping Java server takes about 30 seconds to wake. Wake it when the app
// is opened, and keep it awake while the app is being looked at (as the open
// dashboard already does for Node), so a moved page does not keep anyone waiting.
const keepAwake = () => {
  let woken = 0;
  const wake = () => {
    if (document.visibilityState !== "visible" || Date.now() - woken < WAKE_EVERY) return;
    if (!localStorage.getItem("token")) return; // customers use no moved page
    woken = Date.now();
    fetch(`${JAVA}/health`, { mode: "no-cors" }).catch(() => {});
  };
  document.addEventListener("visibilitychange", wake);
  setInterval(wake, 60 * 1000);
  wake();
};

export const routeMovedParts = () => {
  if (!JAVA || !NODE) return;
  const paths = movedPaths();
  if (!paths.length) return;

  axios.interceptors.request.use((config) => {
    const url = String(config.url || "");
    if (paths.some((path) => matches(url, path))) config.url = JAVA + url.slice(NODE.length);
    return config;
  });
  keepAwake();
};
