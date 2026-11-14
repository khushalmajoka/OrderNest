import { useCallback, useEffect, useRef, useState } from "react";

// A short "just saved" state for a Save button: `saved` is true for about two
// seconds after `flash()` is called, then goes back to false.
export const useSavedFlash = (ms = 2000) => {
  const [saved, setSaved] = useState(false);
  const timer = useRef(null);

  const flash = useCallback(() => {
    setSaved(true);
    clearTimeout(timer.current);
    timer.current = setTimeout(() => setSaved(false), ms);
  }, [ms]);

  useEffect(() => () => clearTimeout(timer.current), []);

  return [saved, flash];
};
