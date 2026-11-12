// What the "What's new" popup says.
//
// To announce a new update later: change WHATS_NEW_VERSION (any new text) and
// edit the list below. Everyone then sees the popup once more.
export const WHATS_NEW_VERSION = "2026-11-email";

export const WHATS_NEW_ITEMS = [
  {
    title: "Change your email",
    text: "Admin: you can now change your login email in Settings. Please make sure it is a real email you can open, because the forgot-password code is sent there. We send a code to the new email first, so a wrong email cannot be saved by mistake.",
  },
  {
    title: "Confirm email at sign-up",
    text: "New accounts now confirm their email with a 6-digit code before they can login. Your existing account is not affected.",
  },
];
