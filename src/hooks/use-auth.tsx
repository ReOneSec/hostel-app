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
        setData({
          user: {
            id: user.id,
            email: user.email!,
            role: user.user_metadata?.role as any,
            isFirstLogin: user.user_metadata?.isFirstLogin ?? false,
            isProfileComplete: user.user_metadata?.isProfileComplete ?? false,
            needsSelfieUpdate: user.user_metadata?.needsSelfieUpdate ?? false,
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
          setData({
            user: {
              id: session.user.id,
              email: session.user.email!,
              role: session.user.user_metadata?.role as any,
              isFirstLogin: session.user.user_metadata?.isFirstLogin ?? false,
              isProfileComplete: session.user.user_metadata?.isProfileComplete ?? false,
              needsSelfieUpdate: session.user.user_metadata?.needsSelfieUpdate ?? false,
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
