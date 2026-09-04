import { customerController } from "@/controllers/customer.controller";
import { validate } from "@/middleware/validate.middleware";
import { customerSchema, updateCustomerSchema } from "@myapp/shared/schemas/customer.schema";
import { idBodySchema } from "@myapp/shared/schemas/helper";
import { Hono } from "hono";


const customerRouter = new Hono();


customerRouter.get("/get/stats", customerController.getCustomerStats);
customerRouter.get("/get/all", customerController.getAllCustomers);
customerRouter.post("/create", validate(customerSchema), customerController.createCustomer);
customerRouter.put("/update", validate(updateCustomerSchema), customerController.updateCustomer);
customerRouter.patch("/toggle-status", validate(idBodySchema), customerController.toggleCustomerStatus);


export default customerRouter;