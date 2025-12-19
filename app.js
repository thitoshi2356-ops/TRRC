// TRRC アプリケーション メインスクリプト

document.addEventListener('DOMContentLoaded', () => {
    // --- 0. ログイン画面の制御 (モック機能) ---
    const loginOverlay = document.getElementById('login-overlay');
    const loginBtn = document.getElementById('login-btn');

    // ログインボタンをクリックした時の処理
    if (loginBtn && loginOverlay) {
        loginBtn.addEventListener('click', () => {
            console.log("Login button clicked"); // デバッグ用
            loginOverlay.style.display = 'none';
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
        
        // ローディング表示
        ruleDisplay.innerHTML = '<p class="loading">データベースに接続中...</p>';

        try {
            // Vercel の API エンドポイントを呼び出す
            const response = await fetch('/api/get-rules');
            
            // レスポンスがJSONでない場合（404エラーなど）の対策
            const contentType = response.headers.get("content-type");
            if (!contentType || !contentType.includes("application/json")) {
                throw new Error("サーバーから正しいデータが返ってきませんでした（APIが見つかりません）");
            }

            const rules = await response.json();

            if (!response.ok) {
                // サーバーからエラーが返ってきた場合（500エラーなど）
                throw new Error(rules.detail || 'サーバー内部でエラーが発生しました');
            }

            if (!Array.isArray(rules) || rules.length === 0) {
                ruleDisplay.innerHTML = '<p>登録されているルールがありません。</p>';
                return;
            }

            // 取得したデータをHTMLに組み立てる
            let html = '<div class="rules-container">';
            rules.forEach(rule => {
                html += `
                    <div class="rule-card">
                        <div class="rule-header">
                            <span class="law-num">第 ${rule.law_number} 条</span>
                            <span class="section-title">${rule.section_title}</span>
                        </div>
                        <div class="rule-content">
                            <p>${rule.content_jp}</p>
                        </div>
                    </div>
                `;
            });
            html += '</div>';

            ruleDisplay.innerHTML = html;

        } catch (error) {
            console.error('Fetch error:', error);
            // 詳細なエラー理由を画面に表示する
            ruleDisplay.innerHTML = `
                <div class="error-message" style="background: #fff0f0; padding: 15px; border-radius: 8px; border: 1px solid #ffcccc; color: #333;">
                    <p style="color: #d00; font-weight: bold;">⚠️ エラーが発生しました</p>
                    <p style="font-size: 0.85em; margin-top: 10px; background: #eee; padding: 10px; border-radius: 4px; font-family: monospace;">
                        理由: ${error.message}
                    </p>
                    <button onclick="location.reload()" style="margin-top:10px; padding:8px 15px; background: #333; color: white; border: none; border-radius: 4px; cursor: pointer;">再読み込み</button>
                </div>
            `;
        }
    }
});