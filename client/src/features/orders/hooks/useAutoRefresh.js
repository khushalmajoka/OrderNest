import { useEffect, useRef, useState } from "react";
import axios from "axios";

const CHECK_EVERY_MS = 30000;
const MIN_GAP_MS = 5000; // coming back to the tab does not ask more often than this

// Keeps the dashboard up to date when someone else (a friend on another
// computer, a staff member) creates, edits or deletes orders.
//
// Every 30 seconds while the page is on screen, and when the person comes back
// to the tab, it asks the server one tiny question: "has anything changed?"
// (the server answers with a short token). If the token is not the one that
// came with the orders on screen, `onChanged` is called (the dashboard then
// reloads quietly). Nothing happens while `paused` (for example while an order
// is being edited, so typing is never disturbed) or while the page is hidden.
//
// Returns { checkedAt, checkNow }: when the list was last known to be up to
// date, and a way to ask right now.
export const useAutoRefresh = ({ shopId, token, paused, onChanged }) => {
  const [checkedAt, setCheckedAt] = useState(null);
  // Always the newest values, so the timer does not have to be restarted
  const latest = useRef({});
  latest.current = { token, paused, onChanged };
  const lastAsk = useRef(0);
  const asking = useRef(false);
  const asked = useRef(null); // the change the dashboard was last told about

  // A list that has just arrived is up to date
  useEffect(() => {
    if (token) setCheckedAt(Date.now());
  }, [token]);

  const check = useRef(async () => {});
  check.current = async () => {
    const { token: known, paused: isPaused, onChanged: changed } = latest.current;
    if (!shopId || !known || isPaused || asking.current) return;
    asking.current = true;
    lastAsk.current = Date.now();
    try {
      const res = await axios.get(
        `${process.env.REACT_APP_BASE_URL}/api/orders/shop/${shopId}/changes`,
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      if (latest.current.paused) return;
      if (res.data.token === latest.current.token) {
        setCheckedAt(Date.now()); // still the same: up to date
      } else if (
        !asked.current ||
        asked.current.token !== res.data.token ||
        Date.now() - asked.current.at > 20000
      ) {
        // The dashboard is told once per change (and again after 20 seconds if
        // the reload did not work out)
        asked.current = { token: res.data.token, at: Date.now() };
        changed();
      }
    } catch (err) {
      // Offline or a sleeping server: stay quiet, the next check tries again
    } finally {
      asking.current = false;
    }
  };

  useEffect(() => {
    if (!shopId) return undefined;

    const timer = setInterval(() => {
      if (document.visibilityState === "visible") check.current();
    }, CHECK_EVERY_MS);

    const onComeBack = () => {
      if (document.visibilityState !== "visible") return;
      if (Date.now() - lastAsk.current < MIN_GAP_MS) return;
      check.current();
    };
    document.addEventListener("visibilitychange", onComeBack);
    window.addEventListener("focus", onComeBack);

    return () => {
      clearInterval(timer);
      document.removeEventListener("visibilitychange", onComeBack);
      window.removeEventListener("focus", onComeBack);
    };
  }, [shopId]);

  return { checkedAt, checkNow: () => check.current() };
};
