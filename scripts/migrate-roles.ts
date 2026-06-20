import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

// Load env vars
dotenv.config({ path: ".env.local" });
dotenv.config();

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error("Missing Supabase environment variables");
  process.exit(1);
}

const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function migrateRoles() {
  console.log("Starting role migration from user_metadata to app_metadata...");
  let page = 1;
  const perPage = 1000; // max allowed by Supabase
  let hasMore = true;
  let migratedCount = 0;
  let skippedCount = 0;

  while (hasMore) {
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers({
      page,
      perPage,
    });

    if (error) {
      console.error(`Failed to fetch users on page ${page}:`, error.message);
      process.exit(1);
    }

    if (!users || users.length === 0) {
      hasMore = false;
      break;
    }

    console.log(`Fetched ${users.length} users on page ${page}...`);

    for (const user of users) {
      const userRole = user.user_metadata?.role;
      const appRole = user.app_metadata?.role;

      if (userRole && appRole !== userRole) {
        console.log(`Migrating user ${user.email} -> ${userRole}`);
        const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(user.id, {
          app_metadata: { role: userRole }
        });
        
        if (updateError) {
          console.error(`Failed to migrate ${user.email}:`, updateError.message);
        } else {
          migratedCount++;
        }
      } else {
        // Either no role in user_metadata, or it's already synced
        skippedCount++;
      }
    }

    if (users.length < perPage) {
      hasMore = false;
    } else {
      page++;
    }
  }

  console.log("-----------------------------------------");
  console.log("Migration Complete.");
  console.log(`Successfully migrated: ${migratedCount} users.`);
  console.log(`Skipped (already synced or no role): ${skippedCount} users.`);
}

migrateRoles().catch(console.error);
