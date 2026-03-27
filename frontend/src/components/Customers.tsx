"use client";

import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Product {
  id: number;
  name: string;
  createdAt?: string;
  license: string;
}

interface MeteredProduct {
  id?: number;
  productId: number;
  credits: number | string;
  product: Product;
  isActive?: boolean;
}

interface IncludedProduct {
  id?: number;
  productId: number;
  credits: number | string;
  product: Product;
  isActive?: boolean;
}

interface HybridProduct {
  id?: number;
  productId: number;
  unlimited: boolean;
  unlimitedUsage: string;
  numberOfUnits?: number | string;
  creditsPerUnit?: number | string;
  product: Product;
  isActive?: boolean;
}

export interface PricingPlan {
  id: number;
  planType: "fixed" | "metered" | "hybrid";
  planName: string;
  description: string;
  fixedPrice?: number | string | null;
  basePrice: number | string;
  creditsIncluded: number | string;
  validity: number;
  billingCycle: string;
  meteredProducts: MeteredProduct[];
  includedProducts: IncludedProduct[];
  hybridProducts: HybridProduct[];
  createdAt?: string;
  invoices: any[];
  restaurantName: string;
  pricingPlan: any[];
}

interface Restaurant {
  id: number;
  name: string;
  location: string;
  brand: {
    id: number;
    name: string;
    business: {
      id: number;
      name: string;
    };
  } | null;
  restaurantPricingPlans: {
    pricingPlan: PricingPlan;
  }[];
  invoices: any[];
}

