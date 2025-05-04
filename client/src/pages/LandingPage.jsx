import React from 'react'
import { Link } from "react-router-dom";
import OrderNestLogo from "../assets/OrderNestLogo.png";

const LandingPage = () => {
  return (
    <div className="min-h-screen bg-gradient-to-r from-orange-100 to-white flex flex-col items-center justify-center px-4">
      <img
        src={OrderNestLogo}
        alt="OrderNest Logo"
        className="w-32 mb-6"
      />
      <h1 className="text-4xl font-bold text-gray-800 mb-2">OrderNest</h1>
      <p className="text-lg text-gray-600 mb-8">
        Simplify Orders. Amplify Growth.
      </p>
      <div className="space-x-4">
        <Link to="/login">
          <button className="bg-orange-500 text-white px-6 py-2 rounded-full shadow hover:bg-orange-600 transition">
            Login
          </button>
        </Link>
        <Link to="/signup">
          <button className="bg-white text-orange-500 border border-orange-500 px-6 py-2 rounded-full hover:bg-orange-50 transition">
            Sign Up
          </button>
        </Link>
      </div>
    </div>
  )
}

export default LandingPage