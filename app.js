document.addEventListener('DOMContentLoaded', () => {
    let allRules = [];

    // --- 1. タブ切り替え ---
    const tabs = document.querySelectorAll('.tab-btn');
    const sections = document.querySelectorAll('.content-section');

    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            sections.forEach(s => s.classList.remove('active'));
            document.getElementById(tab.dataset.tab).classList.add('active');
            
            if (tab.dataset.tab === 'rules' && allRules.length === 0) loadRules();
        });
    });

    // --- 2. フィルタボタン(Law 1-21)の自動生成 ---
    const filterContainer = document.getElementById('law-filters');
    for (let i = 1; i <= 21; i++) {
        const btn = document.createElement('button');
        btn.className = 'filter-btn';
        btn.dataset.law = i;
        btn.textContent = `Law ${i}`;
        filterContainer.appendChild(btn);
    }

    // --- 3. 2025年版カテゴリ名定義 ---
    function getLawCategory(num) {
        const categories = {
            1:"試合場", 2:"ボール", 3:"チーム", 4:"服装", 5:"時間", 6:"役員",
            7:"プレーの進め方", 8:"得点", 9:"不正なプレー", 10:"オフサイド/オンサイド",
            11:"ノックオン/スローフォワード", 12:"キックオフ/再開の蹴り", 13:"地面でのプレー",
            14:"タックル", 15:"ラック", 16:"モール", 17:"マーク", 18:"タッチ/ラインアウト",
            19:"スクラム", 20:"ペナルティ/フリーキック", 21:"インゴール"
        };
        return categories[num] || "";
    }

    // --- 4. データベースからルールを取得 ---
    async function loadRules() {
        const display = document.getElementById('rule-display');
        display.innerHTML = '<p style="text-align:center; padding:20px;">⏳ 2025年競技規則を読み込み中...</p>';

        try {
            const response = await fetch('/api/get-rules');
            if (!response.ok) throw new Error('通信エラーが発生しました');
            allRules = await response.json();
            renderRules(allRules);
        } catch (error) {
            display.innerHTML = `<div class="rule-card" style="color:red; border-left-color:red;">⚠️ エラー: ${error.message}</div>`;
        }
    }

    // --- 5. ルールの描画処理 ---
    function renderRules(rules) {
        const display = document.getElementById('rule-display');
        if (rules.length === 0) {
            display.innerHTML = '<p style="text-align:center; padding:20px;">該当するルールが見つかりません</p>';
            return;
        }

        display.innerHTML = rules.map(rule => `
            <div class="rule-card">
                <div class="rule-header">
                    <span class="rule-law-badge">LAW ${rule.law_number}</span>
                    <span class="rule-category">${getLawCategory(rule.law_number)}</span>
                </div>
                <h3>${rule.section_title}</h3>
                <p>${rule.content_jp}</p>
            </div>
        `).join('');
    }

    // --- 6. 検索とフィルタのイベント設定 ---
    
    // キーワード検索
    document.getElementById('rule-search').addEventListener('input', (e) => {
        const query = e.target.value.toLowerCase();
        const filtered = allRules.filter(r => 
            r.content_jp.toLowerCase().includes(query) || 
            r.section_title.toLowerCase().includes(query)
        );
        renderRules(filtered);
    });

    // Lawボタンフィルタ (親要素にイベント委譲)
    filterContainer.addEventListener('click', (e) => {
        if (!e.target.classList.contains('filter-btn')) return;

        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');

        const law = e.target.dataset.law;
        if (law === 'all') {
            renderRules(allRules);
        } else {
            renderRules(allRules.filter(r => r.law_number == law));
        }
    });

    // 初期ロード
    loadRules();
});