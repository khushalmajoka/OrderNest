import { useEffect, useState } from "react";
import axios from "axios";

// The numbers for the strip at the top of the dashboard (open, overdue,
// balance to collect, today). They are for the whole shop, whatever the
// search or filters are. Change `version` to ask again (after an order is
// created, edited or deleted). If it fails the strip is simply not shown: the
// orders below matter more.
export const useOrderSummary = (shopId, version) => {
  const [summary, setSummary] = useState(null);

  useEffect(() => {
    if (!shopId) return undefined;
    const controller = new AbortController();

    axios
      .get(`${process.env.REACT_APP_BASE_URL}/api/orders/shop/${shopId}/summary`, {
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        signal: controller.signal,
      })
      .then((res) => setSummary(res.data))
      .catch((err) => {
        if (!axios.isCancel(err)) console.error("Could not load the summary:", err);
      });

    return () => controller.abort();
  }, [shopId, version]);

  return summary;
};
