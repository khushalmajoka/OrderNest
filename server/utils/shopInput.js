// Checks a shop's own details: used by the first-time shop setup and by
// Settings -> Shop details, so both follow the same rules.
//
// Returns { values } (clean, trimmed) or { error: "message" }.
// `logo` in the result is only there when the body had one: a picture as text
// ("data:image/..."), or "" meaning "no logo".
const MAX_LOGO_CHARS = 300 * 1024;
const LOGO_PATTERN = /^data:image\/(png|jpeg|jpg|webp|gif);base64,[A-Za-z0-9+/=]+$/;

const checkShopProfile = (body = {}) => {
  const text = (value) => (typeof value === "string" ? value.trim() : null);

  const name = text(body.name);
  const phone = text(body.phone);
  const category = text(body.category);
  const address = body.address === undefined || body.address === null ? "" : text(body.address);

  if (!name) return { error: "Please enter the shop name." };
  if (name.length > 100) return { error: "Shop name is too long (100 letters at most)." };

  if (!phone) return { error: "Please enter the shop phone number." };
  // A shop may give a landline with an area code, so only check it is a
  // number of a sensible length (spaces, dashes, brackets and a + are fine)
  const digits = phone.replace(/[\s\-()]/g, "").replace(/^\+/, "");
  if (!/^\d{6,15}$/.test(digits)) return { error: "Phone number must have 6 to 15 digits." };

  if (!category || category.length > 60) return { error: "Please choose the shop category." };

  if (address === null || address.length > 300) {
    return { error: "Address is too long (300 letters at most)." };
  }

  const values = { name, phone, category, address };

  if (body.logo !== undefined && body.logo !== null) {
    if (typeof body.logo !== "string") return { error: "The logo must be a picture." };
    if (body.logo !== "") {
      if (!LOGO_PATTERN.test(body.logo)) {
        return { error: "The logo must be a PNG, JPG, WEBP or GIF picture." };
      }
      if (body.logo.length > MAX_LOGO_CHARS) {
        return { error: "The logo picture is too big. Please choose a smaller one." };
      }
    }
    values.logo = body.logo;
  }

  return { values };
};

module.exports = { checkShopProfile };
