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

    // --- 2. フィルタボタンの動的生成 ---
    const filterContainer = document.getElementById('law-filters');
    
    function createFilterUI() {
        filterContainer.innerHTML = '';

        const specialSections = [
            { id: 'charter', name: 'ラグビー憲章' },
            { id: 'preface', name: '序文' },
            { id: 'definitions', name: '定義' },
            { id: 'sevens', name: '7人制' },
            { id: 'tens', name: '10人制' },
            { id: 'u19', name: '19歳未満' }
        ];

        // すべてボタン
        const topRow = document.createElement('div');
        topRow.className = 'filter-chips';
        topRow.innerHTML = `<button class="filter-btn active" data-type="all">すべて表示</button>`;
        filterContainer.appendChild(topRow);

        // 特別セクション
        const sTitle = document.createElement('div');
        sTitle.className = 'filter-group-title';
        sTitle.textContent = '憲章・バリエーション:';
        filterContainer.appendChild(sTitle);

        const sRow = document.createElement('div');
        sRow.className = 'filter-chips';
        specialSections.forEach(item => {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.type = 'special';
            btn.dataset.id = item.id;
            btn.textContent = item.name;
            sRow.appendChild(btn);
        });
        filterContainer.appendChild(sRow);

        // Law 1-21
        const lTitle = document.createElement('div');
        lTitle.className = 'filter-group-title';
        lTitle.textContent = '条文 (Law 1-21):';
        filterContainer.appendChild(lTitle);

        const lRow = document.createElement('div');
        lRow.className = 'filter-chips';
        for (let i = 1; i <= 21; i++) {
            const btn = document.createElement('button');
            btn.className = 'filter-btn';
            btn.dataset.type = 'law';
            btn.dataset.id = i;
            btn.textContent = `Law ${i}`;
            lRow.appendChild(btn);
        }
        filterContainer.appendChild(lRow);
    }

    // --- 3. 表示名と罰則装飾の定義 ---
    function getDisplayName(rule) {
        if (rule.type === 'special') {
            const names = { 
                charter: '憲章', preface: '序文', definitions: '定義', 
                sevens: '7人制', tens: '10人制', u19: 'U19' 
            };
            return names[rule.law_number] || '特別規定';
        }
        const categories = {
            1:"試合場", 2:"ボール", 3:"チーム", 4:"服装", 5:"時間", 6:"役員",
            7:"プレーの進め方", 8:"得点", 9:"不正なプレー", 10:"オフサイド/オンサイド",
            11:"ノックオン/スローフォワード", 12:"キックオフ/再開の蹴り", 13:"地面でのプレー",
            14:"タックル", 15:"ラック", 16:"モール", 17:"マーク", 18:"タッチ/ラインアウト",
            19:"スクラム", 20:"ペナルティ/フリーキック", 21:"インゴール"
        };
        return `Law ${rule.law_number} ${categories[rule.law_number] || ""}`;
    }

    function decoratePenalty(text) {
        // 罰則キーワードをバッジ化
        return text
            .replace(/(ペナルティキック|PK)/g, '<span class="penalty-badge pb-pk">$1</span>')
            .replace(/(フリーキック|FK)/g, '<span class="penalty-badge pb-fk">$1</span>')
            .replace(/(スクラム)/g, '<span class="penalty-badge pb-scrum">$1</span>');
    }

    // --- 4. データの読み込み (キャッシュ対応) ---
    async function loadRules() {
        const display = document.getElementById('rule-display');
        display.innerHTML = '<p style="text-align:center; padding:20px;">⏳ 同期中...</p>';

        const cached = localStorage.getItem('trrc_data_2025');
        if (cached) {
            allRules = JSON.parse(cached);
            renderRules(allRules);
            return;
        }

        try {
            const response = await fetch('/api/get-rules');
            if (!response.ok) throw new Error('通信エラー');
            allRules = await response.json();
            localStorage.setItem('trrc_data_2025', JSON.stringify(allRules));
            renderRules(allRules);
        } catch (error) {
            display.innerHTML = `<div class="rule-card" style="color:red;">⚠️ データ取得失敗</div>`;
        }
    }

    // --- 5. 描画 (ハイライト・罰則装飾) ---
    function renderRules(rules, searchTerms = []) {
        const display = document.getElementById('rule-display');
        if (rules.length === 0) {
            display.innerHTML = '<p style="text-align:center; padding:20px;">見つかりませんでした</p>';
            return;
        }

        display.innerHTML = rules.map(rule => {
            let title = rule.section_title;
            let content = decoratePenalty(rule.content_jp);

            // 検索キーワードのハイライト (罰則バッジの中身を壊さないよう注意が必要だが簡易実装)
            if (searchTerms.length > 0) {
                searchTerms.forEach(term => {
                    if (!term) return;
                    const regex = new RegExp(`(${term})`, 'gi');
                    title = title.replace(regex, '<mark>$1</mark>');
                    content = content.replace(regex, '<mark>$1</mark>');
                });
            }

            return `
                <div class="rule-card">
                    <div class="rule-header">
                        <span class="rule-law-badge">${rule.type === 'special' ? 'SPEC' : 'LAW'}</span>
                        <span class="rule-category">${getDisplayName(rule)}</span>
                    </div>
                    <h3>${title}</h3>
                    <p>${content}</p>
                </div>
            `;
        }).join('');
    }

    // --- 6. フィルタ・検索ロジック ---
    function filterAndSearch() {
        const query = document.getElementById('rule-search').value.toLowerCase().trim();
        const activeBtn = document.querySelector('.filter-btn.active');
        const searchTerms = query ? query.split(/\s+/) : [];

        const filtered = allRules.filter(r => {
            let matchesFilter = true;
            if (activeBtn && activeBtn.dataset.type !== 'all') {
                matchesFilter = (r.type === activeBtn.dataset.type && r.law_number == activeBtn.dataset.id);
            }
            const matchesSearch = searchTerms.every(term => 
                r.content_jp.toLowerCase().includes(term) || r.section_title.toLowerCase().includes(term)
            );
            return matchesFilter && matchesSearch;
        });

        renderRules(filtered, searchTerms);
    }

    // イベントリスナー
    document.getElementById('rule-search').addEventListener('input', filterAndSearch);
    filterContainer.addEventListener('click', (e) => {
        if (!e.target.classList.contains('filter-btn')) return;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        e.target.classList.add('active');
        filterAndSearch();
    });

    createFilterUI();
    loadRules();
});