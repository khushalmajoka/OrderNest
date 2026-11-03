import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";
import defaultShopLogo from "../../assets/DefaultShopLogo.svg";

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Shop's own logo if they uploaded one, otherwise the generic default.
export function getShopLogo(shop) {
  return shop?.logo || defaultShopLogo;
}

export { defaultShopLogo };
