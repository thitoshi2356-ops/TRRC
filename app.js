// TRRC アプリケーション メインスクリプト

document.addEventListener('DOMContentLoaded', () => {
    console.log("App.js loaded successfully");

    // --- 0. ログイン画面の制御 (極めて強力にボタンを探します) ---
    const loginOverlay = document.getElementById('login-overlay');
    
    // ページ内のすべてのボタンを監視対象にする（IDが違っても動くようにする）
    const allButtons = document.querySelectorAll('button');
    
    allButtons.forEach(btn => {
        // ボタンに「ログイン」という文字が含まれているか、特定のIDがある場合
        if (btn.textContent.includes('ログイン') || btn.id === 'login-btn') {
            btn.addEventListener('click', (e) => {
                e.preventDefault();
                console.log("Login button clicked!");
                if (loginOverlay) {
                    loginOverlay.style.display = 'none';
                    console.log("Overlay hidden");
                } else {
                    console.error("Login overlay (id='login-overlay') not found");
                }
            });
        }
    });

    // --- 1. タブ切り替え機能 ---
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

    // --- 2. データベースからルールを取得する関数 ---
    async function loadRules() {
        const ruleDisplay = document.getElementById('rule-display');
        if (!ruleDisplay) return;

        ruleDisplay.innerHTML = '<p class="loading">⏳ データベースに接続中...</p>';

        try {
            const response = await fetch('/api/get-rules');
            const result = await response.json();

            if (!response.ok) {
                throw new Error(result.detail || 'サーバーエラーが発生しました');
            }

            if (!Array.isArray(result) || result.length === 0) {
                ruleDisplay.innerHTML = '<p>登録されているルールがありません。</p>';
                return;
            }

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
            ruleDisplay.innerHTML = `
                <div class="error-message" style="background: #fff0f0; padding: 20px; border-radius: 8px; border: 1px solid #ffcccc; color: #333;">
                    <p style="color: #d00; font-weight: bold;">⚠️ 接続エラーが発生しました</p>
                    <div style="margin-top: 15px; background: #eee; padding: 10px; border-radius: 4px; font-family: monospace;">
                        <strong>理由:</strong> ${error.message}
                    </div>
                    <button onclick="location.reload()" style="margin-top:15px; padding:10px; cursor:pointer;">再読み込み</button>
                </div>
            `;
        }
    }
});