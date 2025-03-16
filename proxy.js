// proxy.js - リバースプロキシの機能を管理するスクリプト

class ProxyManager {
  constructor() {
    this.settings = {
      enabled: false,
      targetUrl: 'https://1coin.dev/',
      timeout: 30,
      retryCount: 3,
      preserveHeaders: true,
      sendCredentials: false
    };
    
    this.stats = {
      dataTransferred: 0,
      responseTimes: [],
      errors: [],
      startTime: null
    };
    
    this.charts = {
      dataChart: null,
      responseChart: null
    };
    
    this.serviceWorkerRegistration = null;
    this.connectionTimer = null;
  }
  
  // Service Workerの登録
  async registerServiceWorker() {
    try {
      if ('serviceWorker' in navigator) {
        this.serviceWorkerRegistration = await navigator.serviceWorker.register('/sw.js');
        console.log('Service Worker registered successfully:', this.serviceWorkerRegistration);
        
        // Service Workerからのメッセージを受信
        navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this));
        
        return true;
      } else {
        this.showNotification('エラー', 'お使いのブラウザはService Workerをサポートしていません。', 'error');
        return false;
      }
    } catch (error) {
      console.error('Service Worker registration failed:', error);
      this.showNotification('エラー', `Service Workerの登録に失敗しました: ${error.message}`, 'error');
      return false;
    }
  }
  
  // プロキシの接続
  async connect() {
    try {
      // 入力値の検証
      const targetUrl = document.getElementById('target-url').value.trim();
      if (!targetUrl) {
        this.showNotification('エラー', 'ターゲットURLを入力してください。', 'error');
        return false;
      }
      
      // URLの形式を検証
      try {
        new URL(targetUrl);
      } catch (e) {
        this.showNotification('エラー', '有効なURLを入力してください。', 'error');
        return false;
      }
      
      // 詳細設定の取得
      const timeout = parseInt(document.getElementById('timeout').value, 10);
      const retryCount = parseInt(document.getElementById('retry-count').value, 10);
      const preserveHeaders = document.getElementById('preserve-headers').checked;
      
      // 設定の更新
      this.settings = {
        enabled: true,
        targetUrl,
        timeout,
        retryCount,
        preserveHeaders,
        sendCredentials: false
      };
      
      // Service Workerに設定を送信
      if (this.serviceWorkerRegistration && navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'update-settings',
          data: this.settings
        });
      } else {
        await this.registerServiceWorker();
        // 少し待ってからメッセージを送信
        setTimeout(() => {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({
              type: 'update-settings',
              data: this.settings
            });
          }
        }, 1000);
      }
      
      // UI更新
      this.updateUI('connecting');
      
      // 接続成功を通知
      setTimeout(() => {
        this.updateUI('connected');
        this.showNotification('接続成功', `${targetUrl} に接続しました。`, 'success');
        
        // 統計情報のリセット
        this.resetStats();
        
        // 接続時間の計測開始
        this.startConnectionTimer();
      }, 1500);
      
      return true;
    } catch (error) {
      console.error('Connection error:', error);
      this.showNotification('接続エラー', error.message, 'error');
      this.updateUI('error');
      return false;
    }
  }
  
  // プロキシの切断
  disconnect() {
    try {
      // 設定の更新
      this.settings.enabled = false;
      
      // Service Workerに設定を送信
      if (navigator.serviceWorker.controller) {
        navigator.serviceWorker.controller.postMessage({
          type: 'update-settings',
          data: this.settings
        });
      }
      
      // UI更新
      this.updateUI('disconnected');
      
      // 接続時間の計測停止
      this.stopConnectionTimer();
      
      // 切断成功を通知
      this.showNotification('切断完了', 'プロキシ接続を切断しました。', 'info');
      
      return true;
    } catch (error) {
      console.error('Disconnection error:', error);
      this.showNotification('切断エラー', error.message, 'error');
      return false;
    }
  }
  
  // UIの更新
  updateUI(status) {
    const statusIndicator = document.querySelector('.status-indicator');
    const statusText = statusIndicator.querySelector('.status-text');
    const connectBtn = document.getElementById('connect-btn');
    const disconnectBtn = document.getElementById('disconnect-btn');
    const currentTarget = document.getElementById('current-target');
    
    // ステータス表示の更新
    statusIndicator.dataset.status = status;
    
    switch (status) {
      case 'connected':
        statusText.textContent = '接続中';
        connectBtn.disabled = true;
        disconnectBtn.disabled = false;
        currentTarget.textContent = this.settings.targetUrl;
        break;
      case 'disconnected':
        statusText.textContent = '未接続';
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        currentTarget.textContent = '未設定';
        break;
      case 'connecting':
        statusText.textContent = '接続中...';
        connectBtn.disabled = true;
        disconnectBtn.disabled = true;
        currentTarget.textContent = this.settings.targetUrl;
        break;
      case 'error':
        statusText.textContent = 'エラー';
        connectBtn.disabled = false;
        disconnectBtn.disabled = true;
        break;
    }
  }
  
  // 通知の表示
  showNotification(title, message, type = 'info') {
    // 既存の通知を削除
    const existingNotification = document.querySelector('.notification');
    if (existingNotification) {
      existingNotification.remove();
    }
    
    // 通知要素の作成
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    
    // 通知の内容
    notification.innerHTML = `
      <div class="notification-content">
        <div class="notification-icon">
          <i class="fas ${this.getIconForNotificationType(type)}"></i>
        </div>
        <div class="notification-message">
          <strong>${title}</strong>
          <p>${message}</p>
        </div>
        <button class="notification-close" aria-label="閉じる">
          <i class="fas fa-times"></i>
        </button>
      </div>
    `;
    
    // 通知を表示
    document.body.appendChild(notification);
    
    // アニメーションのためのタイミング
    setTimeout(() => {
      notification.classList.add('show');
    }, 10);
    
    // 閉じるボタンのイベントリスナー
    notification.querySelector('.notification-close').addEventListener('click', () => {
      notification.classList.remove('show');
      setTimeout(() => {
        notification.remove();
      }, 300);
    });
    
    // 一定時間後に自動的に閉じる
    setTimeout(() => {
      if (document.body.contains(notification)) {
        notification.classList.remove('show');
        setTimeout(() => {
          if (document.body.contains(notification)) {
            notification.remove();
          }
        }, 300);
      }
    }, 5000);
  }
  
  // 通知タイプに応じたアイコンの取得
  getIconForNotificationType(type) {
    switch (type) {
      case 'success': return 'fa-check-circle';
      case 'error': return 'fa-exclamation-circle';
      case 'info': return 'fa-info-circle';
      default: return 'fa-info-circle';
    }
  }
  
  // Service Workerからのメッセージ処理
  handleServiceWorkerMessage(event) {
    const { type, data } = event.data;
    
    switch (type) {
      case 'stats-update':
        this.updateStats(data);
        break;
      case 'error-update':
        this.updateErrorStats(data);
        break;
      case 'settings-updated':
        console.log('Proxy settings updated:', data.success);
        break;
    }
  }
  
  // 統計情報の更新
  updateStats(data) {
    // レスポンスタイムの更新
    this.stats.responseTimes.push(data.responseTime);
    if (this.stats.responseTimes.length > 20) {
      this.stats.responseTimes.shift();
    }
    
    // 転送データ量の更新
    this.stats.dataTransferred += data.contentLength;
    
    // UI更新
    this.updateStatsUI();
    
    // チャートの更新
    this.updateCharts();
  }
  
  // エラー統計の更新
  updateErrorStats(data) {
    // エラーの追加
    this.stats.errors.push({
      message: data.message,
      timestamp: data.timestamp
    });
    
    if (this.stats.errors.length > 10) {
      this.stats.errors.shift();
    }
    
    // UI更新
    this.updateErrorUI();
  }
  
  // 統計情報UIの更新
  updateStatsUI() {
    // データ転送量の表示
    const dataTransferred = document.getElementById('data-transferred');
    dataTransferred.textContent = this.formatBytes(this.stats.dataTransferred);
    
    // レスポンスタイムの表示
    const responseTime = document.getElementById('response-time');
    const avgResponseTime = this.stats.responseTimes.length > 0
      ? this.stats.responseTimes.reduce((sum, time) => sum + time, 0) / this.stats.responseTimes.length
      : 0;
    responseTime.textContent = `${Math.round(avgResponseTime)} ms`;
  }
  
  // エラーUIの更新
  updateErrorUI() {
    const errorCount = document.getElementById('error-count');
    const errorLog = document.getElementById('error-log');
    
    // エラー数の表示
    errorCount.textContent = this.stats.errors.length;
    
    // エラーログの表示
    if (this.stats.errors.length > 0) {
      errorLog.innerHTML = this.stats.errors.map(error => `
        <div class="error-item">
          <span class="error-time">${new Date(error.timestamp).toLocaleTimeString()}</span>
          <span class="error-message">${error.message}</span>
        </div>
      `).join('');
    } else {
      errorLog.innerHTML = '<p class="empty-log">エラーはありません</p>';
    }
  }
  
  // チャートの初期化
  initCharts() {
    const dataChartCtx = document.getElementById('data-chart').getContext('2d');
    const responseChartCtx = document.getElementById('response-chart').getContext('2d');
    
    // データ転送チャート
    this.charts.dataChart = new Chart(dataChartCtx, {
      type: 'line',
      data: {
        labels: Array(10).fill(''),
        datasets: [{
          label: '転送データ量',
          data: Array(10).fill(0),
          borderColor: '#3498db',
          backgroundColor: 'rgba(52, 152, 219, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => this.formatBytes(value, 0)
            }
          },
          x: {
            display: false
          }
        }
      }
    });
    
    // レスポンスタイムチャート
    this.charts.responseChart = new Chart(responseChartCtx, {
      type: 'line',
      data: {
        labels: Array(10).fill(''),
        datasets: [{
          label: 'レスポンスタイム',
          data: Array(10).fill(0),
          borderColor: '#2ecc71',
          backgroundColor: 'rgba(46, 204, 113, 0.1)',
          borderWidth: 2,
          tension: 0.4,
          fill: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            display: false
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: {
              callback: value => `${value} ms`
            }
          },
          x: {
            display: false
          }
        }
      }
    });
  }
  
  // チャートの更新
  updateCharts() {
    if (!this.charts.dataChart || !this.charts.responseChart) return;
    
    // データ転送チャートの更新
    const dataChart = this.charts.dataChart;
    dataChart.data.datasets[0].data.push(this.stats.dataTransferred);
    dataChart.data.datasets[0].data.shift();
    dataChart.update();
    
    // レスポンスタイムチャートの更新
    const responseChart = this.charts.responseChart;
    const latestResponseTime = this.stats.responseTimes.length > 0
      ? this.stats.responseTimes[this.stats.responseTimes.length - 1]
      : 0;
    responseChart.data.datasets[0].data.push(latestResponseTime);
    responseChart.data.datasets[0].data.shift();
    responseChart.update();
  }
  
  // 統計情報のリセット
  resetStats() {
    this.stats = {
      dataTransferred: 0,
      responseTimes: [],
      errors: [],
      startTime: new Date()
    };
    
    // UI更新
    this.updateStatsUI();
    this.updateErrorUI();
    
    // チャートのリセット
    if (this.charts.dataChart && this.charts.responseChart) {
      this.charts.dataChart.data.datasets[0].data = Array(10).fill(0);
      this.charts.responseChart.data.datasets[0].data = Array(10).fill(0);
      this.charts.dataChart.update();
      this.charts.responseChart.update();
    }
  }
  
  // 接続時間タイマーの開始
  startConnectionTimer() {
    this.stats.startTime = new Date();
    this.updateConnectionTime();
    
    this.connectionTimer = setInterval(() => {
      this.updateConnectionTime();
    }, 1000);
  }
  
  // 接続時間タイマーの停止
  stopConnectionTimer() {
    if (this.connectionTimer) {
      clearInterval(this.connectionTimer);
      this.connectionTimer = null;
    }
  }
  
  // 接続時間の更新
  updateConnectionTime() {
    if (!this.stats.startTime) return;
    
    const now = new Date();
    const diff = now - this.stats.startTime;
    
    const hours = Math.floor(diff / 3600000);
    const minutes = Math.floor((diff % 3600000) / 60000);
    const seconds = Math.floor((diff % 60000) / 1000);
    
    const timeString = [
      hours.toString().padStart(2, '0'),
      minutes.toString().padStart(2, '0'),
      seconds.toString().padStart(2, '0')
    ].join(':');
    
    document.getElementById('connection-time').textContent = timeString;
  }
  
  // バイト数のフォーマット
  formatBytes(bytes, decimals = 2) {
    if (bytes === 0) return '0 Bytes';
    
    const k = 1024;
    const dm = decimals < 0 ? 0 : decimals;
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    
    return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
  }
}

// グローバルインスタンスの作成
const proxyManager = new ProxyManager();
