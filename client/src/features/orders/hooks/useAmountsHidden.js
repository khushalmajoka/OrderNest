import { useCallback, useState } from "react";

// The "eye" on the dashboard: hide the money (Total, Advance, Balance and the
// Balance-to-collect box) with dots, for when someone is looking over your
// shoulder. The choice is remembered on this device, per person. It starts
// hidden, because money is private.
const keyFor = (userId) => `amountsHidden:${userId}`;

export const useAmountsHidden = (userId) => {
  const [hidden, setHidden] = useState(() => {
    try {
      return localStorage.getItem(keyFor(userId)) !== "0";
    } catch {
      return true;
    }
  });

  const toggle = useCallback(() => {
    setHidden((current) => {
      const next = !current;
      try {
        localStorage.setItem(keyFor(userId), next ? "1" : "0");
      } catch {
        /* storage blocked: it still works until the page is closed */
      }
      return next;
    });
  }, [userId]);

  return [hidden, toggle];
};
