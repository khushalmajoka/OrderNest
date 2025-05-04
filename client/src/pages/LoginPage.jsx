import React from "react";
import OrderNestLogo from "../assets/OrderNestLogoWithoutBg.png";

const Login = () => {
  return (
    <div className="min-h-screen flex items-center justify-evenly bg-gradient-to-br from-orange-100 to-gray-100 px-4 font-poppins">
      <img src={OrderNestLogo} alt="OrderNest Logo" className="" />
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-md">
        <div className="flex flex-col items-center ">
          <h1 className="text-2xl font-semibold text-gray-800">Welcome to OrderNest</h1>
          <p className="text-sm text-gray-500 mt-1">Login to your store dashboard</p>
        </div>

        <form className="space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            <input
              type="email"
              placeholder="you@example.com"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
          </div>
          <div className="">
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              type="password"
              placeholder="••••••••"
              className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-orange-400"
            />
            <div className="text-right text-sm text-orange-600 hover:underline cursor-pointer">
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
