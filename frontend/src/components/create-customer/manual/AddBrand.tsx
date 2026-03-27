"use client";

import { useEffect, useState } from "react";
import axios from "axios";

export default function AddBrand({ onDone }: { onDone: () => void }) {
  const [businesses, setBusinesses] = useState([]);
  const [form, setForm] = useState({
    name: "",
    businessId: "",
  });
  const [error, setError] = useState("");

  // Load all businesses for dropdown
  useEffect(() => {
    const URL = process.env.NEXT_PUBLIC_API_URL;
    axios.get(`${URL}/business`).then((res) => {
      setBusinesses(res.data);
    });
  }, []);

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.businessId.trim()) {
      setError("Business is required.");
      return;
    }
    if (!form.name.trim()) {
      setError("Brand name is required.");
      return;
    }
    try {
      const URL = process.env.NEXT_PUBLIC_API_URL;
      await axios.post(`${URL}/brand`, {
        name: form.name,
        businessId: Number(form.businessId),
      });
      setForm((prev) => ({...prev, name: ""}));
      alert("Brand Created Successfully!");
      onDone();
    } catch (err) {
      console.error(err);
      alert("Error creating brand");
    }
  };

  return (
    <div className="flex justify-center items-center min-h-screen bg-gray-100 p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Add Brand</h1>
        {error && (
          <p className="text-sm text-red-600 font-medium py-2">{error}</p>
        )}

        <div className="space-y-4">

          {/* Business Select */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Select Business
              <span className="ml-1 text-xs text-blue-600 font-normal">
                (required)
              </span>
            </label>
            <select
              name="businessId"
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 bg-white focus:ring-2 focus:ring-blue-500 outline-none"
            >
              <option value="">Select Business</option>
              {businesses.map((b: any) => (
                <option key={b.id} value={b.id}>
                  {b.name}
                </option>
              ))}
            </select>
          </div>

          {/* Brand Name */}
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Brand Name
              <span className="ml-1 text-xs text-blue-600 font-normal">
                (required)
              </span>
            </label>
            <input
              name="name"
              placeholder="Brand Name"
              value={form.name}
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <button
            onClick={handleSubmit}
            className="w-full bg-blue-600 text-white py-2 rounded-lg font-semibold hover:bg-blue-700 transition"
          >
            Submit
          </button>
        </div>
      </div>
    </div>
  );
}