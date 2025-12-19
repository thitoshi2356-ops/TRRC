import { Pool } from 'pg';

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();

  const client = await pool.connect();

  try {
    // --- コメント取得 (GET) ---
    if (req.method === 'GET') {
      const { discussion_id } = req.query;
      if (!discussion_id) throw new Error('discussion_id is required');

      const result = await client.query(
        'SELECT * FROM comments WHERE discussion_id = $1 ORDER BY created_at ASC',
        [discussion_id]
      );
      return res.status(200).json(result.rows);
    }

    // --- コメント投稿 (POST) ---
    if (req.method === 'POST') {
      const { discussion_id, content, author_name } = req.body;
      if (!discussion_id || !content) throw new Error('Missing fields');

      // トランザクション開始
      await client.query('BEGIN');

      // 1. コメント挿入
      const insertQuery = `
        INSERT INTO comments (discussion_id, content, author_name)
        VALUES ($1, $2, $3)
        RETURNING *;
      `;
      const result = await client.query(insertQuery, [discussion_id, content, author_name || 'Guest']);

      // 2. 議論テーブルのコメント数を更新 (オプションのカラムがある場合)
      // await client.query('UPDATE discussions SET comment_count = comment_count + 1 WHERE id = $1', [discussion_id]);

      await client.query('COMMIT');
      return res.status(200).json(result.rows[0]);
    }

  } catch (error) {
    await client.query('ROLLBACK');
    res.status(500).json({ error: error.message });
  } finally {
    client.release();
  }
}