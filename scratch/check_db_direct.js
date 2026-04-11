const { Client } = require('pg');
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

// Assuming standard Supabase DB URL format
const dbPassword = env.SUPABASE_DB_PASSWORD;
const dbUrl = `postgresql://postgres:${dbPassword}@db.mwcrdfohhkfavezdfpcc.supabase.co:5432/postgres`;

async function check() {
  const client = new Client({ connectionString: dbUrl });
  try {
    await client.connect();
    const res = await client.query('SELECT id, status, training_id, error, created_at FROM photoshoots ORDER BY created_at DESC LIMIT 5');
    console.log(JSON.stringify(res.rows, null, 2));
  } catch (err) {
    console.error('Database Error:', err.message);
  } finally {
    await client.end();
  }
}

check();
