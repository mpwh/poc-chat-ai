import { Switch, Route, Redirect } from "wouter";
import { useAuth } from "./contexts/AuthContext";
import LoginPage from "./pages/LoginPage";
import ChatPage from "./pages/ChatPage";
import DocumentsPage from "./pages/DocumentsPage";
import Layout from "./components/Layout";

function PrivateRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <div>Loading...</div>;
  }

  if (!isAuthenticated) {
    return <Redirect to="/login" />;
  }

  return <>{children}</>;
}

export default function App() {
  return (
    <Switch>
      <Route path="/login" component={LoginPage} />
      
      <Route path="/">
        <Redirect to="/chat" />
      </Route>

      <Route path="/chat">
        <PrivateRoute>
          <Layout>
            <ChatPage />
          </Layout>
        </PrivateRoute>
      </Route>

      <Route path="/documents">
        <PrivateRoute>
          <Layout>
            <DocumentsPage />
          </Layout>
        </PrivateRoute>
      </Route>
    </Switch>
  );
} 