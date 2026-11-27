import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Copy, ExternalLink, MessageCircle } from "lucide-react";
import ModalShell, { Field, inputClass } from "../../../common/components/ModalShell";
import { getErrorMessage } from "../../../common/utils/api";
import { whatsappLink } from "../../../common/utils/whatsapp";

const URL_BASE = `${process.env.REACT_APP_BASE_URL}/api/catalog-settings`;
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const plain = "flex items-center justify-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg border border-stone-300 text-sm font-medium text-stone-800 hover:bg-stone-100";
const primary = "w-full px-4 py-2 min-h-[44px] rounded-lg bg-orange-700 text-white font-medium hover:bg-orange-800 disabled:opacity-60";

// "Share catalog": the link customers open to see the ticked products.
// Admin: switch on/off, prices, contact number, new link. Staff with "Manage
// products": copy and send the link.
const ShareCatalogDialog = ({ shopName, onClose }) => {
  const [settings, setSettings] = useState(null);
  const [loadError, setLoadError] = useState(null);
  const [phone, setPhone] = useState("");
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(null); // "off" | "new": the question before it is done

  const load = useCallback(async () => {
    setLoadError(null);
    try {
      const res = await axios.get(URL_BASE, { headers: headers() });
      setSettings(res.data);
      setPhone(res.data.phone);
    } catch (err) {
      setLoadError(getErrorMessage(err, "Could not open the catalog settings."));
    }
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const send = async (request, done) => {
    if (busy) return;
    setBusy(true);
    try {
      const res = await request();
      setSettings(res.data);
      setPhone(res.data.phone);
      setAsking(null);
      toast.success(done);
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not save."));
    } finally {
      setBusy(false);
    }
  };
  const save = (body, done) => send(() => axios.put(URL_BASE, body, { headers: headers() }), done);
  const phoneChanged = Boolean(settings) && phone.trim() !== settings.phone;
  const link = settings?.token ? `${window.location.origin}/c/${settings.token}` : "";

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link);
      toast.success("Link copied.");
    } catch {
      toast.error("Could not copy. Select the link and copy it.");
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (phoneChanged) save({ phone: phone.trim() }, "Number saved.");
  };

  return (
    <ModalShell title="Share catalog" dirty={phoneChanged} onClose={onClose} onSubmit={submit}>
      {loadError ? (
        <div className="text-center space-y-3">
          <p className="text-gray-700">{loadError}</p>
          <button type="button" onClick={load} className={primary}>Try again</button>
        </div>
      ) : !settings ? (
        <p role="status" className="text-center text-gray-600 py-4">Loading...</p>
      ) : !settings.enabled ? (
        <div className="space-y-3">
          <p className="text-sm text-gray-700">
            The catalog is a page your customers open with a link, without any login. They see your shop name, logo, phone and only the products you choose. They never see orders, customers or staff.
          </p>
          {settings.canChange ? (
            <button type="button" disabled={busy} onClick={() => save({ enabled: true }, "Catalog switched on.")} className={primary}>
              Switch on the catalog
            </button>
          ) : (
            <p className="text-sm font-medium text-gray-800">The catalog is switched off. Ask your admin to switch it on.</p>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          <p className={`text-sm rounded-lg border p-3 ${settings.shownCount ? "border-stone-200 bg-stone-50 text-gray-800" : "border-amber-200 bg-amber-50 text-gray-800"}`}>
            {settings.shownCount
              ? `Customers can see ${settings.shownCount} ${settings.shownCount === 1 ? "product" : "products"}.`
              : "Customers see no products yet. Open Edit on a product and tick \"Show in catalog\"."}
          </p>

          <Field label="Link for customers">
            <input type="text" readOnly value={link} onFocus={(e) => e.target.select()} className={`${inputClass} text-sm`} />
          </Field>
          <div className="grid grid-cols-3 gap-2">
            <button type="button" onClick={copy} className={plain}><Copy size={16} /> Copy</button>
            <a href={whatsappLink("", `See our products at ${shopName}:\n${link}`)} target="_blank" rel="noopener noreferrer" className={plain}>
              <MessageCircle size={16} /> WhatsApp
            </a>
            <a href={link} target="_blank" rel="noopener noreferrer" className={plain}><ExternalLink size={16} /> Open</a>
          </div>

          {settings.canChange && (
            <>
              <label className="flex items-start gap-3 min-h-[44px]">
                <input
                  type="checkbox"
                  checked={settings.showPrices}
                  disabled={busy}
                  onChange={(e) => save({ showPrices: e.target.checked }, e.target.checked ? "Customers now see prices." : "Prices are hidden.")}
                  className="w-5 h-5 mt-0.5 accent-orange-500 shrink-0"
                />
                <span className="text-sm text-gray-800">
                  <span className="font-medium">Show prices to customers</span>
                  <span className="block text-gray-600">Off: customers are told to ask you for prices.</span>
                </span>
              </label>

              <div>
                <Field label="Contact number on the catalog" hint={`(empty = shop phone ${settings.shopPhone})`}>
                  <input type="tel" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={25} placeholder={settings.shopPhone} className={inputClass} />
                </Field>
                {phoneChanged && (
                  <button type="submit" disabled={busy} className={`${primary} mt-2`}>Save number</button>
                )}
              </div>

              {asking ? (
                <div role="alertdialog" aria-label="Please confirm" className="rounded-lg border border-red-200 bg-red-50 p-3 space-y-2">
                  <p className="text-sm text-gray-800">
                    {asking === "new"
                      ? "Make a new link? The old link stops working for everyone who has it."
                      : "Switch off the catalog? The link stops working until you switch it on again."}
                  </p>
                  <div className="flex gap-2">
                    <button type="button" autoFocus onClick={() => setAsking(null)} className={`${plain} flex-1 bg-white`}>Keep it</button>
                    <button
                      type="button"
                      disabled={busy}
                      onClick={() =>
                        asking === "new"
                          ? send(() => axios.post(`${URL_BASE}/new-link`, {}, { headers: headers() }), "New link made.")
                          : save({ enabled: false }, "Catalog switched off.")
                      }
                      className="flex-1 px-3 py-2 min-h-[44px] rounded-lg bg-red-700 text-white text-sm font-medium"
                    >
                      {asking === "new" ? "Yes, new link" : "Yes, switch off"}
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex gap-2">
                  <button type="button" onClick={() => setAsking("new")} className={`${plain} flex-1`}>Make a new link</button>
                  <button type="button" onClick={() => setAsking("off")} className={`${plain} flex-1`}>Switch off</button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </ModalShell>
  );
};

export default ShareCatalogDialog;
