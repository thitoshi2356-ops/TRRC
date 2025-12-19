document.addEventListener('DOMContentLoaded', () => {
    let allRules = []; // 取得した全データを保持する

    // 1. タブ切り替え
    const tabs = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.content-section');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            const target = tab.dataset.tab;
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(target).classList.add('active');
            
            if (target === 'rules' && allRules.length === 0) loadRules();
        });
    });

    // 2. データベースからルールを取得
    async function loadRules() {
        const display = document.getElementById('rule-display');
        display.innerHTML = '<p style="text-align:center;">⏳ 規則を取得中...</p>';

        try {
            const response = await fetch('/api/get-rules');
            if (!response.ok) throw new Error('通信エラーが発生しました');
            allRules = await response.json();
            renderRules(allRules);
        } catch (error) {
            display.innerHTML = `<div class="rule-card" style="color:red;">⚠️ エラー: ${error.message}</div>`;
        }
    }

    // 3. ルールを描画する関数
    function renderRules(rules) {
        const display = document.getElementById('rule-display');
        if (rules.length === 0) {
            display.innerHTML = '<p style="text-align:center;">該当するルールがありません</p>';
            return;
        }

        display.innerHTML = rules.map(rule => `
            <div class="rule-card">
                <span class="rule-law-badge">Law ${rule.law_number}</span>
                <h3>${rule.section_title}</h3>
                <p>${rule.content_jp}</p>
            </div>
        `).join('');
    }

    // 4. キーワード検索
    document.getElementById('rule-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allRules.filter(r => 
            r.content_jp.toLowerCase().includes(query) || 
            r.section_title.toLowerCase().includes(query)
        );
        renderRules(filtered);
    });

    // 5. カテゴリフィルタ
    document.querySelectorAll('.filter-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            
            const law = btn.dataset.law;
            if (law === 'all') {
                renderRules(allRules);
            } else {
                renderRules(allRules.filter(r => r.law_number == law));
            }
        });
    });

    // 初期ロード
    loadRules();
});