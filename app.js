// --- TRRC Core Logic ---
document.addEventListener('DOMContentLoaded', () => {
    initApp();
});

function initApp() {
    setupNavigation();
    loadLaws('15人制', 1); // 初期表示
}

// ナビゲーション制御
function setupNavigation() {
    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            const target = e.currentTarget;
            
            // クイズボタンか学習ボタンかを判定
            if (target.classList.contains('quiz')) {
                startQuizMode(target.id);
            } else {
                updateActiveState(target);
                const category = target.dataset.category;
                loadCategoryView(category);
            }
        });
    });

    document.getElementById('law-selector').addEventListener('change', (e) => {
        loadLaws('15人制', e.target.value);
    });
}

function updateActiveState(element) {
    document.querySelectorAll('.nav-item').forEach(i => i.classList.remove('active'));
    element.classList.add('active');
}

// カテゴリー表示の切り替え
function loadCategoryView(category) {
    const title = document.getElementById('view-title');
    const desc = document.getElementById('view-desc');
    const filter = document.getElementById('law-filter-area');
    
    title.textContent = category;
    filter.style.display = (category === '15人制') ? 'block' : 'none';

    switch(category) {
        case '用語定義': desc.textContent = '正確なレフェリングに必要な用語をマスターします。'; break;
        case '7人制': desc.textContent = '15人制とのルールの違いを重点的に学習します。'; break;
        case '19歳未満': desc.textContent = 'プレーヤーの安全を守るための特別な規定です。'; break;
        default: desc.textContent = 'レフェリングの基盤となる基本条項を学びます。';
    }
    
    // API呼び出し（模擬）
    fetchAndRender(category);
}

// 学習カードの描画
function renderRules(rules) {
    const display = document.getElementById('main-display');
    display.innerHTML = rules.map(rule => `
        <div class="rule-card">
            <h3 class="section-title">${rule.section_title}</h3>
            <div class="rule-body">${rule.content_jp.replace(/\n/g, '<br>')}</div>
            ${formatPenalty(rule.content_jp)}
        </div>
    `).join('');
}

// 罰則の自動抽出・ラベル化
function formatPenalty(text) {
    if (text.includes('ペナルティ')) return `<div class="penalty-label penalty-red">判定：ペナルティ</div>`;
    if (text.includes('フリーキック')) return `<div class="penalty-label penalty-green">判定：フリーキック</div>`;
    return '';
}

// クイズモード（草案：実戦的判断力の育成）
function startQuizMode(type) {
    const display = document.getElementById('main-display');
    const title = document.getElementById('view-title');
    document.getElementById('law-filter-area').style.display = 'none';

    if (type === 'btn-quiz-decision') {
        title.textContent = "判定適用クイズ";
        display.innerHTML = `
            <div class="quiz-container">
                <p class="quiz-question">Q. ラックの中でプレーヤーが相手をロール、プル、またはツイストしました。正しい判定は？</p>
                <button class="quiz-option" onclick="checkAnswer(true)">ペナルティ</button>
                <button class="quiz-option" onclick="checkAnswer(false)">フリーキック</button>
                <button class="quiz-option" onclick="checkAnswer(false)">スクラム</button>
            </div>
        `;
    }
}

function checkAnswer(isCorrect) {
    alert(isCorrect ? "正解！ 経験値(XP) +10" : "不正解。ルールを再確認しましょう。");
}

// 以下、API通信(fetch)や15人制のLaw取得ロジックが続きます...