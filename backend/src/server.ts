import Fastify from "fastify";
import fastifyCors from "@fastify/cors";
import fastifyJwt from "@fastify/jwt";
import prismaPlugin from "./plugins/prisma";
import authRoutes from "./modules/auth/auth.routes";
import businessRoutes from "./modules/business/business.routes";
import brandRoutes from "./modules/brand/brand.routes";
import restaurantRoutes from "./modules/restaurant/restaurant.routes";
import dashboardRoutes from "./modules/dashboard/dashboard.routes";
import Pricing from "./modules/pricing/pricing.routes";
import productRoutes from "./modules/product/product.routes";
import Invoices from "./modules/invoices/invoices.routes";
import AutoGenerate from "./modules/invoices/autoGenerate";

const app = Fastify({ logger: true });

// Plugins
app.register(fastifyCors, { origin: "*" });
app.register(fastifyJwt, { secret: "supersecretkey" });
app.register(prismaPlugin);

// Routes
app.register(authRoutes, { prefix: "/auth" });
app.register(businessRoutes, { prefix: "/business" });
app.register(brandRoutes, { prefix: "/brand" });
app.register(restaurantRoutes, { prefix: "/restaurant" });
app.register(dashboardRoutes, { prefix: "/dashboard" });
app.register(Pricing, { prefix: "/pricing-plan" });
app.register(productRoutes, { prefix: "/products" });
app.register(Invoices, { prefix: "/invoices" });
app.register(AutoGenerate, { prefix: "/auto-generate" });

const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient()

console.log(Object.keys(prisma))

// Default route
app.get("/", async () => {
  return { message: "Invoicing API is running 🚀" };
});

// Start server
const start = async () => {
  try {
    const port = Number(process.env.PORT) || 4000;
    await app.listen({
      port,
      host: "0.0.0.0"
    });
    console.log(`🚀 Server is running on ${port}`);
  } catch (err) {
    app.log.error(err);
    process.exit(1);
  }
};

start();
