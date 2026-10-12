import { useEffect, useState } from "react";
import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type { Session as CustomSession } from "@/lib/auth";

const SESSION_CACHE_KEY = "mirror_auth_session";

function getStoredSession(): CustomSession | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SESSION_CACHE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setStoredSession(session: CustomSession | null) {
  if (typeof window === "undefined") return;
  try {
    if (session) {
      localStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(session));
    } else {
      localStorage.removeItem(SESSION_CACHE_KEY);
    }
  } catch {
    // LocalStorage quota or access error
  }
}

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch session");
  return res.json();
});

export function useSession() {
  const [cachedSession, setCachedSession] = useState<CustomSession | null>(null);

  // 1. Instantly hydrate from localStorage for instantaneous chrome rendering (FIX 4)
  useEffect(() => {
    const stored = getStoredSession();
    if (stored) {
      setCachedSession(stored);
    }
  }, []);

  // 2. Auth listener for cross-tab or explicit sign-out events
  useEffect(() => {
    const supabase = createClient();
    const { data: authListener } = supabase.auth.onAuthStateChange(
      (event, session) => {
        if (event === "SIGNED_OUT" || !session) {
          setStoredSession(null);
          setCachedSession(null);
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // 3. SWR revalidation in the background without blocking render on browser-side getUser()
  const { data: dbResponse, error, isLoading, mutate } = useSWR(
    "/api/users/session",
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
      shouldRetryOnError: false,
    }
  );

  // 4. Update display cache upon fresh server session
  useEffect(() => {
    if (dbResponse?.data) {
      const dbUser = dbResponse.data;
      const freshSession: CustomSession = {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role,
          status: dbUser.status,
          isFirstLogin: dbUser.isFirstLogin,
          isProfileComplete: dbUser.isProfileComplete,
          needsSelfieUpdate: dbUser.needsSelfieUpdate,
          privacyConsentAt: dbUser.privacyConsentAt ? new Date(dbUser.privacyConsentAt) : null,
          username: dbUser.username || dbUser.email.split("@")[0],
        },
      };
      setStoredSession(freshSession);
      setCachedSession(freshSession);
    } else if (error) {
      setStoredSession(null);
      setCachedSession(null);
    }
  }, [dbResponse, error]);

  // Derive session: live server data overrides local cache once loaded
  const activeSession: CustomSession | null = dbResponse?.data
    ? {
        user: {
          id: dbResponse.data.id,
          email: dbResponse.data.email,
          role: dbResponse.data.role,
          status: dbResponse.data.status,
          isFirstLogin: dbResponse.data.isFirstLogin,
          isProfileComplete: dbResponse.data.isProfileComplete,
          needsSelfieUpdate: dbResponse.data.needsSelfieUpdate,
          privacyConsentAt: dbResponse.data.privacyConsentAt
            ? new Date(dbResponse.data.privacyConsentAt)
            : null,
          username: dbResponse.data.username || dbResponse.data.email.split("@")[0],
        },
      }
    : cachedSession;

  let status: "loading" | "authenticated" | "unauthenticated" = "loading";
  if (activeSession) {
    status = "authenticated";
  } else if (!isLoading && (error || !dbResponse)) {
    status = "unauthenticated";
  }

  const update = async (metadata?: Record<string, any>) => {
    const supabase = createClient();
    if (metadata) {
      await supabase.auth.updateUser({
        data: metadata,
      });
      mutate();
    } else {
      await supabase.auth.refreshSession();
      mutate();
    }
  };

  return { data: activeSession, status, update };
}

export async function signOut() {
  setStoredSession(null);
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = "/login";
}
