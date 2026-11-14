// What the "What's new" popup says.
//
// To announce a new update later: change WHATS_NEW_VERSION (any new text) and
// edit the list below. Everyone then sees the popup once more.
export const WHATS_NEW_VERSION = "2026-11-rowedit";

export const WHATS_NEW_ITEMS = [
  {
    title: "Edit an order right in its row",
    text: "Double-click an order to edit it where it is (on a phone, double-tap the card or tap Edit). Change what you need, then press the green tick to save. Enter also saves, and Esc or the cross cancels. The Order ID and Balance cannot be edited, so they stay grey.",
  },
  {
    title: "Amounts are private now",
    text: "Admin: the eye button on the Balance to collect box hides or shows all the money on the screen (Total, Advance and Balance). It starts hidden, and your choice is remembered. Staff cannot see any amounts unless you switch on \"See amounts\" for them on the Staff page.",
  },
  {
    title: "Pick the order executive from a list",
    text: "Order executive is now a list of the names already used, plus you and your staff. This keeps names the same everywhere. A new name can be added with \"+ Add a new name\" and then stays in the list.",
  },
  {
    title: "Latest activity comes first",
    text: "A new order, or any order that was just edited or had its status changed, now moves to the top of the list.",
  },
  {
    title: "Choose how status colours look",
    text: "Admin: in Settings you can switch the status colours off completely, or keep them and turn off just the colour of the whole row, or just the coloured line at the start of the row.",
  },
];
