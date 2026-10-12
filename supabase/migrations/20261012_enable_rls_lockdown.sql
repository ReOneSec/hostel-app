-- Mirror Hostels - Database Access Lockdown (Phase 3.1)
-- Enables Row Level Security on all application tables and revokes direct access from anon/authenticated roles.
-- Next.js uses Prisma with the postgres connection string which bypasses RLS.

DO $$ 
DECLARE 
    t text;
    tables text[] := ARRAY[
        'users',
        'student_profiles',
        'remarks',
        'documents',
        'selfies',
        'hostels',
        'rooms',
        'beds',
        'hostel_assignments',
        'room_assignments',
        'bed_assignments',
        'lifecycle_events',
        'hostel_manager_assignments',
        'monthly_manager_sessions',
        'rent_configs',
        'establishment_fees',
        'bed_fees',
        'bills',
        'payments',
        'late_fee_records',
        'mess_configs',
        'mess_sessions',
        'mess_initial_contributions',
        'mess_market_expenses',
        'mess_water_expenses',
        'mess_guest_meals',
        'mess_student_meal_counts',
        'mess_settlements',
        'mess_documents',
        'audit_logs',
        'notifications',
        'profile_edit_requests',
        'devices'
    ];
BEGIN
    FOREACH t IN ARRAY tables LOOP
        IF EXISTS (
            SELECT FROM pg_tables 
            WHERE schemaname = 'public' 
            AND tablename = t
        ) THEN
            EXECUTE format('ALTER TABLE public.%I ENABLE ROW LEVEL SECURITY;', t);
            EXECUTE format('REVOKE ALL ON TABLE public.%I FROM anon, authenticated;', t);
        END IF;
    END LOOP;
END $$;
