"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import {
  onAuthStateChanged,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut as firebaseSignOut,
  sendPasswordResetEmail,
  verifyPasswordResetCode,
  confirmPasswordReset,
  updateProfile,
  type ActionCodeSettings,
  type User,
} from "firebase/auth";
import { getClientAuth, initAppCheck } from "@/config/firebase-client";
import { ensureDelizzaCustomerSession } from "@/services/customer-session";

interface AuthContextValue {
  user: User | null;
  loading: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (params: { email: string; password: string; displayName: string; phone: string }) => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  verifyResetCode: (code: string) => Promise<string>;
  confirmPasswordResetCode: (code: string, newPassword: string) => Promise<void>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);
const PASSWORD_RESET_AUTH_ROUTE = "/auth";

function buildPasswordResetActionSettings(origin: string): ActionCodeSettings {
  const authRouteUrl = new URL(PASSWORD_RESET_AUTH_ROUTE, origin);
  authRouteUrl.search = "";
  authRouteUrl.hash = "";

  return {
    // This is the continueUrl; Firebase Auth Console must use this route as the password-reset Action URL too.
    url: authRouteUrl.toString(),
    handleCodeInApp: false,
  };
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    initAppCheck();
    const auth = getClientAuth();
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      setUser(firebaseUser);
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  const signIn = async (email: string, password: string) => {
    const auth = getClientAuth();
    await signInWithEmailAndPassword(auth, email, password);
    await ensureDelizzaCustomerSession(true);
  };

  const signUp = async ({
    email,
    password,
    displayName,
    phone,
  }: { email: string; password: string; displayName: string; phone: string }) => {
    const auth = getClientAuth();
    const credential = await createUserWithEmailAndPassword(auth, email, password);
    if (displayName.trim()) {
      await updateProfile(credential.user, { displayName: displayName.trim() });
    }
    await ensureDelizzaCustomerSession(true, { displayName, phone });
  };

  const sendPasswordReset = async (email: string) => {
    const auth = getClientAuth();
    await sendPasswordResetEmail(
      auth,
      email,
      buildPasswordResetActionSettings(window.location.origin),
    );
  };

  const confirmPasswordResetCode = async (code: string, newPassword: string) => {
    await confirmPasswordReset(getClientAuth(), code, newPassword);
  };

  const verifyResetCode = async (code: string) => {
    return verifyPasswordResetCode(getClientAuth(), code);
  };

  const signOut = async () => {
    const auth = getClientAuth();
    await firebaseSignOut(auth);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        signIn,
        signUp,
        sendPasswordReset,
        verifyResetCode,
        confirmPasswordResetCode,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return ctx;
}
