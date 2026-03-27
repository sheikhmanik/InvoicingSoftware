import { FastifyInstance } from "fastify";
import bcrypt from "bcryptjs";

export default async function authRoutes(fastify: FastifyInstance) {
  // Register
  fastify.post("/register", async (req, reply) => {
    const { name, email, password } = req.body as any;

    const existingUser = await fastify.prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return reply.code(400).send({ error: "Email already exists" });
    }

    const hashed = await bcrypt.hash(password, 10);
    const user = await fastify.prisma.user.create({
      data: { name, email, password: hashed },
    });

    const token = fastify.jwt.sign({ id: user.id, email: user.email });

    return reply.code(201).send({ message: "User registered", user, token });
  });

  // Login
  fastify.post("/login", async (req, reply) => {
    const { email, password } = req.body as any;

    const user = await fastify.prisma.user.findUnique({ where: { email } });
    if (!user) {
      return reply.code(401).send({ error: "Invalid email" });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return reply.code(401).send({ error: "Invalid password" });
    }

    const token = fastify.jwt.sign({ id: user.id, email: user.email });
    return { message: "Login successful", token };
  });
}
