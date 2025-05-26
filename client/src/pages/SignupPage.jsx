import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import OrderNestLogo from "../assets/OrderNestLogoWithoutBg.png";
import toast from "react-hot-toast";

const SignupPage = () => {
  const navigate = useNavigate();

  const [form, setForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (form.password !== form.confirmPassword) {
      toast.error("Passwords do not match!");
      return;
    }

    try {
      const res = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          name: form.name,
          email: form.email,
          password: form.password,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        toast.success("Registration successful!")
        navigate("/");
      } else {
        toast.error(data.message || "Registration failed!");
      }
    } catch (error) {
      console.error("Error during registration:", error);
      toast.error("Something went wrong. Please try again.");
    }
  };

  return (
    <div className="min-h-screen flex justify-evenly items-center bg-gradient-to-br from-orange-100 to-gray-100 px-4 font-poppins">
      <img src={OrderNestLogo} alt="OrderNest Logo" />
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
          placeholder="Password"
          value={form.password}
          onChange={handleChange}
          required
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
          className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600 transition"
        >
          Sign Up
        </button>
        <p className="text-sm text-gray-600 mt-4 text-center">
          Already have an account?{" "}
          <Link to="/" className="text-orange-500 hover:underline">
            Login
          </Link>
        </p>
      </form>
    </div>
  );
};

export default SignupPage;
