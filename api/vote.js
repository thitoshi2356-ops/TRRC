import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method Not Allowed' });

  const { id, type } = req.body; // type: 'pk', 'playon', 'yc'

  // SQLインジェクション防止のため、カラム名はホワイトリストで確認
  const validTypes = ['votes_pk', 'votes_playon', 'votes_yc'];
  const column = `votes_${type}`; // pk -> votes_pk

  if (!id || !validTypes.includes(column)) {
    return res.status(400).json({ error: 'Invalid parameters' });
  }

  try {
    const client = await pool.connect();
    // 指定された判定のカウントを+1し、最新の行を返す
    const query = `
      UPDATE discussions 
      SET ${column} = ${column} + 1 
      WHERE id = $1 
      RETURNING *;
    `;
    const result = await client.query(query, [id]);
    client.release();

    res.status(200).json(result.rows[0]);
  } catch (error) {
    console.error('Vote Error:', error);
    res.status(500).json({ error: error.message });
  }
}