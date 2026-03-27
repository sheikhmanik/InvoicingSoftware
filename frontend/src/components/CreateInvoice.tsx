"use client";

import axios from "axios";
import { useState, useEffect } from "react";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function CreateInvoice() {

  const [businesses, setBusinesses] = useState<any[]>([]);
  const [business, setBusiness] = useState("");
  const [brands, setBrands] = useState<any[]>([]);
  const [stores, setStores] = useState<any[]>([]);
  const [plans, setPlans] = useState<any[]>([]);

  const [brand, setBrand] = useState("");
  const [store, setStore] = useState("");
  const [storeDetails, setStoreDetails] = useState<Record<string, any> | null>(null);
  const [plan, setPlan] = useState("");

  const [storeId, setStoreId] = useState<number | null>(null);
  const [planId, setPlanId] = useState<number | null>(null);

  const [displayDate, setDisplayDate] = useState("");

  const [duration, setDuration] = useState<number>(1);
  const [subtotal, setSubtotal] = useState(0);

  const [discountType, setDiscountType] = useState<"percent" | "fixed">("percent");
  const [discountValue, setDiscountValue] = useState(0);
  const [discountAmount, setDiscountAmount] = useState<number | null>(null);

  const [taxAmount, setTaxAmount] = useState(0);
  const [taxSettings, setTaxSettings] = useState({
    CGST: false,
    SGST: false,
    IGST: false,
    LUT: false,
  });

  const [totalAmount, setTotalAmount] = useState(0);
  const [error, setError] = useState("");

  useEffect(() => {
    let discounted;

    // Apply discount
    if (discountType === "percent") {
      // discounted -= (subtotal * discountValue) / 100;
      discounted = ( subtotal / 100 ) * discountValue
    } else {
      discounted = discountValue;
    }

    let tax = 0;

    // 🔥 Independent tax calculations
    const cgstAmount = taxSettings.CGST ? subtotal * 0.09 : 0;
    const sgstAmount = taxSettings.SGST ? subtotal * 0.09 : 0;
    const igstAmount = taxSettings.IGST ? subtotal * 0.18 : 0;
    tax = cgstAmount + sgstAmount + igstAmount

    setTaxAmount(tax);
    setTotalAmount((subtotal + tax) - discounted);
    setDiscountAmount(Math.ceil(discounted));
  }, [subtotal, discountType, discountValue, taxSettings]);

  useEffect(() => {
    axios.get(`${API}/business`).then((res) => {
      setBusinesses(res.data);
    });
    axios.get(`${API}/pricing-plan`).then((res) => {
      setPlans(res.data);
    });
  }, []);

  useEffect(() => {
    if (!planId) {
      setSubtotal(0);
      return;
    }
    const selectedPlan = plans.find((p) => p.id === planId);
    if (selectedPlan) {
      // setSubtotal(selectedPlan.planType === "fixed" ? selectedPlan.fixedPrice : selectedPlan.basePrice);
      const price = selectedPlan.planType === "fixed" ? Number(selectedPlan.fixedPrice) : Number(selectedPlan.basePrice);
      const validity = selectedPlan.planType === "fixed" ? Number(selectedPlan.billingCycle) : Number(selectedPlan.validity);
      if (!price || !validity) {
        setSubtotal(0);
        console.log("Invalid price or validity");
        return;
      }
      const perMonthPrice = Number(price) / Number(validity);
      const sub = Number(perMonthPrice * duration);
      setSubtotal(Math.ceil(sub));
    }
  }, [planId]);

  useEffect(() => {
    if (!duration || !planId) {
      setSubtotal(0);
      return;
    };
    const selectedPlan = plans.find((p) => p.id === planId);
    if (selectedPlan) {
      const price = selectedPlan.planType === "fixed" ? Number(selectedPlan.fixedPrice) : Number(selectedPlan.basePrice);
      const validity = selectedPlan.planType === "fixed" ? Number(selectedPlan.billingCycle) : Number(selectedPlan.validity);
      if (!price || !validity) {
        setSubtotal(0);
        console.log("Invalid price or validity");
        return;
      }
      const perMonthPrice = Number(price) / Number(validity);
      const sub = Number(perMonthPrice * duration);
      setSubtotal(Math.ceil(sub));
    }
  }, [duration, planId]);

  useEffect(() => {
    const selectedStore = stores.find((s) => s.name === store);
    if (selectedStore) {
      const taxes = selectedStore?.restaurantPricingPlans[0];
      setTaxSettings({
        CGST: taxes?.cgst || false,
        SGST: taxes?.sgst || false,
        IGST: taxes?.igst || false,
        LUT: taxes?.lut || false,
      });
    };
  }, [brand, store]);

  function handleBusiness(name: string) {
    setBusiness(name);
  
    if (!name || businesses.length === 0) {
      setBrands([]);
      setBrand("");
      setStores([]);
      setStore("");
      setPlan("");
      setPlan("");
      setStoreDetails(null);
      return;
    }
  
    const selectedBusiness = businesses.find((b) => b.name === name);
    setBrands(selectedBusiness?.brands ?? []);
  
    setBrand("");
    setStores([]);
    setStore("");
    setPlan("");
    setPlan("");
    setStoreDetails(null);
  }

  function handleBrand(name: string) {
    setBrand(name);
    const selectedBusiness = businesses.find((b) => b.name === business);
    const selectedBrand = selectedBusiness?.brands.find((br: any) => br.name === name);
    setStores(selectedBrand?.restaurants ?? []);
  }

  function handleStore(name: string) {
    setStore(name);
    const selectedBusiness = businesses.find((b) => b.name === business);
    const selectedBrand = selectedBusiness?.brands.find((br: any) => br.name === brand);
    const selectedStore = selectedBrand?.restaurants.find((st: any) => st.name === name);
    if (selectedStore) {
      setStoreId(selectedStore.id)
      setStoreDetails(selectedStore || {});
    };
  }

  async function handleCreateInvoice() {
    
    if (!business) {
      setError("Please select a Business.");
      return;
    }

    if (!brand) {
      setError("Please select a Brand.");
      return;
    }

    if (!storeId) {
      setError("Please select a Store.");
      return;
    }
  
    if (!planId) {
      setError("Please select a Pricing Plan.");
      return;
    }
  
    if (!duration || Number(duration) <= 0) {
      setError("Please select a valid invoice duration.");
      return;
    }
  
    if (!subtotal || Number(subtotal) <= 0) {
      setError("Please enter a valid Subtotal Amount.");
      return;
    }

    const payload = {
      restaurantId: Number(storeId),
      pricingPlanId: Number(planId),
      ...taxSettings,
      planMode: "live",
      customDuration: Number(duration),
      displayDate,
      subTotal: Number(subtotal),
      totalAmount: Number(totalAmount),
      discountAmount,
    };
  
    try {
      // console.log(payload); return;
      await axios.post(`${API}/restaurant/create-invoice`, payload);
      setError("");
      alert("Invoice created successfully!");
      window.scrollTo(0, 0);
      
      // clear the whole form
      setBusiness("");
      setBrand("");
      setStore("");
      setPlanId(null);
      setDisplayDate("");
      setDuration(1);
      setSubtotal(0);
      setDiscountType("percent");
      setDiscountValue(0);
      setTaxSettings({
        CGST: false,
        SGST: false,
        IGST: false,
        LUT: false,
      });
    } catch (err) {
      console.error("Error creating invoice:", err);
    }
  }

  return (
    <div className="max-w-3xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-5">CREATE INVOICE</h1>

      <div className="space-y-6">

        {error && (
          <div className="bg-red-100 text-red-700 p-3 rounded-md">
            {error}
          </div>
        )}

        {/* Business */}
        <div>
          <label className="text-sm font-semibold">Choose Business</label>
          <select
            className="w-full border rounded-md p-2 mt-1"
            value={business}
            onChange={(e) => handleBusiness(e.target.value as string)}
          >
            <option value="">Choose Company</option>
            {businesses.map((b) => (
              <option key={b.id} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Brand */}
        <div>
          <label className="text-sm font-semibold">Choose Brand</label>
          <select
            className="w-full border rounded-md p-2 mt-1"
            value={brand}
            onChange={(e) => handleBrand(e.target.value as string)}
          >
            <option value="">Choose Brand</option>
            {brands.map((b) => (
              <option key={b} value={b.name}>{b.name}</option>
            ))}
          </select>
        </div>

        {/* Store + Plan */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <div>
              <label className="text-sm font-semibold">Choose Store</label>
              <select
                className="w-full border rounded-md p-2 mt-1"
                value={store}
                onChange={(e) => handleStore(e.target.value as string)}
              >
                <option value="">Choose Store</option>
                {stores.map((s) => (
                  <option key={s.id} value={s.name}>{s.name}</option>
                ))}
              </select>
            </div>
            {storeDetails && <span className="text-sm pl-1">Location: {storeDetails?.location}</span>}
          </div>

          <div>
            <label className="text-sm font-semibold">Choose Plan</label>
            <select
              className="w-full border rounded-md p-2 mt-1"
              value={planId || ""}
              onChange={(e) => setPlanId(Number(e.target.value))}
            >
              <option value="">Choose Plan</option>
              {plans.map((p) => (
                <option key={p.id} value={p.id}>{p.planName}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Display Date */}
        <div>
          <label className="text-sm font-semibold">Display Date (Optional)</label>
          <input
            type="date"
            max={new Date().toISOString().split("T")[0]} // ⛔ prevents future calendar selection
            onClick={(e) => (e.target as HTMLInputElement).showPicker()}
            className="w-full border rounded-md p-2 mt-1"
            value={displayDate}
            onChange={(e) => setDisplayDate(e.target.value)}
          />
        </div>

        {/* Duration */}
        <div>
          <label className="text-sm font-semibold">Invoice Duration</label>
          <select
            className="w-full border rounded-md p-2 mt-1"
            value={duration}
            onChange={(e) => setDuration(e.target.value as any)}
          >
            <option value={1}>1 Month</option>
            <option value={2}>2 Months</option>
            <option value={3}>3 Months</option>
            <option value={4}>4 Months</option>
            <option value={5}>5 Months</option>
            <option value={6}>6 Months</option>
            <option value={7}>7 Months</option>
            <option value={8}>8 Months</option>
            <option value={9}>9 Months</option>
            <option value={10}>10 Months</option>
            <option value={11}>11 Months</option>
            <option value={12}>12 Months</option>
          </select>
        </div>

        {/* Subtotal */}
        <div>
          <label className="text-sm font-semibold">Subtotal Amount</label>
          <input
            disabled
            type="number"
            className="w-full border rounded-md p-2 mt-1"
            value={Number(subtotal)}
          />
        </div>

        {/* Discount */}
        <div>
          <label className="text-sm font-semibold">Discount</label>
          <div className="flex gap-2 mt-1">
            <select
              className="border rounded-md p-2"
              value={discountType}
              onChange={(e) => setDiscountType(e.target.value as any)}
            >
              <option value="percent">Percent</option>
              <option value="fixed">Fixed</option>
            </select>

            <input
              type="number"
              className="border rounded-md p-2 flex-1"
              value={discountValue}
              onChange={(e) => setDiscountValue(Number(e.target.value))}
            />
          </div>
        </div>

        {/* TAX SETTINGS */}
        <div className="border rounded-lg p-2 bg-gray-50">
          <div className="bg-gray-100 p-4 rounded space-y-3">
            <h3 className="text-md font-semibold text-gray-800">GST Settings</h3>

            <div className="flex flex-col gap-2 text-sm">

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={taxSettings.CGST}
                  onChange={(e) => setTaxSettings(prev => ({ ...prev, CGST: e.target.checked }))}
                />
                <span>CGST 9%</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={taxSettings.SGST}
                  onChange={(e) => setTaxSettings(prev => ({ ...prev, SGST: e.target.checked }))}
                />
                <span>SGST 9%</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={taxSettings.IGST}
                  onChange={(e) => setTaxSettings(prev => ({ ...prev, IGST: e.target.checked }))}
                />
                <span>IGST 18%</span>
              </label>

              <label className="flex items-center gap-2">
                <input
                  type="checkbox"
                  className="w-4 h-4"
                  checked={taxSettings.LUT}
                  onChange={(e) => setTaxSettings(prev => ({ ...prev, LUT: e.target.checked }))}
                />
                <span>Add LUT</span>
              </label>

            </div>
          </div>
        </div>

        {/* Total */}
        <div>
          <label className="text-sm font-semibold">Total Amount</label>
          <input
            disabled
            type="number"
            className="w-full border rounded-md p-2 bg-gray-100"
            value={totalAmount.toFixed(2)}
          />
        </div>

        {/* Submit */}

        <button
          onClick={() => handleCreateInvoice()}
          className="w-full bg-black text-white py-2 rounded-md text-lg font-semibold hover:bg-gray-800"
        >
          Create Invoice
        </button>

      </div>
    </div>
  );
}