interface Invoice {
  id: string;
  createdAt: string;
  proformaNumber: string;
  invoiceNumber: string;
  totalAmount: number;
  dueDate: string;
  status: string;
  pricingPlan: {
    planName: string;
  };
  paidAmount: number;
  remainingAmount: number;
  restaurant: Restaurant;
}

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Customers() {

  const [restaurants, setRestaurants] = useState([]);
  const [currentResId, serCurrentResId] = useState<number | null>(null);
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant[]>([]);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [allPlans, setAllPlans] = useState<PricingPlan[]>([]);
  const [planEditingModal, setPlanEditingModal] = useState(false);
  const [selectedRestaurant, setSelectedRestaurant] = useState<null | Record<any, any>>(null);
  const [selectedPricingPlanId, setSelectedPricingPlanId] = useState<number | null>(null);
  const [currentPlan, setCurrentPlan] = useState<PricingPlan>();
  const [confirmAssignModal, setConfirmAssignModal] = useState(false);
  const [updatePayment, setUpdatePayment] = useState(false);
  const [paidCustomers, setPaidCustomers] = useState([]);
  const [unpaidCustomers, setUnpaidCustomers] = useState([]);
  const [display, setDisplay] = useState<"paid" | "unpaid" | "customers">(() => {
    const saved = localStorage.getItem("customerView");
    if (saved === "paid" || saved === "unpaid" || saved === "customers") {
      return saved;
    }
    return "customers";
  });
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [hydrated, setHydrated] = useState(false);

  const [startDate, setStartDate] = useState(() => {
    const today = new Date().toISOString().split("T")[0];
    return today;
  });

  const [planMode, setPlanMode] = useState<"trial" | "live">("live");
  const [trialDays, setTrialDays] = useState<number>(15);

  const [taxSettings, setTaxSettings] = useState({
    CGST: false,
    SGST: false,
    IGST: false,
    LUT: false,
  });

  const [paymentDate, setPaymentDate] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isPartial, setIsPartial] = useState("No");
  const [partialAmount, setPartialAmount] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [assigningPlan, setAssigningPlan] = useState(false);
  const [updatingTaxSettings, setUpdatingTaxSettings] = useState(false);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [assigningPlanId, setAssigningPlanId] = useState<number | null>(null);
  const [newInvCreationModal, setNewInvCreationModal] = useState(false);

  async function selectRestaurant(restaurantId: any) {
    setCurrentPlan(undefined);
    const restaurant = restaurants.find((r: any) => r.id === restaurantId);
    if (restaurant) setSelectedRestaurant(restaurant);

    const map = await axios.get(`${API}/restaurant/plan-map/${restaurantId}`);
    const pricingPlanId = map.data?.pricingPlanId;

    if (pricingPlanId) {
      const planRes = await axios.get(`${API}/restaurant/plan-map/${restaurantId}/${pricingPlanId}`);
      const fullPlan = planRes.data;
      const { addLut, cgst, igst, sgst } = fullPlan;
      setTaxSettings({ LUT: addLut, CGST: cgst, IGST: igst, SGST: sgst });
      if (fullPlan) setCurrentPlan(fullPlan.pricingPlan);
    }
  }

  async function handleAssignPlan(restaurantId: number, pricingPlanId: number, confirm: boolean, newInvoiceCreation: "yes" | "no") {
    if (!startDate) return alert("Please include start date.");
    if (!planMode) return alert("Please include plan mode.");
    if (planMode === "trial" && !trialDays) return alert("Please include trial days.");
    if (!confirm) return;
    setAssigningPlan(true);
    const payload = {
      restaurantId,
      pricingPlanId,
      ...taxSettings,
      startDate,
      planMode,
      trialDays: planMode === "trial" ? trialDays : null,
      newInvoiceCreation,
    }
    try {
      // console.log(payload); return;
      await axios.post(`${API}/restaurant/assign-plan`, payload);
      alert("Plan assigned successfully!");
      setPlanEditingModal(false);
      window.location.reload();
    } catch (err: any) {
      console.log(err);
      const backendMsg = err?.response?.data?.message || err?.message || "Something went wrong!";
      alert(backendMsg);
    } finally {
      setAssigningPlan(false);
      setAssigningPlanId(null);
    }
  }

  async function handleUpdateTaxSettings(restaurantId: number) {
    if (!startDate) return alert("Please include start date.");
    if (!planMode) return alert("Please include plan mode.");
    if (planMode === "trial" && !trialDays) return alert("Please include trial days.");
    if (!currentPlan) return alert("No plan assigned on this business.");
    if (!currentInvoice) return alert("No current invoice found.");
    setUpdatingTaxSettings(true);
    const payload = {
      restaurantId,
      pricingPlanId: currentPlan?.id,
      ...taxSettings,
      startDate,
      planMode,
      trialDays,
      proformaNumber: currentInvoice.proformaNumber,
    };
    try {
      await axios.post(`${API}/restaurant/update-tax-settings`, payload);
      alert("Tax settings applied successfully.");
      setPlanEditingModal(false);
      setCurrentInvoice(null);
      window.location.reload();
    } catch (err) {
      console.error(err);
    } finally {
      setUpdatingTaxSettings(false);
    }
  }

  async function handleUpdatePayment() {
    if (!paymentDate) {
      setError("Payment date is required!");
      return;
    }
    if (!paymentFile) {
      setError("Payment file is required!");
      return;
    }
    if (!currentInvoice) {
      setError("No current invoice found!");
      return;
    }

    setUpdatingPayment(true);
  
    try {
      let uploadedUrl = null;
  
      if (paymentFile) {
        const data = new FormData();
        data.append("file", paymentFile);
        data.append("upload_preset", "fuvii-invoice");
  
        const cloudinaryRes = await axios.post(
          "https://api.cloudinary.com/v1_1/dzr9nt9aj/auto/upload",
          data
        );
  
        uploadedUrl = cloudinaryRes.data.secure_url;
      }
  
      const payload = {
        currentResId,
        paymentDate,
        paymentNotes,
        isPartial,
        partialAmount: isPartial === "Yes" ? partialAmount : null,
        paymentFileUrl: uploadedUrl,
        proformaNumber: currentInvoice.proformaNumber,
      };
      await axios.post(`${API}/restaurant/update-payment`, payload);
  
      alert("Payment updated successfully!");
      setUpdatePayment(false);
      serCurrentResId(null);
      setCurrentInvoice(null);
      window.location.reload();

    } catch (err) {
      console.error(err);
      setError("Upload failed. Try again.");
    } finally {
      setUpdatingPayment(false);
    }
  }

  useEffect(() => {
    axios.get(`${API}/restaurant`).then((res) => {
      setRestaurants(res.data);
      const paid = res.data?.filter((res: any) => res.invoices.length > 0 &&  res.invoices.at(-1).status === "paid");
      const unpaid = res.data?.filter((res: any) => 
        res.invoices.length > 0 &&  res.invoices.at(-1).status === "pending" ||
        res.invoices.length > 0 &&  res.invoices.at(-1).status === "partially paid"
      );
      if (paid) setPaidCustomers(paid);
      if (unpaid) setUnpaidCustomers(unpaid);
    });
  }, []);

  useEffect(() => {
    if (currentResId === null) {
      setCurrentRestaurant([]);
    } else {
      const filtered = restaurants.filter((r: any) => r.id === currentResId);
      setCurrentRestaurant(filtered);
      console.log(filtered);
    }
  }, [currentResId, restaurants]);

  useEffect(() => {
    (async function fetchPricingPlan() {
      try {
        const res = await axios.get(`${API}/pricing-plan`);
        if (res.data) setAllPlans(res.data);
      } catch {}
    })();
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("customerView");
    if (saved === "paid" || saved === "unpaid" || saved === "customers") {
      setDisplay(saved);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem("customerView", display);
  }, [display]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return null;
  }

  if (restaurants.length === 0) {
    return (
      <table className="w-full">
        <tbody>
          <tr>
            <td colSpan={8} className="text-center py-6 text-gray-500">
              No customers found.
            </td>
          </tr>
        </tbody>
      </table>
    );
  }

  function groupInvoicesIntoCycles(invoices: any[]) {
    if (!invoices || invoices.length === 0) return [];
  
    const sorted = [...invoices].sort(
      (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
    );
  
    const cycles = [];
    let currentCycle = [];
  
    for (let i = 0; i < sorted.length; i++) {
      const invoice = sorted[i];
  
      if (i === 0) {
        // first invoice always starts a new cycle
        currentCycle.push(invoice);
        continue;
      }
  
      const prev = sorted[i - 1];
  
      const planChanged = invoice.pricingPlanId !== prev.pricingPlanId;
  
      // If plan changed → new billing cycle
      if (planChanged) {
        cycles.push(currentCycle);
        currentCycle = [invoice];
      } else {
        // Same plan → continue same cycle
        currentCycle.push(invoice);
      }
    }
  
    // push last cycle
    if (currentCycle.length > 0) cycles.push(currentCycle);
  
    return cycles;
  }

  return (
    <>
      <div className="p-6 max-w-7xl mx-auto overflow-scroll">
        <div className="flex flex-col gap-10">
          
          <div className="flex items-center justify-center">
            <button
              className={`flex-1 flex items-center justify-center py-2 ${display === "unpaid" ? "bg-blue-700 text-white font-semibold" : "bg-gray-200 text-black"} `}
              onClick={() => setDisplay("unpaid")}
            >Unpaid Invoice</button>
            <button
              className={`flex-1 flex items-center justify-center py-2 ${display === "paid" ? "bg-blue-700 text-white font-semibold" : "bg-gray-200 text-black"} `}
              onClick={() => setDisplay("paid")}
            >Paid Invoice</button>
            <button
              className={`flex-1 flex items-center justify-center py-2 ${display === "customers" ? "bg-blue-700 text-white font-semibold" : "bg-gray-200 text-black"} `}
              onClick={() => setDisplay("customers")}
            >All Customers</button>
          </div>

          {display === "customers" && (
            <div>
              <div className="overflow-x-auto bg-white shadow-md rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700 border-b">
                    <tr>
                      <th className="p-3 border-r text-center font-semibold">Outlet</th>
                      <th className="p-3 border-r text-center font-semibold">Subscription Type</th>
                      <th className="p-3 border-r text-center font-semibold">Proforma Invoice</th>
                      <th className="p-3 border-r text-center font-semibold">Pending</th>
                      <th className="p-3 border-r text-center font-semibold">Paid</th>
                      <th className="p-3 border-r text-center font-semibold">Initial Churn</th>
                      <th className="p-3 border-r text-center font-semibold">Churn</th>
                      <th className="p-3 text-center font-semibold">Update</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    {restaurants?.map((r: any) => (
                      <tr key={r.id} className="border-b hover:bg-gray-50 transition">
    
                        {/* OUTLET */}
                        <td className="p-4 border-r text-center">
                          <div className="font-semibold text-gray-800">{r.name}</div>
                          <div className="text-xs text-gray-500">{r.location}</div>
    
                          {/* Brand Name */}
                          <div className="text-xs text-blue-600 mt-1 font-medium">
                            Brand: {r.brand?.name || "—"}
                          </div>
    
                          {/* Business Name */}
                          <div className="text-xs text-green-600 font-medium">
                            Business: {r.brand?.business?.name || "—"}
                          </div>
    
                          {/* Add/Edit Pricing plan */}
                          <div className="flex items-center justify-center mt-1">
                            <button
                              onClick={() => {
                                selectRestaurant(r.id);
                                setPlanEditingModal(true);
                                setCurrentInvoice(r.invoices?.at(-1))
                              }}
                              className="block w-full text-xs py-1.5 border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer"
                            >
                              Add/Edit Pricing Plan
                            </button>
                          </div>
                        </td>
    
                        {/* SUBSCRIPTION TYPE */}
                        <td className="p-4 border-r text-center leading-5 text-sm text-gray-700">
                          {r.restaurantPricingPlans?.length > 0 && r.restaurantPricingPlans[0]?.pricingPlan ? (
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {r.restaurantPricingPlans[0].pricingPlan.planName}
                              </span>
                              <span className="text-xs text-gray-500 capitalize">
                                {r.restaurantPricingPlans[0].pricingPlan.planType}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500">No plan assigned.</span>
                          )}
                        </td>
    
                        {/* PROFORMA */}
                        <td className="p-4 border-r text-center">
                          {r.invoices?.length > 0 ? (
                            <div className="text-xs space-y-3">
                              {/* Due Date */}
                              <div>
                                <p className="text-gray-500">Due Date</p>
                                <p className="font-semibold">
                                  {r.invoices?.[r.invoices.length - 1]?.dueDate?.split("T")[0] ?? "--"}
                                </p>
                              </div>
        
                              {/* Total Amount */}
                              <div>
                                <p className="text-gray-500">Total Amount</p>
                                <p className="font-semibold">
                                  {r.invoices?.[r.invoices.length - 1]?.totalAmount ?? "--"}
                                </p>
                              </div>
        
                              {/* Status */}
                              <div>
                                <p className="text-gray-500">Status</p>
                                <p
                                  className={`font-semibold capitalize ${
                                    r.invoices?.[r.invoices.length - 1]?.status === "paid"
                                      ? "text-green-600"
                                      : r.invoices?.[r.invoices.length - 1]?.status === "overdue"
                                      ? "text-red-600"
                                      : "text-yellow-600"
                                  }`}
                                >
                                  {r.invoices?.[r.invoices.length - 1]?.status ?? "--"}
                                </p>
                              </div>
        
                              <div className="flex flex-col gap-2">
                                <Link
                                  href={`/invoice/${r.id}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                                >
                                  Invoice
                                </Link>
                                {r.invoices.at(-1)?.status !== "paid" && (
                                  <button
                                    onClick={() => {
                                      serCurrentResId(r.id)
                                      setUpdatePayment(true)
                                      setCurrentInvoice(r.invoices?.at(-1))
                                    }}
                                    className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                                  >
                                    Update Payment
                                  </button>
                                )}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400">—</span>
                          )}
                        </td>
    
                        {/* PENDING */}
                        <td className="p-4 border-r text-center leading-5">
                          <div className="text-red-600 font-semibold">
                            {r.invoices?.[r.invoices.length - 1]?.status === "pending"
                            || r.invoices?.[r.invoices.length - 1]?.status === "partially paid" ? (
                              <p>{r.invoices?.[r.invoices.length - 1]?.remainingAmount}</p>
                            ) : <span className="text-gray-400 text-xs">—</span>}
                          </div>
                        </td>

                        {/* PAID */}
                        <td className="p-4 border-r text-center leading-5">
                          {(() => {

                            const cycles = groupInvoicesIntoCycles(r.invoices || []);
                            const invoices = cycles.length > 0 ? cycles[cycles.length - 1] : [];
                            if (invoices.length === 0) {
                              return <span className="text-gray-400">—</span>;
                            }

                            const latest = invoices.at(-1);
                            const status = latest?.status?.toLowerCase().trim();
                            const partials = invoices.filter((inv: any) =>
                              inv.status?.toLowerCase().trim() === "partially paid"
                            );

                            // ⭐ Fully Paid
                            if (status === "paid") {
                              return (
                                <div className="space-y-1 text-xs text-center">
                                  <div className="font-semibold text-green-700">Fully Paid ✓</div>
                                  <div className="text-gray-800">
                                    {latest.paymentDate?.split("T")[0] ?? "—"}
                                  </div>
                                  <div className="text-green-700 font-medium">
                                    Tax Invoice
                                  </div>
                                </div>
                              );
                            }

                            // ⭐ Partially Paid
                            if (partials.length > 0 || status === "partially paid") {
                              return (
                                <div className="space-y-2">
                                  {partials.map((inv: any, index: number) => (
                                    <div
                                      key={index}
                                      className="bg-orange-50 border border-orange-200 rounded-md p-2 text-xs shadow-sm text-left"
                                    >
                                      <div className="font-semibold text-orange-700">
                                        Paid: {inv.partialAmount}/-
                                      </div>
                                      <div className="text-gray-800">
                                        Date: {inv.paymentDate?.split("T")[0] ?? "—"}
                                      </div>

                                      {inv.paymentNotes && (
                                        <div className="text-gray-600 italic">
                                          {inv.paymentNotes}
                                        </div>
                                      )}

                                      <div className="font-semibold mt-1 text-red-600">
                                        Remaining: {Math.max(0, inv.remainingAmount)}/-
                                      </div>

                                      <div className="py-1 flex flex-col gap-1">
                                        {inv.paymentFileUrl && (
                                          <Link
                                            href={inv.paymentFileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-gray-600 text-xs underline hover:text-gray-800 transition"
                                          >
                                            📄 View Receipt
                                          </Link>
                                        )}
                                        <Link
                                          href={`/invoice/${r.id}/specific/${inv.id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="
                                            inline-flex items-center gap-1 px-2 py-1 rounded
                                            bg-blue-500 text-white text-[10px] font-medium
                                            hover:bg-blue-600 shadow-sm hover:shadow transition-all
                                          "
                                        >
                                          Invoice →
                                        </Link>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            }

                            // ⭐ No payments yet (Only Pending invoice exists)
                            if (status === "pending") {
                              return (
                                <div className="text-gray-600 text-xs italic">
                                  No payments made yet
                                </div>
                              );
                            }

                            return <span className="text-gray-400">—</span>;
                          })()}
                        </td>
    
                        {/* INITIAL CHURN */}
                        <td className="p-4 border-r text-center font-medium">
                          <span className="text-gray-400">—</span>
                        </td>
    
                        {/* CHURN */}
                        <td className="p-4 border-r text-center font-medium">
                          <span className="text-gray-400">—</span>
                        </td>
    
                        {/* UPDATE ACTIONS */}
                        <td className="p-4 text-center space-y-2">
                          <span className="text-gray-400">—</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
          
          {display === "paid" && (
            <div>
              <div className="overflow-x-auto bg-white shadow-md rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700 border-b">
                    <tr>
                      <th className="p-3 border-r text-center font-semibold">Outlet</th>
                      <th className="p-3 border-r text-center font-semibold">Subscription Type</th>
                      <th className="p-3 border-r text-center font-semibold">Proforma Invoice</th>
                      <th className="p-3 border-r text-center font-semibold">Payment Docs</th>
                      <th className="p-3 border-r text-center font-semibold">Paid</th>
                      <th className="p-3 border-r text-center font-semibold">Initial Churn</th>
                      <th className="p-3 border-r text-center font-semibold">Churn</th>
                      <th className="p-3 text-center font-semibold">Update</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    {paidCustomers?.map((r: any) => (
                      <tr key={r.id} className="border-b hover:bg-gray-50 transition">

                        {/* OUTLET */}
                        <td className="p-4 border-r text-center">
                          <div className="font-semibold text-gray-800">{r.name}</div>
                          <div className="text-xs text-gray-500">{r.location}</div>

                          {/* Brand Name */}
                          <div className="text-xs text-blue-600 mt-1 font-medium">
                            Brand: {r.brand?.name || "—"}
                          </div>

                          {/* Business Name */}
                          <div className="text-xs text-green-600 font-medium">
                            Business: {r.brand?.business?.name || "—"}
                          </div>

                          {/* Add/Edit Pricing plan */}
                          <div className="flex items-center justify-center mt-1">
                            <button
                              onClick={() => {
                                selectRestaurant(r.id);
                                setPlanEditingModal(true);
                                setCurrentInvoice(r.invoices?.at(-1))
                              }}
                              className="block w-full text-xs py-1.5 border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer"
                            >
                              Add/Edit Pricing Plan
                            </button>
                          </div>
                        </td>

                        {/* SUBSCRIPTION TYPE */}
                        <td className="p-4 border-r text-center leading-5 text-sm text-gray-700">
                          {r.restaurantPricingPlans?.length > 0 && r.restaurantPricingPlans[0]?.pricingPlan ? (
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {r.restaurantPricingPlans[0].pricingPlan.planName}
                              </span>
                              <span className="text-xs text-gray-500 capitalize">
                                {r.restaurantPricingPlans[0].pricingPlan.planType}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500">No plan assigned.</span>
                          )}
                        </td>

                        {/* PROFORMA */}
                        <td className="p-4 border-r text-center text-xs space-y-3">

                          {/* Due Date */}
                          <div>
                            <p className="text-gray-500">Due Date</p>
                            <p className="font-semibold">
                              {r.invoices?.[r.invoices.length - 1]?.dueDate?.split("T")[0] ?? "--"}
                            </p>
                          </div>

                          {/* Total Amount */}
                          <div>
                            <p className="text-gray-500">Total Amount</p>
                            <p className="font-semibold">
                              {r.invoices?.[r.invoices.length - 1]?.totalAmount ?? "--"}
                            </p>
                          </div>

                          {/* Status */}
                          <div>
                            <p className="text-gray-500">Status</p>
                            <p
                              className={`font-semibold capitalize ${
                                r.invoices?.[r.invoices.length - 1]?.status === "paid"
                                  ? "text-green-600"
                                  : r.invoices?.[r.invoices.length - 1]?.status === "overdue"
                                  ? "text-red-600"
                                  : "text-yellow-600"
                              }`}
                            >
                              {r.invoices?.[r.invoices.length - 1]?.status ?? "--"}
                            </p>
                          </div>

                          <div className="flex flex-col gap-2">
                            <Link
                              href={`/invoice/${r.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Invoice
                            </Link>
                            {r.invoices.at(-1)?.status !== "paid" && (
                              <button
                                onClick={() => {
                                  serCurrentResId(r.id)
                                  setUpdatePayment(true)
                                  setCurrentInvoice(r.invoices?.at(-1))
                                }}
                                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                              >
                                Update Payment
                              </button>
                            )}
                          </div>

                        </td>

                        {/* Payment Docs */}
                        <td className="p-4 border-r text-center leading-5">
                          <div className="space-y-3">

                            {r.invoices
                              ?.filter((inv: any) => inv.partialAmount > 0 || inv.paymentFileUrl || inv.paymentNotes) // 👈 show any payment record
                              ?.map((inv: any, i: number) => (
                                <div
                                  key={inv.id || i}
                                  className="bg-gray-50 border border-gray-300 rounded-lg p-2 text-left text-xs space-y-1 shadow-sm"
                                >
                                  <div className="flex justify-between">
                                    <span className="font-semibold text-gray-700">
                                      Paid: {inv.partialAmount ?? 0}/-
                                    </span>
                                    <span className="text-gray-500">
                                      {inv.paymentDate?.split("T")[0] || "—"}
                                    </span>
                                  </div>

                                  {/* Notes */}
                                  {inv.paymentNotes && (
                                    <div className="text-gray-600 italic">
                                      {inv.paymentNotes}
                                    </div>
                                  )}

                                  {/* Document */}
                                  <div className="flex flex-col gap-1">
                                    <Link
                                      href={inv.paymentFileUrl}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-blue-600 underline hover:text-blue-800"
                                    >
                                      📄 View Receipt
                                    </Link>
                                    <Link
                                      href={`/invoice/${r.id}/specific/${inv.id}`}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="
                                        inline-flex items-center gap-1 px-2 py-1 rounded
                                        bg-blue-500 text-white text-[10px] font-medium
                                        hover:bg-blue-600 shadow-sm hover:shadow transition-all
                                      "
                                    >
                                      Invoice →
                                    </Link>
                                  </div>
                                </div>
                              ))}

                            {/* If no payment docs */}
                            {(!r.invoices || !r.invoices.some((inv: any) => inv.paymentFileUrl || inv.paymentNotes)) && (
                              <span className="text-gray-400 text-xs">No docs added</span>
                            )}

                          </div>
                        </td>

                        {/* PAID */}
                        <td className="p-4 border-r text-center leading-5">
                          {(() => {
                            const invoices = r.invoices || [];
                            if (invoices.length === 0) {
                              return <span className="text-gray-400">—</span>;
                            }

                            const latest = invoices.at(-1);
                            if (latest.status === "paid") {
                              return (
                                <div className="space-y-1 text-xs text-center">
                                  <div className="font-semibold text-green-700">Fully Paid ✓</div>
                                  <div className="text-gray-800">
                                    {latest.paymentDate?.split("T")[0] ?? "—"}
                                  </div>
                                  <div className="text-green-700 font-medium">
                                    Tax Invoice
                                  </div>
                                </div>
                              );
                            } else {
                              return (
                                "-"
                              )
                            }

                          })()}
                        </td>

                        {/* INITIAL CHURN (dummy) */}
                        <td className="p-4 border-r text-center font-medium">
                          -
                        </td>

                        {/* CHURN (dummy) */}
                        <td className="p-4 border-r text-center font-medium">
                          -
                        </td>

                        {/* UPDATE ACTIONS */}
                        <td className="p-4 text-center space-y-2">
                          -
                        </td>
                      </tr>
                    ))}
                    {restaurants.length > 0 && paidCustomers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-6 text-gray-500">
                          No paid customers found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {display === "unpaid" && (
            <div>
              <div className="overflow-x-auto bg-white shadow-md rounded-lg border border-gray-200">
                <table className="w-full text-sm">
                  <thead className="bg-gray-100 text-gray-700 border-b">
                    <tr>
                      <th className="p-3 border-r text-center font-semibold">Outlet</th>
                      <th className="p-3 border-r text-center font-semibold">Subscription Type</th>
                      <th className="p-3 border-r text-center font-semibold">Proforma Invoice</th>
                      <th className="p-3 border-r text-center font-semibold">Pending</th>
                      <th className="p-3 border-r text-center font-semibold">Due For</th>
                      <th className="p-3 border-r text-center font-semibold">Paid</th>
                      <th className="p-3 border-r text-center font-semibold">Churn</th>
                      <th className="p-3 text-center font-semibold">Update</th>
                    </tr>
                  </thead>
                  <tbody className="text-gray-700">
                    {unpaidCustomers?.map((r: any) => (
                      <tr key={r.id} className="border-b hover:bg-gray-50 transition">

                        {/* OUTLET */}
                        <td className="p-4 border-r text-center">
                          <div className="font-semibold text-gray-800">{r.name}</div>
                          <div className="text-xs text-gray-500">{r.location}</div>

                          {/* Brand Name */}
                          <div className="text-xs text-blue-600 mt-1 font-medium">
                            Brand: {r.brand?.name || "—"}
                          </div>

                          {/* Business Name */}
                          <div className="text-xs text-green-600 font-medium">
                            Business: {r.brand?.business?.name || "—"}
                          </div>

                          {/* Add/Edit Pricing plan */}
                          <div className="flex items-center justify-center mt-1">
                            <button
                              onClick={() => {
                                selectRestaurant(r.id);
                                setPlanEditingModal(true);
                                setCurrentInvoice(r.invoices.at(-1))
                              }}
                              className="block w-full text-xs py-1.5 border border-gray-300 rounded-md bg-gray-50 hover:bg-gray-100 cursor-pointer"
                            >
                              Add/Edit Pricing Plan
                            </button>
                          </div>
                        </td>

                        {/* SUBSCRIPTION TYPE */}
                        <td className="p-4 border-r text-center leading-5 text-sm text-gray-700">
                          {r.restaurantPricingPlans?.length > 0 && r.restaurantPricingPlans[0]?.pricingPlan ? (
                            <div className="flex flex-col">
                              <span className="font-medium">
                                {r.restaurantPricingPlans[0].pricingPlan.planName}
                              </span>
                              <span className="text-xs text-gray-500 capitalize">
                                {r.restaurantPricingPlans[0].pricingPlan.planType}
                              </span>
                            </div>
                          ) : (
                            <span className="text-gray-500">No plan assigned.</span>
                          )}
                        </td>

                        {/* PROFORMA */}
                        <td className="p-4 border-r text-center text-xs space-y-3">

                          {/* Due Date */}
                          <div>
                            <p className="text-gray-500">Due Date</p>
                            <p className="font-semibold">
                              {r.invoices?.[r.invoices.length - 1]?.dueDate?.split("T")[0] ?? "--"}
                            </p>
                          </div>

                          {/* Total Amount */}
                          <div>
                            <p className="text-gray-500">Total Amount</p>
                            <p className="font-semibold">
                              {r.invoices?.[r.invoices.length - 1]?.totalAmount ?? "--"}
                            </p>
                          </div>

                          {/* Status */}
                          <div>
                            <p className="text-gray-500">Status</p>
                            <p
                              className={`font-semibold capitalize ${
                                r.invoices?.[r.invoices.length - 1]?.status === "paid"
                                  ? "text-green-600"
                                  : r.invoices?.[r.invoices.length - 1]?.status === "overdue"
                                  ? "text-red-600"
                                  : "text-yellow-600"
                              }`}
                            >
                              {r.invoices?.[r.invoices.length - 1]?.status ?? "--"}
                            </p>
                          </div>

                          <div className="flex flex-col gap-2">
                            <Link
                              href={`/invoice/${r.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700"
                            >
                              Invoice
                            </Link>
                            <button
                              onClick={() => {
                                serCurrentResId(r.id)
                                setUpdatePayment(true)
                                setCurrentInvoice(r.invoices?.at(-1))
                              }}
                              className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                            >
                              Update Payment
                            </button>
                          </div>

                        </td>

                        {/* PENDING */}
                        <td className="p-4 border-r text-center leading-5">
                          <div className="text-red-600 font-semibold">
                            {r.invoices?.[r.invoices.length - 1]?.status === "pending" && (
                              <p>{r.invoices?.[r.invoices.length - 1]?.totalAmount}</p>
                            )}
                            {r.invoices?.[r.invoices.length - 1]?.status === "partially paid" && (
                              <p>{r.invoices?.[r.invoices.length - 1]?.remainingAmount}</p>
                            )}
                          </div>
                        </td>

                        {/* Due for */}
                        <td className="p-4 border-r text-center leading-5">
                          {(() => {
                            const days = Math.ceil(
                              (new Date().getTime() -
                                new Date(r.restaurantPricingPlans[0]?.startDate).getTime()) /
                                (1000 * 60 * 60 * 24)
                            );
                            return (
                              <>
                                {days}
                                <span className="px-1">{days === 1 ? "Day" : "Days"}</span>
                              </>
                            );
                          })()}
                        </td>

                        {/* PAID */}
                        <td className="p-4 border-r text-center leading-5">
                          {(() => {

                            const cycles = groupInvoicesIntoCycles(r.invoices || []);
                            const invoices = cycles.length > 0 ? cycles[cycles.length - 1] : [];
                            if (invoices.length === 0) {
                              return <span className="text-gray-400">—</span>;
                            }

                            const latest = invoices.at(-1);
                            const status = latest?.status?.toLowerCase().trim();
                            const partials = invoices.filter((inv: any) =>
                              inv.status?.toLowerCase().trim() === "partially paid"
                            );

                            // ⭐ Fully Paid
                            if (status === "paid") {
                              return (
                                <div className="space-y-1 text-xs text-center">
                                  <div className="font-semibold text-green-700">Fully Paid ✓</div>
                                  <div className="text-gray-800">
                                    {latest.paymentDate?.split("T")[0] ?? "—"}
                                  </div>
                                  <div className="text-green-700 font-medium">
                                    Tax Invoice
                                  </div>
                                </div>
                              );
                            }

                            // ⭐ Partially Paid
                            if (partials.length > 0 || status === "partially paid") {
                              return (
                                <div className="space-y-2">
                                  {partials.map((inv: any, index: number) => (
                                    <div
                                      key={index}
                                      className="bg-orange-50 border border-orange-200 rounded-md p-2 text-xs shadow-sm text-left"
                                    >
                                      <div className="font-semibold text-orange-700">
                                        Paid: {inv.partialAmount}/-
                                      </div>
                                      <div className="text-gray-800">
                                        Date: {inv.paymentDate?.split("T")[0] ?? "—"}
                                      </div>

                                      {inv.paymentNotes && (
                                        <div className="text-gray-600 italic">
                                          {inv.paymentNotes}
                                        </div>
                                      )}

                                      <div className="font-semibold mt-1 text-red-600">
                                        Remaining: {Math.max(0, inv.remainingAmount)}/-
                                      </div>

                                      <div className="py-1 flex flex-col gap-1">
                                        {inv.paymentFileUrl && (
                                          <Link
                                            href={inv.paymentFileUrl}
                                            target="_blank"
                                            rel="noopener noreferrer"
                                            className="inline-flex items-center gap-1 text-gray-600 text-xs underline hover:text-gray-800 transition"
                                          >
                                            📄 View Receipt
                                          </Link>
                                        )}
                                        <Link
                                          href={`/invoice/${r.id}/specific/${inv.id}`}
                                          target="_blank"
                                          rel="noopener noreferrer"
                                          className="
                                            inline-flex items-center gap-1 px-2 py-1 rounded
                                            bg-blue-500 text-white text-[10px] font-medium
                                            hover:bg-blue-600 shadow-sm hover:shadow transition-all
                                          "
                                        >
                                          Invoice →
                                        </Link>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              );
                            }

                            // ⭐ No payments yet (Only Pending invoice exists)
                            if (status === "pending") {
                              return (
                                <div className="text-gray-600 text-xs italic">
                                  No payments made yet
                                </div>
                              );
                            }

                            return <span className="text-gray-400">—</span>;
                          })()}
                        </td>

                        {/* CHURN (dummy) */}
                        <td className="p-4 border-r text-center font-medium">
                          -
                        </td>

                        {/* UPDATE ACTIONS */}
                        <td className="p-4 text-center space-y-2">
                          -
                        </td>
                      </tr>
                    ))}
                    {restaurants.length > 0 && unpaidCustomers.length === 0 && (
                      <tr>
                        <td colSpan={8} className="text-center py-6 text-gray-500">
                          No unpaid customers found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

        </div>
      </div>
      
      {planEditingModal && (
        <div
          onClick={() => setPlanEditingModal(false)}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6"
          >

            {/* HEADER */}
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-800">Assign / Edit Pricing Plan</h2>
              <button
                onClick={() => setPlanEditingModal(false)}
                className="text-gray-500 hover:text-gray-700 text-xl"
              >
                ✕
              </button>
            </div>

            <div className="p-4 bg-gray-50 border rounded-lg space-y-4">

              {/* Restaurant Info */}
              <div>
                <p className="text-xs text-gray-500">Restaurant</p>
                <p className="text-lg font-semibold text-gray-800">
                  {selectedRestaurant?.name}
                </p>

                <div className="mt-1 text-sm">
                  <p className="text-blue-600">
                    Brand: {selectedRestaurant?.brand?.name}
                  </p>
                  <p className="text-green-600">
                    Business: {selectedRestaurant?.brand?.business?.name}
                  </p>
                </div>
              </div>

              {/* Assigned Plan */}
              {!currentPlan && (
                <p>No plan assigned.</p>
              )}
              {currentPlan && (
                <div className="border-t pt-4">
                  
                  <p className="text-xs text-gray-500">Assigned Pricing Plan</p>
                  <p className="text-lg font-semibold text-gray-800">
                    {currentPlan.planName}
                  </p>

                  <div className="mt-2 text-sm text-gray-600 space-y-1">
                    <p>
                      <span className="font-medium text-gray-700">Type:</span>{" "}
                      {currentPlan.planType}
                    </p>

                    {currentPlan.description && (
                      <p>
                        <span className="font-medium text-gray-700">Description:</span>{" "}
                        {currentPlan.description}
                      </p>
                    )}

                    {currentPlan.planType === "fixed" ? (
                      <p>
                        <span className="font-medium text-gray-700">Fixed Price:</span>{" "}
                        {currentPlan.fixedPrice}
                      </p>
                    ) : (
                      <p>
                        <span className="font-medium text-gray-700">Base Price:</span>{" "}
                        {currentPlan.basePrice}
                      </p>
                    )}

                    {currentPlan.planType === "metered" && (
                      <p>
                        <span className="font-medium text-gray-700">Credits Included:</span>{" "}
                        {currentPlan.creditsIncluded}
                      </p>
                    )}

                    {currentPlan.planType === "fixed" ? (
                      <p>
                        <span className="font-medium text-gray-700">Billing Cycle:</span>{" "}
                        {currentPlan.billingCycle} months
                      </p>
                    ) : (
                      <p>
                        <span className="font-medium text-gray-700">Validity:</span>{" "}
                        {currentPlan.validity} months
                      </p>
                    )}

                  </div>

                  {currentPlan.planType === "fixed" && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 mt-2">Included Products</h3>

                      {currentPlan.includedProducts?.length > 0 ? (
                        <div className="space-y-3 mt-2">
                          {currentPlan.includedProducts?.map((prod, idx) => (
                            <div
                              key={prod.productId + "-included-" + idx}
                              className="p-3 bg-white border rounded-lg shadow-sm flex justify-between"
                            >
                              <div className="text-sm font-medium text-gray-800">
                                {prod.product?.name}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No included products found.</p>
                      )}
                    </div>
                  )}

                  {currentPlan.planType === "metered" && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 mt-2">Metered Products</h3>

                      {(currentPlan.meteredProducts?.length === 0 || !currentPlan.meteredProducts) ? (
                        <div className="space-y-3 mt-2">
                          {currentPlan.meteredProducts?.map((prod, idx) => (
                            <div
                              key={prod.productId + "-metered-" + idx}
                              className="p-3 bg-white border rounded-lg shadow-sm flex justify-between"
                            >
                              <div className="text-sm font-medium text-gray-800">
                                {prod.product?.name}
                              </div>
                              <div className="text-sm text-gray-600">
                                Credits:{" "}
                                <span className="font-semibold">{prod.credits}</span>
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No metered products found.</p>
                      )}
                    </div>
                  )}

                  {currentPlan.planType === "hybrid" && (
                    <div>
                      <h3 className="text-sm font-semibold text-gray-800 mt-2">Hybrid Products</h3>

                      {currentPlan.hybridProducts?.length > 0 ? (
                        <div className="space-y-3 mt-2">
                          {currentPlan.hybridProducts?.map((prod, idx) => (
                            <div
                            key={prod.productId + "-hybrid-" + idx}
                            className="p-4 bg-linear-to-br from-white to-gray-50 border border-gray-200 
                                       rounded-2xl shadow-sm hover:shadow-md transition-all duration-200"
                          >
                          
                            {/* Header */}
                            <div className="flex items-center justify-between">
                              <h4 className="text-sm font-semibold text-gray-900">
                                {prod.product?.name}
                              </h4>
                          
                              <span
                                className={`px-3 py-1 text-xs rounded-full font-medium ${
                                  prod.unlimitedUsage
                                    ? "bg-green-100 text-green-700"
                                    : "bg-blue-100 text-blue-700"
                                }`}
                              >
                                {prod.unlimitedUsage ? "Unlimited" : "Limited"}
                              </span>
                            </div>
                          
                            {/* Divider */}
                            <div className="mt-3 border-b border-gray-200"></div>

                            <div className="grid grid-cols-3 gap-2 mt-3 text-[11px]">
                              {/* Units */}
                              <div className="bg-gray-50 p-2 border rounded-md flex items-center justify-between">
                                <p className="text-gray-500 leading-none flex items-center gap-1">
                                  🔢 Units
                                </p>
                                <p className="text-gray-900 font-semibold mt-1 text-xs text-right">
                                  {prod.numberOfUnits ?? "0"}
                                </p>
                              </div>

                              {/* Credits Per Unit */}
                              <div className="bg-gray-50 p-2 border rounded-md flex items-center justify-between">
                                <p className="text-gray-500 leading-none flex items-center gap-1">
                                  💳 Cr/Unit
                                </p>
                                <p className="text-gray-900 font-semibold mt-1 text-xs text-right">
                                  {prod.creditsPerUnit ?? "0"}
                                </p>
                              </div>

                              {/* License */}
                              <div className="bg-indigo-50 p-2 border border-indigo-200 rounded-md flex items-center justify-between">
                                <p className="text-indigo-600 leading-none flex items-center gap-1">
                                  🔐 License
                                </p>
                                <p className="text-indigo-900 font-semibold text-xs text-right">
                                  {prod.product.license}
                                </p>
                              </div>

                            </div>
                          
                          </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-gray-500 text-sm">No Hybrid products found.</p>
                      )}
                    </div>
                  )}

                </div>
              )}

            </div>

            {/* PLAN GRID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">

              {allPlans.map((plan) => (
                <div
                  key={plan.id}
                  className="border rounded-lg p-4 shadow-sm hover:shadow-md transition bg-white flex flex-col justify-between"
                >
                  <div>

                    {currentPlan && currentPlan.id === plan.id && (
                      <div className="mb-3">
                        <span className="text-[10px] px-2 py-1 bg-green-600 text-white font-semibold rounded-full uppercase tracking-wide">
                          ✓ Assigned
                        </span>
                      </div>
                    )}

                    <div className="flex justify-between items-start">
                      <h3 className="text-lg font-bold text-gray-900">{plan.planName}</h3>
                      <span className="text-xs px-2 py-1 bg-blue-100 text-blue-700 rounded capitalize">
                        {plan.planType}
                      </span>
                    </div>

                    <p className="text-gray-600 text-sm mt-2 mb-3 line-clamp-3">
                      {plan.description || "No description available"}
                    </p>

                    <div className="space-y-1 text-sm text-gray-700">
                      {plan.planType === "fixed" ? (
                        <p>
                          <span className="font-medium">Fixed Price:</span> {plan.fixedPrice}
                        </p>
                      ) : (
                        <p>
                          <span className="font-medium">Base Price:</span> {plan.basePrice}
                        </p>
                      )}
                      {plan.planType === "metered" && (
                        <p>
                          <span className="font-medium">Credits Included:</span> {plan.creditsIncluded}
                        </p>
                      )}
                      {plan.planType === "fixed" ? (
                        <p>
                          <span className="font-medium">Billing Cycle:</span> {plan.billingCycle} months
                        </p>
                      ) : (
                        <p>
                          <span className="font-medium">Validity:</span> {plan.validity} months
                        </p>
                      )}
                    </div>
                  </div>

                  <div className="mt-4 flex gap-2">                    
                    <button
                      onClick={() => {
                        setConfirmAssignModal(true);
                        setSelectedPricingPlanId(plan?.id);
                        setAssigningPlanId(plan.id);
                      }}
                      disabled={(currentPlan && currentPlan.id === plan.id) || assigningPlan}
                      className={`
                        flex-1 py-2 rounded text-sm font-medium transition
                        ${currentPlan && currentPlan.id === plan.id 
                          ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                          : (assigningPlan && assigningPlanId === plan.id) 
                          ? "text-gray-600 bg-gray-300 cursor-not-allowed"
                          : "bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                        }
                      `}
                    >
                      {assigningPlan && assigningPlanId === plan.id ? (
                        <span className="flex items-center justify-center gap-2">
                          <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                          Updating…
                        </span>
                      ) : currentPlan && currentPlan.id === plan.id ? (
                        <span>Already Assigned</span>
                      ) : (
                        <span>Assign This Plan</span>
                      )}
                    </button>
                  </div>
                </div>
              ))}

            </div>

            {/* TAX SETTINGS & TIME TABLE SECTION */}
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
              <div className="bg-gray-100 p-4 rounded space-y-4 mt-2">
                <h3 className="text-md font-semibold text-gray-800">Time Structure</h3>

                {/* Start Date */}
                <div className="flex flex-col gap-1 text-sm">
                  <label className="font-medium">Start Date:</label>
                  <input
                    type="date"
                    className="border p-2 rounded"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    onClick={e => (e.target as HTMLInputElement).showPicker()}
                  />
                </div>

                {/* Plan Mode */}
                <div className="flex flex-col gap-2 text-sm">
                  <label className="font-medium">Plan Mode:</label>

                  <div className="flex items-center gap-4">
                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="planMode"
                        value="live"
                        checked={planMode === "live"}
                        onChange={() => setPlanMode("live")}
                      />
                      <span>Live</span>
                    </label>

                    <label className="flex items-center gap-2">
                      <input
                        type="radio"
                        name="planMode"
                        value="trial"
                        checked={planMode === "trial"}
                        onChange={() => setPlanMode("trial")}
                      />
                      <span>Trial</span>
                    </label>
                  </div>
                </div>

                {/* Trial Days (conditional) */}
                {planMode === "trial" && (
                  <div className="flex flex-col gap-1 text-sm">
                    <label className="font-medium">Trial Duration (Days):</label>
                    <input
                      type="number"
                      min="1"
                      className="border p-2 rounded"
                      value={trialDays}
                      onChange={(e) => setTrialDays(Number(e.target.value))}
                      placeholder="Enter number of days"
                    />
                  </div>
                )}
              </div>
              <div className="flex items-center justify-end gap-2 mt-3 mb-1">
                <button
                  className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all"
                  onClick={() => {
                    setPlanEditingModal(false);
                    serCurrentResId(null);
                  }}
                >
                  Cancel
                </button>
                <button
                  disabled={updatingTaxSettings}
                  onClick={() => handleUpdateTaxSettings(selectedRestaurant?.id)}
                  className={`
                    relative px-4 py-2 text-sm rounded-md font-medium
                    transition-all duration-200
                    ${updatingTaxSettings
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-sky-600 text-white shadow hover:bg-sky-700 focus:ring-2 focus:ring-sky-400"
                    }
                  `}
                >
                  {updatingTaxSettings ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Updating…
                    </span>
                  ) : (
                    "Update"
                  )}
                </button>
              </div>
            </div>

            {allPlans.length === 0 && (
              <p className="text-center text-gray-500 py-6">No pricing plans available.</p>
            )}

          </div>
        </div>
      )}
      
      {updatePayment && (
        <div
          onClick={() => setUpdatePayment(false)}
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 space-y-6"
          >
            <div className="flex flex-col gap-6 w-full p-6 rounded-lg shadow-sm border border-gray-200">
              
              {/* Payment Summary */}
              <div className="bg-white p-4 rounded-xl border border-gray-200 shadow-sm space-y-4">
                <div className="flex items-center justify-between">
                  <h2 className="text-lg font-semibold text-gray-900">Payment Summary</h2>
                  <span
                    className={`px-2 py-1 text-xs rounded-md font-medium capitalize ${
                      currentRestaurant[0]?.invoices?.at(-1)?.status === "paid"
                        ? "bg-green-50 text-green-600"
                        : currentRestaurant[0]?.invoices?.at(-1)?.status === "partially paid"
                        ? "bg-yellow-50 text-yellow-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {currentRestaurant[0]?.invoices?.at(-1)?.status || "pending"}
                  </span>
                </div>

                {/* Info Rows */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex flex-col">
                    <span className="text-gray-500">Restaurant</span>
                    <span className="text-gray-900 font-medium">
                      {currentRestaurant[0]?.name || "—"}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-gray-500">Pricing Plan</span>
                    <span className="text-gray-900 font-medium">
                      {currentRestaurant[0]?.restaurantPricingPlans?.[0]?.pricingPlan?.planName || "—"}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-gray-500">Total Amount</span>
                    <span className="text-gray-900 font-semibold">
                      {currentRestaurant[0]?.invoices?.at(-1)?.totalAmount?.toLocaleString() ?? "0"}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-gray-500">Paid Amount</span>
                    <span className="text-green-700 font-semibold">
                      {currentRestaurant[0]?.invoices?.at(-1)?.paidAmount?.toLocaleString() ?? "0"}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-gray-500">Remaining</span>
                    <span className="text-red-600 font-bold">
                      {currentRestaurant[0]?.invoices?.at(-1)?.remainingAmount?.toLocaleString() ?? "0"}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-gray-500">Due Date</span>
                    <span className="text-gray-900 font-medium text-xs">
                      {currentRestaurant[0]?.invoices?.at(-1)?.dueDate?.slice(0, 10) || "—"}
                    </span>
                  </div>
                </div>
              </div>

              {error && (
                <p className="text-sm text-red-600 font-medium">{error}</p>
              )}

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Payment Date
                  <span className="ml-1 text-xs text-blue-600 font-normal">
                    (required)
                  </span>
                </label>
                <input
                  type="date"
                  value={paymentDate}
                  max={new Date().toISOString().split("T")[0]} // ⛔ prevents future calendar selection
                  onChange={(e) => {
                    const selectedDate = e.target.value;
                    const today = new Date().toISOString().split("T")[0];

                    if (selectedDate > today) {
                      alert("You cannot select a future date");
                      return; // keep old value
                    }

                    setPaymentDate(selectedDate);
                  }}
                  onClick={(e) => (e.target as HTMLInputElement).showPicker()}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50
                            focus:bg-white focus:ring-2 focus:ring-sky-500 focus:border-sky-500
                            outline-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Payment Notes
                  <span className="ml-1 text-xs text-blue-600 font-normal">
                    (optional)
                  </span>
                </label>
                <textarea
                  rows={4}
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  placeholder="Add additional payment details..."
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 focus:bg-white
                  focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none resize-none transition-all"
                />
              </div>

              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium text-gray-700">
                  Payment Status
                  <span className="ml-1 text-xs text-blue-600 font-normal">
                    (required)
                  </span>
                </label>
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentStatus"
                      value="full"
                      checked={isPartial === "No"}
                      onChange={() => setIsPartial("No")}
                      className="cursor-pointer"
                    />
                    <span className="text-sm">Fully Paid</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="paymentStatus"
                      value="partial"
                      checked={isPartial === "Yes"}
                      onChange={() => setIsPartial("Yes")}
                      className="cursor-pointer"
                    />
                    <span className="text-sm">Partially Paid</span>
                  </label>
                </div>
                {isPartial === "Yes" && (
                  <div className="flex flex-col gap-1 mt-1">
                    <label className="text-sm font-medium text-gray-700">Partial Payment Amount</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01" // if you want decimal payments
                      value={partialAmount ?? ""}
                      onChange={(e) => {
                        const val = parseFloat(e.target.value);
                        setPartialAmount(!isNaN(val) && val >= 0 ? val : 0);
                      }}
                      placeholder="Enter partial payment amount"
                      className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 focus:bg-white
                                focus:ring-2 focus:ring-sky-500 focus:border-sky-500 outline-none transition-all"
                      required
                    />
                  </div>
                )}
              </div>


              <div className="flex flex-col gap-1">
                <label className="text-sm font-medium text-gray-700">
                  Upload Payment Proof
                  <span className="ml-1 text-xs text-blue-600 font-normal">
                    (required)
                  </span>
                </label>
                <input
                  type="file"
                  accept="image/*,application/pdf"
                  onChange={(e) => setPaymentFile(e.target.files?.[0] || null)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm bg-gray-50 
                  focus:bg-white focus:ring-2 focus:ring-sky-500 outline-none"
                />
                <p className="text-xs text-gray-500">
                  Accepted: Images / PDF (max 5MB)
                </p>
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  className="px-4 py-2 text-sm rounded-md border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all"
                  onClick={() => {
                    setUpdatePayment(false);
                    serCurrentResId(null);
                  }}
                >
                  Cancel
                </button>

                <button
                  disabled={updatingPayment}
                  onClick={handleUpdatePayment}
                  className={`
                    relative px-4 py-2 text-sm rounded-md font-medium
                    transition-all duration-200
                    ${updatingPayment
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-sky-600 text-white shadow hover:bg-sky-700 focus:ring-2 focus:ring-sky-400"
                    }
                  `}
                >
                  {updatingPayment ? (
                    <span className="flex items-center gap-2">
                      <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                      Updating…
                    </span>
                  ) : (
                    "Update"
                  )}
                </button>
              </div>

            </div>
          </div>
        </div>
      )}
      
      {confirmAssignModal && (
        <div
          onClick={() => {
            setConfirmAssignModal(false);
          }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 space-y-6 text-center border border-gray-200 animate-slideUp"
          >
            {/* Icon */}
            <div className="text-5xl text-red-600">⚠️</div>

            {/* Text */}
            <h2 className="text-lg font-bold text-gray-900">
              Do you want apply this pricing plan?
            </h2>

            {/* Buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                className="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all"
                onClick={() => {
                  setConfirmAssignModal(false);
                  setSelectedPricingPlanId(null);
                  setAssigningPlanId(null);
                }}
              >
                Cancel
              </button>

              <button
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-red-600 text-white shadow hover:bg-red-700 focus:ring-2 focus:ring-red-400 transition-all"
                onClick={() => {
                  setConfirmAssignModal(false)
                  setNewInvCreationModal(true);
                }}
              >
                Yes, Confirm
              </button>
            </div>
          </div>
        </div>
      )}

      {newInvCreationModal && (
        <div
          onClick={() => {
            setNewInvCreationModal(false);
          }}
          className="fixed inset-0 bg-black/40 backdrop-blur-sm z-50 flex items-center justify-center p-4 animate-fadeIn"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white w-full max-w-md rounded-2xl shadow-xl p-6 space-y-6 text-center border border-gray-200 animate-slideUp"
          >
            {/* Icon */}
            <div className="text-5xl text-red-600">⚠️</div>

            {/* Text */}
            <h2 className="text-lg font-bold text-gray-900">
              Do you want to create new invoice?
            </h2>

            {/* Buttons */}
            <div className="flex items-center justify-center gap-4">
              <button
                className="px-5 py-2.5 rounded-lg text-sm font-medium border border-gray-300 text-gray-700 hover:bg-gray-100 transition-all"
                onClick={() => {
                  setNewInvCreationModal(false);
                  if (selectedRestaurant?.id && selectedPricingPlanId) {
                    handleAssignPlan(selectedRestaurant.id, selectedPricingPlanId, true, "no");
                  }
                }}
              >
                No
              </button>

              <button
                className="px-5 py-2.5 rounded-lg text-sm font-semibold bg-red-600 text-white shadow hover:bg-red-700 focus:ring-2 focus:ring-red-400 transition-all"
                onClick={() => {
                  setNewInvCreationModal(false);
                  if (selectedRestaurant?.id && selectedPricingPlanId) {
                    handleAssignPlan(selectedRestaurant.id, selectedPricingPlanId, true, "yes");
                  }
                }}
              >
                Yes
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}