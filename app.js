// 注意: このコードはVercelにデプロイするために最低限の構造だけを持っています。
// 実際にFirebase Authenticationを動かすには、Firebaseプロジェクトの設定情報が必要です。
// そのため、以下のコードは「認証ボタンが押された時の動作を示すモック」として扱ってください。

document.addEventListener('DOMContentLoaded', () => {
    // 画面の初期状態をセット
    const authSection = document.getElementById('auth-section');
    const appContent = document.getElementById('app-content');
    const userStatus = document.getElementById('user-status');
    const errorMessage = document.getElementById('error-message');

    // ユーザーの状態をチェックするモック関数
    function checkAuthState() {
        // ここにFirebaseの認証状態チェックロジックが入ります
        const userIsLoggedIn = false; // 初期状態はログアウト中

        if (userIsLoggedIn) {
            authSection.style.display = 'none';
            appContent.style.display = 'block';
            userStatus.textContent = 'ようこそ、レフェリーさん！';
        } else {
            authSection.style.display = 'block';
            appContent.style.display = 'none';
        }
    }

    // ログイン処理のモック
    window.handleLogin = function() {
        const email = document.getElementById('login-email').value;
        const password = document.getElementById('login-password').value;

        if (email && password) {
            errorMessage.textContent = 'ログイン処理を開始しました（本物のFirebase認証は次のステップで組み込みます）';
            // 実際はここで firebase.auth().signInWithEmailAndPassword が呼ばれます
            setTimeout(() => {
                // 成功したと仮定して画面を切り替える
                const success = true;
                if (success) {
                    authSection.style.display = 'none';
                    appContent.style.display = 'block';
                    userStatus.textContent = `ようこそ、${email}さん！`;
                    errorMessage.textContent = '';
                }
            }, 1000);
        } else {
            errorMessage.textContent = 'メールアドレスとパスワードを入力してください。';
        }
    };

    // ログアウト処理のモック
    window.handleLogout = function() {
        // 実際はここで firebase.auth().signOut() が呼ばれます
        authSection.style.display = 'block';
        appContent.style.display = 'none';
        errorMessage.textContent = 'ログアウトしました。';
    };

    checkAuthState();
});