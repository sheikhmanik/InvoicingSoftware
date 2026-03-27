// routes/products.ts
import { FastifyInstance } from "fastify";

export default async function ProductRoutes(fastify: FastifyInstance) {
  // CREATE product
  fastify.post("/", async (req, reply) => {
    try {
      const { name, license } = req.body as any;
  
      if (!name || !name.trim()) {
        return reply.code(400).send({ error: "Product name is required" });
      }

      const existingProduct = await fastify.prisma.product.findFirst({
        where: {
          name: {
            equals: name.trim(),
            mode: "insensitive",
          },
        },
      });
  
      if (existingProduct) {
        return reply.code(400).send({
          error: "Product with this name already exists",
        });
      }
  
      // Create product
      const product = await fastify.prisma.product.create({
        data: {
          name: name,
          license: license ?? null,
        },
      });
  
      return reply.send({ product });
  
    } catch (err: any) {
      fastify.log.error(err);
  
      if (
        err.code === "P2002" ||
        err?.message?.includes("Unique constraint failed")
      ) {
        return reply.code(400).send({
          error: "Product with this name already exists",
        });
      }
  
      return reply.code(500).send({
        error: "Failed to create product",
        detail: err?.message ?? String(err),
      });
    }
  });

  // Deleting products
  fastify.delete("/:id", async (req, reply) => {
    try {
      const { id } = req.params as any;

      const deletedProduct = await fastify.prisma.product.delete({
        where: { id: Number(id) }
      });

      return reply.send({ deletedProduct });
    } catch (err: any) {
      fastify.log.error(err);

      if (err.code === "P2025") {
        return reply.code(404).send({ error: "Product not found" });
      }

      return reply.code(500).send({
        error: "Failed to delete product",
        detail: err?.message ?? String(err)
      });
    }
  });

  // GET All products (simple)
  fastify.get("/", async (req, reply) => {
    try {
      const products = await fastify.prisma.product.findMany({ orderBy: { name: "asc" }});
      return reply.send(products);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Failed to fetch products" });
    }
  });
  
  // GET Metered products (simple)
  fastify.get("/meteredProducts", async (req, reply) => {
    try {
      const products = await fastify.prisma.product.findMany({ orderBy: { name: "asc" }});
      return reply.send(products);
    } catch (err) {
      fastify.log.error(err);
      return reply.code(500).send({ error: "Failed to fetch products" });
    }
  });
}