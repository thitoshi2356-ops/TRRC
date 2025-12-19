document.addEventListener('DOMContentLoaded', () => {
    console.log("App initialized. Start loading rules...");

    // 1. タブ切り替え機能
    const tabs = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.content-section');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');

            const target = tab.dataset.tab;
            sections.forEach(section => {
                section.classList.remove('active');
                if (section.id === target) {
                    section.classList.add('active');
                }
            });

            if (target === 'rules') {
                loadRules();
            }
        });
    });

    // 2. データベースからルールを取得する関数
    async function loadRules() {
        const ruleDisplay = document.getElementById('rule-display');
        if (!ruleDisplay) return;

        ruleDisplay.innerHTML = '<p style="padding: 20px;">⏳ データベースに接続しています...</p>';

        try {
            // Vercel の API エンドポイントを呼び出し
            const response = await fetch('/api/get-rules');
            const result = await response.json();

            if (!response.ok) {
                // サーバーエラーが発生した場合
                throw new Error(result.detail || 'サーバーエラーが発生しました');
            }

            // データが空の場合
            if (!Array.isArray(result) || result.length === 0) {
                ruleDisplay.innerHTML = '<p>データが見つかりませんでした。SQL Editorでデータが入っているか確認してください。</p>';
                return;
            }

            // 成功：データを表示
            let html = '<div class="rules-container">';
            result.forEach(rule => {
                html += `
                    <div style="border: 1px solid #ddd; margin-bottom: 15px; padding: 15px; border-radius: 8px; background: #fff; box-shadow: 0 2px 4px rgba(0,0,0,0.05);">
                        <div style="border-bottom: 2px solid #333; margin-bottom: 10px; padding-bottom: 5px;">
                            <span style="font-weight: bold; color: #e44134;">第 ${rule.law_number} 条</span>
                            <span style="margin-left: 10px; font-weight: bold;">${rule.section_title}</span>
                        </div>
                        <p style="margin: 0; line-height: 1.6; color: #333;">${rule.content_jp}</p>
                    </div>
                `;
            });
            html += '</div>';
            ruleDisplay.innerHTML = html;

        } catch (error) {
            console.error('Fetch error:', error);
            // エラーの詳細を画面にデカデカと表示
            ruleDisplay.innerHTML = `
                <div style="background: #fff5f5; border: 2px solid #ff4d4d; padding: 20px; border-radius: 8px; color: #333;">
                    <h3 style="color: #ff4d4d; margin-top: 0;">⚠️ データベース接続エラー</h3>
                    <p>このメッセージがエラーの正体です：</p>
                    <div style="background: #333; color: #fff; padding: 15px; border-radius: 4px; font-family: monospace; font-size: 0.9em; overflow-x: auto;">
                        ${error.message}
                    </div>
                    <p style="font-size: 0.8em; margin-top: 15px; color: #666;">
                        対策: NeonのConnection StringをVercelのDATABASE_URLに正しく貼り直し、再デプロイしてください。
                    </p>
                    <button onclick="location.reload()" style="margin-top: 10px; padding: 8px 16px; cursor: pointer;">再読み込み</button>
                </div>
            `;
        }
    }

    // 最初に自動で読み込みを開始
    loadRules();
});