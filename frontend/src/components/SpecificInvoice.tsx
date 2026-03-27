"use client";

import axios from "axios";
import Image from "next/image";
import { useParams } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import "./styles/print.css";

const API = process.env.NEXT_PUBLIC_API_URL;

function numberToWords(num: number): string {
  const a = [
    "",
    "One",
    "Two",
    "Three",
    "Four",
    "Five",
    "Six",
    "Seven",
    "Eight",
    "Nine",
    "Ten",
    "Eleven",
    "Twelve",
    "Thirteen",
    "Fourteen",
    "Fifteen",
    "Sixteen",
    "Seventeen",
    "Eighteen",
    "Nineteen",
  ];
  
  const b = [
    "",
    "",
    "Twenty",
    "Thirty",
    "Forty",
    "Fifty",
    "Sixty",
    "Seventy",
    "Eighty",
    "Ninety",
  ];

  if (num === 0) return "Zero";
  if (num < 20) return a[num];
  if (num < 100)
    return `${b[Math.floor(num / 10)]} ${a[num % 10]}`.trim();
  if (num < 1000)
    return `${a[Math.floor(num / 100)]} Hundred${
      num % 100 !== 0 ? " " + numberToWords(num % 100) : ""
    }`;
  if (num < 100000)
    return `${numberToWords(Math.floor(num / 1000))} Thousand${
      num % 1000 !== 0 ? " " + numberToWords(num % 1000) : ""
    }`;
  if (num < 10000000)
    return `${numberToWords(Math.floor(num / 100000))} Lakh${
      num % 100000 !== 0 ? " " + numberToWords(num % 100000) : ""
    }`;

  return "Amount too large";
}

interface PricingPlan {
  createdAt: string;
  planType: "fixed" | "metered" | "hybrid";
  billingCycle: number;
  validity: number;
  basePrice: number;
  planName: string;
  customDuration: number;
}

interface Invoice {
  id: number;
  proformaNumber: string;
  invoiceNumber: string;
  subTotalAmount: number;
  totalAmount: number;
  partialAmount: number | null;
  remainingAmount: number | null;
  status: "pending" | "paid" | "partially paid";
  paymentDate: string | null;
  createdAt: string;
  pricingPlanId: number;
  discountAmount?: number;
}

interface RestaurantBrand {
  business: {
    name: string;
    address: string;
    GSTIN: string;
  };
}

interface Restaurant {
  name: string;
  invoices: Invoice[];
  restaurantPricingPlans: { 
    createdAt: string;
    customDuration: number,
    pricingPlan: PricingPlan,
    cgst: boolean,
    igst: boolean,
    sgst: boolean,
  }[];
  brand: RestaurantBrand;
}

