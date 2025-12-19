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

    // --- 2. ルール表示 & 絞り込み機能 ---
    async function loadRules() {
        const display = document.getElementById('rule-display');
        display.innerHTML = '<p style="text-align:center;">ルールを読み込み中...</p>';
        try {
            const res = await fetch('/api/get-rules');
            allRules = await res.json();
            renderRules(allRules);
        } catch (e) { 
            display.innerHTML = '<p>データの取得に失敗しました。</p>'; 
        }
    }

    function renderRules(rules) {
        const display = document.getElementById('rule-display');
        if (rules.length === 0) {
            display.innerHTML = '<p style="text-align:center; padding:20px;">該当するルールが見つかりません。</p>';
            return;
        }
        display.innerHTML = rules.map(r => `
            <div class="rule-card">
                <div class="rule-header"><span class="rule-law-badge">LAW ${r.law_number}</span></div>
                <h3>${r.section_title}</h3>
                <p>${(r.content_jp || "").replace(/(PK|FK|スクラム)/g, '<span class="penalty-badge pb-$1">$1</span>')}</p>
            </div>`).join('');
    }

    // ★検索機能の本体
    const searchInput = document.getElementById('rule-search');
    if (searchInput) {
        searchInput.addEventListener('input', (e) => {
            const query = e.target.value.toLowerCase().trim();
            // タイトルまたは本文に検索語が含まれるものを抽出
            const filtered = allRules.filter(r => {
                const title = (r.section_title || "").toLowerCase();
                const content = (r.content_jp || "").toLowerCase();
                return title.includes(query) || content.includes(query);
            });
            renderRules(filtered);
        });
    }

    // --- 3. ディスカッション表示 ---
    async function renderDiscussion() {
        const feed = document.getElementById('discussion-feed');
        feed.innerHTML = '<p style="text-align:center;">議論をロード中...</p>';
        try {
            const res = await fetch('/api/get-discussions');
            const realPosts = await res.json();
            if (!realPosts || realPosts.length === 0) {
                feed.innerHTML = '<p style="text-align:center; padding:20px;">まだ投稿がありません。</p>';
                return;
            }
            feed.innerHTML = realPosts.map(post => {
                const total = (post.votes_pk || 0) + (post.votes_playon || 0) + (post.votes_yc || 0);
                return `
                <div class="post-card">
                    <div class="post-video">▶️ ケーススタディ: ${post.title}</div>
                    <div class="post-content">
                        <div style="font-size:0.7em; color:#888;">👤 ${post.author} | 📅 ${new Date(post.created_at).toLocaleDateString()}</div>
                        <h3 style="margin:5px 0;">${post.title}</h3>
                        <div class="poll-area">
                            ${renderPollBar("PK", post.votes_pk, total)}
                            ${renderPollBar("PLAY ON", post.votes_playon, total)}
                            ${renderPollBar("YELLOW CARD", post.votes_yc, total)}
                        </div>
                    </div>
                    <div class="action-bar">
                        <button class="action-btn">💬 議論に参加</button>
                        <button class="action-btn ${bookmarks.includes(post.id) ? 'active' : ''}" onclick="window.toggleBookmark(${post.id})">
                            ${bookmarks.includes(post.id) ? '★ 保存済み' : '☆ 保存'}
                        </button>
                    </div>
                </div>`;
            }).join('');
        } catch (e) {
            feed.innerHTML = '<p>データの取得に失敗しました。</p>';
        }
    }

    function renderPollBar(label, count, total) {
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
        return `
            <div class="poll-option">
                <span style="font-size:0.75em; width:80px;">${label}</span>
                <div class="poll-bar-bg"><div class="poll-bar-fill" style="width: ${percent}%;"></div></div>
                <span class="poll-percent">${percent}%</span>
            </div>`;
    }

    // --- 4. 動画投稿 (アップロード) 処理 ---
    const modal = document.getElementById('upload-modal');
    const btnSubmit = document.getElementById('btn-submit-upload');

    document.getElementById('btn-open-upload')?.addEventListener('click', () => modal.classList.add('active'));
    document.getElementById('btn-cancel-upload')?.addEventListener('click', () => modal.classList.remove('active'));

    btnSubmit?.addEventListener('click', async () => {
        const titleInput = document.getElementById('upload-title');
        const fileInput = document.getElementById('video-file');
        if (!titleInput.value || !fileInput.files[0]) return alert("入力不足です");

        const formData = new FormData();
        formData.append('title', titleInput.value);
        formData.append('video', fileInput.files[0]);

        btnSubmit.disabled = true;
        btnSubmit.textContent = "送信中...";
        document.getElementById('progress-container').style.display = 'block';

        const xhr = new XMLHttpRequest();
        xhr.upload.addEventListener('progress', e => {
            const percent = (e.loaded / e.total) * 100;
            document.getElementById('upload-progress').style.width = percent + '%';
        });

        xhr.onload = async () => {
            if (xhr.status === 200) {
                alert("投稿成功！");
                modal.classList.remove('active');
                await renderDiscussion(); 
            } else {
                alert("失敗しました");
            }
            btnSubmit.disabled = false;
            btnSubmit.textContent = "投稿する";
            document.getElementById('progress-container').style.display = 'none';
        };
        xhr.open('POST', '/api/upload-video');
        xhr.send(formData);
    });

    // --- 5. ブックマーク管理 ---
    window.toggleBookmark = (id) => {
        bookmarks = bookmarks.includes(id) ? bookmarks.filter(b => b !== id) : [...bookmarks, id];
        localStorage.setItem('trrc_bookmarks', JSON.stringify(bookmarks));
        renderDiscussion();
    };

    function renderBookmarks() {
        const list = document.getElementById('bookmark-list');
        list.innerHTML = bookmarks.length === 0 ? '<p>保存なし</p>' : `<p>保存数: ${bookmarks.length} 件 (開発中)</p>`;
    }

    loadRules();
});