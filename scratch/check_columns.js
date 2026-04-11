const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.join(process.cwd(), '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const parts = line.split('=');
  if (parts.length >= 2) {
    const key = parts[0].trim();
    const value = parts.slice(1).join('=').trim().replace(/^"|"$/g, '');
    env[key] = value;
  }
});

const url = env.NEXT_PUBLIC_SUPABASE_URL;
const key = env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(url, key);

async function checkSchema() {
  // We try to insert a bogus ID to see what columns error out or we can try to find another way.
  // Actually, we can just use the supabase client to get the table definition if we had service role.
  // Since we don't, we'll try a dummy select.
  
  const { data, error } = await supabase.from('photoshoots').select('*').limit(1);
  if (error) {
    console.error('Error:', error);
    return;
  }
  
  if (data && data.length > 0) {
    console.log('Columns found:', Object.keys(data[0]));
  } else {
    // If no data, we try to select columns we suspect exist
    console.log('No data found to check columns.');
  }
}

checkSchema();
