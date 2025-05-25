import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";

const Onboarding = () => {
  const [formData, setFormData] = useState({
    name: "",
    logo: "",
    category: "",
    phone: "",
    address: "",
  });

  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await axios.post("http://localhost:5000/api/shop/setup", {
        ...formData,
        userId,
      });

      if (res.status === 201) {
        navigate("/dashboard");
      }
    } catch (err) {
      alert("Failed to setup shop");
      console.error(err);
    }
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    const reader = new FileReader();

    reader.onloadend = () => {
      setFormData({ ...formData, logo: reader.result });
    };

    if (file) {
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 font-poppins">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-md rounded-xl p-8 w-full max-w-md space-y-5"
      >
        <h2 className="text-2xl font-bold text-center text-gray-800">
          Setup Your Shop
        </h2>

        <input
          type="text"
          name="name"
          placeholder="Shop Name"
          value={formData.name}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border rounded-md"
        />

        <input
          type="file"
          name="logo"
          accept="image/*"
          onChange={(e) => handleImageUpload(e)}
          required
          className="w-full px-4 py-2 border rounded-md"
        />

        <select
          name="category"
          value={formData.category}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border rounded-md"
        >
          <option value="">Select Category</option>
          <option value="Gift">Gift</option>
          <option value="Grocery">Grocery</option>
          <option value="Electronics">Electronics</option>
        </select>

        <input
          type="text"
          name="phone"
          placeholder="Phone Number"
          value={formData.phone}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border rounded-md"
        />

        <input
          type="text"
          name="address"
          placeholder="Address"
          value={formData.address}
          onChange={handleChange}
          required
          className="w-full px-4 py-2 border rounded-md"
        />

        <button
          type="submit"
          className="w-full bg-orange-500 text-white py-2 rounded-md hover:bg-orange-600"
        >
          Complete Setup
        </button>
      </form>
    </div>
  );
};

export default Onboarding;
