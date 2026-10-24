"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";

interface AuthContextType {
  user: User | null;
  loading: boolean;
  signUp: (
    email: string,
    password: string
  ) => Promise<{ data?: any; error: any }>;
  signIn: (
    email: string,
    password: string
  ) => Promise<{ data?: any; error: any }>;
  signOut: () => Promise<void>;
  updateProfile: (updates: any) => Promise<{ error: any }>;
  showAuthModal: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authLoading, setAuthLoading] = useState(false);
  const [authError, setAuthError] = useState("");
  const [authSuccess, setAuthSuccess] = useState("");

  const supabase = createSupabaseClient();

  useEffect(() => {
    // Get initial session
    const getInitialSession = async () => {
      try {
        const {
          data: { session },
        } = await supabase.auth.getSession();
        setUser(session?.user ?? null);
      } catch (error) {
        console.error("Error getting session:", error);
      } finally {
        setLoading(false);
      }
    };

    getInitialSession();

    // Listen for auth changes
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (event, session) => {
      setUser(session?.user ?? null);
      setLoading(false);

      // Close modal on successful auth
      if (session?.user) {
        setShowModal(false);
        setAuthSuccess("Successfully signed in!");
        setTimeout(() => setAuthSuccess(""), 3000);
      } else if (event === "SIGNED_OUT") {
        setShowModal(false);
        setAuthSuccess("");
      }

      // Create user profile if this is a new signup
      if (event === "SIGNED_UP" && session?.user) {
        try {
          const { error } = await supabase.from("profiles").upsert({
            id: session.user.id,
            email: session.user.email,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
          if (error) {
            console.error("Error creating user profile:", error);
          }
        } catch (profileError) {
          console.error("Profile creation failed:", profileError);
        }
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  const signUp = async (email: string, password: string) => {
    try {
      // Use environment variable if available, otherwise fall back to window.location.origin
      const redirectUrl = process.env.NEXT_PUBLIC_SITE_URL
        ? `${process.env.NEXT_PUBLIC_SITE_URL}/auth/callback`
        : typeof window !== "undefined"
        ? `${window.location.origin}/auth/callback`
        : undefined;

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: redirectUrl,
        },
      });

      return { data, error };
    } catch (error) {
      return { error };
    }
  };

  const signIn = async (email: string, password: string) => {
    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      return { data, error };
    } catch (error) {
      return { error };
    }
  };

  const signOut = async () => {
    try {
      // Immediate user feedback - clear state right away
      setUser(null);
      setLoading(false);

      // Clear local storage immediately for instant UI update
      if (typeof window !== "undefined") {
        const keys = Object.keys(localStorage);
        keys.forEach((key) => {
          if (
            key.includes("supabase") ||
            key.includes("auth") ||
            key.startsWith("sb-")
          ) {
            localStorage.removeItem(key);
          }
        });
        sessionStorage.clear();
      }

      // Try to sign out from Supabase in background (with shorter timeout)
      try {
        const timeoutPromise = new Promise((_, reject) =>
          setTimeout(() => reject(new Error("Sign out timeout")), 2000)
        );
        const signOutPromise = supabase.auth.signOut();
        await Promise.race([signOutPromise, timeoutPromise]);
      } catch (supabaseError) {
        // Supabase sign out failed, but local state is already cleared
        console.warn(
          "Supabase sign out timeout, continuing with local cleanup"
        );
      }
    } catch (error) {
      console.error("Sign out failed:", error);
      // Even if everything fails, ensure user is logged out locally
      setUser(null);
      setLoading(false);
      if (typeof window !== "undefined") {
        localStorage.clear();
        sessionStorage.clear();
      }
    }
  };

  const updateProfile = async (updates: any) => {
    try {
      if (!user) throw new Error("No user logged in");

      const { error } = await supabase.from("profiles").upsert({
        id: user.id,
        ...updates,
        updated_at: new Date().toISOString(),
      });

      return { error };
    } catch (error) {
      return { error };
    }
  };

  const showAuthModal = () => {
    setShowModal(true);
    setAuthError("");
    setAuthSuccess("");
  };

  const closeModal = () => {
    setShowModal(false);
    setEmail("");
    setPassword("");
    setConfirmPassword("");
    setAuthError("");
    setIsSignUp(false);
  };

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthLoading(true);
    setAuthError("");

    if (isSignUp && password !== confirmPassword) {
      setAuthError("Passwords do not match");
      setAuthLoading(false);
      return;
    }

    try {
      let result;
      if (isSignUp) {
        result = await signUp(email, password);
        if (!result.error) {
          setAuthSuccess("Check your email for confirmation link!");
        }
      } else {
        result = await signIn(email, password);
      }

      if (result.error) {
        setAuthError(result.error.message || "Authentication failed");
      }
    } catch (error) {
      setAuthError("Something went wrong. Please try again.");
    } finally {
      setAuthLoading(false);
    }
  };

  const value = {
    user,
    loading,
    signUp,
    signIn,
    signOut,
    updateProfile,
    showAuthModal,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}

      {/* Auth Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <Card className="w-full max-w-md">
            <CardHeader>
              <CardTitle>{isSignUp ? "Sign Up" : "Sign In"}</CardTitle>
              <CardDescription>
                {isSignUp
                  ? "Create your account to track your health data"
                  : "Sign in to access your health records"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form onSubmit={handleAuth} className="space-y-4">
                <div>
                  <label
                    htmlFor="email"
                    className="block text-sm font-medium mb-1"
                  >
                    Email
                  </label>
                  <input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md"
                    required
                  />
                </div>

                <div>
                  <label
                    htmlFor="password"
                    className="block text-sm font-medium mb-1"
                  >
                    Password
                  </label>
                  <input
                    id="password"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full px-3 py-2 border border-border rounded-md"
                    required
                  />
                </div>

                {isSignUp && (
                  <div>
                    <label
                      htmlFor="confirmPassword"
                      className="block text-sm font-medium mb-1"
                    >
                      Confirm Password
                    </label>
                    <input
                      id="confirmPassword"
                      type="password"
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      className="w-full px-3 py-2 border border-border rounded-md"
                      required
                    />
                  </div>
                )}

                {authError && (
                  <div className="text-red-600 text-sm">{authError}</div>
                )}

                {authSuccess && (
                  <div className="text-green-600 text-sm">{authSuccess}</div>
                )}

                <div className="flex gap-2">
                  <Button
                    type="submit"
                    className="flex-1"
                    disabled={authLoading}
                  >
                    {authLoading
                      ? "Loading..."
                      : isSignUp
                      ? "Sign Up"
                      : "Sign In"}
                  </Button>
                  <Button type="button" variant="outline" onClick={closeModal}>
                    Cancel
                  </Button>
                </div>

                <div className="text-center">
                  <button
                    type="button"
                    onClick={() => setIsSignUp(!isSignUp)}
                    className="text-primary hover:underline text-sm"
                  >
                    {isSignUp
                      ? "Already have an account? Sign In"
                      : "Need an account? Sign Up"}
                  </button>
                </div>
              </form>
            </CardContent>
          </Card>
        </div>
      )}
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
