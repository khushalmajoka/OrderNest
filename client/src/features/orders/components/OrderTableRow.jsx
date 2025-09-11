import { Pencil, Share2, Trash2 } from "lucide-react";
import moment from "moment";
import { motion } from "framer-motion";
import html2canvas from "html2canvas";
import { useRef, useState } from "react";
import ShareModal from "../../../common/components/ShareModal";
import OrderCard from "../../../common/components/OrderCard";
import toast from "react-hot-toast";

const OrderTableRow = ({
  order,
  onEdit,
  setDeleteId,
  setShowEditOrderModal,
  setShowDeleteModal,
  onRowClick,
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
    } else if (type === "instagram") {
      toast("📸 Instagram share coming soon!");
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
        className="group border-t text-sm hover:bg-orange-50 transition-all relative cursor-pointer"
        onClick={(e) => {
          if (e.target.closest("button")) return; // prevent conflict with edit/delete/share
          onRowClick(order);
        }}
      >
        <motion.td
          layoutId={`order-title-${order._id}`}
          className="px-4 py-2"
        >
          {order.orderId || order._id.slice(-6)}
        </motion.td>
        <motion.td
          layoutId={`customer-name-${order._id}`}
          className="px-4 py-2"
        >
          {order.customerName}
        </motion.td>
        <motion.td layoutId={`item-${order._id}`} className="px-4 py-2">
          {order.item}
        </motion.td>
        <motion.td layoutId={`phone-${order._id}`} className="px-4 py-2">
          {order.phone}
        </motion.td>
        <motion.td layoutId={`total-${order._id}`} className="px-4 py-2">
          ₹{order.total}
        </motion.td>
        <motion.td layoutId={`advance-${order._id}`} className="px-4 py-2">
          ₹{order.advance}
        </motion.td>
        <motion.td layoutId={`balance-${order._id}`} className="px-4 py-2">
          ₹{order.balance}
        </motion.td>
        <motion.td layoutId={`status-${order._id}`} className="px-4 py-2">
          {order.status}
        </motion.td>
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
              onClick={() => {
                setDeleteId(order._id);
                setShowDeleteModal(true);
              }}
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
