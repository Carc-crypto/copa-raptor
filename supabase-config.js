const SUPABASE_URL =
  "https://gigcjdhnnjnrojentaev.supabase.co/rest/v1/";


const SUPABASE_KEY =
  "sb_publishable_gBHOBIn8vmrgFWZdT0cgVg_prdJJmNC";


const supabaseClient =
  window.supabase.createClient(
    SUPABASE_URL,
    SUPABASE_KEYs
  );