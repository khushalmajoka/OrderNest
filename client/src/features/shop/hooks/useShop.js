import { useCallback, useEffect, useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { getErrorMessage } from "../../../common/utils/api";

const RETRIES = 2; // a sleeping server (free hosting) can fail the first calls
const RETRY_DELAY_MS = 3000;

const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

// Loads the logged-in user's shop.
// Returns { shop, error, reload }:
//  - not logged in            -> goes to the login page
//  - login no longer valid    -> the app logs out (see setupAuthInterceptor)
//  - no shop set up yet       -> goes to the shop setup page
//  - server or network trouble -> `error` has a message, `reload` tries again
//    (the user stays logged in)
export const useShop = () => {
  const [shop, setShop] = useState(null);
  const [error, setError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const navigate = useNavigate();

  const reload = useCallback(() => {
    setError(null);
    setAttempt((count) => count + 1);
  }, []);

  useEffect(() => {
    let cancelled = false;

    const fetchShop = async () => {
      const token = localStorage.getItem("token");
      const userId = localStorage.getItem("userId");

      if (!token || !userId) {
        navigate("/shop");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      for (let tryNo = 0; tryNo <= RETRIES; tryNo++) {
        try {
          const res = await axios.get(
            `${process.env.REACT_APP_BASE_URL}/api/shop/${userId}`,
            { headers }
          );
          if (!cancelled) setShop(res.data.shop);
          return;
        } catch (err) {
          const status = err.response?.status;
          if (status === 401) return; // the app is already logging out
          if (status === 404) {
            if (!cancelled) navigate("/shop/onboarding");
            return;
          }
          if (tryNo < RETRIES) {
            await wait(RETRY_DELAY_MS);
            if (cancelled) return;
            continue;
          }
          if (!cancelled) {
            setError(getErrorMessage(err, "Could not load your shop."));
          }
        }
      }
    };

    fetchShop();
    return () => {
      cancelled = true;
    };
  }, [navigate, attempt]);

  return { shop, error, reload };
};
