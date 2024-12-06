import { createContext, useContext, useEffect, useState } from "react";

interface User {
  id: number;
  email: string;
  name: string;
}

interface AuthContextType {
  user: User | null;
  loading: boolean;
  error: string | null;
  login: (email: string, password: string) => Promise<void>;
  signup: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Check if there's a stored token and try to get user data
    const token = localStorage.getItem("token");
    if (token) {
      fetch("/api/auth/me", {
        headers: {
          Authorization: `Bearer ${token}`,
        },
      })
        .then((res) => res.json())
        .then((data) => {
          if (data.user) {
            setUser(data.user);
          } else {
            localStorage.removeItem("token");
          }
        })
        .catch(() => {
          localStorage.removeItem("token");
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setLoading(false);
    }
  }, []);

  const login = async (email: string, password: string) => {
    try {
      setError(null);
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Login failed");
      }

      localStorage.setItem("token", data.token);
      setUser(data.user);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to login");
      throw e;
    }
  };

  const signup = async (email: string, password: string) => {
    try {
      setError(null);
      const response = await fetch("/api/auth/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: email.split("@")[0] }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Signup failed");
      }

      // After signup, automatically log in
      await login(email, password);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to sign up");
      throw e;
    }
  };

  const logout = async () => {
    try {
      setError(null);
      localStorage.removeItem("token");
      setUser(null);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to logout");
      throw e;
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, error, login, signup, logout }}>
      {!loading && children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
