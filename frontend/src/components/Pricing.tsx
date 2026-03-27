"use client";

import axios from "axios";
import { SquarePen } from "lucide-react";
import { useEffect, useState } from "react";

interface Product {
  id: number;
  name: string;
  createdAt?: string;
  license?: string;
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
  product: Product;
  isActive?: boolean;
}

interface HybridProduct {
  id?: number;
  productId: number;
  unlimitedUsage: boolean;
  numberOfUnits: number | string;
  creditsPerUnit: number | string;
  product: Product;
  isActive?: boolean;
}

export interface PricingPlan {
  id?: number;
  planType: "fixed" | "metered" | "hybrid";
  planName: string;
  description: string;
  fixedPrice?: number | string | null;
  basePrice?: number | string;
  pricePerCredit: number | string;
  creditsIncluded: number | string;
  billingCycle: number;
  validity: number;
  meteredProducts: MeteredProduct[];
  includedProducts: IncludedProduct[];
  hybridProducts: HybridProduct[];
  createdAt?: string;
}

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Pricing() {

  const [allPlans, setAllPlans] = useState<PricingPlan[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [productType, setProductType] = useState<"included" | "metered" | "hybrid">("metered");

  const [currentPlan, setCurrentPlan] = useState<PricingPlan | null>(null);
  const [isCreatingNew, setIsCreatingNew] = useState(false);
  const [createProductModal, setCreateProductModal] = useState(false);
  const [planEditingModal, setPlanEditingModal] = useState(false);

  const [newProductName, setNewProductName] = useState("");
  const [newProductLicense, setNewProductLicense] = useState("");
  const [error, setError] = useState("");

  const emptyPlan = (): PricingPlan => ({
    planType: "fixed",
    planName: "",
    description: "",
    fixedPrice: "",
    basePrice: "",
    pricePerCredit: "",
    creditsIncluded: "",
    billingCycle: 6,
    validity: 6,
    meteredProducts: [],
    includedProducts: [],
    hybridProducts: [],
  });

  // load plans
  const loadPlans = async () => {
    try {
      const res = await axios.get<PricingPlan[]>(`${API}/pricing-plan`);
      setAllPlans(res.data || []);
      if (!currentPlan && res.data && res.data.length > 0) {
        setCurrentPlan(res.data[0]);
        setIsCreatingNew(false);
      } else if (isCreatingNew === false && currentPlan) {
        // try keep current selected id if exists
        const found = res.data.find(p => p.id === currentPlan?.id);
        if (found) setCurrentPlan(found);
        else if (res.data.length) setCurrentPlan(res.data[0]);
      }
    } catch (err) {
      console.error("Failed to load plans", err);
    }
  };

  useEffect(() => {
    loadPlans();
  }, []);

  // select plan from dropdown by id
  const onSelectPlan = (planId: number) => {
    const p = allPlans.find(x => x.id === planId) || null;
    setCurrentPlan(p);
    setIsCreatingNew(false);
  };

  // start creating a new plan (Create Behavior 1)
  const onCreatePlan = () => {
    setCurrentPlan(emptyPlan());
    setIsCreatingNew(true);
    setPlanEditingModal(true);
  };

  // add product modal handler: create product and (optionally) attach to metered plan
  const handleCreateProduct = async () => {
    if (!newProductName.trim()) {
      setError("Product name is required.");
      return;
    }
    try {
      const payload: any = { name: newProductName };
      if (newProductLicense !== "") payload.license = newProductLicense;

      const res = await axios.post(`${API}/products`, payload);
      const createdProduct: Product = res.data.product ?? res.data;

      // Immediately add to currentPlan's meteredProducts (so user can set/save)
      // If server returned meteredProduct, use that (we still push to UI)
      const ipFromServer = res.data.includedProduct ?? null;
      const mpFromServer = res.data.meteredProduct ?? null;

      if (!currentPlan) setCurrentPlan(emptyPlan());

      setCurrentPlan(prev => {
        const cloned = prev ? deepClonePlan(prev) : deepClonePlan(emptyPlan());
      
        if (productType === "metered") {
          cloned.meteredProducts.push({
            id: mpFromServer?.id,
            productId: createdProduct.id,
            credits: mpFromServer ? mpFromServer.credits : Number(newProductLicense) || 0,
            product: createdProduct,
            isActive: mpFromServer?.isActive ?? true
          });
        }
      
        if (productType === "included") {
          cloned.includedProducts.push({
            id: ipFromServer?.id,
            productId: createdProduct.id,
            product: createdProduct,
            isActive: ipFromServer?.isActive ?? true
          });
        }

        if (productType === "hybrid") {
          cloned.hybridProducts.push({
            productId: createdProduct.id,
            unlimitedUsage: false,
            numberOfUnits: 0,
            creditsPerUnit: 0,
            product: createdProduct,
            isActive: true
          });
        }
      
        return cloned;
      });

      setCreateProductModal(false);
      setNewProductName("");
      setNewProductLicense("");
    } catch (error: any) {
      console.log("Create product error:", error.response?.data || error);
      alert(
        error.response?.data?.error ||
        error.response?.data?.detail || // show server detail if present
        error.message ||
        "Failed to create product"
      );
    }
  };

  // save plan (create or update). Important: include planId when updating
  const handleSavePlan = async () => {
    if (!currentPlan) return alert("No plan to save");

    const { planName, planType, fixedPrice, basePrice, pricePerCredit, creditsIncluded, billingCycle, validity } = currentPlan;

    if (!planName || !planType) {
      return alert("Please fill required fields.");
    }

    if (planType === "fixed" && (!fixedPrice || !billingCycle)) {
      return alert("Please include fixed price and billing cycle.");
    }

    if (planType === "metered" && (!basePrice || !creditsIncluded || !validity)) {
      return alert("Please include price, credits, and validity.");
    }

    if ( planType === "hybrid" && (!billingCycle || !basePrice || !pricePerCredit)) {
      return alert("Please fill required fields.");
    }

    const payload: any = {
      planType: currentPlan.planType,
      planName: currentPlan.planName,
      description: currentPlan.description,
      fixedPrice: currentPlan.planType !== "metered" ? Number(currentPlan.fixedPrice) : null,
      basePrice: currentPlan.planType !== "fixed" ? Number(currentPlan.basePrice) : null,
      creditsIncluded: Number(currentPlan.creditsIncluded),
      billingCycle: currentPlan.planType === "fixed" ? currentPlan.billingCycle : null,
      validity: currentPlan.planType !== "fixed" ? currentPlan.validity : null,
      pricePerCredit:
        currentPlan.planType === "hybrid"
          ? Number(currentPlan.pricePerCredit)
          : null,
      includedProducts:
        currentPlan.planType === "fixed"
          ? currentPlan.includedProducts.map(ip => ({
              productId: ip.productId,
              license: ip.product?.license ?? null,
            }))
          : [],
      meteredProducts:
        currentPlan.planType === "metered"
          ? currentPlan.meteredProducts.map(mu => ({
              productId: mu.productId,
              credits: Number(mu.credits) ?? 0,
              license: mu.product?.license ?? null,
            }))
          : [],
      hybridProducts:
        currentPlan.planType === "hybrid"
          ? currentPlan.hybridProducts.map(hp => ({
              productId: hp.productId,
              unlimitedUsage: hp.unlimitedUsage,
              numberOfUnits: hp.unlimitedUsage ? null : Number(hp.numberOfUnits) ?? 0,
              creditsPerUnit: hp.unlimitedUsage ? null : Number(hp.creditsPerUnit) ?? 0,
              license: hp.product?.license ?? null,
            }))
          : [],
    };

    // if we're editing existing plan, include planId to update that plan
    if (!isCreatingNew && currentPlan.id) payload.planId = currentPlan.id;

    try {
      console.log(payload);
      // return;
      const res = await axios.post(`${API}/pricing-plan`, payload);
      const savedPlan = res.data?.plan ?? res.data?.planId ?? null;

      // reload plans and select the saved plan
      await loadPlans();
      if (res.data?.plan?.id) {
        setIsCreatingNew(false);
        setCurrentPlan(res.data.plan);
      } else {
        // fallback: find by name or keep first
        const byName = allPlans.find(p => p.planName === payload.planName);
        if (byName) setCurrentPlan(byName);
      }
      alert("Plan saved!");
      setPlanEditingModal(false);
      window.location.reload();
    } catch (err) {
      console.error("Failed to save plan", err);
      alert("Failed to save plan");
    }
  };

  // helper to update currentPlan fields
  const updateCurrent = (patch: Partial<PricingPlan>) => {
    setCurrentPlan(prev => prev ? ({ ...prev, ...patch }) : ({ ...emptyPlan(), ...patch }));
  };

  const availableMeteredProducts = allProducts.filter(
    p => !currentPlan?.meteredProducts?.some(mp => mp.productId === p.id)
  );
  const availableIncludedProducts = allProducts.filter(
    p => !currentPlan?.includedProducts?.some(ip => ip.productId === p.id)
  );
  
  const availableHybridProducts = allProducts.filter(
    p => !currentPlan?.hybridProducts?.some(ip => ip.productId === p.id)
  );

  const attachProductToPlan = (product: Product, productType: "metered" | "included" | "hybrid") => {
    if (productType === "metered") {
      setCurrentPlan(prev => ({
        ...prev!,
        meteredProducts: [
          ...prev!.meteredProducts,
          {
            productId: product.id,
            credits: 0,
            product,
            isActive: true
          }
        ]
      }));
    }
    if (productType === "included") {
      setCurrentPlan(prev => ({
        ...prev!,
        includedProducts: [
          ...prev!.includedProducts,
          {
            productId: product.id,
            credits: 0,
            product,
            isActive: true
          }
        ]
      }));
    }
    if (productType === "hybrid") {
      setCurrentPlan(prev => ({
        ...prev!,
        hybridProducts: [
          ...(prev!.hybridProducts ?? []),
          {
            productId: product.id,
            unlimitedUsage: false,
            numberOfUnits: 0,
            creditsPerUnit: 0,
            product,
            isActive: true
          }
        ]
      }));
    }
  };

  const deepClonePlan = (p: PricingPlan): PricingPlan => ({
    ...p,
    meteredProducts: p.meteredProducts.map(mp => ({ ...mp })),
    includedProducts: p.includedProducts.map(ip => ({ ...ip })),
    hybridProducts: p.hybridProducts.map(hp => ({ ...hp })),
  });

  useEffect(() => {
    (async () => {
      const res = await axios.get(`${API}/products`);
      setAllProducts(res.data);
    })();
  }, []);

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="flex items-end justify-end gap-3 mb-6">
        <div className="flex items-end gap-2">
          <button
            onClick={onCreatePlan}
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            + Create Plan
          </button>
          <button
            onClick={() => loadPlans()}
            className="px-4 py-2 bg-gray-200 rounded"
          >
            Refresh
          </button>
        </div>
      </div>

      <div className="my-10 bg-white border rounded-lg shadow-md p-6">

        <div className="flex gap-3 mb-4">
          <h2 className="text-xl font-bold text-gray-800">
            Plans Overview
          </h2>
          <button
            onClick={onCreatePlan}
            className="text-lg text-blue-700 underline cursor-pointer"
          >
            + Create Plan
          </button>
        </div>

        <div className="rounded-lg max-h-[350px] overflow-scroll">
          {allPlans.length > 0 ? (
            <table className="min-w-full border-collapse text-left">
              <thead className="sticky top-0 bg-gray-100 z-10">
                <tr className="bg-gray-100 border-b">
                  <th className="p-3 font-semibold text-gray-700">Plan Name</th>
                  <th className="p-3 font-semibold text-gray-700">Plan Type</th>
                  <th className="p-3 font-semibold text-gray-700">Description</th>
                  <th className="p-3 font-semibold text-gray-700">Price</th>
                  <th className="p-3 font-semibold text-gray-700">Credits</th>
                </tr>
              </thead>

              <tbody>
                {allPlans.map((plan: any) => {
                  const isFixed = plan.planType === "fixed";
                  const isMetered = plan.planType === "metered";
                  const isHybrid = plan.planType === "hybrid";

                  const priceDisplay = isFixed
                    ? ` ${plan.fixedPrice}`
                    : isMetered
                    ? ` ${plan.basePrice}`
                    : isHybrid
                    ? `${plan.basePrice}`
                    : "—"
                  ;

                  const creditsDisplay = isMetered || isHybrid ? plan.creditsIncluded ?? "—" : "—";

                  return (
                    <tr key={plan.id} className="border-b hover:bg-gray-50">
                      <td className="p-3">
                        <div className="flex items-center gap-1">
                          <button
                            className="text-blue-700 hover:underline"
                            onClick={() => {
                              setPlanEditingModal(true);
                              onSelectPlan(plan.id);
                            }}
                          >
                            <SquarePen size={16} />
                          </button>
                          <p className="font-medium">{plan.planName}</p>
                        </div>
                      </td>

                      <td className="p-3 capitalize text-gray-800">{plan.planType}</td>

                      <td className="p-3 text-gray-600">
                        {plan.description || "—"}
                      </td>

                      <td className="p-3 font-semibold text-gray-800">
                        {priceDisplay}
                      </td>

                      <td className="p-3 text-gray-800">
                        {creditsDisplay}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          ) : (
            <p className="text-gray-500">No plans created.</p>
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
            <div className="flex justify-between items-center border-b pb-3">
              <h2 className="text-xl font-bold text-gray-800">Edit Pricing Plan</h2>
              <button
                onClick={() => setPlanEditingModal(false)}
                className="px-3 py-1 rounded bg-gray-100 hover:bg-gray-200"
              >
                ✕
              </button>
            </div>

            {/* MAIN FORM */}
            {currentPlan ? (
              <>
                {/* --- BASIC INFO SECTION --- */}
                <div className="space-y-4">
                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Plan Type
                      <span className="ml-1 text-xs text-blue-600 font-normal">
                        (required)
                      </span>
                    </label>
                    <div className="flex gap-4 mt-2">
                      {["fixed", "metered", "hybrid"].map(type => (
                        <label key={type} className="flex items-center gap-2">
                          <input
                            type="radio"
                            checked={currentPlan.planType === type}
                            onChange={() => updateCurrent({ planType: type as any })}
                          />
                          <span className="capitalize">{type}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div>
                    <label className="text-sm font-medium text-gray-700">
                      Plan Name
                      <span className="ml-1 text-xs text-blue-600 font-normal">
                        (required)
                      </span>
                    </label>
                    <input
                      className="w-full border px-3 py-2 rounded mt-1"
                      value={currentPlan.planName}
                      onChange={(e) => updateCurrent({ planName: e.target.value })}
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-semibold"></label>
                    <label className="text-sm font-medium text-gray-700">
                      Description
                      <span className="ml-1 text-xs text-blue-600 font-normal">
                        (optional)
                      </span>
                    </label>
                    <textarea
                      className="w-full border px-3 py-2 rounded mt-1"
                      rows={3}
                      value={currentPlan.description ?? ""}
                      onChange={(e) => updateCurrent({ description: e.target.value })}
                    />
                  </div>

                  {/* Fixed and Metered plan */}
                  {(currentPlan.planType === "fixed" || currentPlan.planType === "metered") && (
                    <div className="space-y-5">
                      <div className="grid grid-cols-2 gap-4">
                        <div className={`${currentPlan.planType === "fixed" && "col-span-2"}`}>
                          <label className="block text-sm font-semibold">
                            {currentPlan.planType === "fixed"
                              ? "Fixed Price"
                              : "Base Price"}
                              <span className="ml-1 text-xs text-blue-600 font-normal">
                                (required)
                              </span>
                          </label>
                          <input
                            className="w-full border px-3 py-2 rounded mt-1"
                            value={String(currentPlan.planType === "fixed" ? currentPlan.fixedPrice : currentPlan.basePrice)}
                            onChange={(e) => updateCurrent(
                              currentPlan.planType === "fixed"
                                ? { fixedPrice: e.target.value }
                                : { basePrice: e.target.value }
                              )
                            }
                            inputMode="numeric"
                          />
                        </div>

                        {currentPlan.planType === "metered" && (
                          <div>
                            <label className="text-sm font-medium text-gray-700">
                              Credits Included
                              <span className="ml-1 text-xs text-blue-600 font-normal">
                                (required)
                              </span>
                            </label>
                            <input
                              className="w-full border px-3 py-2 rounded mt-1"
                              value={String(currentPlan.creditsIncluded ?? "")}
                              onChange={(e) => updateCurrent({ creditsIncluded: e.target.value })}
                              inputMode="numeric"
                            />
                          </div>
                        )}

                      </div>

                      <div>
                        <label className="block text-sm font-semibold">
                          {currentPlan.planType === "fixed"
                            ? "Billing Cycle (in months)"
                            : "Validity (in months)"}
                            <span className="ml-1 text-xs text-blue-600 font-normal">
                              (required)
                            </span>
                        </label>
                        <input
                          type="number"
                          className="w-full border px-3 py-2 rounded mt-1"
                          value={String(currentPlan.planType === "fixed" ? currentPlan.billingCycle : currentPlan.validity)}
                          onChange={(e) => {
                            const value = Number(e.target.value);
                            updateCurrent(
                              currentPlan.planType === "fixed"
                                ? { billingCycle: value }
                                : { validity: value }
                            );
                          }}
                        />
                      </div>

                      {currentPlan.planType === "fixed" && (
                        <div className="bg-white p-6 rounded shadow mb-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">All Products</h3>
                            <button
                              onClick={() => {
                                setProductType("included");
                                setCreateProductModal(true);
                              }}
                              className="text-sm px-3 py-1 bg-blue-600 text-white rounded"
                            >
                              + Add Product
                            </button>
                          </div>
      
                          <div className="space-y-3 mb-10">
                            {availableIncludedProducts.map(prod => (
                              <div
                                key={prod.id}
                                className="flex justify-between p-3 bg-gray-100 rounded hover:bg-gray-200"
                              >
                                <span className="font-medium">{prod.name}</span>
                                <div className="flex items-center justify-center gap-2">
                                  <button
                                    onClick={() => attachProductToPlan(prod, "included")}
                                    className="px-2 py-1 bg-blue-600 text-white rounded text-xs cursor-pointer"
                                  >
                                    Add
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
      
                          {currentPlan.includedProducts?.length === 0 ? (
                            <p className="text-sm text-gray-500">No  included products yet.</p>
                          ): (
                            <div className="space-y-3 mt-5">
                              <h3 className="font-semibold">Included Products</h3>
                              <div className="space-y-3">
                                {currentPlan?.includedProducts?.map((mu, idx) => (
                                  <div
                                  key={mu.productId + "-" + idx}
                                  className="flex items-center justify-between gap-4 bg-gray-50 border rounded-lg p-3"
                                >
                                  <div key={mu.productId + "-" + idx} className="flex flex-col gap-2 p-3 rounded-lg bg-gray-50 w-full">
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm font-medium text-gray-900">{mu.product?.name}</p>
                                      <button
                                        onClick={() =>
                                          setCurrentPlan(prev => ({
                                            ...prev!,
                                            includedProducts: prev!.includedProducts.filter((_, i) => i !== idx)
                                          }))
                                        }
                                        className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-md 
                                                  border border-red-200 hover:bg-red-100 hover:text-red-700 
                                                  transition cursor-pointer"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <label className="text-xs font-medium text-gray-600">
                                        Number of Licenses
                                        <span className="text-gray-400 ml-1">(optional)</span>
                                      </label>
                                      <input
                                        className="border border-gray-300 px-3 py-2 rounded text-sm
                                                  focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                        value={mu.product?.license || ""}
                                        onChange={(e) => {
                                          const updatedLicense = e.target.value;
                                          setCurrentPlan(prev => ({
                                            ...prev!,
                                            includedProducts: prev!.includedProducts.map((item, i) =>
                                              i === idx
                                                ? {
                                                    ...item,
                                                    product: {
                                                      ...item.product,
                                                      license: updatedLicense,
                                                    },
                                                  }
                                                : item
                                            ),
                                          }));
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {currentPlan.planType === "metered" && (
                        <div className="bg-white p-6 rounded shadow mb-6">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">Metered Products</h3>
                            <button
                              onClick={() => {
                                setProductType("metered");
                                setCreateProductModal(true);
                              }}
                              className="text-sm px-3 py-1 bg-blue-600 text-white rounded"
                            >
                              + Add Product
                            </button>
                          </div>

                          <div className="space-y-3 mb-4">
                            {availableMeteredProducts.map(prod => (
                              <div
                                key={prod.id}
                                className="flex justify-between p-3 bg-gray-100 rounded cursor-pointer hover:bg-gray-200"
                                onClick={() => {
                                  attachProductToPlan(prod, "metered");
                                }}
                              >
                                <span className="font-medium">{prod.name}</span>
                                <button className="px-2 py-1 bg-blue-600 text-white rounded text-xs">
                                  Add
                                </button>
                              </div>
                            ))}
                          </div>

                          {currentPlan.meteredProducts.length === 0 ? (
                            <p className="text-sm text-gray-500">No metered products yet.</p>
                          ) : (
                            <div className="space-y-3">
                              {currentPlan?.meteredProducts?.map((mu, idx) => (
                                <div key={mu.productId + "-" + idx} className="flex flex-col gap-2 p-3 rounded-lg bg-gray-50 w-full">
                                  <div className="flex items-center justify-between">
                                    <p className="text-sm font-medium text-gray-900">{mu.product?.name}</p>
                                    <button
                                      onClick={() =>
                                        setCurrentPlan(prev => ({
                                          ...prev!,
                                          meteredProducts: prev!.meteredProducts.filter((_, i) => i !== idx)
                                        }))
                                      }
                                      className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-md border border-red-200 hover:bg-red-100 hover:text-red-700 transition cursor-pointer"
                                    >
                                      Remove
                                    </button>
                                  </div>
                                  <div className="flex flex-col gap-2">
                                    <div className="flex flex-col gap-1">
                                      <label className="text-xs font-medium text-gray-600">
                                        Credits per unit
                                        <span className="text-gray-400 ml-1">(required)</span>
                                      </label>
                                      <input
                                        className="border border-gray-300 px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                        value={String(mu.credits) || ""}
                                        onChange={(e) => {
                                          const updatedCredits = e.target.value;
                                          setCurrentPlan(prev => ({
                                            ...prev!,
                                            meteredProducts: prev!.meteredProducts.map((item, i) =>
                                              i === idx
                                                ? {
                                                    ...item,
                                                    credits: updatedCredits,
                                                  }
                                                : item
                                            ),
                                          }));
                                        }}
                                      />
                                    </div>
                                    {/* <div className="flex flex-col gap-1">
                                      <label className="text-xs font-medium text-gray-600">
                                        Number of Licenses
                                        <span className="text-gray-400 ml-1">(optional)</span>
                                      </label>
                                      <input
                                        className="border border-gray-300 px-3 py-2 rounded text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                        value={String(mu.product?.license) || ""}
                                        onChange={(e) => {
                                          const updatedLicense = e.target.value;
                                          setCurrentPlan(prev => ({
                                            ...prev!,
                                            meteredProducts: prev!.meteredProducts.map((item, i) =>
                                              i === idx
                                                ? {
                                                    ...item,
                                                    product: {
                                                      ...item.product,
                                                      license: updatedLicense,
                                                    },
                                                  }
                                                : item
                                            ),
                                          }));
                                        }}
                                      />
                                    </div> */}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                        </div>
                      )}

                    </div>
                  )}

                  {/* Hybrid plan */}
                  {currentPlan.planType === "hybrid" && (
                    <div className="grid gap-5 mt-5">
                      {/* Fixed */}
                      <div className="space-y-5 border-r pr-5">
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Base Price
                            <span className="ml-1 text-xs text-blue-600 font-normal">
                              (required)
                            </span>
                          </label>
                          <input
                            className="w-full border px-3 py-2 rounded mt-1"
                            value={String(currentPlan.basePrice ?? "")}
                            onChange={(e) => updateCurrent({ basePrice: e.target.value })}
                            inputMode="numeric"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium text-gray-700">
                            Price Per Credit
                            <span className="ml-1 text-xs text-blue-600 font-normal">
                              (required)
                            </span>
                          </label>
                          <input
                            className="w-full border px-3 py-2 rounded mt-1"
                            value={String(currentPlan.pricePerCredit ?? "")}
                            onChange={(e) => updateCurrent({ pricePerCredit: e.target.value })}
                            inputMode="numeric"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-semibold"></label>
                          <label className="text-sm font-medium text-gray-700">
                            Validity (in months)
                            <span className="ml-1 text-xs text-blue-600 font-normal">
                              (required)
                            </span>
                          </label>
                          <input
                            type="number"
                            className="w-full border px-3 py-2 rounded mt-1"
                            value={String(currentPlan.validity ?? "")}
                            onChange={(e) =>
                              updateCurrent({ validity: Number(e.target.value) })
                            }
                          />
                        </div>
                        <div className="bg-white p-6 rounded shadow mb-4">
                          <div className="flex items-center justify-between mb-4">
                            <h3 className="font-semibold">All Products</h3>
                            <button
                              onClick={() => {
                                setProductType("hybrid");
                                setCreateProductModal(true);
                              }}
                              className="text-sm px-3 py-1 bg-blue-600 text-white rounded"
                            >
                              + Add Product
                            </button>
                          </div>
      
                          <div className="space-y-3 mb-4">
                            {availableHybridProducts.map((prod: any) => (
                              <div
                                key={prod.id}
                                className="flex justify-between p-3 bg-gray-100 rounded cursor-pointer hover:bg-gray-200"
                                onClick={() => {
                                  attachProductToPlan(prod, "hybrid");
                                }}
                              >
                                <span className="font-medium">{prod.name}</span>
                                <button className="px-2 py-1 bg-blue-600 text-white rounded text-xs">
                                  Add
                                </button>
                              </div>
                            ))}
                          </div>
      
                          {currentPlan.hybridProducts?.length > 0 ? (
                            <div className="space-y-3 mt-5">
                              <h3 className="font-semibold">Hybrid Products</h3>
                              <div className="space-y-3">
                                {currentPlan?.hybridProducts?.map((hp, idx) => (
                                  <div
                                  key={hp.productId + "-" + idx}
                                  className="flex items-center justify-between gap-4 bg-gray-50 border rounded-lg p-3"
                                >
                                  <div key={hp.productId + "-" + idx} className="flex flex-col gap-2 p-3 rounded-lg bg-gray-50 w-full">
                                    <div className="flex items-center justify-between">
                                      <p className="text-sm font-medium text-gray-900">{hp.product?.name}</p>
                                      <button
                                        onClick={() =>
                                          setCurrentPlan(prev => ({
                                            ...prev!,
                                            hybridProducts: prev!.hybridProducts.filter((_, i) => i !== idx)
                                          }))
                                        }
                                        className="text-xs font-semibold text-red-600 bg-red-50 px-3 py-1.5 rounded-md 
                                                  border border-red-200 hover:bg-red-100 hover:text-red-700 
                                                  transition cursor-pointer"
                                      >
                                        Remove
                                      </button>
                                    </div>
                                    <div className="flex flex-col w-full gap-3 py-2">
                                      {/* Usage selection */}
                                      <div className="flex gap-6">
                                        {/* Unlimited */}
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <input
                                            type="radio"
                                            name={`usage-${hp.productId ?? idx}`}
                                            checked={hp.unlimitedUsage === true}
                                            onChange={() => {
                                              setCurrentPlan(prev => ({
                                                ...prev!,
                                                hybridProducts: prev!.hybridProducts.map((item, i) =>
                                                  i === idx
                                                    ? {
                                                        ...item,
                                                        unlimitedUsage: true,
                                                        numberOfUnits: 0,
                                                        creditsPerUnit: 0,
                                                      }
                                                    : item
                                                ),
                                              }));
                                            }}
                                            className="cursor-pointer"
                                          />
                                          <span className="text-sm font-medium text-gray-700">Unlimited usage</span>
                                        </label>

                                        {/* Limited */}
                                        <label className="flex items-center gap-2 cursor-pointer">
                                          <input
                                            type="radio"
                                            name={`usage-${hp.productId ?? idx}`}
                                            checked={hp.unlimitedUsage === false}
                                            onChange={() => {
                                              setCurrentPlan(prev => ({
                                                ...prev!,
                                                hybridProducts: prev!.hybridProducts.map((item, i) =>
                                                  i === idx
                                                    ? {
                                                        ...item,
                                                        unlimitedUsage: false,
                                                        numberOfUnits: item.numberOfUnits ?? 0,
                                                        creditsPerUnit: item.creditsPerUnit ?? 0,
                                                      }
                                                    : item
                                                ),
                                              }));
                                            }}
                                            className="cursor-pointer"
                                          />
                                          <span className="text-sm font-medium text-gray-700">Limited usage</span>
                                        </label>
                                      </div>

                                      {/* Extra fields when Limited is selected */}
                                      {hp.unlimitedUsage === false && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mt-1 w-full">
                                          <div className="flex flex-col gap-1">
                                            <label className="text-xs font-medium text-gray-600">
                                              No. of Units included
                                              <span className="text-gray-400 ml-1">(required)</span>
                                            </label>
                                            <input
                                              type="number"
                                              min={0}
                                              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                              value={String(hp.numberOfUnits) ?? ""}
                                              onChange={e => {
                                                const value = e.target.value;
                                                setCurrentPlan(prev => ({
                                                  ...prev!,
                                                  hybridProducts: prev!.hybridProducts.map((item, i) =>
                                                    i === idx
                                                      ? {
                                                          ...item,
                                                          numberOfUnits: value === "" ? 0 : Number(value),
                                                        }
                                                      : item
                                                  ),
                                                }));
                                              }}
                                            />
                                          </div>

                                          <div className="flex flex-col gap-1">
                                            <label className="text-xs font-medium text-gray-600">
                                              Credits per unit post "included units"
                                              <span className="text-gray-400 ml-1">(required)</span>
                                            </label>
                                            <input
                                              type="number"
                                              min={0}
                                              className="border border-gray-300 rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                              value={String(hp.creditsPerUnit) ?? ""}
                                              onChange={e => {
                                                const value = e.target.value;
                                                setCurrentPlan(prev => ({
                                                  ...prev!,
                                                  hybridProducts: prev!.hybridProducts.map((item, i) =>
                                                    i === idx
                                                      ? {
                                                          ...item,
                                                          creditsPerUnit: value === "" ? 0 : Number(value),
                                                        }
                                                      : item
                                                  ),
                                                }));
                                              }}
                                            />
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                    <div className="flex flex-col gap-1">
                                      <label className="text-xs font-medium text-gray-600">
                                        Number of Licenses
                                        <span className="text-gray-400 ml-1">(optional)</span>
                                      </label>
                                      <input
                                        className="border border-gray-300 px-3 py-2 rounded text-sm
                                                  focus:outline-none focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
                                        value={hp.product?.license || ""}
                                        onChange={(e) => {
                                          const updatedLicense = e.target.value;
                                          setCurrentPlan(prev => ({
                                            ...prev!,
                                            hybridProducts: prev!.hybridProducts.map((item, i) =>
                                              i === idx
                                                ? {
                                                    ...item,
                                                    product: {
                                                      ...item.product,
                                                      license: updatedLicense,
                                                    },
                                                  }
                                                : item
                                            ),
                                          }));
                                        }}
                                      />
                                    </div>
                                  </div>
                                </div>
                                ))}
                              </div>
                            </div>
                          ): (
                            <p className="text-sm text-gray-500">No hybrid products yet.</p>
                          )}

      
                        </div>
                      </div>
                    </div>
                  )}

                </div>

                {/* BUTTONS */}
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <button
                    onClick={() => setPlanEditingModal(false)}
                    className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleSavePlan}
                    className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
                  >
                    Save Plan
                  </button>
                </div>
              </>
            ) : (
              <p>No plan selected</p>
            )}
          </div>
        </div>
      )}

      {createProductModal && (
        <div
          onClick={() => setCreateProductModal(false)}
          className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white p-6 rounded shadow w-full max-w-md"
          >
            <h3 className="font-semibold mb-3">Create Product</h3>
            {error && (
              <p className="text-sm text-red-600 font-medium py-2">{error}</p>
            )}

            <label className="text-sm font-medium text-gray-700">
              Name
              <span className="ml-1 text-xs text-blue-600 font-normal">
                (required)
              </span>
            </label>
            <input
              className="w-full border px-3 py-2 rounded mt-1 mb-3"
              value={newProductName}
              onChange={(e) => setNewProductName(e.target.value)}
              placeholder="e.g. WhatsApp"
            />

            <label className="text-sm font-medium text-gray-700">
              Number of License
              <span className="ml-1 text-xs text-blue-600 font-normal">
                (optional)
              </span>
            </label>
            <input
              className="w-full border px-3 py-2 rounded mt-1 mb-4"
              value={newProductLicense}
              onChange={(e) => setNewProductLicense(e.target.value)}
            />

            <div className="flex gap-3 justify-end">
              <button
                className="px-4 py-2 bg-gray-200 rounded"
                onClick={() => {
                  setCreateProductModal(false);
                  setNewProductName("");
                  setNewProductLicense("");
                }}
              >
                Cancel
              </button>
              <button className="px-4 py-2 bg-blue-600 text-white rounded" onClick={handleCreateProduct}>Create</button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}