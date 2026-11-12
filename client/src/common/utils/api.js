import axios from "axios";
import toast from "react-hot-toast";
import { clearSession } from "../../features/whatsNew/whatsNewStorage";

// The text to show the user when a request fails. Uses the server's own
// message when there is one ("Wrong email or password.") and says clearly
// when the server could not be reached at all.
export const getErrorMessage = (err, fallback = "Something went wrong.") => {
  const response = err?.response;
  if (!response) {
    return "Can't reach the server. Check your internet and try again.";
  }

  const data = response.data || {};
  const reason = data.error || data.message;
  // Excel upload: show the first few problem rows
  const rows = Array.isArray(data.errors) ? data.errors.slice(0, 3) : [];
  const more = data.totalErrors > rows.length ? " (and more)" : "";

  if (rows.length) return `${reason}: ${rows.join(" ")}${more}`;
  return typeof reason === "string" && reason ? reason : fallback;
};

// If the server says the login is no longer valid (for example the 7 days
// are over), log out once and go to the login page, wherever the user is.
let installed = false;
export const setupAuthInterceptor = () => {
  if (installed) return;
  installed = true;

  axios.interceptors.response.use(
    (response) => response,
    (error) => {
      const hadLogin = Boolean(localStorage.getItem("token"));
      if (error?.response?.status === 401 && hadLogin) {
        clearSession();
        toast.error(
          error.response.data?.error || "Session expired. Please login again."
        );
        window.location.assign("/shop");
      }
      return Promise.reject(error);
    }
  );
};
