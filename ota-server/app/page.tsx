import { GET as getAppUpdatePolicy } from "./api/app-update/route";

// Trivial status page so this project's root URL isn't a 404. The version
// shown is read live from the same policy the app receives on
// GET /api/app-update, so it can never drift from what's actually served.
export default async function Home() {
  const policy = await (await getAppUpdatePolicy()).json();
  return (
    <main style={{ fontFamily: "system-ui, sans-serif", padding: 24 }}>
      <h1>Mirror Mess OTA server</h1>
      <p>
        Standalone update server for the Mirror Mess Android app. It only
        serves web-bundle updates — the app itself and its API live in the
        main hostel app.
      </p>
      <ul>
        <li>Current bundle version: {policy.latestBundleVersion}</li>
        <li>Minimum app (APK) version: {policy.minNativeVersion}</li>
        <li>Latest app (APK) version: {policy.latestNativeVersion}</li>
      </ul>
      <ul>
        <li>
          Update check: <code>GET / POST /api/app-update</code>
        </li>
        <li>
          Bundle download: <code>GET /api/app-update/bundle</code>
        </li>
      </ul>
    </main>
  );
}
