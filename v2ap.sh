#!/bin/bash

echo "Please enter AP's SNI(domain)"
read ap_domain

echo "Please enter AP's Number"
read ap_number

echo PasswordAuthentication no >> /etc/ssh/sshd_config
echo PermitEmptyPasswords no >> /etc/ssh/sshd_config
echo PubkeyAuthentication yes >> /etc/ssh/sshd_config
echo RhostsAuthentication no >> /etc/ssh/sshd_config
echo ChallengeResponseAuthentication no >> /etc/ssh/sshd_config
service sshd restart

yum -y install nano && yum -y install wget && yum -y install curl && yum -y install tar

yum -y install firewalld
systemctl enable firewalld && systemctl start firewalld
systemctl start firewalld.service
systemctl enable firewalld.service
firewall-cmd --permanent --new-service=NoTorrent
firewall-cmd --permanent --service=NoTorrent --set-description="Block bittorrent ports"
firewall-cmd --permanent --service=NoTorrent --add-port=6881-6889/tcp
firewall-cmd --permanent --service=NoTorrent --add-port=6881-6889/udp
firewall-cmd --permanent --service=NoTorrent --set-destination="~0.0.0.0/0"
firewall-cmd --permanent --add-port=80/tcp
firewall-cmd --permanent --add-port=80/udp
firewall-cmd --permanent --add-port=443/tcp
firewall-cmd --permanent --add-port=443/udp
firewall-cmd --add-port=44443-65535/tcp --zone=public --permanent
firewall-cmd --add-forward-port=port=44443-65535:proto=tcp:toport=443
firewall-cmd --reload
firewall-cmd --runtime-to-permanent
firewall-cmd --list-all

systemctl enable crond.service

(crontab -l; echo "PATH=/sbin:/bin:/usr/sbin:/usr/bin")
(crontab -l; echo "0 3 1 * * curl -fsSL https://github.com/tokumeikoi/tidalab-trojan/raw/master/sign.sh | $ap_domain")
(crontab -l; echo "30 5 * * * reboot -h now") | crontab -

curl -fsSL https://get.docker.com | bash -s docker
systemctl start docker
systemctl enable docker

curl -fsSL https://github.com/tokumeikoi/tidalab-trojan/raw/master/sign.sh | bash -s $ap_domain

docker rm -f trojan
docker run -d --name=trojan \
-v /root/.cert:/root/.cert \
-e API=https://1coin.club \
-e TOKEN=asdfghjklaafgjkjhlgfsfSXGfvs \
-e NODE=$ap_number \
-e LICENSE=090581d8b2d64f2b8088dc6701378da7 \
-e PROTOCOL=trojan \
--restart=always \
--network=host \
tokumeikoi/uniproxy




