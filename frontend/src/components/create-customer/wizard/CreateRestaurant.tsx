"use client";

import axios from "axios";
import { useState } from "react";

export default function CreateStore({ business, brand, onBack, onDone }: any) {
  const [form, setForm] = useState({
    name: "",
    address: "",
    location: "",
    GSTIN: "",
    FSSAI: "",
    PrimaryContactName: "",
    PrimaryContactPhone: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e: any) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async () => {
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
    setLoading(true);
    try {
      const URL = process.env.NEXT_PUBLIC_API_URL;
      await axios.post(`${URL}/restaurant`, {
        ...form,
        brandId: Number(brand.id),
      });
      alert("Restaurant created");
      onDone();
    } catch (err) {
      console.error(err);
      alert("Failed to create store");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white p-6 rounded-lg shadow">
      <div className="mb-4">
        <div className="text-sm text-gray-500">Business</div>
        <div className="font-medium">{business?.name}</div>
        <div className="text-sm text-gray-500 mt-2">Brand</div>
        <div className="font-medium">{brand?.name}</div>
      </div>

      {error && (
        <p className="text-sm text-red-600 font-medium py-2">{error}</p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Restaurant name
            <span className="ml-1 text-xs text-blue-600 font-normal">
              (required)
            </span>
          </label>
          <input name="name" placeholder="Restaurant name" onChange={handleChange} className="border p-2 rounded" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Restaurant Address
            <span className="ml-1 text-xs text-blue-600 font-normal">
              (required)
            </span>
          </label>
          <input name="address" placeholder="Address" onChange={handleChange} className="border p-2 rounded" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Restaurant Location
            <span className="ml-1 text-xs text-blue-600 font-normal">
              (required)
            </span>
          </label>
          <input name="location" placeholder="Location" onChange={handleChange} className="border p-2 rounded" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Restaurant GSTIN
            <span className="ml-1 text-xs text-blue-600 font-normal">
              (required)
            </span>
          </label>
          <input name="GSTIN" placeholder="GSTIN" onChange={handleChange} className="border p-2 rounded" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Restaurant FSSAI
            <span className="ml-1 text-xs text-blue-600 font-normal">
              (optional)
            </span>
          </label>
          <input name="FSSAI" placeholder="FSSAI" onChange={handleChange} className="border p-2 rounded" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Primary contact name
            <span className="ml-1 text-xs text-blue-600 font-normal">
              (required)
            </span>
          </label>
          <input name="PrimaryContactName" placeholder="Primary contact" onChange={handleChange} className="border p-2 rounded" />
        </div>
        <div className="flex flex-col gap-1">
          <label className="text-sm font-medium text-gray-700">
            Primary contact phone
            <span className="ml-1 text-xs text-blue-600 font-normal">
              (required)
            </span>
          </label>
          <input name="PrimaryContactPhone" placeholder="Primary phone" onChange={handleChange} className="border p-2 rounded" />
        </div>
      </div>

      <div className="mt-4 flex gap-2">
        <button onClick={onBack} className="px-4 py-2 border rounded">Back</button>
        <button onClick={handleSubmit} disabled={loading} className="px-4 py-2 bg-sky-600 text-white rounded">
          {loading ? "Saving..." : "Create Restaurant"}
        </button>
      </div>
    </div>
  );
}