// WhatsApp "click to chat": a link that opens WhatsApp on the customer's
// number with the message already typed. The staff member taps Send.

export const LANGUAGES = [
  { key: "en", label: "English" },
  { key: "hi", label: "हिंदी" },
  { key: "hinglish", label: "Hinglish" },
];

// Tags a shop may use inside a message text. The app fills in the real value.
export const TAGS = [
  { key: "name", label: "Customer name" },
  { key: "shop", label: "Shop name" },
  { key: "orderId", label: "Order ID" },
  { key: "status", label: "Status" },
  { key: "link", label: "Tracking link" },
];

export const MAX_LENGTH = 600;

export const STATUS_LIST = [
  "Order Received",
  "Pending",
  "In Progress",
  "Completed",
  "Ready to Dispatch/Pick-Up",
  "Dispatched",
  "Delivered",
  "Cancelled",
];

// The status written in each language, for the {status} tag
const STATUS_WORDS = {
  en: {},
  hi: {
    "Order Received": "ऑर्डर मिल गया",
    Pending: "पेंडिंग",
    "In Progress": "तैयार हो रहा है",
    Completed: "पूरा हो गया",
    "Ready to Dispatch/Pick-Up": "डिस्पैच / पिक-अप के लिए तैयार",
    Dispatched: "भेज दिया गया",
    Delivered: "डिलीवर हो गया",
    Cancelled: "रद्द",
  },
  hinglish: {
    "Order Received": "Order mil gaya",
    Pending: "Pending",
    "In Progress": "Taiyaar ho raha hai",
    Completed: "Poora ho gaya",
    "Ready to Dispatch/Pick-Up": "Dispatch / pick-up ke liye taiyaar",
    Dispatched: "Bhej diya gaya",
    Delivered: "Deliver ho gaya",
    Cancelled: "Cancel",
  },
};

// What is used for {name} when the order has no customer name
const NAME_FALLBACK = { en: "there", hi: "ग्राहक", hinglish: "customer" };

// The app's own texts (used until the shop changes them in Settings).
// Each message has short lines: a greeting, what happened, then the tracking
// link on its own line. *word* is bold in WhatsApp.
const message = (hello, body, linkLine) =>
  `${hello}\n\n${body}${linkLine ? `\n\n${linkLine}\n{link}` : ""}`;

const HELLO = {
  en: "Hello {name} 🙏\nThis is *{shop}*.",
  hi: "नमस्ते {name} जी 🙏\n*{shop}* की तरफ से।",
  hinglish: "Namaste {name} ji 🙏\n*{shop}* ki taraf se.",
};
const TRACK = {
  en: "Track your order here:",
  hi: "अपना ऑर्डर यहाँ देखें:",
  hinglish: "Apna order yahan dekhein:",
};

// [what happened, show the tracking link?] for each status and language
const BODIES = {
  en: {
    "Order Received": ["We have received your order *{orderId}*. Thank you!", true],
    Pending: ["Your order *{orderId}* is *pending* right now. We will update you soon.", true],
    "In Progress": ["Your order *{orderId}* is now *in progress*.", true],
    Completed: ["Your order *{orderId}* is *completed*. We will tell you as soon as it is ready to dispatch or pick up.", true],
    "Ready to Dispatch/Pick-Up": ["Your order *{orderId}* is *ready to dispatch / pick up*.", true],
    Dispatched: ["Your order *{orderId}* has been *dispatched*.", true],
    Delivered: ["Your order *{orderId}* has been *delivered*. Thank you for shopping with us! We hope to see you again.", false],
    Cancelled: ["Your order *{orderId}* has been *cancelled*. Please contact us if you have any questions.", false],
  },
  hi: {
    "Order Received": ["आपका ऑर्डर *{orderId}* हमें मिल गया है। धन्यवाद!", true],
    Pending: ["आपका ऑर्डर *{orderId}* अभी *पेंडिंग* है। जल्दी ही आपको अपडेट देंगे।", true],
    "In Progress": ["आपका ऑर्डर *{orderId}* अभी *तैयार किया जा रहा* है।", true],
    Completed: ["आपका ऑर्डर *{orderId}* *पूरा हो गया* है। डिस्पैच या पिक-अप के लिए तैयार होते ही हम आपको बताएंगे।", true],
    "Ready to Dispatch/Pick-Up": ["आपका ऑर्डर *{orderId}* *डिस्पैच / पिक-अप के लिए तैयार* है।", true],
    Dispatched: ["आपका ऑर्डर *{orderId}* *भेज दिया गया* है।", true],
    Delivered: ["आपका ऑर्डर *{orderId}* *डिलीवर हो गया* है। हमारे साथ खरीदारी करने के लिए धन्यवाद! फिर मिलेंगे।", false],
    Cancelled: ["आपका ऑर्डर *{orderId}* *रद्द कर दिया गया* है। कोई सवाल हो तो कृपया हमसे संपर्क करें।", false],
  },
  hinglish: {
    "Order Received": ["Aapka order *{orderId}* hume mil gaya hai. Dhanyavaad!", true],
    Pending: ["Aapka order *{orderId}* abhi *pending* hai. Jaldi hi aapko update denge.", true],
    "In Progress": ["Aapka order *{orderId}* abhi *taiyaar kiya ja raha* hai.", true],
    Completed: ["Aapka order *{orderId}* *poora ho gaya* hai. Dispatch ya pick-up ke liye taiyaar hote hi hum aapko bata denge.", true],
    "Ready to Dispatch/Pick-Up": ["Aapka order *{orderId}* *dispatch / pick-up ke liye taiyaar* hai.", true],
    Dispatched: ["Aapka order *{orderId}* *bhej diya gaya* hai.", true],
    Delivered: ["Aapka order *{orderId}* *deliver ho gaya* hai. Hamare saath shopping karne ke liye dhanyavaad! Phir milenge.", false],
    Cancelled: ["Aapka order *{orderId}* *cancel kar diya gaya* hai. Koi sawaal ho to kripya humse sampark karein.", false],
  },
};

