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

    // --- 2. フィルタボタン生成 (IDをSQLのlaw_numberと紐付け) ---
    const filterContainer = document.getElementById('law-filters');
    function createFilterUI() {
        const specialSections = [
            { id: 100, name: 'ラグビー憲章' },
            { id: 200, name: '定義' },
            { id: 700, name: '7人制' },
            { id: 1000, name: '10人制' },
            { id: 1900, name: '19歳未満' }
        ];

        let html = `<div class="filter-chips"><button class="filter-btn active" data-type="all">すべて</button></div>`;
        
        html += `<div class="filter-group-title">憲章・バリエーション</div><div class="filter-chips">`;
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

    // --- 3. 補助関数 ---
    function getSpecialName(lawNumber) {
        const specials = {
            100: "ラグビー憲章", 200: "定義", 700: "7人制", 1000: "10人制", 1900: "19歳未満"
        };
        return specials[lawNumber];
    }

    function getLawCategoryName(lawNumber) {
        const cats = {
            1:"試合場", 2:"ボール", 3:"チーム", 4:"服装", 5:"時間", 6:"役員",
            7:"プレーの進め方", 8:"得点", 9:"不正なプレー", 10:"オフサイド",
            11:"ノックオン", 12:"再開蹴り", 13:"地面でのプレー", 14:"タックル",
            15:"ラック", 16:"モール", 17:"マーク", 18:"ラインアウト",
            19:"スクラム", 20:"PK/FK", 21:"インゴール"
        };
        return cats[lawNumber] || "";
    }

    function decoratePenalty(text) {
        if (!text) return "";
        return text.replace(/(ペナルティキック|PK)/g, '<span class="penalty-badge pb-pk">$1</span>')
                   .replace(/(フリーキック|FK)/g, '<span class="penalty-badge pb-fk">$1</span>')
                   .replace(/(スクラム)/g, '<span class="penalty-badge pb-scrum">$1</span>');
    }

    // --- 4. データ取得 (SQL API経由) ---
    async function loadRules() {
        const display = document.getElementById('rule-display');
        display.innerHTML = '<p style="text-align:center; padding:20px;">⏳ データを読み込み中...</p>';

        const cacheKey = 'trrc_sql_cache_2025';
        const cached = localStorage.getItem(cacheKey);
        
        if (cached) {
            allRules = JSON.parse(cached);
            renderRules(allRules);
            return;
        }

        try {
            const response = await fetch('/api/get-rules'); 
            if (!response.ok) throw new Error('通信エラー');
            allRules = await response.json();
            
            // 重要: SQLからデータが来たらキャッシュ
            localStorage.setItem(cacheKey, JSON.stringify(allRules));
            renderRules(allRules);
        } catch (e) {
            display.innerHTML = `<div class="rule-card" style="color:red;">⚠️ データ取得失敗: ${e.message}</div>`;
        }
    }

    // --- 5. 描画処理 ---
    function renderRules(rules, searchTerms = []) {
        const display = document.getElementById('rule-display');
        if (!rules.length) {
            display.innerHTML = '<p style="text-align:center; padding:20px;">該当データなし</p>';
            return;
        }

        display.innerHTML = rules.map(rule => {
            let title = rule.section_title || "";
            let content = decoratePenalty(rule.content_jp || "");
            
            // 型に依存しないように law_number を数値化して判定
            const lNum = parseInt(rule.law_number);
            let badgeText = lNum >= 100 ? (getSpecialName(lNum) || "特別規定") : `LAW ${lNum}`;
            let categoryText = lNum >= 100 ? "VARIATIONS" : getLawCategoryName(lNum);

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
                        <span class="rule-category">${categoryText}</span>
                    </div>
                    <h3>${title}</h3>
                    <p>${content}</p>
                </div>`;
        }).join('');
    }

    // --- 6. フィルタ・検索 (型を揃えて比較) ---
    function filterAndSearch() {
        const query = document.getElementById('rule-search').value.toLowerCase().trim();
        const activeBtn = document.querySelector('.filter-btn.active');
        const searchTerms = query ? query.split(/\s+/) : [];

        const filtered = allRules.filter(r => {
            // フィルタ: ボタンのidとデータのlaw_numberを文字列で厳密比較
            let matchesFilter = true;
            if (activeBtn && activeBtn.dataset.type !== 'all') {
                const targetId = activeBtn.dataset.id.toString();
                const ruleLawNum = r.law_number.toString();
                matchesFilter = (ruleLawNum === targetId);
            }

            // 検索: タイトルまたは本文に含まれるか
            const matchesSearch = searchTerms.every(term => 
                (r.content_jp && r.content_jp.toLowerCase().includes(term)) || 
                (r.section_title && r.section_title.toLowerCase().includes(term))
            );

            return matchesFilter && matchesSearch;
        });

        renderRules(filtered, searchTerms);
    }

    // --- 7. イベント ---
    document.getElementById('rule-search').addEventListener('input', filterAndSearch);
    filterContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        filterAndSearch();
    });

    createFilterUI();
    loadRules();
});