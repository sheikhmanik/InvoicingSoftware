"use client";

import axios from "axios";
import { useEffect, useState } from "react";

type BusinessForm = {
  name: string;
  address: string;
  location: string;
  GSTIN: string;
  PrimaryContactName: string;
  PrimaryContactPhone: string;
  PrimaryContactEmail: string;
};

export default function SelectBusiness({ onSelect }: any) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [creatingNewBusiness, setCreatingNewBusiness] = useState(false);
  const [error, setError] = useState("");

  const [form, setForm] = useState<BusinessForm>({
    name: "",
    address: "",
    location: "",
    GSTIN: "",
    PrimaryContactName: "",
    PrimaryContactPhone: "",
    PrimaryContactEmail: "",
  });

  // Handle input updates
  const handleChange = (e: any) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  // Submit form
  const handleSubmit = async () => {
    try {
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

      const URL = process.env.NEXT_PUBLIC_API_URL;
      await axios.post(`${URL}/business`, form);

      // Close modal
      setCreatingNewBusiness(false);

      // Reset form
      setForm({
        name: "",
        address: "",
        location: "",
        GSTIN: "",
        PrimaryContactName: "",
        PrimaryContactPhone: "",
        PrimaryContactEmail: "",
      });

      // Reload business list
      load();

    } catch (err: any) {
      console.error(err);
      alert(err.response?.data?.error ?? "Error creating business");
    }
  };

  // Load business list (debounced)
  useEffect(() => {
    const t = setTimeout(() => load(query), 300);
    return () => clearTimeout(t);
  }, [query]);

  // Fetch businesses
  const load = async (q = "") => {
    setLoading(true);
    try {
      const URL = process.env.NEXT_PUBLIC_API_URL;
      const res = await axios.get(`${URL}/business`, {
        params: q ? { search: q } : {},
      });
      setResults(res.data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Load initial
  useEffect(() => { load(); }, []);

  return (
    <>
      {/* MAIN CARD */}
      <div className="bg-white p-5 rounded-lg shadow max-w-2xl mx-auto w-full">
        <div className="flex flex-col md:flex-row items-center gap-3 mb-4">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search business by name..."
            className="flex-1 w-full border px-3 py-2 rounded"
          />

          <button
            onClick={() => setCreatingNewBusiness(true)}
            className="w-full md:w-auto px-4 py-2 bg-sky-600 text-white rounded hover:bg-sky-700 transition"
          >
            + New Business
          </button>
        </div>

        {/* LIST */}
        <div className="space-y-2">
          {loading && <div className="text-sm text-gray-500">Loading...</div>}

          {results.map((b) => (
            <div
              key={b.id}
              className="flex items-center justify-between p-3 border rounded"
            >
              <div>
                <div className="font-medium">{b.name}</div>
                <div className="text-xs text-gray-500">{b.address}</div>
              </div>

              <button
                onClick={() => onSelect(b)}
                className="px-3 py-1 border rounded text-sm hover:bg-gray-100 transition"
              >
                Select
              </button>
            </div>
          ))}

          {results.length === 0 && !loading && (
            <div className="text-sm text-gray-500">No businesses found.</div>
          )}
        </div>
      </div>

      {/* MODAL */}
      {creatingNewBusiness && (
        <div
          onClick={() => setCreatingNewBusiness(false)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-3 overflow-y-auto"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white p-6 rounded-xl shadow-lg w-full max-w-lg relative animate-fadeIn h-[90vh] overflow-y-auto"
          >
            
            <button
              onClick={() => setCreatingNewBusiness(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-700 text-xl"
            >
              ✕
            </button>

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
                <Input label="Name" name="name" onChange={handleChange} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Business Address
                  <span className="ml-1 text-xs text-blue-600 font-normal">
                    (required)
                  </span>
                </label>
                <Input label="Address" name="address" onChange={handleChange} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Business Location
                  <span className="ml-1 text-xs text-blue-600 font-normal">
                    (required)
                  </span>
                </label>
                <Input label="Location" name="location" onChange={handleChange} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Business GSTIN
                  <span className="ml-1 text-xs text-blue-600 font-normal">
                    (required)
                  </span>
                </label>
                <Input label="GSTIN" name="GSTIN" onChange={handleChange} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Primary Contact Name
                  <span className="ml-1 text-xs text-blue-600 font-normal">
                    (required)
                  </span>
                </label>
                <Input label="Primary Contact Name" name="PrimaryContactName" onChange={handleChange} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Primary Contact Phone
                  <span className="ml-1 text-xs text-blue-600 font-normal">
                    (required)
                  </span>
                </label>
                <Input label="Primary Contact Phone" name="PrimaryContactPhone" onChange={handleChange} />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Primary Contact Email
                  <span className="ml-1 text-xs text-blue-600 font-normal">
                    (required)
                  </span>
                </label>
                <Input label="Primary Contact Email" name="PrimaryContactEmail" onChange={handleChange} />
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

/* SMALL INPUT COMPONENT */
function Input({ label, name, onChange }: any) {
  return (
    <input
      name={name}
      onChange={onChange}
      className="w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-blue-500 outline-none"
    />
  );
}