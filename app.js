document.addEventListener('DOMContentLoaded', () => {
    let allRules = [];
    let currentLawFilter = 'all'; // 現在選択されているLaw

    // --- 1. タブ管理 ---
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            const target = tab.dataset.tab;
            document.getElementById(target).classList.add('active');
            
            if (target === 'rules' && allRules.length === 0) loadRules();
            if (target === 'discussion') renderDiscussion();
        });
    });

    // --- 2. ルール取得 & 表示 ---
    async function loadRules() {
        const display = document.getElementById('rule-display');
        display.innerHTML = '<p>ロード中...</p>';
        try {
            const res = await fetch('/api/get-rules');
            allRules = await res.json();
            
            // Lawボタン（絞り込み）を生成
            renderLawFilters();
            // 最初は全件表示
            applyFilters();
        } catch (e) {
            display.innerHTML = '<p>失敗しました</p>';
        }
    }

    // Lawボタン (1, 2, 3...) を自動生成する機能
    function renderLawFilters() {
        const filterContainer = document.getElementById('law-filters');
        if (!filterContainer) return;

        // 存在するLaw番号を重複なく取得して並べる
        const laws = [...new Set(allRules.map(r => r.law_number))].sort((a, b) => a - b);
        
        filterContainer.innerHTML = `<button class="filter-chip active" data-law="all">ALL</button>` + 
            laws.map(num => `<button class="filter-chip" data-law="${num}">Law ${num}</button>`).join('');

        // ボタンクリックイベント
        filterContainer.querySelectorAll('.filter-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                filterContainer.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentLawFilter = btn.dataset.law;
                applyFilters(); // フィルター実行
            });
        });
    }

    // 検索とLawボタンの両方を考慮して表示を切り替える
    function applyFilters() {
        const searchQuery = document.getElementById('rule-search').value.toLowerCase();
        
        const filtered = allRules.filter(r => {
            const matchesLaw = (currentLawFilter === 'all' || r.law_number.toString() === currentLawFilter);
            const matchesSearch = (r.section_title.toLowerCase().includes(searchQuery) || r.content_jp.toLowerCase().includes(searchQuery));
            return matchesLaw && matchesSearch;
        });

        const display = document.getElementById('rule-display');
        display.innerHTML = filtered.map(r => `
            <div class="rule-card">
                <div class="rule-header"><span class="rule-law-badge">LAW ${r.law_number}</span></div>
                <h3>${r.section_title}</h3>
                <p>${r.content_jp.replace(/(PK|FK|スクラム)/g, '<span class="penalty-badge pb-$1">$1</span>')}</p>
            </div>`).join('');
    }

    // 検索入力時のイベント
    document.getElementById('rule-search').addEventListener('input', applyFilters);

    // 初期ロード
    loadRules();
});
