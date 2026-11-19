import { useCallback, useState } from "react";

// Money is private, so it starts hidden. There are two separate controls, each
// remembered on this device, per person:
//  - the eye on the "Balance to collect" box (useBalanceHidden)
//  - the switch in Settings for Total, Advance and Balance in the order list
//    (useListAmountsHidden)
const balanceKey = (userId) => `amountsHidden:${userId}`;
const listKey = (userId) => `listAmountsHidden:${userId}`;

const read = (key) => {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
};

// "1" = hidden, "0" = shown. Nothing saved yet = use the fallback key (so a
// person's old single eye choice carries over), else hidden.
const useStoredFlag = (key, fallbackKey) => {
  const [hidden, setHidden] = useState(() => {
    const saved = read(key) ?? (fallbackKey ? read(fallbackKey) : null);
    return saved !== "0";
  });

  const set = useCallback(
    (next) => {
      setHidden(next);
      try {
        localStorage.setItem(key, next ? "1" : "0");
      } catch {
        /* storage blocked: it still works until the page is closed */
      }
    },
    [key]
  );

  const toggle = useCallback(() => set(!hidden), [set, hidden]);

  return [hidden, toggle, set];
};

export const useBalanceHidden = (userId) => useStoredFlag(balanceKey(userId));

export const useListAmountsHidden = (userId) =>
  useStoredFlag(listKey(userId), balanceKey(userId));
