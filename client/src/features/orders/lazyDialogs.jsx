import { Suspense } from "react";
import { lazyWithRetry } from "../../common/utils/lazyWithRetry";

// The windows of the orders screen are downloaded only when they are first
// opened (the big libraries inside them - Excel, PDF, pictures, date picker -
// stay out of the first download). The small ones are also fetched quietly a
// moment after the dashboard shows (see preloadSmallDialogs), so they open at
// once.
const loaders = {
  create: () => import("../../common/components/CreateOrderModal"),
  edit: () => import("../../common/components/EditOrderModal"),
  mapping: () => import("../../common/components/MappingModal"),
  export: () => import("./components/ExportDialog"),
  slip: () => import("./components/DeliverySlipDialog"),
  share: () => import("./components/OrderShareDialog"),
};

export const CreateOrderModal = lazyWithRetry(loaders.create);
export const EditOrderModal = lazyWithRetry(loaders.edit);
export const MappingModal = lazyWithRetry(loaders.mapping);
export const ExportDialog = lazyWithRetry(loaders.export);
export const DeliverySlipDialog = lazyWithRetry(loaders.slip);
export const OrderShareDialog = lazyWithRetry(loaders.share);

// Create and Edit are used all the time: fetch them quietly once the page is up
export const preloadSmallDialogs = () => {
  loaders.create().catch(() => {});
  loaders.edit().catch(() => {});
};

// Shown for a moment if a window's code is still on its way
const Opening = () => (
  <div
    role="status"
    className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40"
  >
    <div className="bg-white px-5 py-3 rounded-md shadow-lg text-orange-600 text-sm">
      Opening...
    </div>
  </div>
);

export const WithOpening = ({ children }) => (
  <Suspense fallback={<Opening />}>{children}</Suspense>
);
