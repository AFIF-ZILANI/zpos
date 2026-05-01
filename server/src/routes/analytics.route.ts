import { customerController } from "@/controllers/customer.controller";
import { Hono } from "hono";


const analyticsRouter = new Hono();


analyticsRouter.get("/get/stats", customerController.getCustomerStats);
analyticsRouter.get("/get/all", customerController.getAllCustomers);


export default analyticsRouter;