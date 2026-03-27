import { FastifyInstance } from "fastify";

export default async function dashboardRoutes(fastify: FastifyInstance) {
  fastify.get("/stats", async () => {
    const totalBusinesses = await fastify.prisma.business.findMany();
    const totalRestaurants = await fastify.prisma.restaurant.findMany();
    const invoices = await fastify.prisma.invoice.findMany();
    const plans = await fastify.prisma.pricingPlan.findMany();

    return {
      totalBusinesses,
      totalRestaurants,
      plans,
      invoices,
      mrr: 0,
      arr: 0,
      newCustomers: 0,
      churn: 0,
    };
  });
}