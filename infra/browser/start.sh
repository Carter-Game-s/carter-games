#!/usr/bin/env bash
set -euo pipefail
docker stop carter-browser >/dev/null 2>&1 || true
docker network inspect carter-browser >/dev/null 2>&1 || docker network create --subnet 172.30.0.0/24 carter-browser >/dev/null
iptables -N CARTER_BROWSER_OUT 2>/dev/null || true
iptables -F CARTER_BROWSER_OUT
iptables -A CARTER_BROWSER_OUT -m conntrack --ctstate ESTABLISHED,RELATED -j RETURN
for carter_range in 0.0.0.0/8 10.0.0.0/8 100.64.0.0/10 127.0.0.0/8 169.254.0.0/16 172.16.0.0/12 192.0.0.0/24 192.0.2.0/24 192.88.99.0/24 192.168.0.0/16 198.18.0.0/15 198.51.100.0/24 203.0.113.0/24 224.0.0.0/4 240.0.0.0/4; do
  iptables -A CARTER_BROWSER_OUT -d "$carter_range" -j REJECT
done
while read -r carter_address; do
  iptables -A CARTER_BROWSER_OUT -d "$carter_address" -j REJECT
done < <(ip -o -4 addr show scope global | awk '{print $4}')
iptables -A CARTER_BROWSER_OUT -j RETURN
iptables -C DOCKER-USER -s 172.30.0.0/24 -j CARTER_BROWSER_OUT 2>/dev/null || iptables -I DOCKER-USER 1 -s 172.30.0.0/24 -j CARTER_BROWSER_OUT
docker container inspect carter-browser >/dev/null 2>&1 || docker create --name carter-browser --init --network carter-browser --dns 1.1.1.1 --read-only --cap-drop ALL --security-opt no-new-privileges --security-opt seccomp=/opt/carter-browser/seccomp.json --memory 1024m --memory-swap 1024m --cpus 1.5 --pids-limit 256 --shm-size 128m --tmpfs /tmp:rw,nosuid,nodev,size=256m,mode=1777 --env-file /etc/carter-browser.env -p 127.0.0.1:8081:8081 carter-browser:release >/dev/null
exec docker start -a carter-browser
