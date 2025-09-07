import { Pencil, Share2, Trash2 } from "lucide-react";
import moment from "moment";
import html2canvas from "html2canvas";
import { useRef, useState } from "react";
import ShareModal from "../ShareModal";
import OrderCard from "../OrderCard";
import toast from "react-hot-toast";

const OrderTableRow = ({
  order,
  onEdit,
  setDeleteId,
  setShowEditOrderModal,
}) => {
  const cardRef = useRef();
  const [isModalOpen, setIsModalOpen] = useState(false);

  const generateImage = async () => {
    if (!cardRef.current) return;

    const canvas = await html2canvas(cardRef.current, {
      scale: 3,
      useCORS: true,
      backgroundColor: "#ffffff",
    });

    return canvas.toDataURL("image/png", 1.0);
  };

  const handleShare = async (type) => {
    const image = await generateImage();
    if (!image) return;

    if (type === "download") {
      const link = document.createElement("a");
      link.href = image;
      link.download = `order-${order.orderId || order._id.slice(-6)}.png`;
      link.click();
    } else if (type === "whatsapp") {
      toast("📲 WhatsApp share coming soon!");
      // const whatsappUrl = `https://api.whatsapp.com/send?...`;
      // window.open(whatsappUrl, "_blank");
    } else if (type === "instagram") {
      toast("📸 Instagram share coming soon!");
      // window.open("https://instagram.com/sham._gallery", "_blank");
    }

    setIsModalOpen(false);
  };

  return (
    <>
      {/* Hidden card for screenshot */}
      <div className="absolute -left-[9999px]">
        <OrderCard ref={cardRef} order={order} />
      </div>

      <tr
        key={order._id}
        className="group border-t text-sm hover:bg-orange-50 transition-all relative"
      >
        <td className="px-4 py-2">{order.orderId || order._id.slice(-6)}</td>
        <td className="px-4 py-2">{order.customerName}</td>
        <td className="px-4 py-2">{order.item}</td>
        <td className="px-4 py-2">{order.phone}</td>
        <td className="px-4 py-2">₹{order.total}</td>
        <td className="px-4 py-2">₹{order.advance}</td>
        <td className="px-4 py-2">₹{order.balance}</td>
        <td className="px-4 py-2">{order.status}</td>
        <td className="px-4 py-2">
          {order.expectedDeliveryDate
            ? moment(order.expectedDeliveryDate).format("DD MMM YYYY")
            : "-"}
        </td>
        <td className="px-4 py-2">
          {order.expectedDeliveryDate
            ? Math.max(
                moment(order.expectedDeliveryDate).diff(moment(), "days"),
                0
              ) + " days"
            : "-"}
        </td>
        <td className="px-4 py-2">{order.orderExecutive}</td>
        <td className="px-4 py-2">
          {moment(order.createdAt).format("DD MMM, hh:mm A")}
        </td>
        <td className="px-4 py-2">
          {moment(order.updatedAt).format("DD MMM, hh:mm A")}
        </td>
        <td className="sticky right-0 group-hover:bg-orange-50 px-4 py-2 shadow-left border rounded-md">
          <div className="flex gap-3 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
            <button
              onClick={() => {
                setShowEditOrderModal(true);
                onEdit(order);
              }}
              className="text-blue-500 hover:text-blue-600"
            >
              <Pencil size={18} />
            </button>
            <button
              onClick={() => setDeleteId(order._id)}
              className="text-red-500 hover:text-red-600"
            >
              <Trash2 size={18} />
            </button>
            <button
              onClick={() => setIsModalOpen(true)}
              className="text-green-500 hover:text-green-600"
            >
              <Share2 size={18} />
            </button>
          </div>
        </td>
      </tr>

      {/* Share Modal */}
      <ShareModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onShare={handleShare}
      />
    </>
  );
};

export default OrderTableRow;
