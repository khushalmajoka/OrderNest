import { useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { useSavedFlash } from "../../../common/hooks/useSavedFlash";
import SavedLabel from "../../../common/components/SavedLabel";
import { getErrorMessage } from "../../../common/utils/api";
import {
  DEFAULT_MESSAGES,
  LANGUAGES,
  MAX_LENGTH,
  STATUS_LIST,
  TAGS,
  buildMessage,
  getTemplate,
} from "../../../common/utils/whatsapp";

// Made-up details, only to show what a message will look like
const SAMPLE_ORDER = { customerName: "Asha Verma", orderId: "ORD-20261112-5-3" };

// The texts as boxes need them: the shop's own, or the app's own
const startTexts = (shop) =>
  Object.fromEntries(
    LANGUAGES.map((l) => [
      l.key,
      Object.fromEntries(STATUS_LIST.map((s) => [s, getTemplate(shop, l.key, s)])),
    ])
  );

// Settings card: the WhatsApp message for each status and language.
const WhatsAppMessagesCard = ({ shop }) => {
  const [texts, setTexts] = useState(() => startTexts(shop));
  const [language, setLanguage] = useState("en");
  const [saving, setSaving] = useState(false);
  const [saved, flashSaved] = useSavedFlash();
  const boxes = useRef({});

  const setText = (status, value) =>
    setTexts((t) => ({ ...t, [language]: { ...t[language], [status]: value } }));

  // A tag button puts the tag where the cursor is
  const addTag = (status, tag) => {
    const box = boxes.current[status];
    const current = texts[language][status];
    const start = box ? box.selectionStart : current.length;
    const end = box ? box.selectionEnd : current.length;
    const next = `${current.slice(0, start)}{${tag}}${current.slice(end)}`;
    if (next.length > MAX_LENGTH) return;
    setText(status, next);
    requestAnimationFrame(() => {
      if (!box) return;
      const at = start + tag.length + 2;
      box.focus();
      box.setSelectionRange(at, at);
    });
  };

  const handleSave = async () => {
    // Send only the texts that are different from the app's own
    const messages = {};
    for (const l of LANGUAGES) {
      for (const status of STATUS_LIST) {
        const text = texts[l.key][status].trim();
        if (!text) {
          return toast.error(
            `The ${l.label} message for ${status} is empty. Use "Reset" to bring back the original.`
          );
        }
        if (text !== DEFAULT_MESSAGES[l.key][status]) {
          messages[l.key] = { ...messages[l.key], [status]: text };
        }
      }
    }

    setSaving(true);
    try {
      await axios.put(
        `${process.env.REACT_APP_BASE_URL}/api/shop/settings/whatsapp-messages`,
        { messages },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("WhatsApp messages saved.");
      flashSaved();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not save the WhatsApp messages."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 w-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">WhatsApp messages</h2>
      <p className="text-sm text-gray-600 mb-4">
        The message that WhatsApp opens with when you tap the green WhatsApp
        button on an order. Each status has its own text, in three languages.
        Use the tag buttons to put in the customer name, order ID and so on;
        they are filled in automatically.
      </p>

      <div role="tablist" aria-label="Language" className="flex gap-1 mb-4 bg-gray-100 rounded-lg p-1">
        {LANGUAGES.map((l) => (
          <button
            key={l.key}
            type="button"
            role="tab"
            aria-selected={language === l.key}
            onClick={() => setLanguage(l.key)}
            className={`flex-1 py-2 rounded-md text-sm font-medium ${
              language === l.key ? "bg-white shadow text-orange-600" : "text-gray-600"
            }`}
          >
            {l.label}
          </button>
        ))}
      </div>

      <div className="space-y-5">
        {STATUS_LIST.map((status) => {
          const text = texts[language][status];
          const isDefault = text === DEFAULT_MESSAGES[language][status];
          const preview = buildMessage({
            shop: { ...shop, whatsappMessages: { [language]: { [status]: text } } },
            order: { ...SAMPLE_ORDER, status },
            language,
          });
          return (
            <div key={status}>
              <div className="flex items-center justify-between gap-2 mb-1">
                <label htmlFor={`wa-${status}`} className="text-sm font-semibold text-gray-700">
                  {status}
                </label>
                {!isDefault && (
                  <button
                    type="button"
                    onClick={() => setText(status, DEFAULT_MESSAGES[language][status])}
                    className="text-xs text-gray-600 underline"
                  >
                    Reset
                  </button>
                )}
              </div>
              <textarea
                id={`wa-${status}`}
                ref={(el) => {
                  boxes.current[status] = el;
                }}
                rows={4}
                maxLength={MAX_LENGTH}
                value={text}
                onChange={(e) => setText(status, e.target.value)}
                className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-orange-400"
              />
              <div className="flex flex-wrap gap-1.5 mt-1">
                {TAGS.map((tag) => (
                  <button
                    key={tag.key}
                    type="button"
                    onClick={() => addTag(status, tag.key)}
                    title={`Put ${tag.label} in the message`}
                    className="px-2 py-1 rounded-full bg-orange-50 border border-orange-200 text-xs text-orange-700 hover:bg-orange-100"
                  >
                    {`{${tag.key}}`}
                  </button>
                ))}
              </div>
              <p className="mt-2 rounded-md bg-green-50 border border-green-100 px-3 py-2 text-xs text-gray-700 whitespace-pre-wrap break-words">
                <span className="block text-gray-500 mb-0.5">Looks like (example):</span>
                {preview}
              </p>
            </div>
          );
        })}
      </div>

      <div className="flex justify-end mt-5">
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className={`px-5 py-2 rounded-lg text-white font-medium ${
            saving ? "bg-orange-300" : "bg-orange-500 hover:bg-orange-600"
          }`}
        >
          {saving ? "Saving..." : saved ? <SavedLabel /> : "Save"}
        </button>
      </div>
    </div>
  );
};

export default WhatsAppMessagesCard;
