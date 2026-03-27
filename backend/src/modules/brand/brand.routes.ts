import { FastifyInstance } from "fastify";

export default async function brandRoutes(fastify: FastifyInstance) {
  fastify.post("/", async (req, reply) => {
    const { name, businessId } = req.body as any;

    try {
      const brand = await fastify.prisma.brand.create({
        data: {
          name,
          businessId: Number(businessId),
        },
      });

      return reply.send({ message: "Brand created", brand });
    } catch (error) {
      console.error(error);
      return reply.code(500).send({ error: "Failed to create brand" });
    }
  });

  // Get brands (optionally filter by businessId)
  fastify.get("/", async (req, reply) => {
    const businessId = (req.query as any)?.businessId;
    const where = businessId ? { businessId: Number(businessId) } : {};
    try {
      const brands = await fastify.prisma.brand.findMany({
        where,
        include: { business: true },
        orderBy: { name: "asc" },
      });
      return reply.send(brands);
    } catch (error) {
      fastify.log.error(error);
      return reply.code(500).send({ error: "Failed to fetch brands" });
    }
  });
}