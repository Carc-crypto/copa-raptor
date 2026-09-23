const SUPABASE_URL = "https://gigcjdhnnjnrojentaev.supabase.co";
const SUPABASE_KEY = "sb_publishable_gBHOBIn8vmrgFWZdT0cgVg_prdJJmNC";

const supabaseClient = window.supabase 
  ? window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY) 
  : null;