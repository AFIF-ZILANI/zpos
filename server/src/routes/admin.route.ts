import { Hono } from "hono";
import type { AppEnv } from "@/types";
import { AdminController } from "@/controllers/admin.controller";
import { requireRole } from "@/middleware/requireRole.middleware"
import { validate } from "@/middleware/validate.middleware"
import { inviteSchema, updateSchema } from "@myapp/shared/schemas/admin.schema";

const router = new Hono<AppEnv>();

// Only OWNER role can manage users
router.use("*", requireRole("OWNER"));

router.get("/", AdminController.getAll);
router.post("/invite", validate(inviteSchema), AdminController.invite);
router.delete("/invites", AdminController.cancelInvite);
router.get("/invites", AdminController.getInvites);
router.patch("/", validate(updateSchema), AdminController.update);
router.delete("/:id", AdminController.remove);

export default router;