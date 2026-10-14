import { initializeApp, getApps, cert, type App } from "firebase-admin/app";
import { getMessaging, type Messaging } from "firebase-admin/messaging";

function getCredentials() {
  const projectId = process.env.FIREBASE_PROJECT_ID?.trim();
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL?.trim();
  const rawKey = process.env.FIREBASE_PRIVATE_KEY?.trim();
  const privateKey = rawKey ? rawKey.replace(/\\n/g, "\n") : undefined;

  return { projectId, clientEmail, privateKey };
}

export function isPushConfigured(): boolean {
  const { projectId, clientEmail, privateKey } = getCredentials();
  return Boolean(projectId && clientEmail && privateKey);
}

export function getFirebaseAdminApp(): App | null {
  if (typeof window !== "undefined") {
    // Safety check: Never run or initialize Firebase Admin on client side
    return null;
  }

  const existingApps = getApps();
  if (existingApps.length > 0) {
    return existingApps[0]!;
  }

  const { projectId, clientEmail, privateKey } = getCredentials();

  if (!projectId || !clientEmail || !privateKey) {
    if (process.env.NODE_ENV !== "test") {
      console.warn(
        "[Firebase Admin] Missing required credentials (FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL, FIREBASE_PRIVATE_KEY). Push notifications are disabled."
      );
    }
    return null;
  }

  try {
    return initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey,
      }),
    });
  } catch (err: any) {
    console.error("[Firebase Admin] Initialization failed:", err?.message || err);
    return null;
  }
}

export function getFirebaseMessaging(): Messaging | null {
  const app = getFirebaseAdminApp();
  if (!app) return null;
  try {
    return getMessaging(app);
  } catch (err: any) {
    console.error("[Firebase Admin] Failed to get messaging instance:", err?.message || err);
    return null;
  }
}
