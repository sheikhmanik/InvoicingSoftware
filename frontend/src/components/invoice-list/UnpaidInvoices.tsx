"use client";

import axios from "axios";
import Link from "next/link";
import { useEffect, useState } from "react";

interface Restaurant {
  id: string;
  name: string;
  location: string;
  address: string;
  invoices: Invoice[];
  brand: {
    business: {
      name: string,
      location: string,
    }
  }
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

type SearchField = 
  | "proformaNumber"
  | "invoiceNumber"
  | "storeName"
  | "businessName"
;

interface Props {
  allInvoices: any[];
  latestUnpaidInvoices: any[];
}

const API = process.env.NEXT_PUBLIC_API_URL;

export default function UnpaidInvoices({ allInvoices, latestUnpaidInvoices }: Props) {

  const [updatePayment, setUpdatePayment] = useState(false);
  const [currentRestaurant, setCurrentRestaurant] = useState<Restaurant |  null>(null);
  const [currentInvoice, setCurrentInvoice] = useState<Invoice | null>(null);
  const [paymentDate, setPaymentDate] = useState("");
  const [paymentNotes, setPaymentNotes] = useState("");
  const [isPartial, setIsPartial] = useState("No");
  const [partialAmount, setPartialAmount] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [paymentFile, setPaymentFile] = useState<File | null>(null);
  const [updatingPayment, setUpdatingPayment] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("proformaNumber");
  const [dateField, setDateField] = useState<"proformaDate" | "invoiceDate">("proformaDate");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [dateWiseInvoices, setDateWiseInvoices] = useState<Invoice[]>([]);
  const [searchedInvoices, setSearchedInvoices] = useState<Invoice[]>([]);
  const [dateWise, setDateWise] = useState(false);

  async function handleUpdatePayment() {
    setError("");
    if (!paymentDate) {
      setError("Payment date is required!");
      return;
    }
    if (!paymentFile) {
      setError("Payment file is required!");
      return;
    }
    if (!currentInvoice) {
      setError("Current Invoice is null.");
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
        currentResId: currentRestaurant?.id,
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
      setCurrentRestaurant(null)
      setCurrentInvoice(null);
      window.location.reload();

    } catch (err) {
      console.error(err);
      setError("Upload failed. Try again.");
    } finally {
      setUpdatingPayment(false);
    }
  }

  // function getLatestPendingInvoicesByProforma(allInvoices: Invoice[]) {
  //   const latestByProforma: Record<string, Invoice> = {};
  
  //   for (const inv of allInvoices) {
  //     if (!inv.proformaNumber) continue; // skip weird ones
  
  //     const key = inv.proformaNumber;
  
  //     const existing = latestByProforma[key];
  
  //     // if no invoice stored yet OR this one is newer → replace
  //     if ( !existing || new Date(inv.createdAt).getTime() > new Date(existing.createdAt).getTime()) {
  //       latestByProforma[key] = inv;
  //     }
  //   }
  
  //   // Now `latestByProforma` holds latest invoice (any status) for each proforma.
  //   // Filter only the ones that are still pending:
  //   return Object.values(latestByProforma).filter(
  //     (inv) => inv.status === "pending" || inv.status === "partially paid"
  //   );
  // }

  // // Build a set of IDs that are actually the latest pending invoices per proforma
  // const latestPending = getLatestPendingInvoicesByProforma(allInvoices);
  // const latestPendingIds = new Set(latestPending.map((inv) => inv.id));

  // // Filter your existing `unpaidInvoices` using those IDs
  // const visibleInvoices = unpaidInvoices.filter((inv) =>
  //   latestPendingIds.has(inv.id)
  // );

  function groupInvoicesByProforma(allInvoices: any[]) {
    const groups: Record<string, any[]> = {};
  
    for (const inv of allInvoices) {
      if (!inv.proformaNumber) continue;
      const key = inv.proformaNumber;
      if (!groups[key]) groups[key] = [];
      groups[key].push(inv);
    }
  
    return groups;
  }

  function getLatestUnpaidInvoices(groups: Record<string, any[]>) {
    return Object.values(groups)
      .map((list) =>
        list.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]
      ).filter((inv) => inv.status === "pending" || inv.status === "partially paid");
  }

  const proformaGroups = groupInvoicesByProforma(allInvoices);
  const latestUnpaidInvs = getLatestUnpaidInvoices(proformaGroups);

