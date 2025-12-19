import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  
  try {
    const client = await pool.connect();
    // 新しい投稿順に取得
    const query = 'SELECT * FROM discussions ORDER BY created_at DESC;';
    const result = await client.query(query);
    client.release();
    
    res.status(200).json(result.rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
}