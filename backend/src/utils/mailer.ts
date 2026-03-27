// import nodemailer from "nodemailer";

// export const mailer = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// export async function sendEmail(
//   to: string,
//   invoiceNumber: string,
//   totalAmount: number,
//   restaurant: any,
//   createdInvoice: any
// ) {
//   const mailOptions = {
//     from: `"Fuvii Billing" <${process.env.EMAIL_USER}>`,
//     to,
//     subject: `Proforma Invoice — ${invoiceNumber}`,
//     html: `
//       <h2>Thank you for choosing Fuvii! 🎉</h2>
//       <p>Your subscription invoice has been generated.</p>
//       <p><strong>Invoice No:</strong> ${invoiceNumber}</p>
//       <p><strong>Total:</strong> ₹${totalAmount}.00/-</p>
//       <br/>
//       <p>Please log in to your dashboard for details.</p>
//       <hr/>
//       <small>This is an automated email — do not reply.</small>
//     `
//   };

//   return mailer.sendMail(mailOptions);
// }


// import nodemailer from "nodemailer";
// import * as pdf from "html-pdf-node";
// import { generateFullInvoiceHTML } from "../templates/invoiceTemplate"; // <-- new template file

// export const mailer = nodemailer.createTransport({
//   service: "gmail",
//   auth: {
//     user: process.env.EMAIL_USER,
//     pass: process.env.EMAIL_PASS,
//   },
// });

// export async function sendEmail(
//   to: string,
//   invoiceNumber: string,
//   totalAmount: number,
//   restaurant: any,
//   createdInvoice: any,
//   pricingPlan: any
// ) {
//   // Generate full HTML from template function
//   const html = generateFullInvoiceHTML(restaurant, createdInvoice, pricingPlan);

//   // Convert HTML to PDF
//   const pdfBuffer = await pdf.generatePdf({ content: html }, { format: "A4" });

//   const mailOptions = {
//     from: `"Fuvii Billing" <${process.env.EMAIL_USER}>`,
//     to,
//     subject: `Invoice — ${invoiceNumber}`,
//     html, // full invoice HTML goes inside email body 👌
//     attachments: [
//       {
//         filename: `Invoice-${invoiceNumber}.pdf`,
//         content: pdfBuffer,
//       }
//     ]
//   };

//   return mailer.sendMail(mailOptions);
// }