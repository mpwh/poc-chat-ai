import { StrictMode, useEffect } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route, useLocation } from "wouter";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider, useAuth } from "./contexts/AuthContext";
import Layout from "./components/Layout";
import ChatPage from "./pages/ChatPage";
import DocumentsPage from "./pages/DocumentsPage";
import LoginPage from "./pages/LoginPage";
import SignupPage from "./pages/SignupPage";

function AuthenticatedApp() {
  return (
    <Layout>
      <Switch>
        <Route path="/" component={ChatPage} />
        <Route path="/documents" component={DocumentsPage} />
        <Route>404 Page Not Found</Route>
      </Switch>
    </Layout>
  );
}

function RedirectToLogin() {
  const [, setLocation] = useLocation();
  useEffect(() => {
    setLocation("/login");
  }, [setLocation]);
  return null;
}

function UnauthenticatedApp() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      <Route path="/signup" component={SignupPage} />
      <Route component={RedirectToLogin} />
    </Switch>
  );
}

function App() {
  const { user, loading } = useAuth();

  if (loading) {
    return null;
  }

  return user ? <AuthenticatedApp /> : <UnauthenticatedApp />;
}

const rootElement = document.getElementById("root");
if (!rootElement?.innerHTML) {
  const root = createRoot(rootElement!);
  root.render(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <App />
          <Toaster />
        </AuthProvider>
      </QueryClientProvider>
    </StrictMode>
  );
}