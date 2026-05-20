// ── Supabase Config ──
// Replace these with your actual Supabase project URL and anon key
const SUPABASE_URL = 'https://saqursfwtflktywzmolw.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNhcXVyc2Z3dGZsa3R5d3ptb2x3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3Nzg5NDA5NjUsImV4cCI6MjA5NDUxNjk2NX0.aF5IZbT9b485Kc-58WIzvPEOd3kJ7cekVFgzAEcni0w';

const { createClient } = supabase;
const sb = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// ── Products ──
async function dbGetProducts() {
  const { data, error } = await sb.from('products').select('*').order('id', { ascending: true });
  if (error) { console.error('getProducts:', error); return []; }
  return data;
}

async function dbSaveProduct(product) {
  const payload = {
    name: product.name || '',
    company: product.company || '',
    category: product.category || '',
    price: Number(product.price) || 0,
    mrp: Number(product.mrp) || Number(product.price) || 0,
    badge: product.badge || null,
    img: product.img || '',
    images: Array.isArray(product.images) ? product.images : [],
    description: product.description || '',
    sizes: Array.isArray(product.sizes) ? product.sizes : [],
    sizename: product.sizeName || product.sizename || '',
    qtytype: product.qtyType || product.qtytype || 'input',
    hascolors: false,
    in_stock: true,
    stock: product.stock || '',
    item_code: product.item_code || '',
    hsn_code: product.hsn_code || ''
  };
  if (product.id) {
    const { error } = await sb.from('products').update(payload).eq('id', product.id);
    if (error) { console.error('updateProduct:', error.message, error.details); return false; }
  } else {
    const { error } = await sb.from('products').insert(payload);
    if (error) { console.error('insertProduct:', error.message, error.details); return false; }
  }
  return true;
}

async function dbDeleteProduct(id) {
  const { error } = await sb.from('products').delete().eq('id', id);
  if (error) { console.error('deleteProduct:', error); return false; }
  return true;
}

// ── Categories ──
const DEFAULT_CATEGORIES = ['Electronics', 'Textiles', 'Hardware', 'FMCG', 'Automotive', 'Other'];

async function dbGetCategories() {
  // Ensure defaults exist first (upsert = safe to call every time)
  await sb.from('categories').upsert(
    DEFAULT_CATEGORIES.map(name => ({ name })),
    { onConflict: 'name', ignoreDuplicates: true }
  );
  const { data, error } = await sb.from('categories').select('name').order('name');
  if (error || !data) { console.error('getCategories:', error); return DEFAULT_CATEGORIES; }
  return data.map(r => r.name);
}

async function dbSaveCategory(name) {
  const { error } = await sb.from('categories').upsert({ name }, { onConflict: 'name', ignoreDuplicates: true });
  if (error) { console.error('saveCategory:', error); return false; }
  return true;
}

async function dbDeleteCategory(name) {
  const { error } = await sb.from('categories').delete().eq('name', name);
  if (error) { console.error('deleteCategory:', error); return false; }
  return true;
}

async function dbSyncCategoriesFromProducts(categoryNamesInUse) {
  const existing = await dbGetCategories();
  const toAdd = categoryNamesInUse.filter(c => c && !existing.includes(c));
  for (const name of toAdd) await dbSaveCategory(name);
  const { data: allProds } = await sb.from('products').select('category');
  const usedCats = new Set((allProds || []).map(p => p.category).filter(Boolean));
  const toRemove = existing.filter(c => !usedCats.has(c) && !DEFAULT_CATEGORIES.includes(c));
  for (const name of toRemove) await dbDeleteCategory(name);
}

// ── Settings ──
async function dbGetSetting(key, fallback = '') {
  const { data, error } = await sb.from('settings').select('value').eq('key', key).single();
  if (error || !data) return fallback;
  return data.value;
}

async function dbSaveSetting(key, value) {
  const { error } = await sb.from('settings').upsert({ key, value }, { onConflict: 'key' });
  if (error) { console.error('saveSetting:', error); return false; }
  return true;
}
