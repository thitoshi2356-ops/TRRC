document.addEventListener('DOMContentLoaded', () => {
    // --- データ管理変数 ---
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

    // Lawボタン (ALL, 1, 2, 3...) を自動で作る
    function generateLawButtons() {
        const container = document.getElementById('law-filter-container');
        if (!container) return;

        // DBにあるLaw番号を重複なしで取り出してソート
        const laws = [...new Set(allRules.map(r => r.law_number))].sort((a,b) => a - b);

        let html = `<button class="filter-chip active" data-law="all">ALL</button>`;
        laws.forEach(num => {
            html += `<button class="filter-chip" data-law="${num}">Law ${num}</button>`;
        });
        container.innerHTML = html;

        // ボタンクリックイベント設定
        container.querySelectorAll('.filter-chip').forEach(btn => {
            btn.addEventListener('click', () => {
                // 色を変える
                container.querySelectorAll('.filter-chip').forEach(b => b.classList.remove('active'));
                btn.classList.add('active');
                
                // 絞り込み実行
                currentLawFilter = btn.dataset.law;
                applyRuleFilters();
            });
        });
    }

    // 検索ワードとLawボタンの状態を見てリストを表示する
    function applyRuleFilters() {
        const searchVal = document.getElementById('rule-search').value.toLowerCase().trim();
        const display = document.getElementById('rules-list');

        const filtered = allRules.filter(r => {
            // Law番号チェック
            const matchLaw = (currentLawFilter === 'all') || (r.law_number.toString() === currentLawFilter);
            // キーワードチェック
            const title = (r.section_title || "").toLowerCase();
            const content = (r.content_jp || "").toLowerCase();
            const matchText = title.includes(searchVal) || content.includes(searchVal);

            return matchLaw && matchText;
        });

        if (filtered.length === 0) {
            display.innerHTML = '<p style="text-align:center; padding:20px;">該当するルールがありません。</p>';
            return;
        }

        display.innerHTML = filtered.map(r => `
            <div class="card">
                <div class="rule-header">
                    <span class="law-badge">LAW ${r.law_number}</span>
                </div>
                <h3 style="margin:5px 0 10px;">${r.section_title}</h3>
                <p style="line-height:1.6; color:#4a5568;">
                    ${(r.content_jp || "")
                        .replace(/PK/g, '<span class="pb pb-PK">PK</span>')
                        .replace(/FK/g, '<span class="pb pb-FK">FK</span>')
                        .replace(/スクラム/g, '<span class="pb pb-scrum">スクラム</span>')}
                </p>
            </div>
        `).join('');
    }

    // 検索窓に入力した時のイベント
    document.getElementById('rule-search').addEventListener('input', applyRuleFilters);


    // ==========================================
    // 3. 動画投稿機能 (モーダル & API送信)
    // ==========================================
    const modal = document.getElementById('upload-modal');
    const btnOpen = document.getElementById('btn-open-upload');
    const btnCancel = document.getElementById('btn-cancel');
    const btnSubmit = document.getElementById('btn-submit');

    // モーダル開閉
    if(btnOpen) btnOpen.addEventListener('click', () => modal.classList.add('open'));
    if(btnCancel) btnCancel.addEventListener('click', () => modal.classList.remove('open'));

    // 送信処理
    if(btnSubmit) btnSubmit.addEventListener('click', () => {
        const titleInput = document.getElementById('upload-title');
        const fileInput = document.getElementById('upload-file');

        if (!titleInput.value || !fileInput.files[0]) {
            alert('タイトルと動画ファイルを選択してください。');
            return;
        }

        // UIを送信中モードに
        btnSubmit.disabled = true;
        btnSubmit.textContent = '送信中...';
        document.getElementById('progress-wrapper').style.display = 'block';

        const formData = new FormData();
        formData.append('title', titleInput.value);
        formData.append('video', fileInput.files[0]);

        const xhr = new XMLHttpRequest();
        
        // 進捗バー更新
        xhr.upload.addEventListener('progress', (e) => {
            const percent = (e.loaded / e.total) * 100;
            document.getElementById('upload-progress-bar').style.width = percent + '%';
        });

        // 完了時の処理
        xhr.onload = () => {
            if (xhr.status === 200) {
                alert('投稿が完了しました！');
                modal.classList.remove('open');
                titleInput.value = ''; // 入力リセット
                fileInput.value = '';
                loadDiscussions(); // 一覧を更新
            } else {
                alert('エラーが発生しました: ' + xhr.responseText);
            }
            // UIを元に戻す
            btnSubmit.disabled = false;
            btnSubmit.textContent = '投稿する';
            document.getElementById('progress-wrapper').style.display = 'none';
            document.getElementById('upload-progress-bar').style.width = '0%';
        };

        xhr.onerror = () => {
            alert('ネットワークエラーが発生しました');
            btnSubmit.disabled = false;
        };

        xhr.open('POST', '/api/upload-video');
        xhr.send(formData);
    });


    // ==========================================
    // 4. 議論フィード表示 (DBから取得)
    // ==========================================
    async function loadDiscussions() {
        const feed = document.getElementById('discussion-feed');
        feed.innerHTML = '<p style="text-align:center;">最新の議論を取得中...</p>';

        try {
            const res = await fetch('/api/get-discussions');
            const posts = await res.json();

            if (!posts || posts.length === 0) {
                feed.innerHTML = '<p style="text-align:center; padding:30px;">まだ投稿がありません。<br>最初のケースを投稿してみましょう！</p>';
                return;
            }

            feed.innerHTML = posts.map(post => {
                const total = (post.votes_pk||0) + (post.votes_playon||0) + (post.votes_yc||0);
                const isSaved = bookmarks.includes(post.id);

                return `
                <div class="card">
                    <div class="video-placeholder">
                        ▶️ VIDEO CASE (ID: ${post.id})
                    </div>
                    <div style="font-size:0.8rem; color:#718096; margin-bottom:5px;">
                        📅 ${new Date(post.created_at).toLocaleDateString()} | 👤 ${post.author}
                    </div>
                    <h3 style="margin:0 0 15px;">${post.title}</h3>
                    
                    <div class="poll-area">
                        ${renderPollRow('PK', post.votes_pk, total)}
                        ${renderPollRow('PlayOn', post.votes_playon, total)}
                        ${renderPollRow('Yellow', post.votes_yc, total)}
                    </div>

                    <div style="margin-top:15px; text-align:right;">
                        <button onclick="window.toggleBookmark(${post.id})" style="background:none; border:1px solid #ddd; padding:5px 10px; border-radius:4px; cursor:pointer; color:${isSaved ? '#e53e3e' : '#718096'}">
                            ${isSaved ? '★ 保存済み' : '☆ 保存する'}
                        </button>
                    </div>
                </div>`;
            }).join('');

        } catch (e) {
            console.error(e);
            feed.innerHTML = '<p>データの取得に失敗しました。</p>';
        }
    }

    function renderPollRow(label, count, total) {
        const percent = total > 0 ? Math.round((count / total) * 100) : 0;
        return `
        <div class="poll-row">
            <div class="poll-label">${label}</div>
            <div class="poll-track">
                <div class="poll-fill" style="width: ${percent}%;"></div>
            </div>
            <div style="width:30px; text-align:right;">${percent}%</div>
        </div>`;
    }

    // ==========================================
    // 5. ブックマーク機能 (保存)
    // ==========================================
    window.toggleBookmark = (id) => {
        if (bookmarks.includes(id)) {
            bookmarks = bookmarks.filter(b => b !== id);
        } else {
            bookmarks.push(id);
        }
        localStorage.setItem('trrc_bookmarks', JSON.stringify(bookmarks));
        
        // 今見ている画面を更新
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
            list.innerHTML = `<p style="padding:10px;">現在 ${bookmarks.length} 件保存しています。<br>(詳細表示機能はAPI連携後に実装されます)</p>`;
        }
    }

    // 最初の初期化
    loadRules();
});