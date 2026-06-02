import { supabase } from '../lib/supabase'

export async function fetchProducts() {
  const { data, error } = await supabase
    .from('vw_product_details')
    .select('*')
    .eq('status', 'available')

  if (error) {
    console.error('Error fetching products:', error)
    return []
  }

  return data
}