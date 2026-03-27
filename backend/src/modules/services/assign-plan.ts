import { PrismaClient } from "@prisma/client";

type AssignPlanInput = {
  prisma: PrismaClient;
  restaurantId: number;
  pricingPlanId: number;
  CGST: boolean;
  SGST: boolean;
  IGST: boolean;
  LUT: boolean;
  startDate: Date;
  planMode: string;
  trialDays?: number | null;
  newInvoiceCreation?: boolean;
};

export async function assignPlanService({
  prisma,
  restaurantId,
  pricingPlanId,
  CGST,
  SGST,
  IGST,
  LUT,
  startDate,
  planMode,
  trialDays,
  newInvoiceCreation,
}: AssignPlanInput) {

  const restaurantExists = await prisma.restaurant.findUnique({
    where: { id: restaurantId },
  });
  if (!restaurantExists) {
    throw new Error("Restaurant not found");
  }

  const latestInvoice = await prisma.invoice.findFirst({
    where: { restaurantId },
    orderBy: { createdAt: "desc" },
  });

  const planExists = await prisma.pricingPlan.findUnique({
    where: { id: pricingPlanId },
  });
  if (!planExists) {
    throw new Error("Plan doesn't exist");
  }

  // Assign / update plan
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
      startDate,
      planMode,
      trialDays,
    },
  });

  // const savedPlan = await prisma.restaurantPricingPlan.upsert({
  //   where: {
  //     restaurantId_pricingPlanId: {
  //       restaurantId: Number(restaurantId),
  //       pricingPlanId: Number(pricingPlanId),
  //     },
  //   },
  //   update: {
  //     cgst: Boolean(CGST),
  //     sgst: Boolean(SGST),
  //     igst: Boolean(IGST),
  //     addLut: Boolean(LUT),
  //     startDate: new Date(startDate),
  //     planMode: planMode,
  //     trialDays: trialDays,
  //   },
  //   create: {
  //     restaurantId: Number(restaurantId),
  //     pricingPlanId: Number(pricingPlanId),
  //     cgst: Boolean(CGST),
  //     sgst: Boolean(SGST),
  //     igst: Boolean(IGST),
  //     addLut: Boolean(LUT),
  //     startDate: new Date(startDate),
  //     planMode: planMode,
  //     trialDays: trialDays,
  //   },
  // });

  // ---------------- TAX + INVOICE ----------------

  const base =
    planExists.planType === "fixed"
      ? Number(planExists.fixedPrice)
      : Number(planExists.basePrice);

  const cgstAmount = CGST ? base * 0.09 : 0;
  const sgstAmount = SGST ? base * 0.09 : 0;
  const igstAmount = IGST ? base * 0.18 : 0;

  const totalAmount = base + cgstAmount + sgstAmount + igstAmount;

  const dueDate = new Date(startDate);
  dueDate.setDate(dueDate.getDate() + 10);

  // Proforma number
  const now = new Date();
  const year = now.getFullYear().toString().slice(-2);
  const month = String(now.getMonth() + 1).padStart(2, "0");

  const lastProforma = await prisma.invoice.findFirst({
    where: { proformaNumber: { startsWith: `E/PI/${year}/${month}/` } },
    orderBy: { createdAt: "desc" },
  });

  let seq = 1;
  if (lastProforma?.proformaNumber) {
    const last = Number(lastProforma.proformaNumber.split("/").pop());
    if (!isNaN(last)) seq = last + 1;
  }

  const proformaNumber = `E/PI/${year}/${month}/${String(seq).padStart(4, "0")}`;

  const subTotalAmount = base;

  const invoice = await prisma.invoice.create({
    data: {
      subTotalAmount,
      totalAmount,
      remainingAmount: totalAmount,
      dueDate,
      proformaNumber:
        newInvoiceCreation === false
          ? latestInvoice?.proformaNumber ?? proformaNumber
          : proformaNumber,
      status: "pending",
      restaurantId,
      pricingPlanId,
    },
  });

  return { savedPlan, invoice };
}