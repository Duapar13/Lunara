#!/usr/bin/env bash
# Redéploie le backend sur le serveur Debian : envoie le code, installe les dépendances,
# applique le schéma SQL et redémarre le service. Le .env et les uploads du serveur sont conservés.
# Usage : ./deploy.sh   (clé SSH ~/.ssh/lunara_deploy, ou SSH_KEY=... ./deploy.sh)
set -euo pipefail

HOST="${DEPLOY_HOST:-root@176.161.39.196}"
KEY="${SSH_KEY:-$HOME/.ssh/lunara_deploy}"
SSH=(ssh -i "$KEY" -o BatchMode=yes "$HOST")

cd "$(dirname "$0")"
ARCHIVE="$(mktemp -t lunara-server.XXXXXX).tgz"
tar --exclude=node_modules --exclude=.env --exclude=uploads -czf "$ARCHIVE" server
scp -i "$KEY" -o BatchMode=yes -q "$ARCHIVE" "$HOST:/tmp/lunara-server.tgz"
rm -f "$ARCHIVE"

"${SSH[@]}" '
set -e
tar -xzf /tmp/lunara-server.tgz -C /opt/lunara && rm /tmp/lunara-server.tgz
cd /opt/lunara/server
npm ci --omit=dev --no-fund --no-audit
chown -R lunara:lunara /opt/lunara
sudo -u lunara node src/migrate.js
systemctl restart lunara
sleep 2
systemctl is-active lunara
curl -fsS http://127.0.0.1:4020/health && echo
'
echo "Déployé : https://api-lunara.duapar.fr"
