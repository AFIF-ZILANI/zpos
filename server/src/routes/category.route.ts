import { Hono } from "hono";
import { categoryController } from "@/controllers/category.controller";
import { validate } from "@/middleware/validate.middleware";
import { updateCategorySchema } from "@myapp/shared/schemas/category.schema";

const categoryRouter = new Hono();

categoryRouter.post("/create", categoryController.createCategory);
categoryRouter.get("/get/all", categoryController.getCategories);
categoryRouter.patch("/update", validate(updateCategorySchema), categoryController.updateCategory);
categoryRouter.delete("/delete", categoryController.deleteCategory);

export default categoryRouter;