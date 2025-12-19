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
            
            // タブ移動時にデータをロード
            if (target === 'rules' && allRules.length === 0) loadRules();
            if (target === 'discussion') renderDiscussion(); // SQLから投稿を取得
            if (target === 'stats') renderBookmarks();
        });
    });

    // --- 2. ルール表示ロジック (SQL連携) ---
    async function loadRules() {
        const display = document.getElementById('rule-display');
        display.innerHTML = '<p style="text-align:center;">読み込み中...</p>';
        try {
            const res = await fetch('/api/get-rules');
            allRules = await res.json();
            renderRules(allRules);
        } catch (e) { 
            display.innerHTML = '<p>ルールデータの取得に失敗しました。</p>'; 
        }
    }

    function renderRules(rules) {
        const display = document.getElementById('rule-display');
        display.innerHTML = rules.map(r => `
            <div class="rule-card">
                <div class="rule-header"><span class="rule-law-badge">LAW ${r.law_number}</span></div>
                <h3>${r.section_title}</h3>
                <p>${(r.content_jp || "").replace(/(PK|FK|スクラム)/g, '<span class="penalty-badge pb-$1">$1</span>').toLowerCase()}</p>
            </div>`).join('');
    }

    // --- 3. ディスカッション表示 (SQLから本物データを取得) ---
    async function renderDiscussion() {
        const feed = document.getElementById('discussion-feed');
        feed.innerHTML = '<p style="text-align:center;">議論をロード中...</p>';

        try {
            // DBから投稿一覧を取得する新APIを叩く
            const res = await fetch('/api/get-discussions');
            const realPosts = await res.json();

            if (!realPosts || realPosts.length === 0) {
                feed.innerHTML = '<p style="text-align:center; padding:20px;">まだ投稿がありません。最初の議論を投げかけましょう！</p>';
                return;
            }

            feed.innerHTML = realPosts.map(post => {
                const total = (post.votes_pk || 0) + (post.votes_playon || 0) + (post.votes_yc || 0);
                const date = new Date(post.created_at).toLocaleDateString();
                
                return `
                <div class="post-card">
                    <div class="post-video">▶️ ケーススタディ: ${post.title}</div>
                    <div class="post-content">
                        <div style="font-size:0.7em; color:#888;">👤 ${post.author} | 📅 ${date}</div>
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
            feed.innerHTML = '<p>議論データの取得に失敗しました。</p>';
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

    document.getElementById('btn-open-upload').addEventListener('click', () => {
        modal.classList.add('active');
    });

    document.getElementById('btn-cancel-upload').addEventListener('click', () => {
        modal.classList.remove('active');
    });

    btnSubmit.addEventListener('click', async () => {
        const titleInput = document.getElementById('upload-title');
        const fileInput = document.getElementById('video-file');
        
        if (!titleInput.value || !fileInput.files[0]) {
            alert("タイトルと動画を選択してください");
            return;
        }

        const formData = new FormData();
        formData.append('title', titleInput.value);
        formData.append('video', fileInput.files[0]);

        // 送信開始
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
                alert("投稿が完了しました！");
                modal.classList.remove('active');
                // 投稿成功後、一覧を再描画する
                await renderDiscussion(); 
            } else {
                alert("投稿に失敗しました: " + xhr.statusText);
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
        if (bookmarks.includes(id)) {
            bookmarks = bookmarks.filter(b => b !== id);
        } else {
            bookmarks.push(id);
        }
        localStorage.setItem('trrc_bookmarks', JSON.stringify(bookmarks));
        renderDiscussion(); // 星マークの表示を更新
    };

    function renderBookmarks() {
        const list = document.getElementById('bookmark-list');
        if (bookmarks.length === 0) {
            list.innerHTML = '<div class="placeholder-card"><p>保存された議論はありません</p></div>';
            return;
        }
        list.innerHTML = '<p>保存した議論ID: ' + bookmarks.join(', ') + ' (詳細表示は開発中)</p>';
    }

    // 検索機能
    document.getElementById('rule-search').addEventListener('input', (e) => {
        const q = e.target.value.toLowerCase();
        const filtered = allRules.filter(r => 
            (r.content_jp || "").includes(q) || (r.section_title || "").includes(q)
        );
        renderRules(filtered);
    });

    // 初期ロード
    loadRules();
});