import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { APP_LOGO, APP_TITLE } from "@/const";
import { useState } from "react";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import { useLocation } from "wouter";

/**
 * TEMPORARY EMAIL-GATE LOGIN
 * This is a temporary workaround to bypass publishing issues.
 * No email verification - just collects email and grants access.
 * Will be replaced with magic link authentication once publishing is fixed.
 */
export default function EmailGateLogin() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [, setLocation] = useLocation();

  const loginMutation = trpc.auth.emailGateLogin.useMutation({
    onSuccess: () => {
      toast.success("Welcome!");
      setLocation("/");
    },
    onError: (error: any) => {
      toast.error(error.message || "Failed to continue");
      setLoading(false);
    },
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !email.includes("@")) {
      toast.error("Please enter a valid email address");
      return;
    }

    setLoading(true);
    loginMutation.mutate({ email });
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 to-slate-100">
      <div className="w-full max-w-md">
        <div className="bg-white rounded-2xl shadow-xl p-8 space-y-6">
          {/* Logo and Title */}
          <div className="text-center space-y-3">
            {APP_LOGO && (
              <div className="flex justify-center">
                <img src={APP_LOGO} alt={APP_TITLE} className="h-16 w-16 rounded-xl" />
              </div>
            )}
            <h1 className="text-2xl font-bold text-slate-900">{APP_TITLE}</h1>
            <p className="text-slate-600">Enter your email to continue</p>
          </div>

          {/* Email Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <label htmlFor="email" className="text-sm font-medium text-slate-700">
                Email address
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                disabled={loading}
                required
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-11 text-base"
            >
              {loading ? "Please wait..." : "Continue"}
            </Button>
          </form>

          {/* Temporary Notice */}
          <div className="text-center text-xs text-slate-500 pt-2 border-t">
            <p>No password required - just tracking for access</p>
          </div>
        </div>
      </div>
    </div>
  );
}
