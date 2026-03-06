import { Router } from "express";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import { container } from "../../container";
import { User, UserPlan } from "../../domain/user/User.entity";
import { v4 as uuidv4 } from "uuid";

export function createAuthRouter(): Router {
  const router = Router();
  const { userRepository } = container;
  const JWT_SECRET = process.env.JWT_SECRET || "default-secret";

  // POST /api/auth/register
  router.post("/register", async (req, res) => {
    try {
      const { name, email, password } = req.body;

      const existingUser = await userRepository.findByEmail(email);
      if (existingUser) {
        return res.status(409).json({ message: "El email ya está registrado" });
      }

      const passwordHash = await bcrypt.hash(password, 10);

      const newUser = new User({
        id: uuidv4(),
        name,
        email,
        passwordHash,
        plan: UserPlan.FREE,
        createdAt: new Date(),
      });

      await userRepository.save(newUser);

      return res.status(201).json({ message: "Usuario creado" });
    } catch (error) {
      console.error("Register error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  // POST /api/auth/login
  router.post("/login", async (req, res) => {
    try {
      const { email, password } = req.body;

      const user = await userRepository.findByEmail(email);
      if (!user) {
        return res.status(401).json({ message: "Credenciales incorrectas" });
      }

      const isMatch = await bcrypt.compare(password, user.passwordHash);
      if (!isMatch) {
        return res.status(401).json({ message: "Credenciales incorrectas" });
      }

      const token = jwt.sign(
        {
          sub: user.id,
          email: user.email,
          plan: user.plan,
        },
        JWT_SECRET,
        { expiresIn: "7d" }
      );

      return res.status(200).json({ token });
    } catch (error) {
      console.error("Login error:", error);
      return res.status(500).json({ message: "Error interno del servidor" });
    }
  });

  return router;
}
