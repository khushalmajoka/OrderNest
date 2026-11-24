import { useRef, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { Camera, X } from "lucide-react";
import { getErrorMessage } from "../../../common/utils/api";
import { MAX_PICTURES, preparePicture, uploadPicture, usePicture } from "../utils/pictures";

const API = process.env.REACT_APP_BASE_URL;
const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });

const Tile = ({ src, main, children }) => (
  <li className="relative w-24">
    <div className="w-24 h-24 rounded-lg overflow-hidden border border-orange-100 bg-orange-50 flex items-center justify-center">
      {src ? <img src={src} alt="" className="w-full h-full object-cover" /> : <span className="text-xs text-gray-400">...</span>}
    </div>
    {main && <span className="absolute top-1 left-1 text-[10px] font-semibold rounded bg-orange-500 text-white px-1.5 py-0.5">Main</span>}
    {children}
  </li>
);

const SavedTile = ({ id, index, count, busy, asking, onAsk, onRemove, onMakeMain }) => {
  const src = usePicture(id, "thumb");
  return (
    <Tile src={src} main={index === 0}>
      <button type="button" onClick={() => onAsk(id)} disabled={busy} aria-label={`Remove picture ${index + 1}`} className="absolute top-1 right-1 w-7 h-7 rounded-full bg-white shadow flex items-center justify-center text-gray-700 hover:bg-red-50 hover:text-red-700 disabled:opacity-60">
        <X size={16} />
      </button>
      {index > 0 && (
        <button type="button" onClick={() => onMakeMain(id)} disabled={busy} className="mt-1 w-full text-xs rounded border border-gray-300 py-1 hover:bg-orange-50 disabled:opacity-60">
          Make main
        </button>
      )}
      {asking === id && (
        <div role="alert" className="absolute inset-0 rounded-lg bg-white bg-opacity-95 border border-red-200 flex flex-col items-center justify-center gap-1 p-1">
          <span className="text-xs text-gray-800 text-center">Remove this picture?</span>
          <button type="button" onClick={() => onRemove(id)} disabled={busy} className="w-full text-xs rounded bg-red-600 text-white py-1 hover:bg-red-700 disabled:opacity-60">
            Yes, remove
          </button>
          <button type="button" onClick={() => onAsk(null)} className="w-full text-xs rounded border border-gray-300 py-1 hover:bg-gray-100">
            No
          </button>
        </div>
      )}
    </Tile>
  );
};

// The pictures part of the product form.
//  - an existing product: a picture is saved the moment it is chosen (and removed / made main at once)
//  - a new product: the chosen pictures wait here and are saved together with the product
//   productId: null for a new product; images: saved picture ids; pending: [{ full, thumb }] waiting
const PicturesField = ({ productId, images, onImages, pending, onPending, onChanged }) => {
  const input = useRef(null);
  const [busy, setBusy] = useState(false);
  const [asking, setAsking] = useState(null);
  const total = images.length + pending.length;
  const room = MAX_PICTURES - total;

  const choose = async (e) => {
    const files = [...(e.target.files || [])];
    e.target.value = ""; // the same file can be chosen again
    if (!files.length) return;
    if (files.length > room) toast(`Only ${room} more ${room === 1 ? "picture fits" : "pictures fit"} (up to ${MAX_PICTURES}). The first ${room} will be used.`);
    setBusy(true);
    let list = images;
    let added = 0;
    for (const file of files.slice(0, Math.max(0, room))) {
      try {
        const picture = await preparePicture(file);
        if (productId) {
          const data = await uploadPicture(productId, picture);
          list = data.images;
          onImages(list);
        } else {
          onPending((old) => [...old, picture]);
        }
        added += 1;
      } catch (err) {
        toast.error(err.response ? getErrorMessage(err, "Could not save the picture.") : err.message);
      }
    }
    setBusy(false);
    if (productId && added) onChanged?.();
  };

  const remove = async (id) => {
    setBusy(true);
    try {
      const res = await axios.delete(`${API}/api/products/images/${id}`, { headers: headers() });
      onImages(res.data.images);
      setAsking(null);
      onChanged?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not remove the picture."));
    } finally {
      setBusy(false);
    }
  };

  const makeMain = async (id) => {
    setBusy(true);
    try {
      const ids = [id, ...images.filter((x) => x !== id)];
      const res = await axios.put(`${API}/api/products/${productId}/images/order`, { ids }, { headers: headers() });
      onImages(res.data.images);
      onChanged?.();
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not change the main picture."));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {total > 0 && (
        <ul aria-label="Pictures" className="flex flex-wrap gap-3 mb-2">
          {images.map((id, i) => (
            <SavedTile key={id} id={id} index={i} count={images.length} busy={busy} asking={asking} onAsk={setAsking} onRemove={remove} onMakeMain={makeMain} />
          ))}
          {pending.map((p, i) => (
            <Tile key={`p${i}`} src={p.thumb} main={images.length === 0 && i === 0}>
              <button type="button" onClick={() => onPending((old) => old.filter((_, k) => k !== i))} aria-label={`Remove new picture ${i + 1}`} className="absolute top-1 right-1 w-7 h-7 rounded-full bg-white shadow flex items-center justify-center text-gray-700 hover:bg-red-50 hover:text-red-700">
                <X size={16} />
              </button>
              <span className="block mt-1 text-xs text-gray-500 text-center">Saved with the product</span>
            </Tile>
          ))}
        </ul>
      )}
      <input ref={input} type="file" accept="image/*" multiple hidden onChange={choose} aria-label="Choose pictures" />
      <button
        type="button"
        onClick={() => input.current?.click()}
        disabled={busy || room <= 0}
        className="flex items-center gap-1.5 px-3 py-2 min-h-[44px] rounded-lg border border-orange-400 text-orange-700 text-sm font-medium hover:bg-orange-50 disabled:opacity-60"
      >
        <Camera size={18} /> {busy ? "Getting the pictures ready..." : total === 0 ? "Add pictures" : "Add more pictures"}
      </button>
      <p className="text-xs text-gray-500 mt-1">Up to {MAX_PICTURES} pictures. The first is the main one. They are made smaller automatically.</p>
    </div>
  );
};

export default PicturesField;
