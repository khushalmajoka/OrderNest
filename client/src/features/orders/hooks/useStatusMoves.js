import { createElement as h, useState } from "react";
import axios from "axios";
import toast from "react-hot-toast";
import { getErrorMessage } from "../../../common/utils/api";
import { can } from "../../../common/utils/permissions";
import { whatsappNumber } from "../../../common/utils/whatsapp";
import { promptStatusesOf, statusLabel } from "../utils/statusInfo";
import WhatsAppFollowUp from "../components/WhatsAppFollowUp";

const headers = () => ({ Authorization: `Bearer ${localStorage.getItem("token")}` });
const TOAST_ID = "status-move";

// Moving orders to another status in one tap ("Next step", "Change status" on
// several orders), with an Undo, and the question "Tell the customer on
// WhatsApp?" when the new status is one the shop chose (Settings).
//   onChanged(orders): the orders as they are now (the list updates itself)
// Returns { moveMany, askAfterEdit, followUpUI }: render followUpUI once.
export const useStatusMoves = ({ shop, account, onChanged }) => {
  const [followUp, setFollowUp] = useState(null); // orders to tell the customers about
  const canTell = can(account, "shareSlip");
  const asks = promptStatusesOf(shop);

  const post = async (ids, status) => {
    const res = await axios.post(
      `${process.env.REACT_APP_BASE_URL}/api/orders/bulk-status`,
      { ids, status },
      { headers: headers() }
    );
    return res.data.orders;
  };

  // moves: [{ ids, status }]. Returns the orders that really changed.
  const run = async (moves) => {
    const changed = [];
    try {
      for (const move of moves) {
        const orders = await post(move.ids, move.status);
        changed.push(...orders);
      }
    } catch (err) {
      toast.error(getErrorMessage(err, "Could not change the status."));
    }
    if (changed.length && onChanged) {
      // `previousStatus` is only for Undo
      onChanged(changed.map(({ previousStatus, ...order }) => order));
    }
    return changed;
  };

  const undo = async (changed) => {
    const byPrevious = new Map();
    for (const o of changed) {
      if (!byPrevious.has(o.previousStatus)) byPrevious.set(o.previousStatus, []);
      byPrevious.get(o.previousStatus).push(o._id);
    }
    const back = await run([...byPrevious].map(([status, ids]) => ({ ids, status })));
    if (back.length) toast.success("Undone.", { id: TOAST_ID });
  };

  // The question after a change. `orders` have the NEW status.
  const tellable = (orders) =>
    canTell ? orders.filter((o) => asks.includes(o.status) && whatsappNumber(o.phone)) : [];

  // targetOf(order) = the status to move this order to (null = leave it)
  const moveMany = async (orders, targetOf, { skippedNote } = {}) => {
    const groups = new Map();
    let skipped = 0;
    for (const order of orders) {
      const target = targetOf(order);
      if (!target || target === order.status) {
        skipped += 1;
        continue;
      }
      if (!groups.has(target)) groups.set(target, []);
      groups.get(target).push(order._id);
    }
    if (groups.size === 0) {
      toast(skippedNote || "Nothing to change.", { id: TOAST_ID });
      return [];
    }
    const changed = await run([...groups].map(([status, ids]) => ({ ids, status })));
    if (!changed.length) return [];

    const targets = [...new Set(changed.map((o) => o.status))];
    const where = targets.length === 1 ? ` to ${statusLabel(targets[0])}` : "";
    const text =
      changed.length === 1
        ? `Moved ${changed[0].orderId}${where}.`
        : `Moved ${changed.length} orders${where}.`;
    const extra = skipped && skippedNote ? ` ${skipped} had no next step.` : "";
    const ask = tellable(changed);

    toast(
      (t) =>
        h(
          "div",
          { className: "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" },
          h("span", null, text + extra),
          h(
            "button",
            {
              type: "button",
              className: "font-semibold text-orange-700 underline",
              onClick: () => {
                toast.dismiss(t.id);
                undo(changed);
              },
            },
            "Undo"
          ),
          ask.length > 0 &&
            h(
              "button",
              {
                type: "button",
                className: "font-semibold text-green-700 underline",
                onClick: () => {
                  toast.dismiss(t.id);
                  setFollowUp(ask);
                },
              },
              ask.length === 1 ? "Tell the customer on WhatsApp" : `Tell ${ask.length} customers on WhatsApp`
            )
        ),
      { id: TOAST_ID, duration: 10000 }
    );
    return changed;
  };

  // An order was saved from its edit boxes and its status changed
  const askAfterEdit = (saved, beforeStatus) => {
    if (!saved || saved.status === beforeStatus) return;
    const ask = tellable([saved]);
    if (!ask.length) return;
    toast(
      (t) =>
        h(
          "div",
          { className: "flex flex-wrap items-center gap-x-3 gap-y-1 text-sm" },
          h("span", null, `Status changed to ${statusLabel(saved.status)}.`),
          h(
            "button",
            {
              type: "button",
              className: "font-semibold text-green-700 underline",
              onClick: () => {
                toast.dismiss(t.id);
                setFollowUp(ask);
              },
            },
            "Tell the customer on WhatsApp"
          )
        ),
      { id: TOAST_ID, duration: 10000 }
    );
  };

  const followUpUI = followUp
    ? h(WhatsAppFollowUp, { orders: followUp, shop, onClose: () => setFollowUp(null) })
    : null;

  return { moveMany, askAfterEdit, followUpUI };
};