  const paymentHistoryMap = new Map(
    latestUnpaidInvs.map((latestInv) => {
      const related = proformaGroups[latestInv.proformaNumber] || [];
  
      const paymentsOnly = related.filter(
        (inv) =>
          (inv.status === "paid" || inv.status === "partially paid") &&
          (
            inv.partialAmount > 0 ||
            inv.paidAmount > 0 ||
            inv.paymentDate ||
            inv.paymentFileUrl
          )
      ).sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime()); // oldest to newest
  
      return [latestInv.id, paymentsOnly];
    })
  );
  
  // 🔍 Search logic
  useEffect(() => {
    if (!searchText.trim()) {
      setSearchedInvoices(latestUnpaidInvs);
      setDateWise(false);    // 🔥 switching off date mode when search is reset
      return;
    }
  
    const text = searchText.toLowerCase();
    setDateWise(false);      // 🔥 searching always disables date-wise filtering
  
    const results = latestUnpaidInvs.filter((inv: Invoice) => {
      const match = (field?: string | number) =>
        field?.toString().toLowerCase().includes(text);
  
      switch (searchField) {
        case "proformaNumber":
          return match(inv.proformaNumber);
        case "invoiceNumber":
          return match(inv.invoiceNumber);
        case "storeName":
          return inv.restaurant?.name?.toLowerCase().includes(text);
        case "businessName":
          return inv.restaurant?.brand?.business?.name
            ?.toLowerCase()
            .includes(text);
        default:
          return (
            match(inv.proformaNumber) ||
            match(inv.invoiceNumber) ||
            inv.restaurant?.name?.toLowerCase().includes(text) ||
            inv.restaurant?.brand?.business?.name?.toLowerCase().includes(text)
          );
      }
    });
  
    setSearchedInvoices(results);
  }, [searchText, searchField, latestUnpaidInvoices]);

  function applyDateFilter() {
    if (!fromDate && !toDate) return;
  
    setSearchText("");
    setDateWise(true);
  
    // Normalize bounds (start of fromDate, end of toDate) so "to" is inclusive
    const from = fromDate ? new Date(fromDate) : null;
    if (from) { from.setHours(0,0,0,0); }
    const to = toDate ? new Date(toDate) : null;
    if (to) { to.setHours(23,59,59,999); }
  
    const results = latestUnpaidInvs.filter(inv => {
      const createdTime = new Date(inv.createdAt).getTime();
  
      if (from && createdTime < from.getTime()) return false;
      if (to && createdTime > to.getTime()) return false;
  
      return true;
    });
  
    setDateWiseInvoices(results);
  }

  return (
    <div className="flex flex-col">
      <div className="flex gap-2 items-center p-3 bg-gray-100 rounded-lg border w-full">
        <div className="relative">
          <select
            value={searchField}
            onChange={(e) => setSearchField(e.target.value as SearchField)}
            className="
              appearance-none   /* HIDE default arrow */
              px-3 py-2 
              pr-10             /* space for custom arrow */
              rounded-md 
              border border-gray-300 
              outline-none 
              focus:ring-2 focus:ring-blue-500 
              text-sm
            "
          >
            <option value="proformaNumber">Proforma Number</option>
            <option value="invoiceNumber">Invoice Number</option>
            <option value="businessName">Business Name</option>
            <option value="storeName">Store Name</option>
          </select>
          <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
            ▼
          </span>
        </div>
        <input
          type="text"
          placeholder="Search here..."
          className="px-3 py-2 rounded-md border border-gray-300 outline-none focus:ring-2 focus:ring-blue-500 text-sm w-full"
          value={searchText}
          onChange={(e) => {
            setSearchText(e.target.value)
            setDateWiseInvoices([])
          }}
        />
      </div>
      <div className="flex flex-row items-end justify-end gap-4 my-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="relative">
            <select
              value={dateField}
              onChange={(e) => setDateField(e.target.value as "proformaDate" | "invoiceDate")}
              className="
                appearance-none   /* HIDE default arrow */
                px-3 py-2 
                pr-10             /* space for custom arrow */
                rounded-md 
                border border-gray-300 
                outline-none 
                focus:ring-2 focus:ring-blue-500 
                text-sm
              "
            >
              <option value="proformaDate">Proforma Date</option>
              <option value="invoiceDate">Invoice Date</option>
            </select>
            <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-gray-500">
              ▼
            </span>
          </div>
          <div className="flex flex-col sm:flex-row items-center gap-2 w-full sm:w-auto">
            <input
              type="date"
              onClick={(e) => (e.target as HTMLInputElement).showPicker()}
              onChange={(e) => setFromDate(e.target.value)}
              className="px-3 py-2 border rounded-md bg-white text-sm flex-1 sm:flex-none w-full sm:w-auto focus:ring-2 focus:ring-sky-400 outline-none"
            />
            <span className="text-sm text-gray-400">to</span>
            <input
              type="date"
              onClick={(e) => (e.target as HTMLInputElement).showPicker()}
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
      <div className="overflow-x-auto bg-white shadow-xl rounded-xl border border-gray-200">
        
        <table className="w-full text-sm">
          <thead className="bg-linear-to-r from-blue-50 to-blue-100 text-gray-700 border-b">
            <tr>
              <th className="p-4 border-r text-center font-semibold">Business</th>
              <th className="p-4 border-r text-center font-semibold">Store</th>
              <th className="p-4 border-r text-center font-semibold">Proforma Number</th>
              <th className="p-4 border-r text-center font-semibold">Due Date</th>
              <th className="p-4 border-r text-center font-semibold">Total Amount</th>
              <th className="p-4 border-r text-center font-semibold">Payment Docs</th>
              <th className="p-4 border-r text-center font-semibold">Status</th>
              <th className="p-4 text-center font-semibold">Update Payment</th>
            </tr>
          </thead>

          {!dateWise ? (
            <tbody className="text-gray-800">
              {searchedInvoices?.length > 0 ? (
                searchedInvoices.map((invoice) => {
                  const businessName = invoice?.restaurant?.brand?.business?.name ?? "N/A";
                  const businessLocation = invoice?.restaurant?.brand?.business?.location ?? "N/A";
                  const storeName = invoice?.restaurant?.name ?? "N/A";
                  const storeAddress = invoice?.restaurant?.address ?? "N/A";
                  const proformaNumber = invoice?.proformaNumber ?? "N/A";
                  const totalAmount =
                    typeof invoice?.totalAmount === "number"
                      ? invoice.totalAmount.toLocaleString("en-IN")
                      : invoice?.totalAmount ?? "N/A"
                  ;
                  const dueDate = invoice?.dueDate
                    ? new Date(invoice.dueDate).toLocaleDateString("en-IN")
                    : "N/A"
                  ;
                  const status = invoice?.status ?? "N/A";

                  const statusColor =
                    status === "paid"
                      ? "bg-green-100 text-green-700"
                      : status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-200 text-gray-700"
                  ;

                  const proformaInvoices = allInvoices.filter((inv) => inv.status === "pending");
                  const proformaInvoice = proformaInvoices.find((inv) => 
                    inv.proformaNumber === invoice.proformaNumber &&
                    inv.totalAmount === invoice.totalAmount
                  );

                  const payments = paymentHistoryMap.get(invoice.id);

                  return (
                    <tr
                      key={invoice.id}
                      className="border-b last:border-0 hover:bg-blue-50 transition-all"
                    >
                      <td className="p-4 border-r text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-semibold text-gray-900">{businessName}</span>
                          <span className="text-xs text-gray-500 mt-1">
                            {businessLocation}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 border-r text-center max-w-36">
                        <div className="flex flex-col items-center">
                          <span className="font-medium text-gray-900">{storeName}</span>
                          <span className="text-xs text-gray-500 mt-1">
                            {storeAddress}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 border-r text-center text-blue-700 font-semibold">
                        <div className="flex flex-col gap-1">
                          <p>{proformaNumber}</p>
                          <Link
                            href={`/invoice/${invoice.restaurant.id}/specific/${proformaInvoice.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="
                              inline-flex items-center justify-center gap-1 px-2 py-1 rounded
                              bg-blue-500 text-white text-[10px] font-medium
                              hover:bg-blue-600 shadow-sm hover:shadow transition-all
                            "
                          >
                            Invoice →
                          </Link>
                          <Link
                            href={`/invoice/${invoice.restaurant.id}/specific/${proformaInvoice.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="
                              inline-flex items-center justify-center gap-1 px-2 py-1 rounded
                              bg-blue-500 text-white text-[10px] font-medium
                              hover:bg-blue-600 shadow-sm hover:shadow transition-all
                            "
                          >
                            Download Invoice
                          </Link>
                        </div>
                      </td>
                      <td className="p-4 border-r text-center text-sm">
                        {dueDate}
                      </td>
                      <td className="p-4 border-r text-center font-semibold text-gray-900">
                        {totalAmount}
                      </td>
                      <td className="p-4 border-r text-center">
                        <div className="flex flex-col gap-2">
                          {payments && payments.length > 0 ? (
                            payments.map((invoice) => {
                              const paymentDate = new Date(invoice?.paymentDate).toLocaleDateString("en-IN") || "—";
                              return (
                                <div key={invoice.id} className="bg-gray-50 border border-gray-300 rounded-lg p-2 text-left text-xs space-y-1 shadow-sm">
                                  <div className="flex justify-between">
                                    <span className="font-semibold text-gray-700">
                                      Paid: {invoice?.partialAmount ?? 0}/-
                                    </span>
                                    <span className="text-gray-500">
                                      {paymentDate}
                                    </span>
                                  </div>
                                  
                                  <div className="flex justify-between">
                                    <span className="font-medium text-red-700">
                                      Due: {invoice?.remainingAmount ?? 0}/-
                                    </span>
                                  </div>
          
                                  {/* Notes */}
                                  {invoice?.paymentNotes && (
                                    <div className="text-gray-600 italic">
                                      {invoice?.paymentNotes}
                                    </div>
                                  )}
          
                                  {/* Document */}
                                  <div className="flex flex-col gap-1">
                                    {invoice?.paymentFileUrl && (
                                      <Link
                                        href={invoice?.paymentFileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 underline hover:text-blue-800"
                                      >
                                        📄 View Receipt
                                      </Link>
                                    )}
                                    <Link
                                      href={`/invoice/${invoice?.restaurant?.id}/specific/${invoice?.id}`}
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
                              );                      
                            })                      
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 border-r text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => {
                            setCurrentInvoice(invoice);
                            setCurrentRestaurant(invoice.restaurant)
                            setUpdatePayment(true)
                          }}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Update Payment
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500 italic">
                    No paid invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          ) : (
            <tbody className="text-gray-800">
              {dateWiseInvoices?.length > 0 ? (
                dateWiseInvoices.map((invoice) => {
                  const businessName = invoice?.restaurant?.brand?.business?.name ?? "N/A";
                  const businessLocation = invoice?.restaurant?.brand?.business?.location ?? "N/A";
                  const storeName = invoice?.restaurant?.name ?? "N/A";
                  const storeAddress = invoice?.restaurant?.address ?? "N/A";
                  const proformaNumber = invoice?.proformaNumber ?? "N/A";
                  const totalAmount =
                    typeof invoice?.totalAmount === "number"
                      ? invoice.totalAmount.toLocaleString("en-IN")
                      : invoice?.totalAmount ?? "N/A"
                  ;
                  const dueDate = invoice?.dueDate
                    ? new Date(invoice.dueDate).toLocaleDateString("en-IN")
                    : "N/A"
                  ;
                  const status = invoice?.status ?? "N/A";

                  const statusColor =
                    status === "paid"
                      ? "bg-green-100 text-green-700"
                      : status === "pending"
                      ? "bg-yellow-100 text-yellow-700"
                      : "bg-gray-200 text-gray-700"
                  ;

                  const proformaInvoices = allInvoices.filter((inv) => inv.status === "pending");
                  const proformaInvoice = proformaInvoices.find((inv) => 
                    inv.proformaNumber === invoice.proformaNumber &&
                    inv.totalAmount === invoice.totalAmount
                  );

                  const payments = paymentHistoryMap.get(invoice.id);

                  return (
                    <tr
                      key={invoice.id}
                      className="border-b last:border-0 hover:bg-blue-50 transition-all"
                    >
                      <td className="p-4 border-r text-center">
                        <div className="flex flex-col items-center">
                          <span className="font-semibold text-gray-900">{businessName}</span>
                          <span className="text-xs text-gray-500 mt-1">
                            {businessLocation}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 border-r text-center max-w-36">
                        <div className="flex flex-col items-center">
                          <span className="font-medium text-gray-900">{storeName}</span>
                          <span className="text-xs text-gray-500 mt-1">
                            {storeAddress}
                          </span>
                        </div>
                      </td>
                      <td className="p-4 border-r text-center text-blue-700 font-semibold">
                        <div className="flex flex-col gap-1">
                          <p>{proformaNumber}</p>
                          <Link
                            href={`/invoice/${invoice.restaurant.id}/specific/${proformaInvoice.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="
                              inline-flex items-center justify-center gap-1 px-2 py-1 rounded
                              bg-blue-500 text-white text-[10px] font-medium
                              hover:bg-blue-600 shadow-sm hover:shadow transition-all
                            "
                          >
                            Invoice →
                          </Link>
                          <Link
                            href={`/invoice/${invoice.restaurant.id}/specific/${proformaInvoice.id}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="
                              inline-flex items-center justify-center gap-1 px-2 py-1 rounded
                              bg-blue-500 text-white text-[10px] font-medium
                              hover:bg-blue-600 shadow-sm hover:shadow transition-all
                            "
                          >
                            Download Invoice
                          </Link>
                        </div>
                      </td>
                      <td className="p-4 border-r text-center text-sm">
                        {dueDate}
                      </td>
                      <td className="p-4 border-r text-center font-semibold text-gray-900">
                        {totalAmount}
                      </td>
                      <td className="p-4 border-r text-center">
                        <div className="flex flex-col gap-2">
                          {payments && payments.length > 0 ? (
                            payments.map((invoice) => {
                              const paymentDate = new Date(invoice?.paymentDate).toLocaleDateString("en-IN") || "—";
                              return (
                                <div key={invoice.id} className="bg-gray-50 border border-gray-300 rounded-lg p-2 text-left text-xs space-y-1 shadow-sm">
                                  <div className="flex justify-between">
                                    <span className="font-semibold text-gray-700">
                                      Paid: {invoice?.partialAmount ?? 0}/-
                                    </span>
                                    <span className="text-gray-500">
                                      {paymentDate}
                                    </span>
                                  </div>
                                  
                                  <div className="flex justify-between">
                                    <span className="font-medium text-red-700">
                                      Due: {invoice?.remainingAmount ?? 0}/-
                                    </span>
                                  </div>
          
                                  {/* Notes */}
                                  {invoice?.paymentNotes && (
                                    <div className="text-gray-600 italic">
                                      {invoice?.paymentNotes}
                                    </div>
                                  )}
          
                                  {/* Document */}
                                  <div className="flex flex-col gap-1">
                                    {invoice?.paymentFileUrl && (
                                      <Link
                                        href={invoice?.paymentFileUrl}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="text-blue-600 underline hover:text-blue-800"
                                      >
                                        📄 View Receipt
                                      </Link>
                                    )}
                                    <Link
                                      href={`/invoice/${invoice?.restaurant?.id}/specific/${invoice?.id}`}
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
                              );                      
                            })                      
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </div>
                      </td>
                      <td className="p-4 border-r text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                          {status}
                        </span>
                      </td>
                      <td className="p-4 text-center">
                        <button
                          onClick={() => {
                            setCurrentInvoice(invoice);
                            setCurrentRestaurant(invoice.restaurant)
                            setUpdatePayment(true)
                          }}
                          className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
                        >
                          Update Payment
                        </button>
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="p-6 text-center text-gray-500 italic">
                    No paid invoices found.
                  </td>
                </tr>
              )}
            </tbody>
          )}
        </table>
      </div>
      
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
                      currentInvoice?.status === "paid"
                        ? "bg-green-50 text-green-600"
                        : currentRestaurant?.invoices?.at(-1)?.status === "partially paid"
                        ? "bg-yellow-50 text-yellow-600"
                        : "bg-red-50 text-red-600"
                    }`}
                  >
                    {currentInvoice?.status || "pending"}
                  </span>
                </div>

                {/* Info Rows */}
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex flex-col">
                    <span className="text-gray-500">Restaurant</span>
                    <span className="text-gray-900 font-medium">
                      {currentRestaurant?.name || "—"}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-gray-500">Pricing Plan</span>
                    <span className="text-gray-900 font-medium">
                      {currentInvoice?.pricingPlan?.planName || "—"}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-gray-500">Total Amount</span>
                    <span className="text-gray-900 font-semibold">
                      {currentInvoice?.totalAmount?.toLocaleString() ?? "0"}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-gray-500">Paid Amount</span>
                    <span className="text-green-700 font-semibold">
                      {currentInvoice?.paidAmount?.toLocaleString() ?? "0"}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-gray-500">Remaining</span>
                    <span className="text-red-600 font-bold">
                      {currentInvoice?.remainingAmount?.toLocaleString() ?? "0"}
                    </span>
                  </div>

                  <div className="flex flex-col">
                    <span className="text-gray-500">Due Date</span>
                    <span className="text-gray-900 font-medium text-xs">
                      {currentInvoice?.dueDate?.slice(0, 10) || "—"}
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
                    setCurrentRestaurant(null);
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
    </div>
  );
}