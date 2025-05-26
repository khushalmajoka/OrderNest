import React, { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import OrderNestLogo from "../assets/OrderNestLogoWithoutBg.png";
import toast from "react-hot-toast";

const Login = () => {
  const [form, setForm] = useState({
    email: "",
    password: "",
  });
  const navigate = useNavigate();

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (token) {
      navigate("/dashboard");
    }
  }, [navigate]);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      const res = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(form),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Login successful!");

        const user = data.user;

        localStorage.setItem("userId", user._id);
        localStorage.setItem("token", data.token);
        localStorage.setItem("shopId", user.shopId);

        if (!user.shopId) {
          navigate("/onboarding");
        } else {
          navigate("/dashboard");
        }
      } else {
        toast.error(data.message || "Login failed");
      }
    } catch (err) {
      console.error(err);
      toast.error("Something went wrong");
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-evenly bg-gradient-to-br from-orange-100 to-gray-100 px-4 font-poppins">
      <img src={OrderNestLogo} alt="OrderNest Logo" />
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-md">
        <div className="flex flex-col items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">
            Welcome to OrderNest
          </h1>
          <p className="text-sm text-gray-500">
            Simplify Orders. Amplify Growth.
          </p>
        </div>

        <form className="space-y-5" onSubmit={handleSubmit}>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="you@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
              required
            />
            <div className="text-right text-xs text-orange-600 hover:underline cursor-pointer mt-1">
              Forgot password?
            </div>
          </div>
          <button
            type="submit"
            className="w-full bg-orange-500 text-white font-semibold py-2 rounded-lg hover:bg-orange-600 transition"
          >
            Login
          </button>
        </form>

        <p className="text-center text-sm text-gray-600 mt-4">
          Don't have an account?{" "}
          <a href="/signup" className="text-orange-600 hover:underline">
            Sign up
          </a>
        </p>
      </div>
    </div>
  );
};

export default Login;
