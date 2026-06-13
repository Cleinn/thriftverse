import { supabase } from '../lib/supabase'

export async function fetchProducts() {
  const { data, error } = await supabase
    .from('products')
    .select(`
      *,
      profiles!products_seller_id_fkey (
        username,
        shop_name
      )
    `)
    .eq('status', 'available')

  if (error) {
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

  return (data || []).map((p) => ({
    ...p,
    product_id: p.id,
    seller_username: p.profiles?.username || null,
    seller_shop_name: p.profiles?.shop_name || null,
    seller_display_name: p.profiles?.shop_name || p.profiles?.username || null,
  }))
}

export async function fetchMyActiveListings(userId) {
  if (!userId) return []
  const { data, error } = await supabase
    .from('products')
    .select('*')
    .eq('seller_id', userId)
    .eq('status', 'available')
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching own listings:', error)
    return []
  }

  return (data || []).filter((p) => !p.is_sold && (p.stock ?? 1) > 0)
}