export default function SpecificInvoice() {

  const params = useParams<{ restaurantId: string, specificInvId: string }>();
  const resId = Number(params.restaurantId);
  const specificInvId = Number(params.specificInvId);

  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [loading, setLoading] = useState(true);
  const componentRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    axios
      .get(`${API}/restaurant`)
      .then((res) => {
        const item = res.data.find((i: any) => i.id === resId);
        setRestaurant(item || null);
        console.log(item);
      })
      .catch((err) => console.error("Error fetching restaurant:", err))
      .finally(() => setLoading(false));
  }, []);

  // useEffect(() => {
  //   if (!loading && restaurant) {
  //     setTimeout(() => window.print(), 500);
  //   }
  // }, [loading, restaurant]);

  if (loading) {
    return <div className="text-center my-20">Loading invoice...</div>;
  }

  if (!restaurant)
    return <div className="text-center text-red-600 mt-10">Invoice data not found</div>
  ;

  const pricingPlan = restaurant.restaurantPricingPlans[0]?.pricingPlan || null;
  const restaurantPricingPlan = restaurant.restaurantPricingPlans[0] || null;

  const specificInv = restaurant.invoices.find(
    (inv) => inv.id === specificInvId
  ) || restaurant.invoices.at(-1) || null;

  if (!specificInv || !pricingPlan || !restaurant) {
    return (
      <div className="text-center text-red-600 mt-10">
        Invoice data not found
      </div>
    );
  }

  const invoice = specificInv;

  const createdDate = new Date(pricingPlan.createdAt);
  const endDate = new Date(createdDate);
  
  if (pricingPlan.planType === "fixed") {
    if (restaurantPricingPlan?.customDuration && restaurantPricingPlan.customDuration > 0) {
      endDate.setMonth(endDate.getMonth() + restaurantPricingPlan.customDuration - 1);
    } else {
      endDate.setMonth(endDate.getMonth() + pricingPlan.validity - 1);
    }
  } else {
    if (restaurantPricingPlan?.customDuration && restaurantPricingPlan.customDuration > 0) {
      endDate.setMonth(endDate.getMonth() + restaurantPricingPlan.customDuration - 1);
    } else {
      endDate.setMonth(endDate.getMonth() + pricingPlan.validity - 1);
    }
  }

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });

  const subscriptionPeriod = `${formatDate(createdDate)} — ${formatDate(endDate)}`;

  const subTotalAmount = Math.ceil(invoice.subTotalAmount ?? 0);
  const totalAmount = Math.ceil(invoice.totalAmount ?? 0);
  const amountInWords = `${numberToWords(totalAmount)} only`;

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
        currentCycle.push(invoice);
        continue;
      }
  
      const prev = sorted[i - 1];
      const planChanged = invoice.pricingPlanId !== prev.pricingPlanId;
  
      if (planChanged) {
        cycles.push(currentCycle);
        currentCycle = [invoice];
      } else {
        currentCycle.push(invoice);
      }
    }
  
    if (currentCycle.length > 0) cycles.push(currentCycle);
  
    return cycles;
  }

  return (
    <>
    <div
      ref={componentRef}
      style={{ colorScheme: "light", backgroundColor: "#fff" }}
      className="max-w-3xl mx-auto border p-8 bg-white rounded-lg shadow text-sm my-5"
    >

      {/* Logo */}
      <div className="flex items-center justify-end">
        <Image
          alt="logo"
          src="/fuvii.png"
          width={70}
          height={70}
          className="mb-2"
        />
      </div>

      {/* Header */}
      <div className="text-left mb-6 border-b-2 pb-2">
        <h2 className="text-lg font-semibold">Edlar Business Services Private Limited</h2>
        <p>No 34, Marutham Street, Fathima Nagar,</p>
        <p>Valasaravakkam, Chennai - 600087.</p>
        <p>Phone: 044-4286 1687 | Email: info@possier.com</p>
        <p>www.possier.com</p>
      </div>

      {/* Title + Date */}
      <div className="flex justify-between mb-4 mt-10">
        <h3 className="text-xl font-bold">
          { invoice.status === "pending" ? "Proforma Invoice" : "Tax Invoice" }
        </h3>
        <p>Date: {new Date().toLocaleDateString("en-GB")}</p>
      </div>

      {/* Invoice Details */}
      <div className="mb-4 text-sm">
        {invoice.status === "pending" ? (
          <p>Proforma No. {invoice.proformaNumber}</p>
        ) : (
          <p>Invoice No. {invoice.invoiceNumber}</p>
        )}
        <p>GSTIN: 33AADCE1170H2Z2</p>
        <p>PAN: AADCE1170H</p>
      </div>

      {/* Customer */}
      <div className="mb-5">
        <p className="font-semibold">To,</p>
        <p>{restaurant.brand.business.name}</p>
        <p>{restaurant.brand.business.address}</p>
        <p>{restaurant.brand.business.GSTIN}</p>
      </div>

      {/* Table */}
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-gray-100">
            <th className="border p-2 text-left w-32">Item</th>
            <th className="border p-2 text-left">Description</th>
            <th className="border p-2 text-center w-32">Unit Cost</th>
            <th className="border p-2 text-center w-36">Cost to be Paid</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td className="border p-2">Possier Point of Sale</td>
            <td className="border p-2 whitespace-pre-line">
              {restaurant.name}{"\n"}
              {
                restaurantPricingPlan.customDuration ||
                (pricingPlan.planType === "fixed" ? pricingPlan.billingCycle : pricingPlan.validity)
              } month(s) Subscription{"\n"}
              Subscription period:{"\n"}
              {subscriptionPeriod}
            </td>
            <td className="border p-2 text-center">
              {subTotalAmount}.00/-
            </td>
            <td className="border p-2 text-center">
              {subTotalAmount}.00/-
            </td>
          </tr>

          <tr>
            <td colSpan={3} className="border p-2 text-right font-semibold">Subtotal</td>
            <td className="border p-2 text-center">{subTotalAmount}.00/-</td>
          </tr>

          {restaurant.restaurantPricingPlans[0].cgst && (
            <tr>
              <td colSpan={3} className="border p-2 text-right">CGST (9%)</td>
              <td className="border p-2 text-center">{Number(subTotalAmount * 0.09)}.00/-</td>
            </tr>
          )}
          {restaurant.restaurantPricingPlans[0].sgst && (
            <tr>
              <td colSpan={3} className="border p-2 text-right">SGST (9%)</td>
              <td className="border p-2 text-center">{Number(subTotalAmount * 0.09)}.00/-</td>
            </tr>
          )}
          {restaurant.restaurantPricingPlans[0].igst && (
            <tr>
              <td colSpan={3} className="border p-2 text-right">IGST (18%)</td>
              <td className="border p-2 text-center">{Number(subTotalAmount * 0.18)}.00/-</td>
            </tr>
          )}

          {invoice.discountAmount && (invoice.discountAmount > 0) ? (
            <tr className="bg-yellow-50">
              <td colSpan={3} className="border p-2 text-right text-yellow-800">
                Discount Applied
              </td>
              <td className="border p-2 text-center text-yellow-800">
                -{invoice.discountAmount}.00/-
              </td>
            </tr>
          ) : null}

          <tr className="font-bold">
            <td colSpan={3} className="border p-2 text-right">
              Total — {amountInWords}
            </td>
            <td className="border p-2 text-center">{totalAmount}.00/-</td>
          </tr>
          
          {/* PAYMENT HISTORY UP TO THIS INVOICE */}
          {(() => {
            const cycles = groupInvoicesIntoCycles(restaurant.invoices || []);

            // 1️⃣ Find the cycle that contains the specific invoice
            let invoices: any[] = [];
            for (const cycle of cycles) {
              if (cycle.some((inv: any) => inv.id === specificInvId)) {
                invoices = cycle;
                break;
              }
            }

            if (!invoices.length) return null;

            // 2️⃣ Sort that cycle's invoices oldest → latest
            const sorted = [...invoices].sort(
              (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()
            );

            // 3️⃣ Find index of the specific invoice within that cycle
            const indexOfCurrent = sorted.findIndex((inv) => inv.id === specificInvId);
            if (indexOfCurrent === -1) return null;

            // 4️⃣ Only show invoices up to and including the selected one
            const displayInvoices = sorted.slice(0, indexOfCurrent + 1);

            // 5️⃣ Filter only invoices which have payments
            const paymentHistory = displayInvoices.filter(
              (inv) => (inv.partialAmount ?? 0) > 0
            );

            if (paymentHistory.length === 0) {
              return (
                <tr className="bg-red-50">
                  <td colSpan={4} className="border p-2 text-center text-red-600 italic">
                    No payments made yet
                  </td>
                </tr>
              );
            }

            return paymentHistory.map((inv, i) => (
              <tr key={i} className="bg-green-50 font-medium">
                <td colSpan={3} className="border p-2 text-right text-green-700">
                  {inv.status === "paid" ? "Fully Paid" : "Partially Paid"} —{" "}
                  {inv.paymentDate?.split("T")[0] || "—"}
                </td>
                <td className="border p-2 text-center text-green-700">
                  {inv.partialAmount}.00/-
                </td>
              </tr>
            ));
          })()}

          {/* REMAINING DUE — ONLY FOR SPECIFIC INVOICE */}
          {(() => {
            const remaining = invoice.remainingAmount ?? 0;

            return (
              <tr className="bg-red-50 font-semibold">
                <td colSpan={3} className="border p-2 text-right text-red-700">
                  Remaining Amount Due
                </td>
                <td className="border p-2 text-center text-red-700">
                  {Number(Math.ceil(Math.max(remaining, 0)))}.00/-
                </td>
              </tr>
            );
          })()}

        </tbody>
      </table>

      {/* Notes */}
      <p className="text-xs mt-4 text-gray-600 leading-5">
        Note: Possier is SaaS Application…
      </p>

      {/* Payment Section */}
      <div className="flex justify-between gap-4 mt-20">
        <div className="w-1/2 leading-6">
          <p className="font-semibold underline">For online payment:</p>
          <p>Account Name: Edlar Business Services Private Limited</p>
          <p>Account Number: 027605500360</p>
          <p>Bank: ICICI Bank, Nelson Manickam Road</p>
          <p>IFSC Code: ICIC0000276</p>

          <br />

          <p className="font-semibold underline">
            For International bank transfer:
          </p>
          <p>Swift Code: ICICINBBXXX</p>
        </div>

        <div className="w-1/2 text-center">
          <p className="font-semibold underline mb-1">Scan & Pay</p>
          <p>UPI ID: 9176655717@okbizaxis</p>

          <div className="w-52 h-52 relative mx-auto my-3">
            <Image
              alt="QR Code"
              src="/qrcode.png"
              fill
              className="object-contain"
            />
          </div>

          <p className="text-xs">9176655717@okbizaxis</p>
        </div>
      </div>

      {/* Signature */}
      <div className="pt-10">
        <p>
          For <span className="font-semibold">Edlar Business Services Private Limited</span>
        </p>

        <div className="w-40 h-14 relative mt-6 mb-2">
          <Image
            alt="Signature"
            src="/sign.png"
            fill
            className="object-contain"
          />
        </div>

        <p className="font-semibold">Syed Harris, Director</p>
      </div>
    </div>
    <div className="flex items-center justify-center mb-10">
      <button
        className="border px-2 text-xs cursor-pointer hover:bg-gray-100"
        onClick={() => window.print()}
      >
        Download PDF
      </button>
    </div>
    </>
  );
}