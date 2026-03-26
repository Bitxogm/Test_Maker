import { Router } from "express";
import { Server } from "socket.io";
import { createTestsRouter } from "./tests.routes";
import { createAuthRouter } from "./auth.routes";
import { createChatRouter } from "./chat.routes";

export function createApiRouter(io: Server): Router {
  const router: Router = Router();

  router.use("/tests", createTestsRouter(io));
  router.use("/auth", createAuthRouter());
  router.use("/chat", createChatRouter());

  return router;
}
