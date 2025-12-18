import { useAuth } from "@/_core/hooks/useAuth";
import { SimpleCollapsibleNav } from './SimpleCollapsibleNav';
import { APP_LOGO, APP_TITLE, getLoginUrl } from "@/const";
import { Button } from "@/components/ui/button";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { loading, user } = useAuth();

  // Always show the layout - don't block on auth
  return (
    <div className="flex h-screen">
      <SimpleCollapsibleNav />
      <main className="flex-1 overflow-auto p-4">
        {loading ? (
          <div className="flex items-center justify-center h-full">
            <div className="text-muted-foreground">Loading...</div>
          </div>
        ) : !user ? (
          <div className="flex items-center justify-center h-full">
            <div className="flex flex-col items-center gap-6 p-8 max-w-md w-full">
              <img
                src={APP_LOGO}
                alt={APP_TITLE}
                className="h-20 w-20 rounded-xl object-cover shadow"
              />
              <div className="text-center space-y-2">
                <h1 className="text-2xl font-bold tracking-tight">{APP_TITLE}</h1>
                <p className="text-sm text-muted-foreground">
                  Please sign in to continue
                </p>
              </div>
              <Button
                onClick={() => { window.location.href = getLoginUrl(); }}
                size="lg"
                className="w-full shadow-lg"
              >
                Sign in
              </Button>
            </div>
          </div>
        ) : (
          children
        )}
      </main>
    </div>
  );
}
