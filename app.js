// TRRC アプリケーション メインスクリプト

document.addEventListener('DOMContentLoaded', () => {
    // 1. タブ切り替え機能
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

    // 2. データベースからルールを取得する関数
    async function loadRules() {
        const ruleDisplay = document.getElementById('rule-display');
        
        // ローディング表示
        ruleDisplay.innerHTML = '<p class="loading">データベースに接続中...</p>';

        try {
            // Vercel の API エンドポイントを呼び出す
            const response = await fetch('/api/get-rules');
            const rules = await response.json();

            if (!response.ok) {
                // サーバーからエラーが返ってきた場合（500エラーなど）
                throw new Error(rules.detail || 'サーバーエラーが発生しました');
            }

            if (rules.length === 0) {
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
            // 詳細なエラー理由を画面に表示する（原因特定のため）
            ruleDisplay.innerHTML = `
                <div class="error-message">
                    <p><strong>エラー: データが取得できませんでした。</strong></p>
                    <p style="font-size: 0.8em; color: #cc0000; margin-top: 10px;">
                        理由: ${error.message}
                    </p>
                    <button onclick="location.reload()" style="margin-top:10px; padding:5px 10px;">再試行</button>
                </div>
            `;
        }
    }

    // 初期状態で「ルール参照」タブの内容を読み込みたい場合は以下を有効にする
    // loadRules();
});