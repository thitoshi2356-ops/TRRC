const { Pool } = require('pg');
const formidable = require('formidable');
const fs = require('fs');

// DB接続設定 (get-rules.jsと同じ)
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000,
  idleTimeoutMillis: 30000,
  max: 10,
  ssl: { rejectUnauthorized: false }
});

// Vercel等のサーバーレス環境向け設定: 自動でBody解析しないようにする
export const config = {
  api: {
    bodyParser: false,
  },
};

module.exports = async (req, res) => {
  // CORS設定
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method Not Allowed' });
  }

  // formidableを使ってFormData（動画とテキスト）を解析
  const form = new formidable.IncomingForm();
  
  form.parse(req, async (err, fields, files) => {
    if (err) {
      console.error('Form parse error:', err);
      return res.status(500).json({ error: 'データの解析に失敗しました' });
    }

    // クライアントから送られてきたデータ
    // formidableのバージョンによって fields.title が配列になる場合があるので対応
    const title = Array.isArray(fields.title) ? fields.title[0] : fields.title;
    
    // 動画ファイルの情報（今回は保存せず、ファイル名だけDBに入れる簡易実装とします）
    // ※本格運用ではここで AWS S3 や Vercel Blob にアップロードします
    const videoFile = files.video ? (Array.isArray(files.video) ? files.video[0] : files.video) : null;
    const fakeVideoUrl = videoFile ? `https://example.com/videos/${videoFile.originalFilename}` : null;

    let client;
    try {
      client = await pool.connect();
      
      // DBに投稿データを挿入
      const query = `
        INSERT INTO discussions (title, author, video_url, votes_pk, votes_playon, votes_yc)
        VALUES ($1, 'Current User', $2, 0, 0, 0)
        RETURNING id, title, author, created_at;
      `;
      
      const result = await client.query(query, [title, fakeVideoUrl]);
      
      // 成功レスポンス
      res.status(200).json({ 
        message: '投稿成功', 
        post: result.rows[0]
      });

    } catch (dbError) {
      console.error('DB Insert Error:', dbError);
      res.status(500).json({ error: 'データベースへの保存に失敗しました', detail: dbError.message });
    } finally {
      if (client) client.release();
    }
  });
};