import React, { useState } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import toast from "react-hot-toast";

const Onboarding = () => {
  const [formData, setFormData] = useState({
    name: "",
    logo: "",
    category: "",
    phone: "",
    address: "",
  });

  const [loading, setLoading] = useState(false); // 🔁 loading state
  const navigate = useNavigate();
  const userId = localStorage.getItem("userId");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true); // start loading

    try {
      const token = localStorage.getItem("token");

      const res = await axios.post(
        `${process.env.REACT_APP_BASE_URL}/api/shop/setup`,
        {
          ...formData,
          userId,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        }
      );

      if (res.status === 201) {
        const shopId = res.data.shop._id;
        localStorage.setItem("shopId", shopId);
        toast.success("Shop setup successful! 🚀");
        navigate("/shop/dashboard");
      }
    } catch (err) {
      toast.error("Failed to setup shop");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-orange-50 font-poppins px-4">
      <form
        onSubmit={handleSubmit}
        className="bg-white shadow-xl rounded-xl p-8 w-full max-w-md space-y-5"
      >
        <h2 className="text-2xl font-bold text-center text-gray-800 mb-4">
          🛍️ Setup Your Shop
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

        {/* Logo Upload */}
        <div className="space-y-2">
          <label className="block text-gray-700 font-medium">
            Shop Logo <span className="text-red-500">*</span>
          </label>
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            className="w-full px-3 py-2 border rounded-md bg-white"
            required
          />

          {formData.logo && (
            <img
              src={formData.logo}
              alt="Logo Preview"
              className="w-24 h-24 object-cover rounded-full border mx-auto"
            />
          )}
        </div>

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
          disabled={loading}
          className={`w-full text-white py-2 rounded-md ${
            loading
              ? "bg-orange-300 cursor-not-allowed"
              : "bg-orange-500 hover:bg-orange-600"
          }`}
        >
          {loading ? "Submitting..." : "Complete Setup"}
        </button>
      </form>
    </div>
  );
};

export default Onboarding;
