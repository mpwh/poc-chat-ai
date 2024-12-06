import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Switch, Route } from "wouter";
import "./index.css";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { Toaster } from "@/components/ui/toaster";
import { SidebarProvider } from "@/components/ui/sidebar";
import Layout from "./components/Layout";
import ChatPage from "./pages/ChatPage";
import DocumentsPage from "./pages/DocumentsPage";

function Router() {
  return (
    <SidebarProvider>
      <Layout>
        <Switch>
          <Route path="/" component={DocumentsPage} />
          <Route path="/chat/:id" component={ChatPage} />
          <Route>404 Page Not Found</Route>
        </Switch>
      </Layout>
    </SidebarProvider>
  );
}

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <Router />
      <Toaster />
    </QueryClientProvider>
  </StrictMode>,
);
