import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route, useLocation } from "wouter";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider } from "@/components/ui/sidebar";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import ChatPage from "./pages/ChatPage";
import DocumentsPage from "./pages/DocumentsPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";

function ProtectedRoute({ component: Component }: { component: React.ComponentType }) {
  const { user, loading } = useAuth();
  const [, setLocation] = useLocation();

  if (loading) return null;

  if (!user) {
    setLocation("/login");
    return null;
  }

  return <Component />;
}

function Router() {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      {user ? (
        <Layout>
          <Switch>
            <Route path="/" component={() => <ProtectedRoute component={DocumentsPage} />} />
            <Route path="/chat/:id" component={() => <ProtectedRoute component={ChatPage} />} />
            <Route>404 Page Not Found</Route>
          </Switch>
        </Layout>
      ) : (
        <Switch>
          <Route path="/login" component={LoginPage} />
          <Route path="/signup" component={SignupPage} />
          <Route>
            {() => {
              const [, setLocation] = useLocation();
              setLocation("/login");
              return null;
            }}
          </Route>
        </Switch>
      )}
    </SidebarProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <Router />
        <Toaster />
      </AuthProvider>
    </QueryClientProvider>
  </StrictMode>,
);
