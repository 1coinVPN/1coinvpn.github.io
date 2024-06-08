#!/bin/bash

# SSH設定ファイルのパス
SSHD_CONFIG="/etc/ssh/sshd_config"

# 必要な設定を変更する関数
configure_sshd() {
  # パスワード認証を無効にする
  sudo sed -i 's/^#PasswordAuthentication yes/PasswordAuthentication no/' $SSHD_CONFIG
  sudo sed -i 's/^PasswordAuthentication yes/PasswordAuthentication no/' $SSHD_CONFIG

  # Challenge-Response認証を無効にする
  sudo sed -i 's/^#ChallengeResponseAuthentication yes/ChallengeResponseAuthentication no/' $SSHD_CONFIG
  sudo sed -i 's/^ChallengeResponseAuthentication yes/ChallengeResponseAuthentication no/' $SSHD_CONFIG

  # 公開キー認証を有効にする
  sudo sed -i 's/^#PubkeyAuthentication yes/PubkeyAuthentication yes/' $SSHD_CONFIG
}

# SSHD設定をバックアップ
backup_sshd_config() {
  sudo cp $SSHD_CONFIG "${SSHD_CONFIG}.bak"
}

# SSHサービスを再起動する関数
restart_sshd() {
  sudo systemctl restart sshd
}

# メインスクリプトの実行部分
echo "Backing up SSHD config..."
backup_sshd_config

echo "Configuring SSHD for key-based authentication..."
configure_sshd

echo "Restarting SSHD service..."
restart_sshd

echo "SSHD configuration updated. Password login is now disabled, and key-based authentication is enabled."
