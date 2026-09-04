import { useState } from "react";
import { Link, useRoute } from "wouter";
import {
  LayoutDashboard,
  ShoppingCart,
  Package,
  Users,
  Store,
  CarTaxiFrontIcon,
  PanelRight,
  LogOut,
  User2Icon,
} from "lucide-react";

import { Button } from "./ui/button";
import { useClerk, useUser } from "@clerk/react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./ui/dropdown-menu";

const navItems = [
  { path: "/", label: "Dashboard", icon: LayoutDashboard },
  { path: "/pos", label: "Point of Sale", icon: ShoppingCart },
  { path: "/products", label: "Products", icon: Package },
  { path: "/purchases", label: "Purchases", icon: CarTaxiFrontIcon },
  // { path: "/barcodes", label: "Barcodes", icon: QrCode },
  { path: "/customers", label: "Customers", icon: Users },
  // { path: "/analytics", label: "Analytics", icon: BarChart3 },
  { path: "/sales", label: "Sales", icon: ShoppingCart },
  // { path: "/settings", label: "Settings", icon: Settings },
];

const ownerOnlyNavItems = [
  { path: "/admin", label: "Admin", icon: User2Icon },
];

function NavItem({
  path,
  label,
  icon: Icon,
  collapsed,
}: {
  path: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  collapsed: boolean;
}) {
  const [isActive] = useRoute(path === "/" ? "/" : `${path}*`);
  // const [user, isLoading] = useUser();

  return (
    <Link href={path}>
      <div
        className={`flex items-center gap-3 px-3 py-2.5 rounded-lg cursor-pointer transition-all duration-150 group relative ${
          isActive
            ? "bg-sidebar-primary text-sidebar-primary-foreground"
            : "text-sidebar-foreground/70 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
        }`}
      >
        <Icon className={`shrink-0 ${collapsed ? "w-5 h-5" : "w-4.5 h-4.5"}`} />
        {!collapsed && (
          <span className="text-sm font-medium truncate">{label}</span>
        )}
        {collapsed && (
          <div className="absolute left-full ml-3 px-2 py-1 bg-popover text-popover-foreground text-xs rounded shadow-md opacity-0 group-hover:opacity-100 pointer-events-none whitespace-nowrap z-50 border border-border">
            {label}
          </div>
        )}
      </div>
    </Link>
  );
}

export default function Layout({
  children,
  isOwner,
}: {
  children: React.ReactNode;
  isOwner?: boolean;
}) {
  const [collapsed, setCollapsed] = useState(false);
  const visibleNavItems = isOwner ? [...navItems, ...ownerOnlyNavItems] : navItems;
  return (
    <div className="flex h-screen bg-background overflow-hidden">
      {/* Sidebar */}
      <aside
        className={`flex flex-col bg-sidebar border-r border-sidebar-border transition-all duration-300 ${
          collapsed ? "w-16" : "w-60"
        } shrink-0`}
      >
        {/* Logo */}
        <div
          className={`flex items-center gap-3 px-4 py-4 border-b border-sidebar-border ${collapsed ? "justify-center" : ""}`}
        >
          <div className="w-8 h-8 bg-sidebar-primary rounded-lg flex items-center justify-center shrink-0">
            <Store className="w-4 h-4 text-white" />
          </div>
          {!collapsed && (
            <div>
              <p className="text-sidebar-foreground font-semibold text-sm leading-tight">
                zPOS
              </p>
              <p className="text-sidebar-foreground/50 text-xs">
                Retail Manager
              </p>
            </div>
          )}
        </div>

        {/* Nav */}
        <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
          {visibleNavItems.map((item) => (
            <NavItem key={item.path} {...item} collapsed={collapsed} />
          ))}
        </nav>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between gap-4 px-6 py-3 bg-card border-b border-border shrink-0">
          {/* Collapse toggle */}
          <Button
            onClick={() => setCollapsed(!collapsed)}
            size={"icon"}
            variant={"outline"}
          >
            <PanelRight />
          </Button>
          <UserMenu />
        </header>

        {/* Content */}
        <main className="flex-1 overflow-y-auto">{children}</main>
      </div>
    </div>
  );
}

export function UserMenu() {
  const { user, isLoaded } = useUser();
  const { signOut } = useClerk();

  const initial = user?.firstName?.[0]?.toUpperCase() ?? "?";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className="h-9 w-9 rounded-full p-0 bg-primary text-primary-foreground hover:bg-primary/90 font-medium text-sm"
        >
          {isLoaded ? initial : "?"}
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-60" align="end" sideOffset={8}>
        {/* User info */}
        <div className="flex items-center gap-3 px-3 py-3">
          <div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center text-primary-foreground font-medium text-sm shrink-0">
            {initial}
          </div>
          <div className="flex flex-col min-w-0">
            <p className="text-sm font-medium truncate">
              {user?.fullName ?? "—"}
            </p>
            <p className="text-xs text-muted-foreground truncate">
              {user?.emailAddresses[0]?.emailAddress ?? "—"}
            </p>
          </div>
        </div>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={() => signOut()}
          className="gap-2 text-destructive focus:text-destructive focus:bg-destructive/10 cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          Sign out
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
