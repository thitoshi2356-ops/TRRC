document.addEventListener('DOMContentLoaded', () => {
    let allRules = [];
    let bookmarks = JSON.parse(localStorage.getItem('trrc_bookmarks') || '[]');

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
            if (target === 'stats') renderBookmarks();
        });
    });

    // --- 2. フィルタ生成 ---
    const filterContainer = document.getElementById('law-filters');
    function createFilterUI() {
        const special = [
            { id: 100, name: '憲章' }, { id: 200, name: '定義' },
            { id: 700, name: '7人制' }, { id: 1000, name: '10人制' }, { id: 1900, name: 'U19' }
        ];
        let html = `<div class="filter-chips"><button class="filter-btn active" data-type="all">すべて</button></div>`;
        html += `<div class="filter-group-title">特別規定</div><div class="filter-chips">`;
        special.forEach(s => html += `<button class="filter-btn" data-id="${s.id}">${s.name}</button>`);
        html += `</div><div class="filter-group-title">Law 1-21</div><div class="filter-chips">`;
        for (let i = 1; i <= 21; i++) html += `<button class="filter-btn" data-id="${i}">Law ${i}</button>`;
        html += `</div>`;
        filterContainer.innerHTML = html;
    }

    // --- 3. ルール表示ロジック (SQL連携想定) ---
    async function loadRules() {
        const display = document.getElementById('rule-display');
        display.innerHTML = '<p style="text-align:center;">読み込み中...</p>';
        
        try {
            // SQLから取得したデータを想定。なければキャッシュ
            const cache = localStorage.getItem('trrc_sql_cache');
            if (cache) { allRules = JSON.parse(cache); } 
            else {
                const res = await fetch('/api/get-rules');
                allRules = await res.json();
                localStorage.setItem('trrc_sql_cache', JSON.stringify(allRules));
            }
            renderRules(allRules);
        } catch (e) { display.innerHTML = '<p>データ取得エラー。APIパスを確認してください。</p>'; }
    }

    function renderRules(rules, searchTerms = []) {
        const display = document.getElementById('rule-display');
        const cats = {1:"試合場",2:"ボール",3:"チーム",4:"服装",5:"時間",6:"役員",7:"進行",8:"得点",9:"不正",10:"オフサイド",11:"ノックオン",12:"再開",13:"地面",14:"タックル",15:"ラック",16:"モール",17:"マーク",18:"ラインアウト",19:"スクラム",20:"PK/FK",21:"インゴール"};
        const specials = {100:"ラグビー憲章", 200:"定義", 700:"7人制", 1000:"10人制", 1900:"19歳未満"};

        display.innerHTML = rules.map(r => {
            const lNum = parseInt(r.law_number);
            const badge = lNum >= 100 ? (specials[lNum] || "SPEC") : `LAW ${lNum}`;
            const category = lNum >= 100 ? "VARIATION" : (cats[lNum] || "");
            
            let content = (r.content_jp || "").replace(/(PK|FK|スクラム)/g, '<span class="penalty-badge pb-$1">$1</span>').replace(/pb-PK/,'pb-pk').replace(/pb-FK/,'pb-fk');

            return `<div class="rule-card">
                <div class="rule-header"><span class="rule-law-badge">${badge}</span><span class="rule-category">${category}</span></div>
                <h3>${r.section_title}</h3><p>${content}</p>
            </div>`;
        }).join('');
    }

    // --- 4. ディスカッション機能 (Case Study) ---
    const mockPosts = [
        { id: 1, author: "Ref_A", title: "タックル後のジャッカル、支持なし？", votes: { pk: 15, playOn: 5, yc: 2 }, bookmarked: false },
        { id: 2, author: "Ref_B", title: "スクラム崩壊の責任はどちらか", votes: { pk: 8, fk: 10, reset: 12 }, bookmarked: false }
    ];

    function renderDiscussion() {
        const feed = document.getElementById('discussion-feed');
        feed.innerHTML = mockPosts.map(post => {
            const total = Object.values(post.votes).reduce((a, b) => a + b, 0);
            return `
            <div class="post-card">
                <div class="post-video">▶️ 動画再生クリップ</div>
                <div class="post-content">
                    <div style="font-size:0.7em; color:#888;">👤 ${post.author}</div>
                    <h3 style="margin:5px 0;">${post.title}</h3>
                    <div class="poll-area">
                        ${Object.entries(post.votes).map(([label, count]) => `
                            <div class="poll-option">
                                <span style="font-size:0.7em; width:60px; text-transform:uppercase;">${label}</span>
                                <div class="poll-bar-bg"><div class="poll-bar-fill" style="width:${Math.round(count/total*100)}%"></div></div>
                                <span class="poll-percent">${Math.round(count/total*100)}%</span>
                            </div>
                        `).join('')}
                    </div>
                </div>
                <div class="action-bar">
                    <button class="action-btn">💬 議論に参加</button>
                    <button class="action-btn ${bookmarks.includes(post.id) ? 'active' : ''}" onclick="toggleBookmark(${post.id})">
                        ${bookmarks.includes(post.id) ? '★ 保存済み' : '☆ 保存'}
                    </button>
                </div>
            </div>`;
        }).join('');
    }

    // --- 5. ブックマーク管理 ---
    window.toggleBookmark = (id) => {
        if (bookmarks.includes(id)) {
            bookmarks = bookmarks.filter(b => b !== id);
        } else {
            bookmarks.push(id);
        }
        localStorage.setItem('trrc_bookmarks', JSON.stringify(bookmarks));
        renderDiscussion();
    };

    function renderBookmarks() {
        const list = document.getElementById('bookmark-list');
        const saved = mockPosts.filter(p => bookmarks.includes(p.id));
        if (saved.length === 0) {
            list.innerHTML = '<div class="placeholder-card"><p>保存された投稿はありません</p></div>';
            return;
        }
        list.innerHTML = saved.map(p => `<div class="rule-card"><h3>${p.title}</h3><p>投稿者: ${p.author}</p></div>`).join('');
    }

    // --- 6. 検索・フィルタ連動 ---
    document.getElementById('rule-search').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        renderRules(allRules.filter(r => r.content_jp.includes(q) || r.section_title.includes(q)), [q]);
    });

    filterContainer.addEventListener('click', (e) => {
        const btn = e.target.closest('.filter-btn');
        if (!btn) return;
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const id = btn.dataset.id;
        renderRules(id ? allRules.filter(r => r.law_number.toString() === id) : allRules);
    });

    createFilterUI();
    loadRules();
});