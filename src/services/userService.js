import { supabase } from '../lib/supabaseClient'

export async function ambilProfil(userId) {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, nip, nama, unit_kerja, role, is_verified')
    .eq('id', userId)
    .maybeSingle()
  if (error) throw error
  return data
}
