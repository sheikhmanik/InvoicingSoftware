"use client";

import { useEffect, useState } from "react";
import AddBusiness from "./create-customer/manual/AddBusiness";
import AddBrand from "./create-customer/manual/AddBrand";
import AddRestaurant from "./create-customer/manual/AddRestaurant";
import Customers from "./Customers";
import Pricing from "./Pricing";
import AddProduct from "./AddProduct";
import axios from "axios";
import CustomerWizard from "./create-customer/wizard/CustomerWizard";
import PlanListing from "./PlanListing";
import InvoiceList from "./InvoiceList";
import CreateInvoice from "./CreateInvoice";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function Dashboard() {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState<boolean>(false);
  const [display, setDisplay] = useState<string>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("dashboardView");
      if (saved) {
        return saved;
      }
    }
    return "Dashboard";
  });
  const [stats, setStats] = useState<any>(null);
  const [hydrated, setHydrated] = useState(false);
  const [paidInvoices, setPaidInvoices] = useState<any[]>([]);
  const [unpaidInvoices, setUnpaidInvoices] = useState<any[]>([]);
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [filteredBusinesses, setFilteredBusinesses] = useState<any[]>([]);
  const [filteredRestaurants, setFilteredRestaurants] = useState<any[]>([]);
  const [dateWise, setDateWise] = useState<boolean>(false);
  const [restaurantPricingPlans, setRestaurantPricingPlans] = useState<any[]>([]);
  const [filteredResPricingPlans, setFilteredResPricingPlans] = useState<any[]>([]);
  const [MRR, setMRR] = useState<number>();
  const [ARR, setARR] = useState<number>();

  const statsTop = [
    { onClickValue: "Customers", title: "Total Businesses", value: dateWise ? filteredBusinesses.length : stats?.totalBusinesses?.length || "—" },
    { onClickValue: "Customers", title: "Total Outlets", value: dateWise ? filteredRestaurants.length : stats?.totalRestaurants?.length || "—" },
    { onClickValue: "Invoice List", title: "Pending Invoices", value: unpaidInvoices?.length ?? "—" },
    { onClickValue: "Invoice List", title: "Paid Invoices", value: paidInvoices?.length ?? "—" },
  ];

  function groupInvoicesByProforma(allInvoices: any[]) {
    const groups: Record<string, any[]> = {};

    for (const invoice of allInvoices) {
      const key = invoice.proformaNumber as string;
      if (!groups[key]) groups[key] = [];
      groups[key].push(invoice);
    }
    return groups;
  };

  function paidInvs(groups: Record<string, any[]>) {
    return Object.values(groups)
      .map((invoice) =>
        invoice.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      )
      .filter((inv) => inv.status === "paid" || inv.status === "partially paid"
    );
  };

  function unpaidInvs(groups: Record<string, any[]>) {
    return Object.values(groups)
      .map((invoice) =>
        invoice.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())[0]
      )
      .filter((inv) => inv.status === "pending" || inv.status === "partially paid");
  };

  function applyDateFilter() {
    if (!fromDate && !toDate) return;
  
    const from = fromDate ? new Date(fromDate) : null;
    if (from) from.setHours(0, 0, 0, 0);
  
    const to = toDate ? new Date(toDate) : null;
    if (to) to.setHours(23, 59, 59, 999);
  
    // ---------- INVOICES ----------
    const filteredInvoices = stats?.invoices?.filter((inv: any) => {
      const createdAt = new Date(inv.createdAt);
      if (from && to) return createdAt >= from && createdAt <= to;
      if (from) return createdAt >= from;
      if (to) return createdAt <= to;
      return true;
    }) ?? [];
  
    const groupedInvoices = groupInvoicesByProforma(filteredInvoices);
    setPaidInvoices(paidInvs(groupedInvoices));
    setUnpaidInvoices(unpaidInvs(groupedInvoices));
  
    // ---------- BUSINESSES ----------
    const businesses = stats?.totalBusinesses?.filter((biz: any) => {
      const createdAt = new Date(biz.createdAt);
      if (from && to) return createdAt >= from && createdAt <= to;
      if (from) return createdAt >= from;
      if (to) return createdAt <= to;
      return true;
    }) ?? [];
  
    setFilteredBusinesses(businesses);
  
    // ---------- RESTAURANTS ----------
    const restaurants = stats?.totalRestaurants?.filter((rest: any) => {
      const createdAt = new Date(rest.createdAt);
      if (from && to) return createdAt >= from && createdAt <= to;
      if (from) return createdAt >= from;
      if (to) return createdAt <= to;
      return true;
    }) ?? [];

    // ---------- RestaurantPricingPlans ----------
    const filteredPlans = restaurantPricingPlans.filter((plan: any) => {
      const createdAt = new Date(plan.createdAt);
      if (from && to) return createdAt >= from && createdAt <= to;
      if (from) return createdAt >= from;
      if (to) return createdAt <= to;
      return true;
    }) ?? [];
  
    setFilteredRestaurants(restaurants);
    setFilteredResPricingPlans(filteredPlans);
    setDateWise(true);
  };

  useEffect(() => {
    axios.get(`${API}/dashboard/stats`).then(res => {
      setStats(res.data);
      const groupedInvoices = groupInvoicesByProforma(res.data?.invoices ?? []);
      const paid = paidInvs(groupedInvoices);
      const unpaid = unpaidInvs(groupedInvoices);
      if (paid) setPaidInvoices(paid);
      if (unpaid) setUnpaidInvoices(unpaid);
    });
  }, []);

  useEffect(() => {
    axios.get(`${API}/restaurant/restaurantPricingPlans`).then(res => {
      setRestaurantPricingPlans(res.data);
      setFilteredResPricingPlans(res.data);
    });
  }, []);

  useEffect(() => {
    if (!Array.isArray(filteredResPricingPlans)) return;
  
    let mrr = 0;

    filteredResPricingPlans.forEach((plan: any) => {
      let price = 0;
      let duration = 0;

      // price
      if (plan.pricingPlan?.type === "fixed") {
        price = Number(plan.pricingPlan.fixedPrice);
      } else {
        price = Number(plan.pricingPlan.basePrice);
      }

      // duration
      if (plan.customDuration) {
        duration = Number(plan.customDuration);
      } else {
        duration =
          plan.pricingPlan?.type === "fixed"
            ? Number(plan.pricingPlan.billingCycle)
            : Number(plan.pricingPlan.validity);
      }

      if (!price || !duration) return;

      // monthly normalization
      mrr += price / duration;
    });

    const arr = mrr * 12;

    setMRR(Number(mrr.toFixed(2)));
    setARR(Number(arr.toFixed(2)));
  }, [filteredResPricingPlans]);

  useEffect(() => {
    axios.post(`${API}/auto-generate`).then(res => {
      console.log(res.data);
    })
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("dashboardView");
    if (saved) setDisplay(saved);
  }, []);

  useEffect(() => {
    if (typeof window !== "undefined") {
      localStorage.setItem("dashboardView", display);
    }
  }, [display]);

  useEffect(() => {
    setHydrated(true);
  }, []);

  if (!hydrated) {
    return null;
  };

  const navItems = [
    "Dashboard", "Customers", "Invoice List", "Create Customer", "Add Business", "Add Brand", "Add Restaurant", "Plan Listing", "Pricing plan setup", "Add Product", "Create Proforma", "Create Invoice", "Pending Invoices", "MRR / ARR", "Churn"
  ];

  return (
    <div className="min-h-screen bg-gray-50 text-slate-800 flex flex-col md:flex-row">
      {/* MOBILE HEADER (Visible only on screens smaller than md) */}
      <header className="md:hidden bg-white border-b border-gray-200 px-4 py-3 flex items-center justify-between sticky top-0 z-30 shadow-sm">
        <h2 className="text-lg font-semibold text-gray-800">Invoice</h2>
        <button
          onClick={() => setIsMobileNavOpen((prev) => !prev)}
          className="p-2 text-gray-600 hover:text-gray-900 focus:outline-none rounded-md hover:bg-gray-100 transition"
          aria-label="Toggle Navigation Menu"
        >
          {isMobileNavOpen ? (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
          ) : (
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          )}
        </button>
      </header>

      {/* MOBILE NAV DRAWER (Visible when isMobileNavOpen is true on screens below md) */}
      {isMobileNavOpen && (
        <div className="md:hidden bg-white border-b border-gray-200 px-4 py-3 space-y-1 text-sm shadow-md">
          {navItems.map((item) => (
            <a
              key={item}
              onClick={() => {
                setDisplay(item);
                setIsMobileNavOpen(false);
              }}
              className={`${
                display === item ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-700"
              } block px-3 py-2 rounded-md hover:bg-gray-100 hover:text-gray-900 transition cursor-pointer`}
            >
              {item}
            </a>
          ))}
        </div>
      )}

      {/* DESKTOP SIDEBAR (Visible on md and above) */}
      <aside className="hidden md:block w-48 lg:w-56 bg-white border-r border-gray-200 py-6 sticky top-0 h-screen shadow-sm shrink-0">
        <h2 className="text-lg font-semibold mb-6 px-6 text-gray-800">Invoice</h2>

        <nav className="space-y-1 text-sm">
          {navItems.map((item) => (
            <a
              key={item}
              onClick={() => setDisplay(item)}
              className={`${
                display === item ? "bg-gray-100 text-gray-900 font-medium" : "text-gray-700"
              } block px-4 md:pl-6 lg:pl-10 py-2 hover:bg-gray-100 hover:text-gray-900 transition cursor-pointer`}
            >
              {item}
            </a>
          ))}
        </nav>
      </aside>

      {/* MAIN CONTENT */}
      <main className="flex-1 p-4 md:p-6 overflow-y-auto">

          {display === "Dashboard" && (
            <div>
              {/* HEADER */}
              <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 mb-8 bg-white p-4 border rounded-lg shadow-sm">
                <h1 className="text-xl md:text-2xl font-bold text-gray-800">Dashboard</h1>

                <div className="flex flex-col sm:flex-row sm:items-center gap-3 w-full md:w-auto">
                  <label className="text-sm font-medium text-gray-600">Select date:</label>

                  <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
                    <input
                      type="date"
                      onClick={(e) => (e.target as HTMLInputElement).showPicker()}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setFromDate(e.target.value)}
                      className="px-3 py-2 border rounded-md bg-white text-sm flex-1 sm:flex-none w-full sm:w-auto focus:ring-2 focus:ring-sky-400 outline-none"
                    />
                    <span className="text-sm text-gray-400">to</span>
                    <input
                      type="date"
                      onClick={(e) => (e.target as HTMLInputElement).showPicker()}
                      max={new Date().toISOString().split("T")[0]}
                      onChange={(e) => setToDate(e.target.value)}
                      className="px-3 py-2 border rounded-md bg-white text-sm flex-1 sm:flex-none w-full sm:w-auto focus:ring-2 focus:ring-sky-400 outline-none"
                    />
                  </div>

                  <button
                    onClick={applyDateFilter}
                    className="bg-sky-600 text-white px-4 py-2 text-sm rounded-md shadow hover:bg-sky-700 transition w-full sm:w-auto"
                  >
                    Apply
                  </button>
                </div>
              </div>

              {/* TOP CARDS */}
              <section className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
                {statsTop.map((s) => (
                  <div
                    key={s.title}
                    onClick={() => setDisplay(s.onClickValue)}
                    className="bg-white border rounded-lg p-5 shadow-md hover:shadow-lg transition flex flex-col justify-between cursor-pointer"
                  >
                    <div className="text-sm font-medium text-gray-500">{s.title}</div>
                    <div className="mt-3 text-3xl font-bold text-gray-800">{s.value}</div>
                  </div>
                ))}
              </section>

              {/* THREE-COLUMN BLOCK */}
              <section className="grid grid-cols-1 lg:grid-cols-3 gap-4">

                <div className="bg-white border rounded-lg p-6 shadow-md hover:shadow-lg transition">
                  <div className="text-sm text-gray-500 font-medium">MRR</div>
                  <div className="mt-4 text-4xl font-bold text-gray-800">{MRR}</div>
                  <div className="mt-2 text-xs text-gray-500">Monthly recurring revenue</div>
                </div>

                <div className="bg-white border rounded-lg p-6 shadow-md hover:shadow-lg transition">
                  <div className="text-sm text-gray-500 font-medium">ARR</div>
                  <div className="mt-4 text-4xl font-bold text-gray-800">{ARR}</div>
                  <div className="mt-2 text-xs text-gray-500">Annual recurring revenue</div>
                </div>

                <div className="bg-white border rounded-lg p-6 shadow-md hover:shadow-lg transition">
                  <div className="text-sm text-gray-500 font-medium">Overview</div>

                  <div className="mt-4 flex flex-col gap-3">
                    <div className="flex justify-between text-sm">
                      <span>Pending invoices</span>
                      <span className="font-semibold">
                        {unpaidInvoices?.length ?? "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Paid invoices</span>
                      <span className="font-semibold">
                        {paidInvoices?.length ?? "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Business</span>
                      <span className="font-semibold">
                        {stats?.totalBusinesses?.length ?? "—"}
                      </span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Outlets</span>
                      <span className="font-semibold">
                        {stats?.totalRestaurants?.length ?? "—"}
                      </span>
                    </div>
                  </div>
                </div>

              </section>
            </div>
          )}

          {display === "Customers" && (
            <Customers/>
          )}
          
          {display === "Invoice List" && (
            <InvoiceList/>
          )}

          {display === "Create Customer" && (
            <CustomerWizard onDone={() => setDisplay("Customers")} />
          )}

          {display === "Add Business" && (
            <AddBusiness onDone={() => setDisplay("Add Brand")}/>
          )}
          
          {display === "Add Brand" && (
            <AddBrand onDone={() => setDisplay("Add Restaurant")} />
          )}
          
          {display === "Add Restaurant" && (
            <AddRestaurant onDone={() => setDisplay("Customers")} />
          )}
          
          {display === "Plan Listing" && (
            <PlanListing/>
          )}

          {display === "Pricing plan setup" && (
            <Pricing/>
          )}

          {display === "Add Product" && (
            <AddProduct/>
          )}
          
          {display === "Create Invoice" && (
            <CreateInvoice/>
          )}

        </main>
    </div>
  );
}
