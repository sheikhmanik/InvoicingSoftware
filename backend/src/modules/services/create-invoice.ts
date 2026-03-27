import { PrismaClient } from "@prisma/client";

type CreateInvoiceInput = {
  prisma: PrismaClient;
  restaurantId: number;
  pricingPlanId: number;
  CGST: boolean;
  SGST: boolean;
  IGST: boolean;
  LUT: boolean;
  planMode: string;
  customDuration?: number | null;
  displayDate?: Date | null;
  subTotal: number;
  totalAmount: number;
  discountAmount?: number | null;
};

export async function createInvoiceService({
  prisma,
  restaurantId,
  pricingPlanId,
  CGST,
  SGST,
  IGST,
  LUT,
  planMode,
  customDuration,
  displayDate,
  subTotal,
  totalAmount,
  discountAmount,
}: CreateInvoiceInput) {

  const restaurantExists = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });
  if (!restaurantExists) {
    throw new Error("Restaurant not found");
  }

  const planExists = await prisma.pricingPlan.findUnique({
    where: { id: pricingPlanId },
  });
  if (!planExists) {
    throw new Error("Plan doesn't exist");
  }

  // Assign pricing plan (new duration-based plan)
  await prisma.restaurantPricingPlan.deleteMany({
    where: { restaurantId: Number(restaurantId) },
  });
  const savedPlan = await prisma.restaurantPricingPlan.create({
    data: {
      restaurantId,
      pricingPlanId,
      cgst: CGST,
      sgst: SGST,
      igst: IGST,
      addLut: LUT,
      startDate: new Date(),
      planMode,
      customDuration,
    },
  });

  // Due date = 10 days from now
  const dueDate = new Date();
  dueDate.setDate(dueDate.getDate() + 10);

  // -------------------------
  // PROFORMA NUMBER
  // -------------------------

  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const lastProforma = await prisma.invoice.findFirst({
    where: {
      proformaNumber: {
        startsWith: `E/PI/${year}/${month}/`,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  let seq = 1;
  if (lastProforma?.proformaNumber) {
    const last = Number(lastProforma.proformaNumber.split("/").pop());
    if (!isNaN(last)) seq = last + 1;
  }

  const proformaNumber = `E/PI/${year}/${month}/${String(seq).padStart(4, "0")}`;

  // -------------------------
  // CREATE INVOICE
  // -------------------------

  const invoice = await prisma.invoice.create({
    data: {
      subTotalAmount: subTotal,
      totalAmount,
      remainingAmount: totalAmount,
      dueDate,
      proformaNumber,
      status: "pending",
      customDuration,
      displayDate: displayDate ?? null,
      restaurantId,
      pricingPlanId,
      discountAmount: discountAmount || 0,
    },
  });

  return {
    savedPlan,
    invoice,
  };
}