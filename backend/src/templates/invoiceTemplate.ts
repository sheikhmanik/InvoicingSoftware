export function generateFullInvoiceHTML(
  restaurant: any,
  invoice: any,
  pricingPlan: any
) {
  const createdDate = new Date(pricingPlan.createdAt);
  const endDate = new Date(createdDate);
  endDate.setMonth(endDate.getMonth() + pricingPlan.validity);

  const formatDate = (date: Date) =>
    date.toLocaleDateString("en-GB", {
      month: "long",
      year: "numeric",
    });

  const subscriptionPeriod = `${formatDate(createdDate)} — ${formatDate(endDate)}`;

  const subTotalAmount = Math.ceil(invoice.subTotalAmount);
  const totalAmount = Math.ceil(invoice.totalAmount);

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

  const amountInWords = `${numberToWords(totalAmount)} only`;

  return `
    <html>
    <head>
      <style>
        body { font-family: Arial, sans-serif; font-size: 13px; background:#fff; color: #333; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { border: 1px solid #ddd; padding: 6px; }
        th { background: #f4f4f4; font-weight: bold; }
        .right { text-align: right; }
        .center { text-align: center; }
        .bg-success { background: #e8f5e9; }
        .bg-danger { background: #ffebee; }
        .footer { font-size: 11px; color: gray; margin-top: 30px; }
      </style>
    </head>

    <body>

      <!-- Header -->
      <div style="text-align:right;">
        <img src="${process.env.LOGO_URL}" height="60" />
      </div>

      <h3 style="font-size:18px;font-weight:bold;margin-top:5px;">Edlar Business Services Private Limited</h3>
      <p>No 34, Marutham Street, Fathima Nagar,<br/>
        Valasaravakkam, Chennai - 600087.<br/>
        Phone: 044-4286 1687 | Email: info@possier.com<br/>
        www.possier.com
      </p>

      <hr style="margin:10px 0;"/>

      <h2 style="font-size:20px;font-weight:bold;margin:10px 0;">
        ${invoice.status === "pending" ? "Proforma Invoice" : "Tax Invoice"}
      </h2>

      <p>Date: ${new Date().toLocaleDateString("en-GB")}</p>
      <p><strong>Invoice No:</strong> ${invoice.invoiceNumber}</p>
      <p><strong>GSTIN:</strong> 33AADCE1170H2Z2</p>
      <p><strong>PAN:</strong> AADCE1170H</p>

      <br/>

      <p><strong>Bill To:</strong><br/>
        ${restaurant.brand.business.name}<br/>
        ${restaurant.brand.business.address}
      </p>

      <table>
        <thead>
          <tr>
            <th>Item</th>
            <th>Description</th>
            <th class="right">Unit Cost</th>
            <th class="right">Amount</th>
          </tr>
        </thead>

        <tbody>
          <tr>
            <td>Possier POS</td>
            <td>
              ${restaurant.name}<br/>
              ${pricingPlan.validity} Month(s) Subscription<br/>
              Subscription Period:<br/>
              ${subscriptionPeriod}
            </td>
            <td class="right">₹${subTotalAmount}.00/-</td>
            <td class="right">₹${subTotalAmount}.00/-</td>
          </tr>

          <tr>
            <td colspan="3" class="right"><strong>Subtotal</strong></td>
            <td class="right">₹${subTotalAmount}.00/-</td>
          </tr>

          ${restaurant.restaurantPricingPlans[0].cgst ? `
          <tr><td colspan="3" class="right">CGST (9%)</td><td class="right">₹${(subTotalAmount * 0.09).toFixed(0)}.00/-</td></tr>` : ""}

          ${restaurant.restaurantPricingPlans[0].sgst ? `
          <tr><td colspan="3" class="right">SGST (9%)</td><td class="right">₹${(subTotalAmount * 0.09).toFixed(0)}.00/-</td></tr>` : ""}

          ${restaurant.restaurantPricingPlans[0].igst ? `
          <tr><td colspan="3" class="right">IGST (18%)</td><td class="right">₹${(subTotalAmount * 0.18).toFixed(0)}.00/-</td></tr>` : ""}

          <tr style="font-weight:bold;">
            <td colspan="3" class="right">Total — ${amountInWords}</td>
            <td class="right">₹${totalAmount}.00/-</td>
          </tr>

          ${restaurant.invoices
            .filter((inv:any) => inv.status === "partially paid")
            .map(
              (inv:any) => `
              <tr class="bg-success">
                <td colspan="3" class="right">Partially Paid — ${formatDate(inv.paymentDate)}</td>
                <td class="right">₹${inv.partialAmount}.00/-</td>
              </tr>`
            ).join("")}

          <tr class="bg-danger">
            <td colspan="3" class="right">Remaining Amount Due</td>
            <td class="right">₹${Math.max(invoice.remainingAmount ?? totalAmount, 0)}.00/-</td>
          </tr>

        </tbody>
      </table>

      <br/>

      <p><strong>UPI ID:</strong> 9176655717@okbizaxis</p>
      <img src="${process.env.QR_URL}" height="160" style="margin:10px auto;display:block;"/>

      <br/>

      <p><strong>For Edlar Business Services Private Limited</strong></p>
      <img src="${process.env.SIGNATURE_URL}" height="55" />

      <p class="footer">
        This is a system generated invoice. If you have any questions contact support.
      </p>

    </body>
    </html>
  `;
}