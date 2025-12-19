import { Pool } from 'pg';
import formidable from 'formidable';

// データベース接続設定
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10,
  ssl: {
    rejectUnauthorized: false
  }
});

// Vercel設定: 動画データ（バイナリ）を解析するため標準の解析をオフにする
export const config = {
  api: {
    bodyParser: false,
  },
};

export default async function handler(req, res) {
  // CORS設定（フロントエンドからのアクセス許可）
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // formidable v3 の非同期解析を使用
  const form = formidable({});
  
  try {
    const [fields, files] = await form.parse(req);
    
    // フィールドの取得（formidable v3では配列で返ることが多いため安全に取得）
    const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
    
    if (!title) {
      return res.status(400).json({ error: 'タイトルが必要です' });
    }

    // データベースへ保存
    const client = await pool.connect();
    try {
      const query = `
        INSERT INTO discussions (title, author, video_url, votes_pk, votes_playon, votes_yc)
        VALUES ($1, $2, $3, 0, 0, 0)
        RETURNING *;
      `;
      // 現状はストレージ(S3等)がないため、video_urlはダミーを入れます
      const result = await client.query(query, [title, 'Guest Referee', 'https://example.com/video.mp4']);
      
      return res.status(200).json({
        message: '投稿成功',
        post: result.rows[0]
      });
    } finally {
      client.release();
    }

  } catch (err) {
    console.error('API Error:', err);
    return res.status(500).json({
      error: 'サーバーエラーが発生しました',
      detail: err.message
    });
  }
}