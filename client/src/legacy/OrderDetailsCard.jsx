import { AnimatePresence, motion, LayoutGroup } from "framer-motion";
import moment from "moment";

const OrderDetailCard = ({ order, onClose }) => {
  return (
    <AnimatePresence>
      {order && (
        <LayoutGroup>
          {/* Overlay with fade-in */}
          <motion.div
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50"
            onClick={onClose}
          >
            {/* Modal container with smooth expand */}
            <motion.div
              layout
              layoutId={`card-container-${order._id}`}
              transition={{ layout: { duration: 0.45, type: "spring" } }}
              className="bg-white rounded-2xl shadow-2xl max-w-lg w-full p-6 relative overflow-hidden"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Close button */}
              <motion.button
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ delay: 0.2 }}
                onClick={onClose}
                className="absolute top-3 right-3 text-gray-400 hover:text-gray-600 text-lg"
              >
                ✕
              </motion.button>

              {/* Title with shared transition */}
              <motion.h2
                layoutId={`order-title-${order._id}`}
                className="text-2xl font-bold mb-6 text-orange-600"
              >
                Order #{order.orderId || order._id.slice(-6)}
              </motion.h2>

              {/* Order details with staggered animation */}
              <motion.div
                initial="hidden"
                animate="visible"
                exit="hidden"
                variants={{
                  hidden: { opacity: 0, y: 10 },
                  visible: {
                    opacity: 1,
                    y: 0,
                    transition: { staggerChildren: 0.05 },
                  },
                }}
                className="space-y-3"
              >
                <motion.p variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
                  <strong>Customer:</strong> {order.customerName}
                </motion.p>
                <motion.p variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
                  <strong>Item:</strong> {order.item}
                </motion.p>
                <motion.p variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
                  <strong>Phone:</strong> {order.phone}
                </motion.p>
                <motion.p variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
                  <strong>Total Amount:</strong> ₹{order.total}
                </motion.p>
                <motion.p variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
                  <strong>Advance:</strong> ₹{order.advance}
                </motion.p>
                <motion.p variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
                  <strong>Balance:</strong> ₹{order.balance}
                </motion.p>
                <motion.p variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
                  <strong>Status:</strong>{" "}
                  <span
                    className={`px-2 py-1 rounded-md text-sm ${
                      order.status === "Completed"
                        ? "bg-green-100 text-green-700"
                        : "bg-yellow-100 text-yellow-700"
                    }`}
                  >
                    {order.status}
                  </span>
                </motion.p>
                <motion.p variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
                  <strong>Created:</strong>{" "}
                  {moment(order.createdAt).format("DD MMM, hh:mm A")}
                </motion.p>
                <motion.p variants={{ hidden: { opacity: 0 }, visible: { opacity: 1 } }}>
                  <strong>Updated:</strong>{" "}
                  {moment(order.updatedAt).format("DD MMM, hh:mm A")}
                </motion.p>
              </motion.div>
            </motion.div>
          </motion.div>
        </LayoutGroup>
      )}
    </AnimatePresence>
  );
};

export default OrderDetailCard;
