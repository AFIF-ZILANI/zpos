import { Hono } from "hono";
import { validate } from "@/middleware/validate.middleware";
import { SaleController } from "@/controllers/sale.controller";
import { saleSchema } from "@myapp/shared/schemas/sale.schema";

const saleRouter = new Hono();

saleRouter.post("/create", validate(saleSchema), SaleController.createSale);
saleRouter.get("/get/stats", SaleController.getStats);
saleRouter.get("/get/chart", SaleController.getChartData);
saleRouter.get("/get/payment/collect", SaleController.getPaymentData);
saleRouter.get("/get/all", SaleController.getSales);
saleRouter.post("/payment/create", SaleController.createPayment);

export default saleRouter;