import { Router } from "express";
import { Server } from "socket.io";
import { createTestsRouter } from "./tests.routes";

export function createApiRouter(io: Server): Router {
  const router: Router = Router();

  router.use("/tests", createTestsRouter(io));

  return router;
}
