import defaultShopLogo from "../../assets/DefaultShopLogo.svg";

// Shop's own logo if they uploaded one, otherwise the generic default.
export function getShopLogo(shop) {
  return shop?.logo || defaultShopLogo;
}

export { defaultShopLogo };
