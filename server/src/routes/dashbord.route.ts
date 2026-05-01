import { Hono } from "hono";
import { DashboardController } from "@/controllers/dashboard.controller";

const dashboardRouter = new Hono();


dashboardRouter.get("/get/stats", DashboardController.getDashboardStats);
dashboardRouter.get("/get/stat-trend", DashboardController.getDashboardStatTrend);
dashboardRouter.get("/get/category-graph", DashboardController.getDashboardCategoryGraph);
dashboardRouter.get("/get/weekly-sales-graph", DashboardController.getDashboardWeeklySalesGraph);
dashboardRouter.get("/get/top-products", DashboardController.getDashboardTopProducts);
dashboardRouter.get("/get/sales-history", DashboardController.getDashboardSalesHistory);

export default dashboardRouter;