// TRRC: フロントエンドJavaScript (ルール参照機能の追加)

document.addEventListener('DOMContentLoaded', () => {
    const authSection = document.getElementById('auth-section');
    const appContent = document.getElementById('app-content');
    const userStatus = document.getElementById('user-status');
    const errorMessage = document.getElementById('error-message');
    const ruleDisplay = document.getElementById('rule-display'); // ルール表示エリア

    // 認証状態チェックのモック
    function checkAuthState() {
        const userIsLoggedIn = true; // ★一時的に「ログイン済み」と仮定
        // ... (省略: 認証後の画面切り替えロジック) ...
        if (userIsLoggedIn) {
            authSection.style.display = 'none';
            appContent.style.display = 'block';
            userStatus.textContent = 'ようこそ、TRRC会員さん！';
            loadRules(); // ★ログイン後、ルールを読み込み開始
        } else {
            authSection.style.display = 'block';
            appContent.style.display = 'none';
        }
    }

    // --- 新規追加: ルールデータをAPIから取得し、画面に表示する関数 ---
    async function loadRules() {
        ruleDisplay.innerHTML = 'ルールデータを読み込み中...';
        
        try {
            // VercelにデプロイしたAPIエンドポイント（/api/get-rules）を呼び出す
            const response = await fetch('/api/get-rules');
            const rules = await response.json();

            if (response.ok) {
                let htmlContent = '';
                let currentLaw = null;
                
                // 取得したルールデータを整形して表示
                rules.forEach(rule => {
                    if (rule.law_number !== currentLaw) {
                        if (currentLaw !== null) htmlContent += '</div>';
                        htmlContent += `<div class="law-section"><h3>Law ${rule.law_number}: ${rule.section_title}</h3>`;
                        currentLaw = rule.law_number;
                    }
                    htmlContent += `<p><strong>${rule.section_title}:</strong> ${rule.content_jp}</p>`;
                });
                if (currentLaw !== null) htmlContent += '</div>';

                ruleDisplay.innerHTML = htmlContent;
            } else {
                ruleDisplay.innerHTML = `エラー: サーバーからルールデータを取得できませんでした。エラー詳細: ${rules.error}`;
            }

        } catch (error) {
            console.error('Fetch Error:', error);
            ruleDisplay.innerHTML = '通信エラーが発生しました。Vercelのログを確認してください。';
        }
    }
    // -----------------------------------------------------------------

    // ログイン・ログアウトのモック関数（省略）
    window.handleLogin = function() { /* ... */ };
    window.handleLogout = function() { /* ... */ };

    checkAuthState();
});