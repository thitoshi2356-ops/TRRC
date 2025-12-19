document.addEventListener('DOMContentLoaded', () => {
    // ==========================================
    // 0. 定数・変数定義
    // ==========================================
    const LAW_LABELS = {
        100: "ラグビー憲章",
        200: "定義",
        700: "7人制",
        1000: "10人制",
        1900: "19歳未満"
    };

    let allRules = [];
    let currentLawFilter = 'all';
    let bookmarks = JSON.parse(localStorage.getItem('trrc_bookmarks') || '[]');

    // ==========================================
    // 1. タブ切り替え機能
    // ==========================================
    const navButtons = document.querySelectorAll('.nav-item');
    const sections = document.querySelectorAll('.content-section');

    navButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            // 見た目の切り替え
            navButtons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            sections.forEach(s => s.classList.remove('active'));
            
            const targetId = btn.dataset.target;
            document.getElementById(targetId).classList.add('active');

            // タブごとのデータロード処理
            if (targetId === 'tab-rules' && allRules.length === 0) loadRules();
            if (targetId === 'tab-discussion') loadDiscussions();
            if (targetId === 'tab-bookmarks') renderBookmarks();
        });
    });

    // ==========================================
    // 2. ルール機能 (取得・表示・絞り込み)
    // ==========================================
    async function loadRules() {
        const listContainer = document.getElementById('rules-list');
        try {
            const res = await fetch('/api/get-rules');
            if (!res.ok) throw new Error('Network response was not ok');
            allRules = await res.json();
            
            generateLawButtons(); // ボタン生成
            applyRuleFilters();   // 表示更新
        } catch (e) {
            console.error(e);
            listContainer.innerHTML = '<p style="text-align:center; color:red;">ルールの取得に失敗しました。<br>データベースを確認してください。</p>';
        }
    }

    function generateLawButtons() {
        const container = document.getElementById('law-filter-container');
        if (!container) return;

        const laws = [...new Set(allRules.map(r => r.law_number))].sort((a,b) => a - b);

        let html = `<button class="filter-chip active" data-law="all">ALL</button>`;
        laws.forEach(num => {
            const label = LAW_LABELS[num] ? LAW_LABELS[num] : `Law ${num}`;
            html += `<button class="filter-chip" data-law="${num}">${label}</button>`;
        });
        container.innerHTML = html;

        container.querySelectorAll('.filter-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                container.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                currentLawFilter = btn.dataset.law;
                applyRuleFilters();
            });
        });
    }

    function applyRuleFilters() {
        const searchInput = document.getElementById('rule-search');
        if(!searchInput) return; // 別のタブにいる場合など

        const searchVal = searchInput.value.toLowerCase().trim();
        const display = document.getElementById('rules-list');

        const filtered = allRules.filter(r => {
            const matchLaw = (currentLawFilter === 'all') || (r.law_number.toString() === currentLawFilter);
            const title = (r.section_title || "").toLowerCase();
            const content = (r.content_jp || "").toLowerCase();
            const matchText = title.includes(searchVal) || content.includes(searchVal);
            return matchLaw && matchText;
        });

        if (filtered.length === 0) {
            display.innerHTML = '<p style="text-align:center; padding:20px;">該当するルールがありません。</p>';
            return;
        }

        display.innerHTML = filtered.map(r => {
            const badgeLabel = LAW_LABELS[r.law_number] ? LAW_LABELS[r.law_number] : `LAW ${r.law_number}`;
            return `
            <div class="card">
                <div class="rule-header">
                    <span class="law-badge">${badgeLabel}</span>
                </div>
                <h3 style="margin:5px 0 10px;">${r.section_title}</h3>
                <p style="line-height:1.6; color:#4a5568;">
                    ${(r.content_jp || "")
                        .replace(/PK/g, '<span class="pb pb-PK">PK</span>')
                        .replace(/FK/g, '<span class="pb pb-FK">FK</span>')
                        .replace(/スクラム/g, '<span class="pb pb-scrum">スクラム</span>')}
                </p>
            </div>
            `;
        }).join('');
    }

    const searchInput = document.getElementById('rule-search');
    if(searchInput) searchInput.addEventListener('input', applyRuleFilters);


    // ==========================================
    // 3. 動画投稿機能
    // ==========================================
    const modal = document.getElementById('upload-modal');
    const btnOpen = document.getElementById('btn-open-upload');
    const btnCancel = document.getElementById('btn-cancel');
    const btnSubmit = document.getElementById('btn-submit');

    if(btnOpen) btnOpen.addEventListener('click', () => modal.classList.add('open'));
    if(btnCancel) btnCancel.addEventListener('click', () => modal.classList.remove('open'));

    if(btnSubmit) btnSubmit.addEventListener('click', () => {
        const titleInput = document.getElementById('upload-title');
        const fileInput = document.getElementById('upload-file');

        if (!titleInput.value || !fileInput.files[0]) {
            alert('タイトルと動画ファイルを選択してください。');
            return;
        }

        btnSubmit.disabled = true;
        btnSubmit.textContent = '送信中...';
        document.getElementById('progress-wrapper').style.display = 'block';

        const formData = new FormData();
        formData.append('title', titleInput.value);
        formData.append('video', fileInput.files[0]);

        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (e) => {
            const percent = (e.loaded / e.total) * 100;
            document.getElementById('upload-progress-bar').style.width = percent + '%';
        });

        xhr.onload = () => {
            if (xhr.status === 200) {
                alert('投稿が完了しました！');
                modal.classList.remove('open');
                titleInput.value = '';
                fileInput.value = '';
                loadDiscussions(); 
            } else {
                alert('エラー: ' + xhr.responseText);
            }
            btnSubmit.disabled = false;
            btnSubmit.textContent = '投稿する';
            document.getElementById('progress-wrapper').style.display = 'none';
            document.getElementById('upload-progress-bar').style.width = '0%';
        };

        xhr.onerror = () => {
            alert('ネットワークエラー');
            btnSubmit.disabled = false;
        };

        xhr.open('POST', '/api/upload-video');
        xhr.send(formData);
    });


    // ==========================================
    // 4. 議論フィード機能 (投票 & コメント追加版)
    // ==========================================
    async function loadDiscussions() {
        const feed = document.getElementById('discussion-feed');
        // 初回ロード時のみメッセージを出すなど調整しても良い
        // feed.innerHTML = '<p style="text-align:center;">読み込み中...</p>';

        try {
            const res = await fetch('/api/get-discussions');
            const posts = await res.json();

            if (!posts || posts.length === 0) {
                feed.innerHTML = '<p style="text-align:center; padding:30px;">まだ投稿がありません。</p>';
                return;
            }

            feed.innerHTML = posts.map(post => {
                const total = (post.votes_pk||0) + (post.votes_playon||0) + (post.votes_yc||0);
                const isSaved = bookmarks.includes(post.id);

                return `
                <div class="card" id="post-${post.id}">
                    <div class="video-placeholder">
                        ▶️ VIDEO CASE (ID: ${post.id})
                    </div>
                    <div style="font-size:0.8rem; color:#718096; margin-bottom:5px;">
                        📅 ${new Date(post.created_at).toLocaleDateString()} | 👤 ${post.author}
                    </div>
                    <h3 style="margin:0 0 15px;">${post.title}</h3>
                    
                    <div class="poll-actions">
                        <button onclick="vote(${post.id}, 'pk')" class="btn-vote vote-pk">PK</button>
                        <button onclick="vote(${post.id}, 'playon')" class="btn-vote vote-playon">Play On</button>
                        <button onclick="vote(${post.id}, 'yc')" class="btn-vote vote-yc">Yellow</button>
                    </div>

                    <div class="poll-area">
                        ${renderPollRow('PK', post.votes_pk, total, '#e53e3e')}
                        ${renderPollRow('PlayOn', post.votes_playon, total, '#38a169')}
                        ${renderPollRow('Yellow', post.votes_yc, total, '#d69e2e')}
                    </div>

                    <div style="margin-top:15px; display:flex; justify-content:space-between; align-items:center;">
                        <button onclick="toggleComments(${post.id})" class="nav-item" style="flex-direction:row; gap:5px; font-size:0.9rem; color:#4a5568;">
                            <span>💬</span> コメント
                        </button>
                        
                        <button onclick="window.toggleBookmark(${post.id})" style="background:none; border:none; cursor:pointer; font-size:0.9rem; color:${isSaved ? '#e53e3e' : '#718096'}">
                            ${isSaved ? '★ 保存済み' : '☆ 保存する'}
                        </button>
                    </div>

                    <div id="comments-section-${post.id}" class="comments-section" style="display:none;">
                        <div class="comments-list" id="comments-list-${post.id}">
                            </div>
                        <div class="comment-input-area">
                            <input type="text" id="comment-input-${post.id}" class="comment-input" placeholder="判定の根拠や意見を入力...">
                            <button onclick="postComment(${post.id})" class="btn-comment-submit">送信</button>
                        </div>
                    </div>
                </div>`;
            }).join('');

        } catch (e) {
            console.error(e);
            feed.innerHTML = '<p>データの取得に失敗しました。</p>';
        }
    }

    // 投票バー描画用ヘルパー
    function renderPollRow(label, count, total, color) {
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
        return `
        <div class="poll-row">
            <div class="poll-label" style="font-size:0.75rem;">${label}</div>
            <div class="poll-track">
                <div class="poll-fill" style="width: ${percent}%; background:${color};"></div>
            </div>
            <div style="width:30px; text-align:right; font-size:0.75rem;">${percent}%</div>
        </div>`;
    }

    // ==========================================
    // 5. グローバル関数 (HTML側から呼ぶため window に登録)
    // ==========================================
    
    // --- 投票処理 ---
    window.vote = async (id, type) => {
        try {
            const res = await fetch('/api/vote', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({ id, type })
            });
            if(res.ok) {
                // 成功したら画面を更新（簡易的にリロード）
                loadDiscussions(); 
            }
        } catch(e) { console.error('Vote failed', e); }
    };

    // --- コメント表示切替 & 取得 ---
    window.toggleComments = async (id) => {
        const section = document.getElementById(`comments-section-${id}`);
        const list = document.getElementById(`comments-list-${id}`);
        
        if (section.style.display === 'none') {
            section.style.display = 'block';
            list.innerHTML = '<p style="font-size:0.8rem; color:#aaa;">読み込み中...</p>';
            
            try {
                const res = await fetch(`/api/comments?discussion_id=${id}`);
                const comments = await res.json();
                
                if(comments.length === 0) {
                    list.innerHTML = '<p style="font-size:0.8rem; padding:10px; color:#718096;">コメントはまだありません。</p>';
                } else {
                    list.innerHTML = comments.map(c => `
                        <div class="comment-item">
                            <div class="comment-meta">${c.author_name} • ${new Date(c.created_at).toLocaleDateString()}</div>
                            <div class="comment-body">${c.content}</div>
                        </div>
                    `).join('');
                }
            } catch(e) {
                list.innerHTML = '<p>読み込みエラー</p>';
            }
        } else {
            section.style.display = 'none';
        }
    };

    // --- コメント投稿 ---
    window.postComment = async (id) => {
        const input = document.getElementById(`comment-input-${id}`);
        const content = input.value;
        if(!content) return;

        try {
            const res = await fetch('/api/comments', {
                method: 'POST',
                headers: {'Content-Type': 'application/json'},
                body: JSON.stringify({
                    discussion_id: id,
                    content: content,
                    author_name: 'Guest Ref'
                })
            });
            
            if(res.ok) {
                input.value = '';
                // コメントリストを更新するために一旦閉じて開く（簡易実装）
                const section = document.getElementById(`comments-section-${id}`);
                section.style.display = 'none';
                window.toggleComments(id);
            }
        } catch(e) { alert('送信失敗'); }
    };

    // --- ブックマーク処理 ---
    window.toggleBookmark = (id) => {
        if (bookmarks.includes(id)) {
            bookmarks = bookmarks.filter(b => b !== id);
        } else {
            bookmarks.push(id);
        }
        localStorage.setItem('trrc_bookmarks', JSON.stringify(bookmarks));
        
        // 画面更新
        if (document.getElementById('tab-discussion').classList.contains('active')) {
            loadDiscussions();
        } else {
            renderBookmarks();
        }
    };

    function renderBookmarks() {
        const list = document.getElementById('bookmark-list');
        if (bookmarks.length === 0) {
            list.innerHTML = '<p style="padding:20px; text-align:center;">保存された議論はありません。</p>';
        } else {
            list.innerHTML = `<p style="padding:10px;">現在 ${bookmarks.length} 件保存しています。</p>`;
        }
    }

    // 初期化
    loadRules();
});