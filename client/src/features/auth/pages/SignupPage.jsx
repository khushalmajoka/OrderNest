import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import OrderNestLogo from "../../../assets/OrderNestLogoWithoutBg.png";
import toast from "react-hot-toast";

const SignupPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const [loading, setLoading] = useState(false); // <-- loading state

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    setLoading(true); // Start loading

    try {
      const res = await fetch(
        `${process.env.REACT_APP_BASE_URL}/api/auth/register`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            name: form.name,
            email: form.email,
            password: form.password,
          }),
        }
      );

      const data = await res.json();

      if (res.ok) {
        if (data.needsVerification) {
          toast.success("Almost done! We sent a code to your email.");
          navigate("/shop/verify-email", {
            state: { email: form.email.trim(), fresh: true },
          });
        } else {
          toast.success("Registration successful!");
          navigate("/shop");
        }
      } else {
        toast.error(data.error || data.message || "Registration failed!");
      }
    } catch (error) {
      console.error("Error during registration:", error);
      toast.error("Can't reach the server. Check your internet and try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row justify-center md:justify-evenly items-center gap-6 bg-gradient-to-br from-orange-100 to-gray-100 px-4 py-8 font-poppins">
      <img
        src={OrderNestLogo}
        alt="OrderNest Logo"
        className="w-40 md:w-auto max-w-full h-auto"
      />
      <form
        onSubmit={handleSubmit}
        className="bg-white p-6 rounded-xl shadow-md w-full max-w-sm flex flex-col items-center"
      >
        <h2 className="text-2xl font-semibold mb-6 text-gray-700">
          Create an Account
        </h2>
        <input
          type="text"
          name="name"
          placeholder="Name"
          value={form.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border mb-4 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border mb-4 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <input
          type="password"
          name="password"
          placeholder="Password (at least 8 characters)"
          value={form.password}
          onChange={handleChange}
          required
          minLength={8}
          className="w-full px-4 py-2 border mb-4 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <input
          type="password"
          name="confirmPassword"
          placeholder="Confirm Password"
          value={form.confirmPassword}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border mb-6 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-400"
        />
        <button
          type="submit"
          disabled={loading}
          className={`w-full py-2 rounded-md transition text-white ${
            loading
              ? "bg-orange-300 cursor-not-allowed"
              : "bg-orange-500 hover:bg-orange-600"
          }`}
        >
          {loading ? "Creating Account..." : "Sign Up"}
        </button>
        <p className="text-sm text-gray-600 mt-4 text-center">
          Already have an account?{" "}
          <Link to="/shop" className="text-orange-500 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
};

export default SignupPage;