export const DEFAULT_MESSAGES = Object.fromEntries(
  Object.entries(BODIES).map(([language, byStatus]) => [
    language,
    Object.fromEntries(
      Object.entries(byStatus).map(([status, [body, withLink]]) => [
        status,
        message(HELLO[language], body, withLink ? TRACK[language] : ""),
      ])
    ),
  ])
);

// The text for one language and status: the shop's own if it has one
export const getTemplate = (shop, language, status) =>
  shop?.whatsappMessages?.[language]?.[status] ||
  DEFAULT_MESSAGES[language]?.[status] ||
  DEFAULT_MESSAGES.en[status] ||
  DEFAULT_MESSAGES.en["Order Received"];

// The page where a customer checks the order (only the Order ID is in the
// link; the customer types their phone number there)
export const trackingLink = (orderId) =>
  `${window.location.origin}/?id=${encodeURIComponent(orderId || "")}`;

// Fills the tags of a text with the real values
export const fillTemplate = (template, values) =>
  template.replace(/\{(\w+)\}/g, (whole, key) =>
    values[key] === undefined ? whole : values[key]
  );

export const buildMessage = ({ shop, order, language }) =>
  fillTemplate(getTemplate(shop, language, order.status), {
    name: (order.customerName || "").trim() || NAME_FALLBACK[language],
    shop: shop?.name || "",
    orderId: order.orderId || "",
    status: STATUS_WORDS[language]?.[order.status] || order.status,
    link: trackingLink(order.orderId),
  });

// Digits for the wa.me link: a 10-digit Indian number gets 91 in front.
// Returns "" when the number cannot be used.
export const whatsappNumber = (phone) => {
  const digits = String(phone || "").replace(/\D/g, "");
  if (digits.length === 10) return `91${digits}`;
  if (digits.length === 11 && digits.startsWith("0")) return `91${digits.slice(1)}`;
  if (digits.length >= 11 && digits.length <= 15) return digits;
  return "";
};

// phone "" opens WhatsApp so the person can pick a contact
export const whatsappLink = (phone, text) =>
  `https://wa.me/${whatsappNumber(phone)}?text=${encodeURIComponent(text)}`;

// Remembers which language was used last on this device
const LANGUAGE_KEY = "whatsappLanguage";
export const getLastLanguage = () => {
  try {
    const saved = localStorage.getItem(LANGUAGE_KEY);
    return LANGUAGES.some((l) => l.key === saved) ? saved : "en";
  } catch {
    return "en";
  }
};
export const rememberLanguage = (language) => {
  try {
    localStorage.setItem(LANGUAGE_KEY, language);
  } catch {
    /* private mode: fine, nothing to remember */
  }
};

// A phone or tablet (it has a share menu that can send a picture straight to
// WhatsApp). On a computer the picture is copied to paste instead.
export const isPhoneDevice = () =>
  /Android|iPhone|iPad|iPod/i.test(navigator.userAgent) ||
  (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);

// The paste shortcut to show to the person
export const pasteKey = () =>
  /Mac|iPhone|iPad/i.test(navigator.platform) ? "Cmd+V" : "Ctrl+V";

// Whether the order picture is sent along with the message (remembered per device)
const PICTURE_KEY = "whatsappWithPicture";
export const getWithPicture = () => {
  try {
    return localStorage.getItem(PICTURE_KEY) !== "0";
  } catch {
    return true;
  }
};
export const rememberWithPicture = (on) => {
  try {
    localStorage.setItem(PICTURE_KEY, on ? "1" : "0");
  } catch {
    /* nothing to remember */
  }
};
