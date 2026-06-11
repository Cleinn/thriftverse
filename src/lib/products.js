import { supabase } from '../lib/supabase'

export async function fetchProducts() {
  // Fetch products and join with profiles to get seller username
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      profiles!products_seller_id_fkey (
        username
      )
    `)
    .eq('status', 'available')

  if (error) {
    // Fallback: try vw_product_details view if direct join fails
    const { data: viewData, error: viewError } = await supabase
      .from('vw_product_details')
      .select('*')
      .eq('status', 'available')

    if (viewError) {
      console.error('Error fetching products:', viewError)
      return []
    }
    return viewData
  }

  // Normalize: flatten profiles.username → seller_username
  return (data || []).map((p) => ({
    ...p,
    product_id: p.id,
    seller_username: p.profiles?.username || null,
  }))
}
