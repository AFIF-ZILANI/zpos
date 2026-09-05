import { lazy, Suspense, useEffect } from "react";
import { Switch, Route, Router as WouterRouter, Redirect } from "wouter";
import { QueryClientProvider } from "@tanstack/react-query";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useAuth } from "@clerk/react";
import type { BasicDataResponse } from "@myapp/shared";
import { useGetData } from "@/lib/api-request";
import { queryClient } from "@/lib/query-client";
import Layout from "@/components/Layout";
import { ErrorBoundary } from "@/components/ErrorBoundary";

// Routes are code-split: the app previously shipped every page — plus recharts,
// the whole Radix surface and each page's forms — in one ~1.8 MB script that had
// to parse before anything rendered. Now a visitor downloads the shell plus the
// one page they asked for.
const Dashboard = lazy(() => import("@/pages/Dashboard"));
const PointOfSale = lazy(() => import("@/pages/PointOfSale"));
const Products = lazy(() => import("@/pages/Products"));
const ProductDetailPage = lazy(() => import("@/pages/ProductDetails"));
const Customers = lazy(() => import("@/pages/Customers"));
const Settings = lazy(() => import("@/pages/Settings"));
const Purchases = lazy(() => import("@/pages/Purchase"));
const NewPurchase = lazy(() => import("@/pages/new-purchase"));
const SalesPage = lazy(() => import("@/pages/Sales"));
const AdminPage = lazy(() => import("@/pages/Admin"));
const Login = lazy(() => import("@/pages/Login"));
const NotFound = lazy(() => import("@/pages/not-found"));

function FullPageSpinner() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function RouteSpinner() {
  return (
    <div className="flex items-center justify-center py-24">
      <div className="w-6 h-6 border-2 border-primary border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

/**
 * Warm the chunks for the routes a signed-in user is most likely to open next.
 * Runs after the current page has rendered, so it costs nothing on the critical
 * path but makes in-app navigation feel instant.
 */
function prefetchLikelyRoutes() {
  void import("@/pages/PointOfSale");
  void import("@/pages/Products");
}

function ProtectedRouter() {
  const { isSignedIn, isLoaded } = useAuth();
  const { data: me, isLoading: meLoading } = useGetData<
    BasicDataResponse<{ userId: string; role: "OWNER" | "STAFF" }>
  >("/me", ["me"], {
    enabled: isSignedIn,
    // Identity is stable for the life of a session; refetching it on every
    // mount added a blocking request to each navigation.
    staleTime: 5 * 60 * 1000,
  });

  // Warm the next-most-likely route chunks once we know the user is staying.
  useEffect(() => {
    if (!isSignedIn) return;
    const schedule =
      window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1));
    const handle = schedule(() => prefetchLikelyRoutes());
    return () => window.cancelIdleCallback?.(handle as number);
  }, [isSignedIn]);

  // Clerk is still initializing — render nothing to avoid flash
  if (!isLoaded) {
    return <FullPageSpinner />;
  }

  // Not authenticated — send to login
  if (!isSignedIn) return <Redirect to="/login" />;

  const isOwner = me?.data.role === "OWNER";

  // Authenticated — render full app
  return (
    <ErrorBoundary>
      <Layout isOwner={isOwner}>
        <Suspense fallback={<RouteSpinner />}>
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
        </Suspense>
      </Layout>
    </ErrorBoundary>
  );
}

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <WouterRouter base={import.meta.env.BASE_URL.replace(/\/$/, "")}>
          <Suspense fallback={<FullPageSpinner />}>
            <Switch>
              {/* Public route — accessible without auth */}
              <Route path="/login" component={Login} />
              {/* Everything else is protected */}
              <Route component={ProtectedRouter} />
            </Switch>
          </Suspense>
        </WouterRouter>
        <Toaster />
      </TooltipProvider>
    </QueryClientProvider>
  );
}

export default App;
