import fastify, { FastifyInstance } from "fastify";
import { assignPlanService } from "../services/assign-plan";
import { createInvoiceService } from "../services/create-invoice";

export default async function AutoGenerates(fastify: FastifyInstance) {
  fastify.post("/", async (req, reply) => {
    
    // Dealing with Invoices
    const invoices = await fastify.prisma.invoice.findMany({
      where: {
        invoiceNumber: null
      },
      include: {
        restaurant: {
          include: {
            restaurantPricingPlans: true
          }
        },
        pricingPlan: true,
      }
    });

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // Uncomment & change this data just for the checking purposes
    // const today = new Date("2027-3-01");
    // today.setHours(0, 0, 0, 0);

    function addMonths(date: Date, months: number) {
      const d = new Date(date);
      d.setMonth(d.getMonth() + months);
      return d;
    }

    for (const inv of invoices) {
      const oldStartDate = inv.restaurant.restaurantPricingPlans[0].startDate;
      oldStartDate.setHours(0, 0, 0, 0);

      let duration = 0;

      if (inv.customDuration) {
        duration = Number(inv.customDuration)
      } else {
        if (inv.pricingPlan.planType === "fixed") {
          duration = Number(inv.pricingPlan.billingCycle)
        } else {
          duration = Number(inv.pricingPlan.validity)
        }
      }

      const expiryDate = addMonths(oldStartDate, duration);
      const triggerDate = new Date(expiryDate);
      triggerDate.setDate(triggerDate.getDate() - 14);
      triggerDate.setHours(0, 0, 0, 0);

      // For Assigning Plan
      const restaurantId = Number(inv.restaurantId);
      const pricingPlanId = Number(inv.pricingPlanId);
      const CGST = inv.restaurant.restaurantPricingPlans[0].cgst;
      const IGST = inv.restaurant.restaurantPricingPlans[0].igst;
      const SGST = inv.restaurant.restaurantPricingPlans[0].sgst;
      const LUT = inv.restaurant.restaurantPricingPlans[0].addLut;
      const startDate = new Date(new Date(expiryDate).setDate(new Date(expiryDate).getDate() + 1));
      const planMode = inv.restaurant.restaurantPricingPlans[0].planMode;
      const trialDays = inv.restaurant.restaurantPricingPlans[0].trialDays;
      const newInvoiceCreation = true;

      // To Create an Invoice
      const displayDate = startDate;
      const customDuration = duration;
      const subTotal = Number(inv.subTotalAmount);
      const totalAmount = Number(inv.totalAmount);
      const discountAmount = Number(inv.discountAmount);

      if (today.getTime() >= triggerDate.getTime()) {
        if (!inv.customDuration) {
          await assignPlanService({
            prisma: fastify.prisma,
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
          })
          console.log("✅ Plan assigned for restaurant:", restaurantId);
        } else {
          await createInvoiceService({
            prisma: fastify.prisma,
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
          })
          console.log("✅ Invoice created for restaurant:", restaurantId);
        }
      }
  
    }
    
    return invoices;

  });
}