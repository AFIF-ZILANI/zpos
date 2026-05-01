import { Hono } from "hono";
import { validate } from "@/middleware/validate.middleware";
import { PurchaseController } from "@/controllers/purchase.controller";
import { newPurchaseSchema } from "@myapp/shared/schemas/purchase.schema";

const purchaseRouter = new Hono();

purchaseRouter.post("/create", validate(newPurchaseSchema), PurchaseController.createPurchase);

purchaseRouter.get("/get/overview-stats", PurchaseController.getOverviewStats);
purchaseRouter.get("/get/history", PurchaseController.getPurchaseHistory);
purchaseRouter.delete("/delete", PurchaseController.deletePurchase);

export default purchaseRouter;