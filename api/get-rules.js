const { Pool } = require('pg');

// 接続設定（タイムアウトを長めに設定し、接続を安定させます）
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  connectionTimeoutMillis: 5000, // 5秒待つ
  idleTimeoutMillis: 30000,
  max: 10,
  ssl: {
    rejectUnauthorized: false // SSL接続をより柔軟に許可
  }
});

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  let client;
  try {
    // 1. 接続を試みる
    client = await pool.connect();
    
    // 2. クエリ実行
    const result = await client.query('SELECT law_number, section_title, content_jp FROM rules ORDER BY law_number, id;');
    
    // 3. 成功したらデータを返す
    res.status(200).json(result.rows);

  } catch (error) {
    // 4. 失敗した場合、エラーの詳細をフロントエンドに送る（診断用）
    console.error('DB Error Detail:', error.message);
    res.status(500).json({ 
      error: 'データの取得に失敗しました。',
      detail: error.message // ← これで具体的な原因が画面に表示されます
    });
  } finally {
    if (client) client.release();
  }
};