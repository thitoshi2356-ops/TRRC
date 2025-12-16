// TRRC: サーバーレスAPI - ルール参照用
const { Pool } = require('pg');
const connectionString = process.env.DATABASE_URL;

const pool = new Pool({
    connectionString: connectionString,
});

module.exports = async (req, res) => {
    res.setHeader('Access-Control-Allow-Origin', '*'); 
    res.setHeader('Access-Control-Allow-Methods', 'GET,OPTIONS');

    if (req.method === 'OPTIONS') {
        res.writeHead(200);
        res.end();
        return;
    }

    try {
        const client = await pool.connect();
        // データベースからすべてのルールを取得するSQL
        const result = await client.query('SELECT law_number, section_title, content_jp FROM rules ORDER BY law_number, id;');
        client.release();

        res.statusCode = 200;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify(result.rows)); // JSON形式でデータを返す

    } catch (error) {
        console.error('データベースクエリ実行エラー:', error);
        res.statusCode = 500;
        res.setHeader('Content-Type', 'application/json');
        res.end(JSON.stringify({ error: 'データの取得に失敗しました。' }));
    }
};