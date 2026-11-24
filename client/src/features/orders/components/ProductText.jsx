import { Package } from "lucide-react";
import { orderLineTexts } from "../../products/utils/productOptions";

// The Product of an order. An order whose products were PICKED from the shop's
// list shows each one on its own line with a small box icon and its quantity;
// an order typed by hand shows plain text, as before.
const ProductText = ({ order }) => {
  const texts = orderLineTexts(order);
  if (!texts.length) return <>{order.item || "-"}</>;
  return (
    <span className="inline-flex flex-col gap-0.5" title="Picked from your products">
      {texts.map((t, i) => (
        <span key={i} className="inline-flex items-start gap-1 font-medium text-gray-900">
          <Package size={13} className="mt-1 shrink-0 text-orange-600" aria-hidden="true" />
          <span className="break-words min-w-0">
            {t.label} <span className="font-normal text-gray-600 whitespace-nowrap">× {t.qty}</span>
          </span>
        </span>
      ))}
    </span>
  );
};

export default ProductText;
