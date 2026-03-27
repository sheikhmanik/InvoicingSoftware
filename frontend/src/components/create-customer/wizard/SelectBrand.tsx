"use client";

import axios from "axios";
import { useEffect, useState } from "react";

export default function SelectBrand({ business, onBack, onSelect }: any) {
  const [brands, setBrands] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);

  const [showAddBrand, setShowAddBrand] = useState(false);

  // Form used inside modal
  const [form, setForm] = useState({
    name: "",
  });
  const [error, setError] = useState("");

  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handleSubmit = async () => {
    if (!form.name.trim()) {
      setError("Brand name is required.");
      return;
    }

    try {
      const URL = process.env.NEXT_PUBLIC_API_URL;
      await axios.post(`${URL}/brand`, {
        name: form.name,
        businessId: business.id,
      });

      // Instantly add new brand to UI
      setBrands(prev => [...prev, {
        name: form.name,
      }]);

      loadBrands(business.id);

      setShowAddBrand(false); // Close modal
      setForm({ name: "" });  // Reset
    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error || "Error creating brand");
    }
  };

  useEffect(() => {
    if (!business) return;
    loadBrands(business.id);
  }, [business]);

  const loadBrands = async (businessId: number) => {
    setLoading(true);
    try {
      const URL = process.env.NEXT_PUBLIC_API_URL;
      const res = await axios.get(`${URL}/brand`, { params: { businessId } });
      setBrands(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="bg-white rounded-lg shadow p-5">

        <div className="flex items-center justify-between mb-4">
          <div>
            <div className="text-sm text-gray-500">Selected Business</div>
            <div className="font-medium">{business?.name}</div>
          </div>

          <div className="flex gap-2">
            <button onClick={onBack} className="px-3 py-1 border rounded">Back</button>

            <button
              onClick={() => setShowAddBrand(true)}
              className="px-3 py-1 bg-sky-600 text-white rounded"
            >
              + New Brand
            </button>
          </div>
        </div>

        <div className="space-y-2">
          {loading && <div className="text-sm text-gray-500">Loading...</div>}

          {brands.map((b, idx) => (
            <div key={idx} className="flex items-center justify-between p-3 border rounded">
              <div className="font-medium">{b.name}</div>
              <button
                onClick={() => onSelect(b)}
                className="px-3 py-1 border rounded text-sm"
              >
                Select
              </button>
            </div>
          ))}

          {!loading && brands.length === 0 && (
            <div className="text-sm text-gray-500">No brands found for this business.</div>
          )}
        </div>
      </div>

      {/* ====== MODAL ====== */}
      {showAddBrand && (
        <div
          onClick={() => setShowAddBrand(false)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-lg rounded-xl shadow-lg p-6 relative animate-fadeIn"
          >

            {/* Close Button */}
            <button
              onClick={() => setShowAddBrand(false)}
              className="absolute right-4 top-4 text-gray-600 hover:text-black"
            >
              ✕
            </button>

            <h1 className="text-2xl font-bold mb-6 text-center">Add Brand</h1>
            {error && (
              <p className="text-sm text-red-600 font-medium py-2">{error}</p>
            )}

            <div className="space-y-4">
              <div>
                <label className="block font-medium mb-1">Brand Name</label>
                <input
                  name="name"
                  value={form.name}
                  onChange={handleChange}
                  placeholder="Brand Name"
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
      )}
    </>
  );
}