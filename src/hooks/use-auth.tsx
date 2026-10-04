import { useEffect, useState } from "react";
import useSWR from "swr";
import { createClient } from "@/utils/supabase/client";
import type { Session as CustomSession } from "@/lib/auth";

const fetcher = (url: string) => fetch(url).then((res) => {
  if (!res.ok) throw new Error("Failed to fetch session");
  return res.json();
});

export function useSession() {
  const [supabaseUser, setSupabaseUser] = useState<any>(null);
  const [supabaseStatus, setSupabaseStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  // Track the raw supabase auth state
  useEffect(() => {
    const supabase = createClient();

    const fetchInitialSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setSupabaseUser(user);
        setSupabaseStatus("authenticated");
      } else {
        setSupabaseUser(null);
        setSupabaseStatus("unauthenticated");
      }
    };

    fetchInitialSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          setSupabaseUser(session.user);
          setSupabaseStatus("authenticated");
        } else {
          setSupabaseUser(null);
          setSupabaseStatus("unauthenticated");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Fetch from our new DB session endpoint using SWR
  // SWR automatically deduplicates multiple simultaneous calls and handles caching
  const { data: dbResponse, error, isLoading, mutate } = useSWR(
    supabaseUser ? '/api/users/session' : null,
    fetcher,
    {
      revalidateOnFocus: false,
      revalidateIfStale: false,
    }
  );

  // Derive the final status combining Supabase and DB states
  let status: "loading" | "authenticated" | "unauthenticated" = supabaseStatus;
  if (status === "authenticated" && isLoading) {
    status = "loading";
  }

  // Derive the final session data
  let data: CustomSession | null = null;
  
  if (supabaseStatus === "authenticated" && supabaseUser) {
    if (dbResponse?.data) {
      const dbUser = dbResponse.data;
      data = {
        user: {
          id: dbUser.id,
          email: dbUser.email,
          role: dbUser.role,
          status: dbUser.status,
          isFirstLogin: dbUser.isFirstLogin,
          isProfileComplete: dbUser.isProfileComplete,
          needsSelfieUpdate: dbUser.needsSelfieUpdate,
          privacyConsentAt: dbUser.privacyConsentAt 
            ? new Date(dbUser.privacyConsentAt) 
            : (supabaseUser.user_metadata?.privacyConsentAt ? new Date(supabaseUser.user_metadata.privacyConsentAt) : null),
          username: dbUser.username || dbUser.email.split('@')[0],
        }
      };
    } else if (error) {
      // Fallback to supabase metadata if API fails or hasn't loaded yet and error occurred
      data = {
        user: {
          id: supabaseUser.id,
          email: supabaseUser.email!,
          role: supabaseUser.app_metadata?.role as any || "STUDENT",
          status: supabaseUser.user_metadata?.status || "ACTIVE",
          isFirstLogin: supabaseUser.user_metadata?.isFirstLogin ?? false,
          isProfileComplete: supabaseUser.user_metadata?.isProfileComplete ?? false,
          needsSelfieUpdate: supabaseUser.user_metadata?.needsSelfieUpdate ?? false,
          privacyConsentAt: supabaseUser.user_metadata?.privacyConsentAt ? new Date(supabaseUser.user_metadata.privacyConsentAt) : null,
          username: supabaseUser.user_metadata?.username ?? supabaseUser.email!.split('@')[0],
        }
      };
    } else if (isLoading) {
      // Optional: you can choose to provide the fallback data here too while it's loading,
      // but usually returning null for data when status is "loading" is safer.
      data = null;
    }
  }

  const update = async (metadata?: Record<string, any>) => {
    const supabase = createClient();
    if (metadata) {
      await supabase.auth.updateUser({
        data: metadata
      });
      // Optionally mutate SWR cache if user metadata was updated in our DB as well
      mutate();
    } else {
      await supabase.auth.refreshSession();
      mutate();
    }
  };

  return { data, status, update };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = "/login";
}
