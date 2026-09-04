import { Hono } from "hono";
import type { AppEnv } from "@/types";
import { validate } from "@/middleware/validate.middleware";
import { requireRole } from "@/middleware/requireRole.middleware";
import { PurchaseController } from "@/controllers/purchase.controller";
import { newPurchaseSchema } from "@myapp/shared/schemas/purchase.schema";

const purchaseRouter = new Hono<AppEnv>();

purchaseRouter.post("/create", validate(newPurchaseSchema), PurchaseController.createPurchase);

purchaseRouter.get("/get/overview-stats", PurchaseController.getOverviewStats);
purchaseRouter.get("/get/history", PurchaseController.getPurchaseHistory);
purchaseRouter.delete("/delete", requireRole("OWNER"), PurchaseController.deletePurchase);

export default purchaseRouter;