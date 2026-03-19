import type { SupabaseClient } from '@supabase/supabase-js'
import type { Database } from '@/types/database'

/** Returns true when the authenticated user has admin role */
export async function isAdmin(supabase: SupabaseClient<Database>): Promise<boolean> {
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) return false

  const { data } = await supabase.from('profiles').select('role').eq('id', user.id).single()

  return data?.role === 'admin'
}

/** Validates the Authorization: Bearer <secret> header for cron/admin calls */
export function validateCronSecret(authHeader: string | null): boolean {
  if (!authHeader) return false
  const secret = process.env.CRON_SECRET
  if (!secret) return false
  const token = authHeader.replace(/^Bearer\s+/i, '')
  return token === secret
}
