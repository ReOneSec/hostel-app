import { createClient } from '@supabase/supabase-js'
import { PrismaClient } from '@prisma/client'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const prisma = new PrismaClient()

async function main() {
  console.log("Creating Super Admin in Supabase Auth & Prisma...")

  if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.error("Missing SUPABASE_SERVICE_ROLE_KEY in .env.local")
    process.exit(1)
  }

  const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    }
  )

  const email = "sahabaj@mirror.com"
  const password = "Password123!"
  const username = "SuperAdmin"

  // 1. Create in Supabase Auth
  const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      role: "SUPER_ADMIN",
      isProfileComplete: true,
      needsSelfieUpdate: false
    }
  })

  if (authError) {
    if (authError.code === 'email_exists' || authError.message.includes('already registered')) {
      console.log(`User ${email} already exists in Supabase. Attempting to update metadata...`)
      
      const { data: usersData } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 100 })
      const existingUser = usersData.users.find(u => u.email === email)
      
      if (existingUser) {
        await supabaseAdmin.auth.admin.updateUserById(existingUser.id, {
          user_metadata: {
            role: "SUPER_ADMIN",
            isProfileComplete: true,
            needsSelfieUpdate: false
          }
        })
        console.log("Updated metadata for existing user in Supabase!")
      }
    } else {
      console.error("Supabase Error:", authError)
      process.exit(1)
    }
  } else {
    console.log("Created user in Supabase Auth!")
  }

  // 2. Create in Prisma
  try {
    const existingPrismaUser = await prisma.user.findUnique({ where: { email } })
    
    if (existingPrismaUser) {
      await prisma.user.update({
        where: { email },
        data: { role: "SUPER_ADMIN" }
      })
      console.log("User already exists in Prisma. Updated role.")
    } else {
      await prisma.user.create({
        data: {
          email,
          username,
          role: "SUPER_ADMIN",
          isFirstLogin: false,
          isProfileComplete: true,
          status: "ACTIVE"
        }
      })
      console.log("Created user in Prisma!")
    }
  } catch (err) {
    console.error("Prisma Error:", err)
  }

  console.log("\nSuccess! You can now log in with:")
  console.log(`Email: ${email}`)
  console.log(`Password: ${password}`)
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect())
