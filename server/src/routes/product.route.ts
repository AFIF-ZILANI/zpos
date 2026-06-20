import { Hono } from "hono";
import { validate } from "@/middleware/validate.middleware";
import { ProductController } from "@/controllers/product.controller";
import { createProductSchema, createProductVariantSchemaSepa, updateProductSchema, updateProductVariantSchema } from "@myapp/shared/schemas/product.schema";

const productRouter = new Hono();

productRouter.post("/create", validate(createProductSchema), ProductController.create);
productRouter.get("/get/all", ProductController.getAll);
productRouter.get("/get/:id", ProductController.getById);
productRouter.patch("/update", validate(updateProductSchema), ProductController.update);
productRouter.delete("/delete", ProductController.deleteById);
productRouter.get("/purchase", ProductController.getPurchaseData);
productRouter.get("/get/by-barcode/:barcode", ProductController.getByBarcode);
productRouter.get("/get/variants/:variantId/cart-item", ProductController.getCartItemByVariant);
productRouter.patch("/variants/toggle", ProductController.toggleVariantById);
productRouter.patch("/variants/update", validate(updateProductVariantSchema), ProductController.updateVariant);
productRouter.post("/variants/create", validate(createProductVariantSchemaSepa), ProductController.createVariant);
productRouter.get("/stats", ProductController.getProductStats);

export default productRouter;