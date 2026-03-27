"use client";

import axios from "axios";
import { useEffect, useState } from "react";

export default function AddRestaurant({ onDone }: { onDone: () => void }) {
  const [brands, setBrands] = useState([]);
  const [form, setForm] = useState({
    name: "",
    address: "",
    location: "",
    GSTIN: "",
    FSSAI: "",
    PrimaryContactName: "",
    PrimaryContactPhone: "",
    brandId: "",
  });
  const [error, setError] = useState("");

  // Load all brands
  useEffect(() => {
    const URL = process.env.NEXT_PUBLIC_API_URL;
    axios.get(`${URL}/brand`).then((res) => {
      setBrands(res.data);
    });
  }, []);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.brandId.trim()) {
      setError("Brand is required.");
      return;
    }
    if (!form.name.trim()) {
      setError("Restaurant name is required.");
      return;
    }
    if (!form.address.trim()) {
      setError("Address is required.");
      return;
    }
    if (!form.location.trim()) {
      setError("Location is required.");
      return;
    }
    if (!form.GSTIN.trim()) {
      setError("GSTIN is required.");
      return;
    }
    if (!form.PrimaryContactName.trim()) {
      setError("Primary contact name is required.");
      return;
    }
    if (!form.PrimaryContactPhone.trim()) {
      setError("Primary contact phone is required.");
      return;
    }
    try {
      const URL = process.env.NEXT_PUBLIC_API_URL;
      await axios.post(`${URL}/restaurant`, {
        ...form,
        brandId: Number(form.brandId),
      });
      alert("Restaurant Created Successfully!");
      onDone();
    } catch (err) {
      console.error(err);
      alert("Failed to create restaurant");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Add Restaurant</h1>
        {error && (
          <p className="text-sm text-red-600 font-medium py-2">{error}</p>
        )}
        <div className="space-y-4">

          {/* Brand Dropdown */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Select Brand
              <span className="ml-1 text-xs text-blue-600 font-normal">
                (required)
              </span>
            </label>
            <select
              name="brandId"
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Select Brand</option>
              {brands.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name} — ({b.business?.name})
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Restaurant Name
              <span className="ml-1 text-xs text-blue-600 font-normal">
                (required)
              </span>
            </label>
            <input name="name" placeholder="Restaurant Name" className="w-full border rounded px-3 py-2" onChange={handleChange} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Restaurant Address
              <span className="ml-1 text-xs text-blue-600 font-normal">
                (required)
              </span>
            </label>
            <input name="address" placeholder="Address" className="w-full border rounded px-3 py-2" onChange={handleChange} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Restaurant Location
              <span className="ml-1 text-xs text-blue-600 font-normal">
                (required)
              </span>
            </label>
            <input name="location" placeholder="Location" className="w-full border rounded px-3 py-2" onChange={handleChange} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Restaurant GSTIN
              <span className="ml-1 text-xs text-blue-600 font-normal">
                (required)
              </span>
            </label>
            <input name="GSTIN" placeholder="GSTIN" className="w-full border rounded px-3 py-2" onChange={handleChange} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Restaurant FSSAI
              <span className="ml-1 text-xs text-blue-600 font-normal">
                (optional)
              </span>
            </label>
            <input name="FSSAI" placeholder="FSSAI" className="w-full border rounded px-3 py-2" onChange={handleChange} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Primary Contact Name
              <span className="ml-1 text-xs text-blue-600 font-normal">
                (required)
              </span>
            </label>
            <input name="PrimaryContactName" placeholder="Primary Contact Name" className="w-full border rounded px-3 py-2" onChange={handleChange} />
          </div>
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Primary Contact Phone
              <span className="ml-1 text-xs text-blue-600 font-normal">
                (required)
              </span>
            </label>
            <input name="PrimaryContactPhone" placeholder="Primary Contact Phone" className="w-full border rounded px-3 py-2" onChange={handleChange} />
          </div>

          <button onClick={handleSubmit} className="w-full bg-blue-600 text-white py-2 rounded-lg">
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}