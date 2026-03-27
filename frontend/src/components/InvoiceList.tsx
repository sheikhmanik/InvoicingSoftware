import axios from "axios";
import { useEffect, useState } from "react";
import UnpaidInvoices from "./invoice-list/UnpaidInvoices";
import PaidInvoices from "./invoice-list/PaidInvoices";

const API = process.env.NEXT_PUBLIC_API_URL;

export default function InvoiceList() {

  const [hydrated, setHydrated] = useState(false);

  const [display, setDisplay] = useState<"paid" | "unpaid">(() => {
    const saved = localStorage.getItem("customerView");
    if (saved === "paid" || saved === "unpaid") {
      return saved;
    }
    return "unpaid";
  });

  const [restaurants, setRestaurants] = useState<any[]>([]);
  const [allInvoices, setAllInvoices] = useState<any[]>([]);
  const [paidCustomers, setPaidCustomers] = useState<any[]>([]);
  const [unpaidCustomers, setUnpaidCustomers] = useState<any[]>([]);

  useEffect(() => {
    axios.get(`${API}/invoices`).then((res: any) => {
      console.log("Invoices:", res.data);
      const paid = res.data?.filter((inv: any) => inv.status === "paid" || inv.status === "partially paid");
      const unpaid = res.data?.filter((inv: any) => inv.status === "pending");
      if (res.data) setAllInvoices(res.data);
      if (paid) setPaidCustomers(paid);
      if (unpaid) setUnpaidCustomers(unpaid);
    })
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem("customerView");
    if (saved === "paid" || saved === "unpaid") {
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

  return (
    <div className="p-4 space-y-5">
      <div className="flex items-center justify-center">
        <button
          className={`flex-1 flex items-center justify-center py-2 ${display === "unpaid" ? "bg-blue-700 text-white font-semibold" : "bg-gray-200 text-black"} `}
          onClick={() => setDisplay("unpaid")}
        >Unpaid Invoices</button>
        <button
          className={`flex-1 flex items-center justify-center py-2 ${display === "paid" ? "bg-blue-700 text-white font-semibold" : "bg-gray-200 text-black"} `}
          onClick={() => setDisplay("paid")}
        >Paid Invoices</button>
      </div>
      {display === "unpaid" ? (
        <UnpaidInvoices allInvoices={allInvoices} latestUnpaidInvoices={unpaidCustomers} />
      ) : (
        <PaidInvoices allInvoices={allInvoices} latestPaidInvoices={paidCustomers} />
      )}
    </div>
  );
}