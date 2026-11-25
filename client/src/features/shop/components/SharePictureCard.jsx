import { useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../common/utils/api";

// Settings card (admin): the picture an order is shared as (the "Thank you"
// card). The delivery slip has its own list of parts above; this is for the picture.
const SharePictureCard = ({ shop, onSaved }) => {
  const start = shop?.pictureProductNote !== false;
  const [showNote, setShowNote] = useState(start);
  const [saving, setSaving] = useState(false);

  const save = async () => {
    setSaving(true);
    try {
      await axios.put(
        `${process.env.REACT_APP_BASE_URL}/api/shop/settings/share-picture`,
        { productNote: showNote },
        { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
      );
      toast.success("Saved.");
      if (onSaved) onSaved();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not save."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-xl shadow-md p-4 sm:p-6 w-full">
      <h2 className="text-lg font-semibold text-gray-800 mb-2">Share picture</h2>
      <p className="text-sm text-gray-600 mb-1">
        When you add a product to an order, you can write a small note next to it, for example "Landscape" for a
        frame. Choose here if that note is printed on the picture you share with the customer.
      </p>
      <p className="text-xs text-gray-500 mb-3">
        Example: with this on, the picture says "Item: Photo Frame (8 x 10 inch) (Quantity: 1, Landscape)". With it off, the
        note stays only inside the app. For the delivery slip, use "Note on a product" in the slip settings above.
      </p>
      <label className="flex items-center gap-2 text-sm text-gray-800 cursor-pointer">
        <input type="checkbox" checked={showNote} onChange={(e) => setShowNote(e.target.checked)} className="w-4 h-4 accent-orange-500" />
        Show the note of a product on the share picture
      </label>
      <button
        type="button"
        onClick={save}
        disabled={showNote === start || saving}
        className={`mt-4 px-5 py-2 rounded-lg text-white font-medium ${showNote === start || saving ? "bg-orange-300 cursor-not-allowed" : "bg-orange-700 hover:bg-orange-800"}`}
      >
        {saving ? "Saving..." : "Save"}
      </button>
    </div>
  );
};

export default SharePictureCard;
