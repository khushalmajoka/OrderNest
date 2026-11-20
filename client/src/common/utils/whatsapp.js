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

// The app's own texts (used until the shop changes them in Settings)
export const DEFAULT_MESSAGES = {
  en: {
    "Order Received":
      "Hello {name}, this is {shop}. We have received your order {orderId}. Thank you! Track your order here: {link}",
    Pending:
      "Hello {name}, this is {shop}. Your order {orderId} is pending right now. We will update you soon. Track your order here: {link}",
    "In Progress":
      "Hello {name}, this is {shop}. Your order {orderId} is now in progress. Track your order here: {link}",
    Completed:
      "Hello {name}, this is {shop}. Your order {orderId} is completed. We will tell you as soon as it is ready to dispatch or pick up. Track your order here: {link}",
    "Ready to Dispatch/Pick-Up":
      "Hello {name}, this is {shop}. Your order {orderId} is ready to dispatch / pick up. Track your order here: {link}",
    Dispatched:
      "Hello {name}, this is {shop}. Your order {orderId} has been dispatched. Track your order here: {link}",
    Delivered:
      "Hello {name}, this is {shop}. Your order {orderId} has been delivered. Thank you for shopping with us! We hope to see you again.",
    Cancelled:
      "Hello {name}, this is {shop}. Your order {orderId} has been cancelled. Please contact us if you have any questions.",
  },
  hi: {
    "Order Received":
      "नमस्ते {name} जी, {shop} की तरफ से। आपका ऑर्डर {orderId} हमें मिल गया है। धन्यवाद! अपना ऑर्डर यहाँ देखें: {link}",
    Pending:
      "नमस्ते {name} जी, {shop} की तरफ से। आपका ऑर्डर {orderId} अभी पेंडिंग है। जल्दी ही आपको अपडेट देंगे। अपना ऑर्डर यहाँ देखें: {link}",
    "In Progress":
      "नमस्ते {name} जी, {shop} की तरफ से। आपका ऑर्डर {orderId} अभी तैयार किया जा रहा है। अपना ऑर्डर यहाँ देखें: {link}",
    Completed:
      "नमस्ते {name} जी, {shop} की तरफ से। आपका ऑर्डर {orderId} पूरा हो गया है। डिस्पैच या पिक-अप के लिए तैयार होते ही हम आपको बताएंगे। अपना ऑर्डर यहाँ देखें: {link}",
    "Ready to Dispatch/Pick-Up":
      "नमस्ते {name} जी, {shop} की तरफ से। आपका ऑर्डर {orderId} डिस्पैच / पिक-अप के लिए तैयार है। अपना ऑर्डर यहाँ देखें: {link}",
    Dispatched:
      "नमस्ते {name} जी, {shop} की तरफ से। आपका ऑर्डर {orderId} भेज दिया गया है। अपना ऑर्डर यहाँ देखें: {link}",
    Delivered:
      "नमस्ते {name} जी, {shop} की तरफ से। आपका ऑर्डर {orderId} डिलीवर हो गया है। हमारे साथ खरीदारी करने के लिए धन्यवाद! फिर मिलेंगे।",
    Cancelled:
      "नमस्ते {name} जी, {shop} की तरफ से। आपका ऑर्डर {orderId} रद्द कर दिया गया है। कोई सवाल हो तो कृपया हमसे संपर्क करें।",
  },
  hinglish: {
    "Order Received":
      "Namaste {name} ji, {shop} ki taraf se. Aapka order {orderId} hume mil gaya hai. Dhanyavaad! Apna order yahan dekhein: {link}",
    Pending:
      "Namaste {name} ji, {shop} ki taraf se. Aapka order {orderId} abhi pending hai. Jaldi hi aapko update denge. Apna order yahan dekhein: {link}",
    "In Progress":
      "Namaste {name} ji, {shop} ki taraf se. Aapka order {orderId} abhi taiyaar kiya ja raha hai. Apna order yahan dekhein: {link}",
    Completed:
      "Namaste {name} ji, {shop} ki taraf se. Aapka order {orderId} poora ho gaya hai. Dispatch ya pick-up ke liye taiyaar hote hi hum aapko bata denge. Apna order yahan dekhein: {link}",
    "Ready to Dispatch/Pick-Up":
      "Namaste {name} ji, {shop} ki taraf se. Aapka order {orderId} dispatch / pick-up ke liye taiyaar hai. Apna order yahan dekhein: {link}",
    Dispatched:
      "Namaste {name} ji, {shop} ki taraf se. Aapka order {orderId} bhej diya gaya hai. Apna order yahan dekhein: {link}",
    Delivered:
      "Namaste {name} ji, {shop} ki taraf se. Aapka order {orderId} deliver ho gaya hai. Hamare saath shopping karne ke liye dhanyavaad! Phir milenge.",
    Cancelled:
      "Namaste {name} ji, {shop} ki taraf se. Aapka order {orderId} cancel kar diya gaya hai. Koi sawaal ho to kripya humse sampark karein.",
  },
};

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
