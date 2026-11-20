import axios from "axios";

// Tells the server that a feature was used (only for things that happen on
// screen). Silent: it never shows an error, never makes anything wait, and
// does nothing when nobody is logged in. Only the feature name is sent, no
// customer details. Repeats within 1.5 seconds are ignored.
const lastSent = {};

export const trackUse = (feature) => {
  try {
    const token = localStorage.getItem("token");
    if (!token) return;
    const now = Date.now();
    if (lastSent[feature] && now - lastSent[feature] < 1500) return;
    lastSent[feature] = now;
    axios
      .post(
        `${process.env.REACT_APP_BASE_URL}/api/usage`,
        { feature },
        { headers: { Authorization: `Bearer ${token}` } }
      )
      .catch(() => {});
  } catch {
    // counting must never break the app
  }
};
