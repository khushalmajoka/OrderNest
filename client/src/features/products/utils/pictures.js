import { useEffect, useState } from "react";
import axios from "axios";

// Product pictures: shrinking before upload, and showing them.
// Pictures are kept in our own database. A picture needs the login, so it is
// fetched with the token and shown from a local copy (kept for the visit).

export const MAX_PICTURES = 5; // per product (the server checks the same)
const FULL_SIDE = 900; // longest side of the big copy, in pixels
const THUMB_SIDE = 240; // longest side of the small copy
const FULL_LIMIT = 230 * 1024; // the server accepts up to 250 KB
const THUMB_LIMIT = 36 * 1024; // the server accepts up to 40 KB

const decodeFile = async (file) => {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* try the older way below */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("unreadable"));
    };
    img.src = url;
  });
};

// the bytes of a "data:image/jpeg;base64,..." text
const bytesOf = (dataUrl) => Math.round((dataUrl.length - dataUrl.indexOf(",") - 1) * 0.75);

const draw = (source, side, quality) => {
  const w = source.width || source.naturalWidth;
  const h = source.height || source.naturalHeight;
  const scale = Math.min(1, side / Math.max(w, h));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(w * scale));
  canvas.height = Math.max(1, Math.round(h * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#ffffff"; // a see-through picture gets a white background
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(source, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", quality);
};

// A chosen file -> { full, thumb } (both JPEG, as text). Throws a message for the person.
export const preparePicture = async (file) => {
  if (!file || !/^image\//.test(file.type || "")) throw new Error("This is not a picture. Please choose a JPG, PNG or WebP picture.");
  let source;
  try {
    source = await decodeFile(file);
  } catch {
    throw new Error("This picture could not be read. Please choose a JPG, PNG or WebP picture.");
  }
  let full = "";
  for (const [side, quality] of [[FULL_SIDE, 0.82], [FULL_SIDE, 0.7], [760, 0.65], [640, 0.55]]) {
    full = draw(source, side, quality);
    if (bytesOf(full) <= FULL_LIMIT) break;
  }
  let thumb = "";
  for (const quality of [0.7, 0.55, 0.4]) {
    thumb = draw(source, THUMB_SIDE, quality);
    if (bytesOf(thumb) <= THUMB_LIMIT) break;
  }
  if (source.close) source.close();
  if (bytesOf(full) > FULL_LIMIT || bytesOf(thumb) > THUMB_LIMIT) throw new Error("This picture is too detailed to shrink. Please choose another one.");
  return { full, thumb };
};

export const uploadPicture = async (productId, picture) => {
  const res = await axios.post(
    `${process.env.REACT_APP_BASE_URL}/api/products/${productId}/images`,
    { full: picture.full, thumb: picture.thumb },
    { headers: { Authorization: `Bearer ${localStorage.getItem("token")}` } }
  );
  return res.data; // { image, images }
};

// ---- showing a picture: fetched with the login, a few at a time, kept for the visit ----
const cache = new Map(); // "id:size" -> Promise of a local address
let running = 0;
const waiting = [];
const next = () => {
  while (running < 4 && waiting.length) {
    running += 1;
    waiting.shift()();
  }
};

const fetchPicture = (id, size) => {
  const key = `${id}:${size}`;
  if (!cache.has(key)) {
    const promise = new Promise((resolve, reject) => {
      waiting.push(async () => {
        try {
          const res = await axios.get(`${process.env.REACT_APP_BASE_URL}/api/products/images/${id}`, {
            params: { size },
            responseType: "blob",
            headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
          });
          resolve(URL.createObjectURL(res.data));
        } catch (err) {
          cache.delete(key); // try again next time
          reject(err);
        } finally {
          running -= 1;
          next();
        }
      });
      next();
    });
    cache.set(key, promise);
  }
  return cache.get(key);
};

// The local address of a picture (empty until it has arrived, "" when there is none)
export const usePicture = (id, size = "thumb") => {
  const [src, setSrc] = useState("");
  useEffect(() => {
    let alive = true;
    setSrc("");
    if (id) {
      fetchPicture(id, size)
        .then((url) => alive && setSrc(url))
        .catch(() => {});
    }
    return () => {
      alive = false;
    };
  }, [id, size]);
  return src;
};
