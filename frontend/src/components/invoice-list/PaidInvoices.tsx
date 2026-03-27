"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

interface Restaurant {
  id: string;
  name: string;
  invoices: any[];
  location: string;
  address: string;
  brand: {
    business: {
      name: string;
      location: string;
      address: string;
    };
  };
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
  latestPaidInvoices: any[];
}

export default function PaidInvoices({ allInvoices, latestPaidInvoices }: Props) {

  const [searchText, setSearchText] = useState("");
  const [searchField, setSearchField] = useState<SearchField>("proformaNumber");
  const [dateField, setDateField] = useState<"proformaDate" | "invoiceDate">("proformaDate");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [dateWiseInvoices, setDateWiseInvoices] = useState<Invoice[]>([]);
  const [searchedInvoices, setSearchedInvoices] = useState<Invoice[]>([]);
  const [dateWise, setDateWise] = useState(false);

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

  function getLatestPaidInvoices(groups: Record<string, any[]>) {
    return Object.values(groups)
      .map((list) =>
        list.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
        )[0]
      )
      .filter((inv) => inv.status === "paid" || inv.status === "partially paid");
  }

  const proformaGroups = groupInvoicesByProforma(allInvoices);
  const latestPaidInvs = getLatestPaidInvoices(proformaGroups);

  const paymentHistoryMap = new Map(
    latestPaidInvoices.map((latestInv) => {
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

  // // 🔍 Search logic
  // const searchedInvoices = useMemo(() => {
  //   if (!searchText.trim()) return latestPaidInvoices;
    
  //   const text = searchText.toLowerCase();
  //   setDateWise(false);
  
  //   return latestPaidInvoices.filter((inv: any) => {
      
  //     const match = (field: SearchField) => inv[field]?.toString().toLowerCase().includes(text);
  
  //     switch (searchField) {
  //       case "proformaNumber":
  //         return match("proformaNumber");
  //       case "invoiceNumber":
  //         return match("invoiceNumber");
  //       case "storeName":
  //         return inv.restaurant?.name?.toLowerCase().includes(text);
  //       case "businessName":
  //         return inv.restaurant?.brand?.business?.name
  //           ?.toLowerCase()
  //           .includes(text);
  //       default:
  //         return (
  //           match("invoiceNumber") ||
  //           match("proformaNumber") ||
  //           inv.restaurant?.name?.toLowerCase().includes(text) ||
  //           inv.restaurant?.brand?.business?.name?.toLowerCase().includes(text)
  //         );
  //     }
  //   });
  // }, [searchText, searchField, latestPaidInvoices]);

  useEffect(() => {
    if (!searchText.trim()) {
      setSearchedInvoices(latestPaidInvs);
      setDateWise(false);    // 🔥 switching off date mode when search is reset
      return;
    }
  
    const text = searchText.toLowerCase();
    setDateWise(false);      // 🔥 searching always disables date-wise filtering
  
    const results = latestPaidInvs.filter((inv: Invoice) => {
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
  }, [searchText, searchField, latestPaidInvoices]);

  function applyDateFilter() {
    if (!fromDate && !toDate) return;
  
    setSearchText("");
    setDateWise(true);
  
    // Normalize bounds (start of fromDate, end of toDate) so "to" is inclusive
    const from = fromDate ? new Date(fromDate) : null;
    if (from) { from.setHours(0,0,0,0); }
    const to = toDate ? new Date(toDate) : null;
    if (to) { to.setHours(23,59,59,999); }
  
    const results = latestPaidInvs.filter(inv => {
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
              <th className="p-4 border-r text-center font-semibold">Invoice Number</th>
              <th className="p-4 border-r text-center font-semibold">Due Date</th>
              <th className="p-4 border-r text-center font-semibold">Total Amount</th>
              <th className="p-4 border-r text-center font-semibold">Payment Docs</th>
              <th className="p-4 border-r text-center font-semibold">Status</th>
            </tr>
          </thead>
          {!dateWise ? (
            <tbody className="text-gray-800">
              {searchedInvoices?.length > 0 ? (
                searchedInvoices.map((invoice: Invoice) => {
                  const businessName =
                    invoice?.restaurant?.brand?.business?.name ?? "N/A";
                  const businessLocation =
                    invoice?.restaurant?.brand?.business?.location ?? "N/A";
                  const storeName = invoice?.restaurant?.name ?? "N/A";
                  const storeAddress = invoice?.restaurant?.address ?? "N/A";
                  const proformaNumber = invoice?.proformaNumber ?? "N/A";
                  const invoiceNumber = invoice?.invoiceNumber ?? "N/A";
                  const totalAmount =
                    typeof invoice?.totalAmount === "number"
                      ? invoice.totalAmount.toLocaleString("en-IN")
                      : invoice?.totalAmount ?? "N/A";
                  const dueDate = invoice?.dueDate
                    ? new Date(invoice.dueDate).toLocaleDateString("en-IN")
                    : "N/A";
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
                            Proforma Invoice →
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
                            Download
                          </Link>
                        </div>
                      </td>
                      <td className="p-4 border-r text-center text-blue-700 font-semibold">
                        <div className="flex flex-col gap-1">
                          <p>{invoiceNumber}</p>
                          <Link
                            href={`/invoice/${invoice.restaurant.id}/specific/${invoice.id}`}
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
                            href={`/invoice/${invoice.restaurant.id}/specific/${invoice.id}`}
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
                      <td className="p-4 border-r text-center flex flex-col gap-2">
                        {payments?.map((invoice) => {
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
                        })}
                      </td>
                      <td className="p-4 border-r text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                          {status}
                        </span>
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
                dateWiseInvoices.map((invoice: Invoice) => {
                  const businessName =
                    invoice?.restaurant?.brand?.business?.name ?? "N/A";
                  const businessLocation =
                    invoice?.restaurant?.brand?.business?.location ?? "N/A";
                  const storeName = invoice?.restaurant?.name ?? "N/A";
                  const storeAddress = invoice?.restaurant?.address ?? "N/A";
                  const proformaNumber = invoice?.proformaNumber ?? "N/A";
                  const invoiceNumber = invoice?.invoiceNumber ?? "N/A";
                  const totalAmount =
                    typeof invoice?.totalAmount === "number"
                      ? invoice.totalAmount.toLocaleString("en-IN")
                      : invoice?.totalAmount ?? "N/A";
                  const dueDate = invoice?.dueDate
                    ? new Date(invoice.dueDate).toLocaleDateString("en-IN")
                    : "N/A";
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
                            Proforma Invoice →
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
                            Download
                          </Link>
                        </div>
                      </td>
                      <td className="p-4 border-r text-center text-blue-700 font-semibold">
                        <div className="flex flex-col gap-1">
                          <p>{invoiceNumber}</p>
                          <Link
                            href={`/invoice/${invoice.restaurant.id}/specific/${invoice.id}`}
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
                            href={`/invoice/${invoice.restaurant.id}/specific/${invoice.id}`}
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
                      <td className="p-4 border-r text-center flex flex-col gap-2">
                        {payments?.map((invoice) => {
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
                        })}
                      </td>
                      <td className="p-4 border-r text-center">
                        <span className={`px-3 py-1 rounded-full text-xs font-semibold ${statusColor}`}>
                          {status}
                        </span>
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
    </div>
  );
}