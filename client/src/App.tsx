import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@clerk/react";
import type { BasicDataResponse } from "@myapp/shared";
import { useGetData } from "@/lib/api-request";
import Layout from "@/components/Layout";
import Dashboard from "@/pages/Dashboard";
import PointOfSale from "@/pages/PointOfSale";
import Products from "@/pages/Products";
import Customers from "@/pages/Customers";
import Settings from "@/pages/Settings";
import NotFound from "@/pages/not-found";
import Purchases from "@/pages/Purchase";
import NewPurchase from "@/pages/new-purchase";
import SalesPage from "./pages/Sales";
import ProductDetailPage from "./pages/ProductDetails";
import Login from "./pages/Login";
import AdminPage from "./pages/Admin";
import { ErrorBoundary } from "@/components/ErrorBoundary";

const queryClient = new QueryClient();

function ProtectedRouter() {
  const { isSignedIn, isLoaded } = useAuth();
  const { data: me, isLoading: meLoading } = useGetData<
    BasicDataResponse<{ userId: string; role: "OWNER" | "STAFF" }>
  >("/me", ["me"], { enabled: isSignedIn });

  // Clerk is still initializing — render nothing to avoid flash
  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  // Not authenticated — send to login
  if (!isSignedIn) return <Redirect to="/login" />;

  const isOwner = me?.data.role === "OWNER";

  // Authenticated — render full app
  return (
    <ErrorBoundary>
    <Layout isOwner={isOwner}>
      <Switch>
        <Route path="/" component={Dashboard} />
        <Route path="/pos" component={PointOfSale} />
        <Route path="/products" component={Products} />
        <Route path="/products/:id" component={ProductDetailPage} />
        <Route path="/customers" component={Customers} />
        <Route path="/settings" component={Settings} />
        <Route path="/purchases" component={Purchases} />
        <Route path="/purchases/new" component={NewPurchase} />
        <Route path="/sales" component={SalesPage} />
        <Route path="/admin">
          {meLoading ? null : isOwner ? <AdminPage /> : <Redirect to="/" />}
        </Route>
        <Route component={NotFound} />
      </Switch>
    </Layout>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Switch>
            {/* Public route — accessible without auth */}
            <Route path="/login" component={Login} />
            {/* Everything else is protected */}
            <Route component={ProtectedRouter} />
          </Switch>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
