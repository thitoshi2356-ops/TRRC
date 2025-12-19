document.addEventListener('DOMContentLoaded', () => {
    let allRules = [];

    // --- 1. タブ切り替え ---
    const tabs = document.querySelectorAll('.tab-btn');
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'));
            tab.classList.add('active');
            document.querySelectorAll('.content-section').forEach(s => s.classList.remove('active'));
            document.getElementById(tab.dataset.tab).classList.add('active');
            if (tab.dataset.tab === 'rules' && allRules.length === 0) loadRules();
        });
    });

    // --- 2. フィルタボタン生成 ---
    const filterContainer = document.getElementById('law-filters');
    function createFilterUI() {
        const specialSections = [
            { id: 'charter', name: '憲章' }, { id: 'preface', name: '序文' },
            { id: 'definitions', name: '定義' }, { id: 'sevens', name: '7人制' },
            { id: 'tens', name: '10人制' }, { id: 'u19', name: 'U19' }
        ];

        let html = `<div class="filter-chips"><button class="filter-btn active" data-type="all">すべて</button></div>`;
        
        html += `<div class="filter-group-title">特別規定</div><div class="filter-chips">`;
        specialSections.forEach(s => {
            html += `<button class="filter-btn" data-type="special" data-id="${s.id}">${s.name}</button>`;
        });
        html += `</div><div class="filter-group-title">Law 1-21</div><div class="filter-chips">`;
        for (let i = 1; i <= 21; i++) {
            html += `<button class="filter-btn" data-type="law" data-id="${i}">Law ${i}</button>`;
        }
        html += `</div>`;
        filterContainer.innerHTML = html;
    }

    // --- 3. 補助関数（表示名・装飾） ---
    function getDisplayName(rule) {
        if (rule.type === 'special') {
            const names = { 
                charter: '憲章', preface: '序文', definitions: '定義', 
                sevens: '7人制', tens: '10人制', u19: 'U19' 
            };
            return names[rule.law_number] || '特別規定';
        }
        const cats = {1:"試合場", 2:"ボール", 3:"チーム", 4:"服装", 5:"時間", 6:"役員", 7:"プレーの進め方", 8:"得点", 9:"不正なプレー", 10:"オフサイド", 11:"ノックオン", 12:"再開蹴り", 13:"地面でのプレー", 14:"タックル", 15:"ラック", 16:"モール", 17:"マーク", 18:"ラインアウト", 19:"スクラム", 20:"PK/FK", 21:"インゴール"};
        return cats[rule.law_number] || "";
    }

    function decoratePenalty(text) {
        return text.replace(/(ペナルティキック|PK|ペナルティ)/g, '<span class="penalty-badge pb-pk">$1</span>')
                   .replace(/(フリーキック|FK)/g, '<span class="penalty-badge pb-fk">$1</span>')
                   .replace(/(スクラム)/g, '<span class="penalty-badge pb-scrum">$1</span>');
    }

    // --- 4. データ取得 ---
    async function loadRules() {
        const display = document.getElementById('rule-display');
        display.innerHTML = '<p style="text-align:center;">読み込み中...</p>';
        const cached = localStorage.getItem('trrc_v5');
        if (cached) {
            allRules = JSON.parse(cached);
            renderRules(allRules);
            return;
        }
        try {
            const response = await fetch('/api/get-rules');
            allRules = await response.json();
            localStorage.setItem('trrc_v5', JSON.stringify(allRules));
            renderRules(allRules);
        } catch (e) {
            display.innerHTML = '<p style="color:red;">データ取得エラー</p>';
        }
    }

    // --- 5. 描画処理 (バッジ表示の修正) ---
    function renderRules(rules, searchTerms = []) {
        const display = document.getElementById('rule-display');
        if (!rules.length) { display.innerHTML = '<p style="text-align:center;">該当なし</p>'; return; }

        display.innerHTML = rules.map(rule => {
            let title = rule.section_title;
            let content = decoratePenalty(rule.content_jp);
            
            // 赤枠バッジ部分のテキスト決定
            const badgeText = rule.type === 'special' ? 'SPEC' : `LAW ${rule.law_number}`;

            searchTerms.forEach(term => {
                if (!term) return;
                const regex = new RegExp(`(${term})`, 'gi');
                title = title.replace(regex, '<mark>$1</mark>');
                content = content.replace(regex, '<mark>$1</mark>');
            });

            return `
                <div class="rule-card">
                    <div class="rule-header">
                        <span class="rule-law-badge">${badgeText}</span>
                        <span class="rule-category">${getDisplayName(rule)}</span>
                    </div>
                    <h3>${title}</h3>
                    <p>${content}</p>
                </div>`;
        }).join('');
    }

    // --- 6. フィルタ・検索実行 ---
    function filterAndSearch() {
        const query = document.getElementById('rule-search').value.toLowerCase().trim();
        const activeBtn = document.querySelector('.filter-btn.active');
        const searchTerms = query ? query.split(/\s+/) : [];

        const filtered = allRules.filter(r => {
            let matchesFilter = true;
            if (activeBtn && activeBtn.dataset.type !== 'all') {
                const targetType = activeBtn.dataset.type;
                const targetId = activeBtn.dataset.id;
                matchesFilter = (r.type === targetType && r.law_number.toString() === targetId.toString());
            }

            const matchesSearch = searchTerms.every(term => 
                r.content_jp.toLowerCase().includes(term) || r.section_title.toLowerCase().includes(term)
            );
            return matchesFilter && matchesSearch;
        });
        renderRules(filtered, searchTerms);
    }

    filterContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterAndSearch();
    });

    document.getElementById('rule-search').addEventListener('input', filterAndSearch);

    createFilterUI();
    loadRules();
});