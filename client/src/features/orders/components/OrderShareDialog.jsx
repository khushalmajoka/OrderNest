import { createPortal } from "react-dom";
import ShareModal from "../../../common/components/ShareModal";
import OrderCard from "../../../common/components/OrderCard";

// The "Share order" window. The "Thank you" card that becomes the picture is
// only built while this window is open (not for every order on the page), and
// sits off-screen at the page level so it is valid inside a table too.
const OrderShareDialog = ({ isOpen, order, shop, cardRef, onClose, onShare }) => {
  if (!isOpen) return null;

  return createPortal(
    <>
      <div className="absolute top-0 -left-[9999px]">
        <OrderCard ref={cardRef} order={order} shop={shop} />
      </div>
      <ShareModal isOpen onClose={onClose} onShare={onShare} />
    </>,
    document.body
  );
};

export default OrderShareDialog;
