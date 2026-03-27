import fastify, { FastifyInstance } from "fastify";

export default async function Invoices(fastify: FastifyInstance) {
  fastify.get("/", async () => {
    return fastify.prisma.invoice.findMany({
      include: {
        restaurant: {
          include: {
            brand: {
              include: {
                business: true
              }
            }
          }
        },
        pricingPlan: true,
      }
    });
  });
}