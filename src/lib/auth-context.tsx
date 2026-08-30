"use client";

import { createContext, useContext, useEffect, useState } from "react";
import {
  User,
  onAuthStateChanged,
  signInWithPopup,
  signOut as firebaseSignOut,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  updateProfile,
} from "firebase/auth";
import { auth, googleProvider } from "@/lib/firebase-client";
import { apiFetch } from "@/lib/api-client";
import { UserDoc } from "@/lib/types";

type AuthContextValue = {
  user: User | null;
  profile: UserDoc | null;
  loading: boolean;
  signInWithGoogle: () => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName: string) => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  signOut: () => Promise<void>;
  getToken: () => Promise<string | null>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

/**
 * Tras cualquier alta/login exitoso, asegura que exista el perfil en
 * Firestore (users/{uid}) llamando a /api/auth/ensure-profile. Es
 * idempotente en servidor: si el perfil ya existe, no hace nada. Esto es
 * lo que genera el rol por defecto ("vendedor") y el código de referido
 * único la PRIMERA vez que se ve a ese uid, sin que el cliente decida
 * nunca esos valores directamente.
 */
async function ensureProfile(user: User, displayName?: string): Promise<UserDoc> {
  const token = await user.getIdToken();
  const res = await apiFetch("/api/auth/ensure-profile", token, {
    method: "POST",
    body: JSON.stringify({ displayName: displayName ?? user.displayName ?? user.email }),
  });
  const data = await res.json();
  return data.profile as UserDoc;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<UserDoc | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        // Se llama también en sesiones YA existentes (no solo tras un login
        // explícito) — así el rol/perfil está disponible tras recargar la
        // página con una sesión que Firebase ya recordaba, sin depender de
        // que el usuario vuelva a pasar por signInWithEmail/Google.
        try {
          const p = await ensureProfile(u);
          setProfile(p);
        } catch {
          setProfile(null);
        }
      } else {
        setProfile(null);
      }
      setLoading(false);
    });
    return unsubscribe;
  }, []);

  async function signInWithGoogle() {
    await signInWithPopup(auth, googleProvider);
    // ensureProfile se dispara solo vía el listener onAuthStateChanged de
    // arriba — no hace falta llamarlo aquí también (evitaría una petición
    // duplicada al mismo endpoint).
  }

  async function registerWithEmail(email: string, password: string, displayName: string) {
    const cred = await createUserWithEmailAndPassword(auth, email, password);
    // Guarda el nombre también en el propio perfil de Firebase Auth (útil
    // para mostrarlo en la UI antes de que responda ensure-profile).
    await updateProfile(cred.user, { displayName });
    // El listener disparará ensureProfile, pero como el displayName recién
    // actualizado puede tardar un instante en propagarse al objeto `user`
    // que ve el listener, se llama aquí también UNA vez, explícitamente con
    // el nombre correcto, para no arriesgarse a crear el perfil con un
    // nombre vacío. ensureProfile es idempotente, así que la llamada del
    // listener después no hace daño, solo relee el mismo perfil ya creado.
    await ensureProfile(cred.user, displayName);
  }

  async function signInWithEmail(email: string, password: string) {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async function resetPassword(email: string) {
    await sendPasswordResetEmail(auth, email);
  }

  async function signOut() {
    await firebaseSignOut(auth);
  }

  async function getToken(): Promise<string | null> {
    if (!auth.currentUser) return null;
    return auth.currentUser.getIdToken();
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        profile,
        loading,
        signInWithGoogle,
        registerWithEmail,
        signInWithEmail,
        resetPassword,
        signOut,
        getToken,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth debe usarse dentro de <AuthProvider>");
  return ctx;
}
