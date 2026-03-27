import { FastifyInstance } from "fastify";

export default async function PricingPlanRoutes(fastify: FastifyInstance) {
  
  // CREATE or UPDATE pricing plan
  fastify.post("/", async (req, reply) => {
    try {
      const {
        planId,
        planType,
        planName,
        description = "",
        fixedPrice,
        basePrice,
        creditsIncluded,
        pricePerCredit,
        billingCycle,
        validity,
        meteredProducts = [],
        includedProducts = [],
        hybridProducts = [],
      } = req.body as any;
  
      if (!planName?.trim()) {
        return reply.code(400).send({ error: "Plan name required" });
      }
  
      if (!["fixed", "metered", "hybrid"].includes(planType)) {
        return reply.code(400).send({ error: "Invalid plan type" });
      }
  
      const data: any = {
        planType,
        planName: planName.trim(),
        description: description.trim(),
      };
  
      // Assign fields based on plan type
      if (planType !== "metered") {
        data.fixedPrice = fixedPrice ? Number(fixedPrice) : 0;
        data.billingCycle = billingCycle ? Number(billingCycle) : 1;
      } else {
        data.fixedPrice = null;
        data.billingCycle = null;
      }
  
      if (planType !== "fixed") {
        data.basePrice = basePrice ? Number(basePrice) : 0;
        data.creditsIncluded = creditsIncluded ? Number(creditsIncluded) : 0;
        data.validity = validity ? Number(validity) : 1;
      } else {
        data.basePrice = null;
        data.creditsIncluded = null;
        data.validity = null;
      }

      if (planType === "hybrid") {
        data.pricePerCredit = pricePerCredit ? Number(pricePerCredit) : 0;
      }
  
      // Create OR Update plan
      const plan = planId
        ? await fastify.prisma.pricingPlan.update({
            where: { id: Number(planId) },
            data,
          })
        : await fastify.prisma.pricingPlan.create({ data })
      ;
  
      // =============================
      // Products Section
      // =============================
  
      const keepIncludedIds: number[] = [];
      const keepMeteredIds: number[] = [];
      const keepHybridIds: number[] = [];
  
      if (planType === "fixed") {
        for (const item of includedProducts) {
          const productId = item.productId;
          if (!productId) continue;

          if (item.license !== undefined) {
            await fastify.prisma.product.update({
              where: { id: productId },
              data: { license: item.license }
            });
          }
  
          const result = await fastify.prisma.includedProduct.upsert({
            where: {
              planId_productId: { planId: plan.id, productId }
            },
            update: { isActive: true },
            create: { planId: plan.id, productId, isActive: true }
          });
  
          keepIncludedIds.push(result.id);
        }
  
        await fastify.prisma.includedProduct.deleteMany({
          where: { planId: plan.id, id: { notIn: keepIncludedIds } }
        });
      } else {
        await fastify.prisma.includedProduct.deleteMany({ where: { planId: plan.id } });
      }
  
      if (planType === "metered") {
        for (const item of meteredProducts) {
          const productId = item.productId;
          if (!productId) continue;

          if (item.license !== undefined) {
            await fastify.prisma.product.update({
              where: { id: productId },
              data: { license: item.license }
            });
          }
  
          const result = await fastify.prisma.meteredProduct.upsert({
            where: {
              planId_productId: { planId: plan.id, productId }
            },
            update: { credits: Number(item.credits), isActive: true },
            create: {
              planId: plan.id,
              productId,
              credits: Number(item.credits),
              isActive: true
            }
          });
  
          keepMeteredIds.push(result.id);
        }
  
        await fastify.prisma.meteredProduct.deleteMany({
          where: { planId: plan.id, id: { notIn: keepMeteredIds } }
        });
      } else {
        await fastify.prisma.meteredProduct.deleteMany({ where: { planId: plan.id } });
      }

      if (planType === "hybrid") {
        for (const item of hybridProducts) {
          const productId = item.productId;
          if (!productId) continue;

          // update license on Product if passed
          if (item.license !== undefined) {
            await fastify.prisma.product.update({
              where: { id: productId },
              data: { license: item.license },
            });
          }

          const result = await fastify.prisma.hybridProduct.upsert({
            where: {
              planId_productId: {
                planId: plan.id,
                productId,
              },
            },
            update: {
              isActive: true,
              unlimitedUsage: Boolean(item.unlimitedUsage),
              numberOfUnits: item.unlimited
                ? null
                : item.numberOfUnits != null
                ? Number(item.numberOfUnits)
                : 0,
              creditsPerUnit: item.unlimited
                ? null
                : item.creditsPerUnit != null
                ? Number(item.creditsPerUnit)
                : 0,
            },
            create: {
              planId: plan.id,
              productId,
              isActive: true,
              unlimitedUsage: Boolean(item.unlimitedUsage),
              numberOfUnits: item.unlimited
                ? null
                : item.numberOfUnits != null
                ? Number(item.numberOfUnits)
                : 0,
              creditsPerUnit: item.unlimited
                ? null
                : item.creditsPerUnit != null
                ? Number(item.creditsPerUnit)
                : 0,
            },
          });

          keepHybridIds.push(result.id);
        }

        // remove hybrid rows that weren't sent (deleted on UI)
        await fastify.prisma.hybridProduct.deleteMany({
          where: { planId: plan.id, id: { notIn: keepHybridIds } },
        });

        // optional but usually correct: hybrid doesn't use these tables
        await fastify.prisma.includedProduct.deleteMany({ where: { planId: plan.id } });
        await fastify.prisma.meteredProduct.deleteMany({ where: { planId: plan.id } });

      } else {
        // if plan is not hybrid, clear hybrid mappings
        await fastify.prisma.hybridProduct.deleteMany({ where: { planId: plan.id } });
      }
  
      const saved = await fastify.prisma.pricingPlan.findUnique({
        where: { id: plan.id },
        include: {
          includedProducts: { include: { product: true } },
          meteredProducts: { include: { product: true } },
          hybridProducts: { include: { product: true } }
        }
      });

      await fastify.prisma.pricingPlan.findUnique({
        where: { id: plan.id },
        include: {
          hybridProducts: true
        }
      });
      
      return reply.send({
        message: "Pricing Plan Saved!",
        plan: saved,
      });
  
    } catch (error: any) {
      fastify.log.error(error);
      return reply.code(500).send({ error: error.message });
    }
  });

  // DELETE product from plan (metered or included)
  fastify.delete("/remove-product/:mappingId", async (req, reply) => {
    try {
      const { mappingId } = req.params as any;
      const { type } = req.query as any;
  
      if (!mappingId || !["metered", "included"].includes(type)) {
        return reply.code(400).send({ error: "Invalid request" });
      }
  
      if (type === "metered") {
        await fastify.prisma.meteredProduct.delete({
          where: { id: Number(mappingId) }
        });
      } else {
        await fastify.prisma.includedProduct.delete({
          where: { id: Number(mappingId) }
        });
      }
  
      return reply.send({ success: true });
  
    } catch (err: any) {
      fastify.log.error(err);
      return reply.code(500).send({
        error: "Failed to remove product from plan",
        detail: err.message
      });
    }
  });
  
  // GET all plans (with metered usages + product)
  fastify.get("/", async (req, reply) => {
    try {
      const plans = await fastify.prisma.pricingPlan.findMany({
        include: {
          meteredProducts: { include: { product: true } },
          includedProducts: { include: { product: true } },
          hybridProducts: { include: { product: true } },
        },
        orderBy: { id: "asc" }
      });
      return reply.send(plans);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Failed to fetch pricing plans" });
    }
  });
}