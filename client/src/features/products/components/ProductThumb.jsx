import { Image as ImageIcon } from "lucide-react";
import { usePicture } from "../utils/pictures";

// The small picture of a product (its first one), or a plain box when it has none.
//   size: a Tailwind size such as "w-14 h-14"
const ProductThumb = ({ product, size = "w-14 h-14", className = "", onClick }) => {
  const first = product.images?.[0];
  const src = usePicture(first, "thumb");
  const body = src ? (
    <img src={src} alt="" className="w-full h-full object-cover" draggable={false} />
  ) : (
    <ImageIcon size={18} className={first ? "text-orange-200 animate-pulse" : "text-gray-300"} aria-hidden="true" />
  );
  const box = `${size} shrink-0 rounded-lg bg-stone-50 border border-stone-200 overflow-hidden flex items-center justify-center ${className}`;
  if (onClick && first) {
    return (
      <button
        type="button"
        onClick={onClick}
        aria-label={`See the ${product.images.length === 1 ? "picture" : "pictures"} of ${product.name}`}
        className={`${box} hover:ring-2 hover:ring-orange-400 focus:outline-none focus:ring-2 focus:ring-orange-400`}
      >
        {body}
      </button>
    );
  }
  return (
    <div className={box} aria-hidden="true">
      {body}
    </div>
  );
};

export default ProductThumb;
