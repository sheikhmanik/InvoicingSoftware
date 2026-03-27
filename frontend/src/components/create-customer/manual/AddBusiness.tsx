"use client";

import { useState } from "react";
import axios from "axios";

export default function AddBusiness({ onDone }: { onDone: () => void }) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    location: "",
    GSTIN: "",
    PrimaryContactName: "",
    PrimaryContactPhone: "",
    PrimaryContactEmail: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    
    if(!form.name.trim()) {
      setError("Name is required.");
      return;
    }
    if(!form.address.trim()) {
      setError("Address is required.");
      return;
    }
    if(!form.location.trim()) {
      setError("Location is required.");
      return;
    }
    if(!form.GSTIN.trim()) {
      setError("GSTIN is required.");
      return;
    }
    if(!form.PrimaryContactName.trim()) {
      setError("Primary Contact Name is required.");
      return;
    }
    if(!form.PrimaryContactPhone.trim()) {
      setError("Primary Contact Phone is required.");
      return;
    }
    if(!form.PrimaryContactEmail.trim()) {
      setError("Primary Contact Email is required.");
      return;
    }
    if (!/\S+@\S+\.\S+/.test(form.PrimaryContactEmail.trim())) {
      alert("Invalid email format.");
      return;
    }
    if (!/^[0-9]{10}$/.test(form.PrimaryContactPhone.trim())) {
      setError("Primary Contact Phone must be a valid 10-digit number.");
      return;
    }

    try {
      const URL = process.env.NEXT_PUBLIC_API_URL;
      const res = await axios.post(`${URL}/business`, form);
      alert("Business Created!");
      onDone();
    } catch (err) {
      console.error(err);
      alert("Error creating business");
    }
  };

  return (
    <div className="flex justify-center items-center bg-gray-100 p-4">
      <div className="w-full max-w-lg bg-white rounded-xl shadow-lg p-6">
        <h1 className="text-2xl font-bold mb-6 text-center">Add Business</h1>

        {error && (
          <p className="text-sm text-red-600 font-medium py-2">{error}</p>
        )}

        <div className="space-y-4">

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Business Name
              <span className="ml-1 text-xs text-blue-600 font-normal">
                (required)
              </span>
            </label>
            <input
              name="name"
              placeholder="Business Name"
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Business Address
              <span className="ml-1 text-xs text-blue-600 font-normal">
                (required)
              </span>
            </label>
            <input
              name="address"
              placeholder="Address"
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Business Location
              <span className="ml-1 text-xs text-blue-600 font-normal">
                (required)
              </span>
            </label>
            <input
              name="location"
              placeholder="City / Area"
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Business GSTIN
              <span className="ml-1 text-xs text-blue-600 font-normal">
                (required)
              </span>
            </label>
            <input
              name="GSTIN"
              placeholder="GSTIN Number"
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Primary Contact Name
              <span className="ml-1 text-xs text-blue-600 font-normal">
                (required)
              </span>
            </label>
            <input
              name="PrimaryContactName"
              placeholder="Full Name"
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Primary Contact Phone
              <span className="ml-1 text-xs text-blue-600 font-normal">
                (required)
              </span>
            </label>
            <input
              name="PrimaryContactPhone"
              placeholder="Phone Number"
              onChange={handleChange}
              className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
            />
          </div>
          
          <div className="flex flex-col gap-1">
            <label className="text-sm font-medium text-gray-700">
              Contact Email Address
              <span className="ml-1 text-xs text-blue-600 font-normal">
                (required)
              </span>
            </label>
            <input
              name="PrimaryContactEmail"
              placeholder="Type Email Address"
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