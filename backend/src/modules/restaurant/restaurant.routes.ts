import { FastifyInstance } from "fastify";

export default async function restaurantRoutes(fastify: FastifyInstance) {
  
  fastify.post("/", async (req, reply) => {
    const {
      name,
      address,
      location,
      GSTIN,
      FSSAI,
      PrimaryContactName,
      PrimaryContactPhone,
      brandId,
    } = req.body as any;

    try {
      const restaurant = await fastify.prisma.restaurant.create({
        data: {
          name,
          address,
          location,
          GSTIN,
          FSSAI,
          PrimaryContactName,
          PrimaryContactPhone,
          brandId: Number(brandId),
        },
      });

      return reply.send({ message: "Restaurant created", restaurant });
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Failed to create restaurant" });
    }
  });

  fastify.post("/assign-plan", async (req, reply) => {
    const {
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
    } = req.body as any;

    const restaurantExists = await fastify.prisma.restaurant.findUnique({
      where: { id: Number(restaurantId) }
    });
    if (!restaurantExists) return reply.send({ message: "Restaurant not found!" });
    
    const latestInvoice = await fastify.prisma.invoice.findFirst({
      where: { restaurantId: Number(restaurantId) },
      orderBy: { createdAt: "desc" },
    })
    if (latestInvoice && (latestInvoice.remainingAmount ?? 0) > 0 && latestInvoice.status !== "paid") {
      return reply.code(400).send({ message: "Restaurant has a remaining amount. Cannot reassign plan!" });
    }

    const planExists = await fastify.prisma.pricingPlan.findUnique({
      where: { id: Number(pricingPlanId) }
    });
    if (!planExists) return reply.send({ message: "Plan doesn't exist!" });
    
    try {
      // await fastify.prisma.restaurantPricingPlan.deleteMany({
      //   where: { restaurantId: Number(restaurantId) },
      // });
      const saved = await fastify.prisma.restaurantPricingPlan.upsert({
        where: {
          restaurantId_pricingPlanId: {
            restaurantId: Number(restaurantId),
            pricingPlanId: Number(pricingPlanId),
          },
        },
        update: {
          cgst: Boolean(CGST),
          sgst: Boolean(SGST),
          igst: Boolean(IGST),
          addLut: Boolean(LUT),
          startDate: new Date(startDate),
          planMode: planMode,
          trialDays: trialDays,
        },
        create: {
          restaurantId: Number(restaurantId),
          pricingPlanId: Number(pricingPlanId),
          cgst: Boolean(CGST),
          sgst: Boolean(SGST),
          igst: Boolean(IGST),
          addLut: Boolean(LUT),
          startDate: new Date(startDate),
          planMode: planMode,
          trialDays: trialDays,
        },
      });

      const base = Number(planExists.planType === "fixed" ? planExists.fixedPrice : planExists.basePrice);

      // TAX calculations
      const cgstAmount = CGST ? base * 0.09 : 0;
      const sgstAmount = SGST ? base * 0.09 : 0;
      const igstAmount = IGST ? base * 0.18 : 0;

      // FINAL total
      const totalAmount = base + cgstAmount + sgstAmount + igstAmount;

      // due date = 10 days from startDate
      const dueDate = new Date(startDate);
      dueDate.setDate(dueDate.getDate() + 10);

      // -------------------------
      //  PROFORMA NUMBER GENERATION
      // -------------------------

      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);             // e.g. "25"
      const month = String(now.getMonth() + 1).padStart(2, "0");       // e.g. "11"

      // 1) Generate Proforma Number: E/PI/YY/MM/0001
      const lastProforma = await fastify.prisma.invoice.findFirst({
        where: {
          proformaNumber: {
            startsWith: `E/PI/${year}/${month}/`,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      let proformaSeq = 1;
      if (lastProforma?.proformaNumber) {
        const lastPart = lastProforma.proformaNumber.split("/").pop() || "0";
        const parsed = Number(lastPart);
        proformaSeq = Number.isFinite(parsed) ? parsed + 1 : 1;
      }
      const proformaSeqPadded = String(proformaSeq).padStart(4, "0");
      const proformaNumber = `E/PI/${year}/${month}/${proformaSeqPadded}`;

      // -------------------------
      //  CREATE INVOICE ENTRY (Only Proforma)
      // -------------------------

      const subTotalAmount =
        planExists.planType === "fixed"
          ? Number(planExists.fixedPrice)
          : Number(planExists.basePrice);

      const createdInvoice = await fastify.prisma.invoice.create({
        data: {
          subTotalAmount,
          totalAmount,
          remainingAmount: totalAmount,
          dueDate,
          proformaNumber: newInvoiceCreation === "yes" ? proformaNumber : latestInvoice?.proformaNumber || proformaNumber,
          status: "pending",
          restaurant: { connect: { id: Number(restaurantId) } },
          pricingPlan: { connect: { id: Number(pricingPlanId) } },
        }
      });

      const restaurant = await fastify.prisma.restaurant.findUnique({
        where: { id: Number(restaurantId) },
        include: {
          brand: { include: { business: true } },
          invoices: true,
          restaurantPricingPlans: {
            include: { pricingPlan: true }
          }
        }
      });
      // const businessEmail = restaurant?.brand?.business?.PrimaryContactEmail;
      // if (businessEmail) {
      //   await sendEmail(
      //     businessEmail,
      //     createdInvoice.invoiceNumber as string,
      //     createdInvoice.totalAmount,
      //     restaurant,
      //     createdInvoice,
      //     planExists,
      //   );
      //   console.log("📧 Email sent to:", businessEmail);
      // }

      return reply.send({
        message: "Plan updated successfully — Email Sent!",
        saved,
        invoice: createdInvoice,
      });

    } catch (err) {
      console.error("Error mapping plan:", err);
      return reply.code(500).send({ error: "Failed to assign plan" });
    }
  });

  fastify.post("/create-invoice", async (req, reply) => {
    const {
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
    } = req.body as any;

    const restaurantExists = await fastify.prisma.restaurant.findUnique({
      where: { id: Number(restaurantId) }
    });
    if (!restaurantExists) return reply.send({ message: "Restaurant not found!" });

    const planExists = await fastify.prisma.pricingPlan.findUnique({
      where: { id: Number(pricingPlanId) }
    });
    if (!planExists) return reply.send({ message: "Plan doesn't exist!" });
    
    try {
      await fastify.prisma.restaurantPricingPlan.deleteMany({
        where: { restaurantId: Number(restaurantId) },
      });
      const saved = await fastify.prisma.restaurantPricingPlan.create({
        data: {
          restaurantId: Number(restaurantId),
          pricingPlanId: Number(pricingPlanId),
          cgst: Boolean(CGST),
          sgst: Boolean(SGST),
          igst: Boolean(IGST),
          addLut: Boolean(LUT),
          startDate: new Date(),
          planMode: planMode,
          customDuration,
        },
      });

      // due date = 10 days from startDate
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 10);

      // -------------------------
      //  PROFORMA NUMBER GENERATION
      // -------------------------

      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);             // e.g. "25"
      const month = String(now.getMonth() + 1).padStart(2, "0");       // e.g. "11"

      // 1) Generate Proforma Number: E/PI/YY/MM/0001
      const lastProforma = await fastify.prisma.invoice.findFirst({
        where: {
          proformaNumber: {
            startsWith: `E/PI/${year}/${month}/`,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      let proformaSeq = 1;
      if (lastProforma?.proformaNumber) {
        const lastPart = lastProforma.proformaNumber.split("/").pop() || "0";
        const parsed = Number(lastPart);
        proformaSeq = Number.isFinite(parsed) ? parsed + 1 : 1;
      }
      const proformaSeqPadded = String(proformaSeq).padStart(4, "0");
      const proformaNumber = `E/PI/${year}/${month}/${proformaSeqPadded}`;

      // -------------------------
      //  CREATE INVOICE ENTRY (Only Proforma)
      // -------------------------

      const createdInvoice = await fastify.prisma.invoice.create({
        data: {
          subTotalAmount: subTotal,
          totalAmount,
          remainingAmount: totalAmount,
          dueDate,
          proformaNumber,
          status: "pending",
          customDuration,
          displayDate: displayDate ? new Date(displayDate) : null,
          restaurant: { connect: { id: Number(restaurantId) } },
          pricingPlan: { connect: { id: Number(pricingPlanId) } },
          discountAmount: discountAmount || 0,
        }
      });

      const restaurant = await fastify.prisma.restaurant.findUnique({
        where: { id: Number(restaurantId) },
        include: {
          brand: { include: { business: true } },
          invoices: true,
          restaurantPricingPlans: {
            include: { pricingPlan: true }
          }
        }
      });
      // const businessEmail = restaurant?.brand?.business?.PrimaryContactEmail;
      // if (businessEmail) {
      //   await sendEmail(
      //     businessEmail,
      //     createdInvoice.invoiceNumber as string,
      //     createdInvoice.totalAmount,
      //     restaurant,
      //     createdInvoice,
      //     planExists,
      //   );
      //   console.log("📧 Email sent to:", businessEmail);
      // }

      return reply.send({
        message: "Plan updated successfully — Email Sent!",
        saved,
        invoice: createdInvoice,
      });

    } catch (err) {
      console.error("Error mapping plan:", err);
      return reply.code(500).send({ error: "Failed to assign plan" });
    }
  });

  fastify.post("/update-tax-settings", async (req, reply) => {
    const {
      restaurantId,
      pricingPlanId,
      CGST,
      SGST,
      IGST,
      LUT,
      startDate,
      planMode,
      trialDays,
    } = req.body as any;

    const restaurantExists = await fastify.prisma.restaurant.findUnique({
      where: { id: Number(restaurantId) }
    });
    if (!restaurantExists) return reply.send({ message: "Restaurant not found!" });

    const planExists = await fastify.prisma.pricingPlan.findUnique({
      where: { id: Number(pricingPlanId) }
    });
    if (!planExists) return reply.send({ message: "Plan doesn't exist!" });
  
    try {
      
      const updated = await fastify.prisma.restaurantPricingPlan.update({
        where: {
          restaurantId_pricingPlanId: {
            restaurantId: Number(restaurantId),
            pricingPlanId: Number(pricingPlanId),
          },
        },
        data: {
          cgst: Boolean(CGST),
          sgst: Boolean(SGST),
          igst: Boolean(IGST),
          addLut: Boolean(LUT),
          startDate: new Date(startDate),
          planMode,
          trialDays,
        },
      });

      const base = Number(planExists.basePrice);

      const cgstAmount = CGST ? base * 0.09 : 0;
      const sgstAmount = SGST ? base * 0.09 : 0;
      const igstAmount = IGST ? base * 0.18 : 0;

      const totalAmount = base + cgstAmount + sgstAmount + igstAmount;

      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);             // e.g. "25"
      const month = String(now.getMonth() + 1).padStart(2, "0");       // e.g. "11"

      // 2) Generate Invoice Number: E/I/YY/MM/0001
      const lastInvoiceForMonth = await fastify.prisma.invoice.findFirst({
        where: {
          invoiceNumber: {
            startsWith: `E/I/${year}/${month}/`,
          },
        },
        orderBy: { createdAt: "desc" },
      });

      let invoiceSeq = 1;
      if (lastInvoiceForMonth?.invoiceNumber) {
        const lastPart = lastInvoiceForMonth.invoiceNumber.split("/").pop() || "0";
        const parsed = Number(lastPart);
        invoiceSeq = Number.isFinite(parsed) ? parsed + 1 : 1;
      }
      const invoiceSeqPadded = String(invoiceSeq).padStart(4, "0");
      const invoiceNumber = `E/I/${year}/${month}/${invoiceSeqPadded}`;

      const lastInvoice = await fastify.prisma.invoice.findFirst({
        where: { restaurantId: Number(restaurantId) },
        orderBy: { createdAt: "desc" },
      });

      if (!lastInvoice) {
        return reply.code(400).send({
          error: "Restaurant has no invoice. Assign a plan first."
        });
      }

      // Calculate old paid amount correctly
      const previousPaid = Number(lastInvoice.paidAmount ?? 0);

      // New remaining = new total - old paid
      const remainingAmount = totalAmount - previousPaid;

      const updatedStatus =
        remainingAmount <= 0
          ? "paid"
          : previousPaid > 0
          ? "partially paid"
          : "pending"
      ;

      const invoice = {
        restaurantId: Number(restaurantId),
        pricingPlanId: Number(pricingPlanId),

        subTotalAmount: base, // or previous
        totalAmount,      // NEW total after tax update

        paidAmount: previousPaid,    // Keep cumulative payments
        remainingAmount,             // NEW remaining

        dueDate: lastInvoice.dueDate,
        proformaNumber: lastInvoice.proformaNumber,
        invoiceNumber,

        status: updatedStatus,
      };

      await fastify.prisma.invoice.create({ data: invoice });
  
      return reply.send({ message: "Tax settings updated successfully.", updated, invoice });
  
    } catch (err) {
      console.error("Update Tax Settings Failed:", err);
      return reply.code(500).send({ error: "Failed to update tax settings" });
    }
  });

  fastify.post("/update-payment", async (req, reply) => {
    const {
      currentResId,
      paymentDate,
      paymentNotes,
      isPartial,
      partialAmount,
      paymentFileUrl,
      proformaNumber,
    } = req.body as any;
  
    if (!currentResId || !paymentDate) {
      return reply.code(400).send({ error: "Missing required fields" });
    }
  
    try {
      const restaurant = await fastify.prisma.restaurant.findUnique({
        where: { id: Number(currentResId) },
        include: { invoices: true }
      });
  
      if (!restaurant) {
        return reply.code(404).send({ error: "Restaurant not found" });
      }

      const invoices = await fastify.prisma.invoice.findMany({
        where: { proformaNumber }
      });
      
      const lastInvoice = invoices.sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      )[0];
  
      if (!lastInvoice) {
        return reply.code(400).send({
          error: "Restaurant has no invoice. Assign a plan first."
        });
      }
  
      const now = new Date();
      const year = now.getFullYear().toString().slice(-2);
      const month = String(now.getMonth() + 1).padStart(2, "0");
  
      const lastFinal = await fastify.prisma.invoice.findFirst({
        where: {
          invoiceNumber: {
            startsWith: `E/I/${year}/${month}/`,
          },
        },
        orderBy: { createdAt: "desc" },
      });
  
      let seq = 1;
      if (lastFinal?.invoiceNumber) {
        seq = Number(lastFinal.invoiceNumber.split("/").pop()) + 1;
      }
  
      const invoiceNumber = `E/I/${year}/${month}/${String(seq).padStart(4, "0")}`;

      const previousPaid = Number(lastInvoice.paidAmount ?? 0);
      const newPayment = isPartial.toLowerCase() === "yes" ? Number(partialAmount ?? 0) : Number(lastInvoice.remainingAmount ?? 0);
      const totalPaid = previousPaid + newPayment;

      const remainingAmount = Number(lastInvoice.totalAmount) - totalPaid;

      const updatedStatus =
        remainingAmount <= 0
          ? "paid"
          : newPayment > 0
          ? "partially paid"
          : lastInvoice.status;

      const newInvoice = await fastify.prisma.invoice.create({
        data: {
          restaurantId: Number(currentResId),
          pricingPlanId: lastInvoice.pricingPlanId,

          subTotalAmount: lastInvoice.subTotalAmount,
          totalAmount: lastInvoice.totalAmount,

          partialAmount: newPayment,     // ✔ stores only current installment
          paidAmount: totalPaid,         // ✔ cumulative
          remainingAmount,               // ✔ correct remaining

          dueDate: lastInvoice.dueDate,
          proformaNumber: lastInvoice.proformaNumber,
          invoiceNumber,
          status: updatedStatus,

          paymentDate: new Date(paymentDate),
          paymentNotes: paymentNotes || null,
          isPartialPayment: newPayment > 0,
          paymentFileUrl,
        },
      });
  
      return reply.send({
        message: "Payment updated successfully",
        invoice: newInvoice
      });
  
    } catch (err) {
      console.error("Payment update failed:", err);
      return reply.code(500).send({ error: "Internal server error" });
    }
  });

  fastify.get("/plan-map/:restaurantId/:pricingPlanId", async (request, reply) => {
    const { restaurantId, pricingPlanId } = request.params as any;

    try {
      // Use findUnique for composite unique lookup and include the plan relation
      const mapping = await fastify.prisma.restaurantPricingPlan.findUnique({
        where: {
          restaurantId_pricingPlanId: {
            restaurantId: Number(restaurantId),
            pricingPlanId: Number(pricingPlanId),
          },
        },
        include: {
          pricingPlan: {
            include: {
              meteredProducts: {
                include: {
                  product: true
                }
              },
              includedProducts: {
                include: {
                  product: true
                }
              },
              hybridProducts: {
                include: {
                  product: true
                }
              },
            }
          },
        },
      });

      if (!mapping) {
        return reply.code(404).send({ message: "Mapping not found." });
      }

      return reply.send(mapping);
    } catch (err) {
      fastify.log.error("Error fetching specific plan mapping:", err as any);
      return reply.code(500).send({ error: "Failed to fetch specific plan mapping" });
    }
  });

  fastify.get("/plan-map/:restaurantId", async (request, reply) => {
    const { restaurantId } = request.params as any;

    const mapping = await fastify.prisma.restaurantPricingPlan.findFirst({
      where: { restaurantId: Number(restaurantId) },
    });

    if (!mapping) return reply.send({ message: "No plan assigned." });

    return reply.send(mapping);
  });

  fastify.get("/restaurantPricingPlans", async () => {
    return fastify.prisma.restaurantPricingPlan.findMany({
      include: {
        pricingPlan: true
      }
    })
  })

  fastify.get("/", async () => {
    return fastify.prisma.restaurant.findMany({
      include: {
        brand: {
          include: {
            business: true
          }
        },
        restaurantPricingPlans: {
          include: {
            pricingPlan: true
          }
        },
        invoices: true
      }
    });
  });

}