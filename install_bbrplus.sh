# BBR Plusカーネルのダウンロード
wget -O /tmp/kernel-ml-5.10.0_bbrplus.x86_64.rpm https://repo.huaweicloud.com/kernel-el7/x86_64/Packages/kernel-ml-5.10.0_bbrplus.x86_64.rpm

# BBR Plusカーネルのインストール
sudo rpm -ivh /tmp/kernel-ml-5.10.0_bbrplus.x86_64.rpm

# Grubの設定を更新して、新しいカーネルをデフォルトに設定
sudo grub2-set-default 0
sudo grub2-mkconfig -o /boot/grub2/grub.cfg

# sysctl設定を追加してBBR Plusを有効化
echo "net.core.default_qdisc=fq" | sudo tee -a /etc/sysctl.conf
echo "net.ipv4.tcp_congestion_control=bbrplus" | sudo tee -a /etc/sysctl.conf

# 設定を適用
sudo sysctl -p

echo "BBR Plus has been installed and enabled. The system will reboot in 10 seconds."

# 10秒後にシステムを再起動
sleep 10
sudo reboot
