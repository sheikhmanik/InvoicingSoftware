import { Prisma } from "@prisma/client";
import { FastifyInstance } from "fastify";

export default async function businessRoutes(fastify: FastifyInstance) {
  fastify.post("/", async (req, reply) => {
    const {
      name,
      address,
      location,
      GSTIN,
      PrimaryContactName,
      PrimaryContactPhone,
      PrimaryContactEmail,
    } = req.body as any;

    try {
      const business = await fastify.prisma.business.create({
        data: {
          name,
          address,
          location,
          GSTIN,
          PrimaryContactName,
          PrimaryContactPhone,
          PrimaryContactEmail,
        },
      });

      return reply.send({ message: "Business created", business });
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Failed to create business" });
    }
  });

  // Get all Businesses (optionally search by name)
  fastify.get("/", async (req, reply) => {
    const q = (req.query as any)?.search;
    const where: Prisma.BusinessWhereInput = q ? { name: { contains: q, mode: "insensitive" } } : {};
    try {
      const businesses = await fastify.prisma.business.findMany({
        where,
        orderBy: { name: "asc" },
        include: {
          brands: {
            include: {
              restaurants: {
                include: {
                  restaurantPricingPlans: {
                    include: {
                      pricingPlan: true,
                    }
                  }
                }
              }
            }
          }
        }
      });
      return reply.send(businesses);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch businesses" });
    }
  });
}