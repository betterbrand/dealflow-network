import { Toaster } from "@/components/ui/sonner";
import NotFound from "@/pages/NotFound";
import { Route, Switch } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import DashboardLayout from "./components/DashboardLayout";
import Dashboard from "./pages/Dashboard";
import Contacts from "./pages/Contacts";
import ContactDetail from "./pages/ContactDetail";
import Graph from "./pages/Graph";
import SemanticGraph from "./pages/SemanticGraph";
import Companies from "./pages/Companies";
import CompanyDetail from "./pages/CompanyDetail";
import Suggestions from "./pages/Suggestions";
import AIQuery from "./pages/AIQuery";
import AdminUsers from "./pages/AdminUsers";
import Login from "./pages/Login";
import Profile from "./pages/Profile";
import Settings from "./pages/Settings";
import { useAuth } from "./_core/hooks/useAuth";

function Router() {
  const { user, loading } = useAuth();

  // Show loading while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  // If not logged in, show magic link login
  if (!user) {
    return <Login />;
  }

  // User is logged in, show app routes
  return (
    <Switch>
      <Route path="/" component={() => (
        <DashboardLayout>
          <Dashboard />
        </DashboardLayout>
      )} />
      <Route path="/contacts" component={() => (
        <DashboardLayout>
          <Contacts />
        </DashboardLayout>
      )} />
      <Route path="/contacts/:id" component={() => (
        <DashboardLayout>
          <ContactDetail />
        </DashboardLayout>
      )} />
      <Route path="/graph" component={() => (
        <DashboardLayout>
          <Graph />
        </DashboardLayout>
      )} />
      <Route path="/semantic-graph" component={() => (
        <DashboardLayout>
          <SemanticGraph />
        </DashboardLayout>
      )} />
      <Route path="/companies" component={() => (
        <DashboardLayout>
          <Companies />
        </DashboardLayout>
      )} />
      <Route path="/companies/:id" component={() => (
        <DashboardLayout>
          <CompanyDetail />
        </DashboardLayout>
      )} />
      <Route path="/suggestions" component={() => (
        <DashboardLayout>
          <Suggestions />
        </DashboardLayout>
      )} />
      <Route path="/ai-query" component={() => (
        <DashboardLayout>
          <AIQuery />
        </DashboardLayout>
      )} />
      <Route path="/admin/users" component={() => (
        <DashboardLayout>
          <AdminUsers />
        </DashboardLayout>
      )} />
      <Route path="/profile" component={() => (
        <DashboardLayout>
          <Profile />
        </DashboardLayout>
      )} />
      <Route path="/settings" component={() => (
        <DashboardLayout>
          <Settings />
        </DashboardLayout>
      )} />
      <Route path="/404" component={NotFound} />
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <Toaster />
        <Router />
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
