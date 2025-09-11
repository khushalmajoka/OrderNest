import { AnimatePresence, motion, LayoutGroup } from "framer-motion";

const OrderDetailCard = ({ order, onClose }) => {
  return (
    <AnimatePresence>
      {order && (
        <LayoutGroup>
          <motion.div
            layout
            className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
            onClick={onClose}
          >
            <motion.div
              layout
              transition={{ layout: { duration: 0.4, type: "spring" } }}
              className="bg-white rounded-xl shadow-lg max-w-lg w-full p-6 relative"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <button
                onClick={onClose}
                className="absolute top-2 right-2 text-gray-500 hover:text-gray-700"
              >
                ✕
              </button>

              {/* Order details with layoutId for shared transition */}
              <motion.h2
                layoutId={`order-title-${order._id}`}
                className="text-xl font-bold mb-4 text-orange-600"
              >
                Order #{order._id}
              </motion.h2>

              <motion.p layoutId={`customer-name-${order._id}`} className="mb-2">
                <strong>Customer:</strong> {order.customerName}
              </motion.p>
              <motion.p layoutId={`item-${order._id}`} className="mb-2">
                <strong>Item:</strong> {order.item}
              </motion.p>
              <motion.p layoutId={`phone-${order._id}`} className="mb-2">
                <strong>Phone:</strong> {order.phone}
              </motion.p>
              <motion.p layoutId={`total-${order._id}`} className="mb-2">
                <strong>Total Amount:</strong> ₹{order.total}
              </motion.p>
              <motion.p layoutId={`advance-${order._id}`} className="mb-2">
                <strong>Advance:</strong> ₹{order.advance}
              </motion.p>
              <motion.p layoutId={`balance-${order._id}`} className="mb-2">
                <strong>Balance:</strong> ₹{order.balance}
              </motion.p>
              <motion.p layoutId={`status-${order._id}`} className="mb-2">
                <strong>Status:</strong> {order.status}
              </motion.p>

              <motion.p className="text-gray-600">
                <strong>Date:</strong>{" "}
                {new Date(order.createdAt).toLocaleString()}
              </motion.p>
            </motion.div>
          </motion.div>
        </LayoutGroup>
      )}
    </AnimatePresence>
  );
};

export default OrderDetailCard;
