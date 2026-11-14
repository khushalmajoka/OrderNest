import { useEffect, useRef, useState } from "react";

// True for about a second and a half after `value` changes (not when the
// component first appears). Used to light up an order row that was just edited.
export const useFlashOnChange = (value, ms = 1500) => {
  const [flash, setFlash] = useState(false);
  const previous = useRef(value);

  useEffect(() => {
    if (previous.current === value) return undefined;
    previous.current = value;
    setFlash(true);
    const timer = setTimeout(() => setFlash(false), ms);
    return () => clearTimeout(timer);
  }, [value, ms]);

  return flash;
};
