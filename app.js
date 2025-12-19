// TRRC アプリケーション メインスクリプト

document.addEventListener('DOMContentLoaded', () => {
    // --- 0. ログイン画面の制御 (確実に動くように強化) ---
    const loginOverlay = document.getElementById('login-overlay');
    // ID "login-btn" またはボタンのタグ名から探します
    const loginBtn = document.getElementById('login-btn') || document.querySelector('button');

    if (loginBtn && loginOverlay) {
        loginBtn.addEventListener('click', (e) => {
            e.preventDefault(); // 画面リロードを防止
            loginOverlay.style.display = 'none'; // ログイン画面を消す
            console.log("Login successful");
        });
    }

    // --- 1. タブ切り替え機能 ---
    const tabs = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.content-section');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            // アクティブなタブの切り替え
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            // 表示セクションの切り替え
            const target = tab.dataset.tab;
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === target) {
                    section.classList.add('active');
                }
            });

            // 「ルール参照」タブがクリックされた時にデータを読み込む
            if (target === 'rules') {
                loadRules();
            }
        });
    });

    // --- 2. データベースからルールを取得する関数 ---
    async function loadRules() {
        const ruleDisplay = document.getElementById('rule-display');
        if (!ruleDisplay) return;

        // ローディング表示
        ruleDisplay.innerHTML = '<p class="loading">⏳ データベースに接続中...</p>';

        try {
            // Vercel の API エンドポイントを呼び出す
            const response = await fetch('/api/get-rules');
            
            // JSONデータとして受け取る
            const result = await response.json();

            if (!response.ok) {
                // API側でエラーが発生した場合（500エラーなど）
                throw new Error(result.detail || 'サーバーエラーが発生しました');
            }

            if (!Array.isArray(result) || result.length === 0) {
                ruleDisplay.innerHTML = '<p>登録されているルールがありません。</p>';
                return;
            }

            // 取得したデータをHTMLに組み立てる
            let html = '<div class="rules-container">';
            result.forEach(rule => {
                html += `
                    <div class="rule-card" style="border:1px solid #ddd; margin-bottom:10px; padding:15px; border-radius:8px; background:#fff;">
                        <div class="rule-header" style="border-bottom:2px solid #333; margin-bottom:10px; padding-bottom:5px;">
                            <span class="law-num" style="font-weight:bold; color: #d00;">第 ${rule.law_number} 条</span>
                            <span class="section-title" style="margin-left:10px; font-weight:bold;">${rule.section_title}</span>
                        </div>
                        <div class="rule-content">
                            <p style="margin:0; line-height:1.6;">${rule.content_jp}</p>
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            ruleDisplay.innerHTML = html;

        } catch (error) {
            console.error('Fetch error:', error);
            // エラーの詳細を画面に分かりやすく表示
            ruleDisplay.innerHTML = `
                <div class="error-message" style="background: #fff0f0; padding: 20px; border-radius: 8px; border: 1px solid #ffcccc; color: #333;">
                    <p style="color: #d00; font-weight: bold; font-size: 1.1em;">⚠️ データの取得に失敗しました</p>
                    <div style="margin-top: 15px; background: #fdfdfd; padding: 10px; border: 1px dashed #ccc; font-family: monospace; font-size: 0.9em;">
                        <strong>理由:</strong> ${error.message}
                    </div>
                    <p style="font-size: 0.8em; color: #666; margin-top: 10px;">
                        ※ DATABASE_URLの設定やNeonの接続状態を確認してください。
                    </p>
                    <button onclick="location.reload()" style="margin-top:15px; padding:10px 20px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer;">再読み込みを試す</button>
                </div>
            `;
        }
    }
});