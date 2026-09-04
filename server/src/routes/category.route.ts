import { Hono } from "hono";
import type { AppEnv } from "@/types";
import { categoryController } from "@/controllers/category.controller";
import { validate } from "@/middleware/validate.middleware";
import { requireRole } from "@/middleware/requireRole.middleware";
import { updateCategorySchema } from "@myapp/shared/schemas/category.schema";

const categoryRouter = new Hono<AppEnv>();

categoryRouter.post("/create", categoryController.createCategory);
categoryRouter.get("/get/all", categoryController.getCategories);
categoryRouter.patch("/update", validate(updateCategorySchema), categoryController.updateCategory);
categoryRouter.delete("/delete", requireRole("OWNER"), categoryController.deleteCategory);

export default categoryRouter;