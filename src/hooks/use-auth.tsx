import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import type { Session as CustomSession } from "@/lib/auth";

export function useSession() {
  const [data, setData] = useState<CustomSession | null>(null);
  const [status, setStatus] = useState<"loading" | "authenticated" | "unauthenticated">("loading");

  useEffect(() => {
    const supabase = createClient();

    const fetchSession = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        // Fetch fresh data from our DB to ensure role and completion status are accurate
        try {
          const res = await fetch('/api/users/me');
          if (res.ok) {
            const dbUser = await res.json();
            setData({
              user: {
                id: dbUser.data.id,
                email: dbUser.data.email,
                role: dbUser.data.role,
                status: dbUser.data.status,
                isFirstLogin: dbUser.data.isFirstLogin,
                isProfileComplete: dbUser.data.isProfileComplete,
                needsSelfieUpdate: dbUser.data.needsSelfieUpdate,
                privacyConsentAt: dbUser.data.privacyConsentAt !== undefined 
                  ? (dbUser.data.privacyConsentAt ? new Date(dbUser.data.privacyConsentAt) : null) 
                  : (user.user_metadata?.privacyConsentAt ? new Date(user.user_metadata.privacyConsentAt) : null),
                username: dbUser.data.username || dbUser.data.email.split('@')[0],
              }
            });
            setStatus("authenticated");
            return;
          }
        } catch (e) {
          console.error("Failed to fetch fresh user data", e);
        }
        
        // Fallback to supabase metadata if API fails
        setData({
          user: {
            id: user.id,
            email: user.email!,
            role: user.app_metadata?.role as any || "STUDENT",
            status: user.user_metadata?.status || "ACTIVE",
            isFirstLogin: user.user_metadata?.isFirstLogin ?? false,
            isProfileComplete: user.user_metadata?.isProfileComplete ?? false,
            needsSelfieUpdate: user.user_metadata?.needsSelfieUpdate ?? false,
            privacyConsentAt: user.user_metadata?.privacyConsentAt ? new Date(user.user_metadata.privacyConsentAt) : null,
            username: user.user_metadata?.username ?? user.email!.split('@')[0],
          }
        });
        setStatus("authenticated");
      } else {
        setData(null);
        setStatus("unauthenticated");
      }
    };

    fetchSession();

    const { data: authListener } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (session?.user) {
          // Fetch fresh data from our DB to ensure role and completion status are accurate
          try {
            const res = await fetch('/api/users/me');
            if (res.ok) {
              const dbUser = await res.json();
              setData({
                user: {
                  id: dbUser.data.id,
                  email: dbUser.data.email,
                  role: dbUser.data.role,
                  status: dbUser.data.status,
                  isFirstLogin: dbUser.data.isFirstLogin,
                  isProfileComplete: dbUser.data.isProfileComplete,
                  needsSelfieUpdate: dbUser.data.needsSelfieUpdate,
                  privacyConsentAt: dbUser.data.privacyConsentAt !== undefined 
                    ? (dbUser.data.privacyConsentAt ? new Date(dbUser.data.privacyConsentAt) : null) 
                    : (session.user.user_metadata?.privacyConsentAt ? new Date(session.user.user_metadata.privacyConsentAt) : null),
                  username: dbUser.data.username || dbUser.data.email.split('@')[0],
                }
              });
              setStatus("authenticated");
              return;
            }
          } catch (e) {
            console.error("Failed to fetch fresh user data on auth change", e);
          }

          // Fallback to supabase metadata
          setData({
            user: {
              id: session.user.id,
              email: session.user.email!,
              role: session.user.app_metadata?.role as any || "STUDENT",
              status: session.user.user_metadata?.status || "ACTIVE",
              isFirstLogin: session.user.user_metadata?.isFirstLogin ?? false,
              isProfileComplete: session.user.user_metadata?.isProfileComplete ?? false,
              needsSelfieUpdate: session.user.user_metadata?.needsSelfieUpdate ?? false,
              privacyConsentAt: session.user.user_metadata?.privacyConsentAt ? new Date(session.user.user_metadata.privacyConsentAt) : null,
              username: session.user.user_metadata?.username ?? session.user.email!.split('@')[0],
            }
          });
          setStatus("authenticated");
        } else {
          setData(null);
          setStatus("unauthenticated");
        }
      }
    );

    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  const update = async (metadata?: Record<string, any>) => {
    const supabase = createClient();
    if (metadata) {
      await supabase.auth.updateUser({
        data: metadata
      });
    } else {
      await supabase.auth.refreshSession();
    }
  };

  return { data, status, update };
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  window.location.href = "/login";
}
