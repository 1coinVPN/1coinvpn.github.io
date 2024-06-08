#!/bin/bash

# Firewalldのインストールと起動
sudo yum install -y firewalld
sudo systemctl start firewalld
sudo systemctl enable firewalld

# BitTorrentおよびP2Pサービスでよく使用されるポートリスト
P2P_PORTS=(
    6881-6889 # BitTorrent
    6969      # BitTorrent Tracker
    51413     # Transmission
    12345     # General P2P
    13579     # General P2P
)

# 指定されたポートをブロックする関数
block_ports() {
    for PORT in "${P2P_PORTS[@]}"; do
        echo "Blocking port $PORT..."
        sudo firewall-cmd --permanent --add-rich-rule="rule family='ipv4' port port=$PORT protocol='tcp' reject"
        sudo firewall-cmd --permanent --add-rich-rule="rule family='ipv4' port port=$PORT protocol='udp' reject"
    done
}

# 設定をリロードして反映
reload_firewalld() {
    sudo firewall-cmd --reload
}

# メインスクリプトの実行部分
echo "Blocking BitTorrent and P2P service ports..."
block_ports

echo "Reloading firewalld to apply changes..."
reload_firewalld

echo "Ports blocked successfully."
