import { useState } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/_core/hooks/useAuth";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { APP_LOGO, APP_TITLE } from "@/const";
import {
  Building2, LayoutDashboard, LogOut, Network, PanelLeft,
  Users, Lightbulb, Sparkles, Settings, Shield
} from "lucide-react";
import { cn } from "@/lib/utils";

const menuItems = [
  { icon: LayoutDashboard, label: "Dashboard", path: "/" },
  { icon: Users, label: "Contacts", path: "/contacts" },
  { icon: Building2, label: "Companies", path: "/companies" },
  { icon: Network, label: "Knowledge Graph", path: "/graph" },
  { icon: Lightbulb, label: "Suggestions", path: "/suggestions" },
  { icon: Sparkles, label: "AI Query", path: "/ai-query" },
  { icon: Settings, label: "Settings", path: "/settings" },
  { icon: Shield, label: "Admin Users", path: "/admin/users" },
];

export function SimpleCollapsibleNav() {
  const [location, setLocation] = useLocation();
  const { user, logout } = useAuth();
  const [isCollapsed, setIsCollapsed] = useState(false);

  return (
    <nav
      className={cn(
        "flex h-screen flex-col border-r bg-sidebar",
        isCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Header with collapse button */}
      <div className="flex h-16 items-center justify-between px-3 border-b">
        {!isCollapsed && (
          <div className="flex items-center gap-3">
            <img src={APP_LOGO} className="h-8 w-8 rounded-md object-cover ring-1 ring-border" alt="Logo" />
            <span className="font-semibold tracking-tight truncate">{APP_TITLE}</span>
          </div>
        )}
        {isCollapsed && (
          <img src={APP_LOGO} className="h-8 w-8 mx-auto rounded-md object-cover ring-1 ring-border" alt="Logo" />
        )}
        <div className={cn("flex items-center gap-1", isCollapsed && "mx-auto mt-2")}>
          <NotificationBell collapsed={isCollapsed} />
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="h-8 w-8 flex items-center justify-center rounded-lg"
          >
            <PanelLeft className="h-4 w-4 text-muted-foreground" />
          </button>
        </div>
      </div>

      {/* Menu Items */}
      <div className="flex-1 py-4 px-2 space-y-1">
        {menuItems.map(item => {
          const isActive = location === item.path;
          const Icon = item.icon;

          return (
            <button
              key={item.path}
              onClick={() => setLocation(item.path)}
              className={cn(
                "flex w-full items-center gap-2 rounded-md p-2 text-sm",
                isActive && "bg-sidebar-accent font-medium text-sidebar-accent-foreground",
                isCollapsed && "justify-center"
              )}
              title={isCollapsed ? item.label : undefined}
            >
              <Icon className={cn("h-4 w-4", isActive && "text-primary")} />
              {!isCollapsed && <span>{item.label}</span>}
            </button>
          );
        })}
      </div>

      {/* User Menu */}
      <div className="border-t p-3 space-y-2">
        <button
          onClick={() => setLocation("/profile")}
          className={cn(
            "flex items-center gap-3 px-1 py-1 rounded-md w-full hover:bg-sidebar-accent transition-colors",
            isCollapsed && "flex-col gap-2",
            location === "/profile" && "bg-sidebar-accent"
          )}
          title={isCollapsed ? "My Profile" : undefined}
        >
          <Avatar className="h-9 w-9 border shrink-0">
            <AvatarFallback className="text-xs font-medium bg-primary/10 text-primary">
              {user?.name?.charAt(0).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          {!isCollapsed && (
            <div className="flex-1 min-w-0 text-left">
              <p className="text-sm font-medium truncate leading-none">
                {user?.name || "-"}
              </p>
              <p className="text-xs text-muted-foreground truncate mt-1.5">
                {user?.email || "-"}
              </p>
            </div>
          )}
        </button>

        {/* Theme Toggle */}
        <ThemeToggle collapsed={isCollapsed} />

        {/* Logout */}
        {!isCollapsed && (
          <button
            onClick={logout}
            className="flex w-full items-center gap-2 px-2 py-1.5 text-sm rounded-sm hover:bg-sidebar-accent"
          >
            <LogOut className="h-4 w-4" />
            <span>Sign out</span>
          </button>
        )}
        {isCollapsed && (
          <button
            onClick={logout}
            className="w-full flex justify-center p-2 hover:bg-sidebar-accent rounded-md"
            title="Sign out"
          >
            <LogOut className="h-4 w-4" />
          </button>
        )}
      </div>
    </nav>
  );
}
