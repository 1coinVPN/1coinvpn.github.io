// app.js - メインアプリケーションスクリプト

// DOMの読み込み完了後に実行
document.addEventListener('DOMContentLoaded', () => {
  // プロキシマネージャーの初期化
  initProxyManager();
  
  // UIイベントリスナーの設定
  setupEventListeners();
  
  // テーマ設定の初期化
  initTheme();
  
  // チャートの初期化
  proxyManager.initCharts();
});

// プロキシマネージャーの初期化
async function initProxyManager() {
  // Service Workerの登録
  await proxyManager.registerServiceWorker();
  
  // UIの初期状態を設定
  proxyManager.updateUI('disconnected');
}

// UIイベントリスナーの設定
function setupEventListeners() {
  // 接続ボタン
  const connectBtn = document.getElementById('connect-btn');
  connectBtn.addEventListener('click', () => {
    proxyManager.connect();
  });
  
  // 切断ボタン
  const disconnectBtn = document.getElementById('disconnect-btn');
  disconnectBtn.addEventListener('click', () => {
    proxyManager.disconnect();
  });
  
  // テーマ切替ボタン
  const themeToggleBtn = document.getElementById('theme-toggle-btn');
  themeToggleBtn.addEventListener('click', () => {
    toggleTheme();
  });
  
  // ターゲットURL入力フィールドのEnterキー処理
  const targetUrlInput = document.getElementById('target-url');
  targetUrlInput.addEventListener('keypress', (e) => {
    if (e.key === 'Enter' && !connectBtn.disabled) {
      proxyManager.connect();
    }
  });
}

// テーマの初期化
function initTheme() {
  // ローカルストレージからテーマ設定を取得
  const savedTheme = localStorage.getItem('theme');
  
  // 保存されたテーマがあればそれを適用、なければシステム設定に従う
  if (savedTheme) {
    document.documentElement.setAttribute('data-theme', savedTheme);
    updateThemeIcon(savedTheme);
  } else {
    // システムのダークモード設定を確認
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    const theme = prefersDark ? 'dark' : 'light';
    document.documentElement.setAttribute('data-theme', theme);
    updateThemeIcon(theme);
  }
}

// テーマの切り替え
function toggleTheme() {
  const currentTheme = document.documentElement.getAttribute('data-theme');
  const newTheme = currentTheme === 'light' ? 'dark' : 'light';
  
  // テーマを適用
  document.documentElement.setAttribute('data-theme', newTheme);
  
  // ローカルストレージに保存
  localStorage.setItem('theme', newTheme);
  
  // アイコンを更新
  updateThemeIcon(newTheme);
}

// テーマアイコンの更新
function updateThemeIcon(theme) {
  const themeIcon = document.querySelector('#theme-toggle-btn i');
  
  if (theme === 'dark') {
    themeIcon.className = 'fas fa-sun';
  } else {
    themeIcon.className = 'fas fa-moon';
  }
}

// ページ離脱時の処理
window.addEventListener('beforeunload', () => {
  // プロキシが接続中なら切断
  if (proxyManager.settings.enabled) {
    proxyManager.disconnect();
  }
});
