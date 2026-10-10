# Lunara — Tarot y guía espiritual

Marketplace mobile qui met en relation des clients hispanophones (Pérou en priorité) avec des tarotistes et guides spirituels vérifiés : chat par forfait de questions, visio de 30 min / 1 h, paiement Stripe (cartes du Pérou et du monde, Apple Pay, Google Pay), avis vérifiés, et IA (Claude) pour approfondir une lecture.

```
Lunara/
├── mobile/   App React Native — Expo SDK 57, Expo Router, compatible Expo Go
└── server/   API Node.js — Express 5, MySQL, Socket.io, Stripe, Daily.co, Claude
```

## Fonctionnalités

| Côté client | Côté voyante | Admin |
|---|---|---|
| Accueil, recherche, filtres (spécialité, en ligne, note, prix) | Inscription → profil « en revisión » | Valide / refuse les profils des voyantes |
| Fiche voyante type Airbnb : note, avis vérifiés, forfaits | Interrupteur « En línea » (présence temps réel) | |
| Réservation : chat 1/3/5 questions ou visio 30/60 min (maintenant ou créneau) | Prix de ses 5 forfaits, horaires par jour | |
| Paiement Stripe : cartes Visa / Mastercard / Amex péruviennes ou étrangères, Apple Pay, Google Pay | Chat temps réel, visio, saisie de la tirada (cartes + message) | |
| Chat temps réel avec compteur de questions, visio Daily en WebView | Gains du mois (après commission), consultations ouvertes | |
| Avis 1 par consultation terminée, IA « Profundizar », tirada del día | | |

Règles d'identité respectées : palette du brief, Playfair Display + Inter, espagnol du Pérou, prix en `S/`, aucune statistique inventée (une nouvelle voyante affiche « Nuevo en Lunara », les avis viennent uniquement de consultations terminées).

## Démarrage en local

Prérequis : Node 20+ et MySQL 8 (ou MariaDB 10.6+).

### 1. Serveur

```bash
cd server
npm install
cp .env.example .env        # puis remplir au minimum JWT_SECRET et DB_*
mysql -u root -p -e "CREATE DATABASE lunara CHARACTER SET utf8mb4; CREATE USER 'lunara'@'localhost' IDENTIFIED BY 'motdepasse'; GRANT ALL ON lunara.* TO 'lunara'@'localhost';"
npm run migrate             # crée les tables
npm run demo:seed           # données de démonstration (voir plus bas)
npm run dev
```


### 2. App mobile (Expo Go)

```bash
cd mobile
npm install
cp .env.example .env        # EXPO_PUBLIC_API_URL = IP locale de ton PC, ex. http://192.168.1.10:4000
npx expo start
```

Scanne le QR code avec **Expo Go** (le téléphone doit être sur le même Wi-Fi). En local, mets aussi `PUBLIC_URL=http://<ip-du-pc>:4000` dans `server/.env` pour que les avatars s'affichent sur le téléphone.

## Données de démonstration

`npm run demo:seed` crée 8 voyantes complètes, des clientes, un historique de consultations avec avis, et pour `cliente@demo.lunara.app` un chat en cours, une visio réservée et une consultation terminée avec tirage (pour tester « Profundizar con IA »). Mot de passe de tous les comptes : `lunara123`.

Le service `lunara-demo` (`src/demo-presence.js`) garde 4 voyantes de démo « En línea ».

**Avant le lancement public**, tout effacer : les avis de démo sont fictifs.

```bash
systemctl disable --now lunara-demo
cd /opt/lunara/server && sudo -u lunara npm run demo:purge
```

## Services externes à configurer

Sans ces clés, l'app fonctionne mais la fonction concernée renvoie un message clair (« no está disponible »).

| Service | Variables (`server/.env`) | À faire |
|---|---|---|
| **Stripe** | `STRIPE_SECRET_KEY`, `STRIPE_PUBLISHABLE_KEY`, `STRIPE_WEBHOOK_SECRET` | Compte Stripe (ex. France, le Pérou n'est pas éligible comme pays marchand) ; webhook `https://<api>/payments/stripe/webhook` sur l'événement `payment_intent.succeeded`. Mets aussi la clé publique dans `mobile/.env`. |
| **Daily.co** | `DAILY_API_KEY`, `DAILY_DOMAIN` | Compte Daily ; `DAILY_DOMAIN` = sous-domaine (`lunara` pour `lunara.daily.co`). |
| **Claude** | `ANTHROPIC_API_KEY`, `AI_DAILY_LIMIT` | Clé sur console.anthropic.com. Modèle `claude-opus-5-5`, appelé uniquement côté serveur. |

Pour créer le premier vrai admin : inscris-toi dans l'app puis `UPDATE users SET role='admin' WHERE email='toi@...';`.

## Production actuelle

| | |
|---|---|
| API | `https://api-lunara.duapar.fr` (HTTPS Let's Encrypt, renouvelé automatiquement ; l'ancien nom `176-161-39-196.sslip.io` redirige ici) |
| Code | `/opt/lunara/server`, exécuté par l'utilisateur système `lunara` |
| Service | `systemctl status lunara` · logs : `journalctl -u lunara -f` |
| Port local | `127.0.0.1:4020` (non exposé, uniquement via nginx) |
| Nginx | `/etc/nginx/sites-available/lunara` (WebSocket Socket.io activé) |
| Base | MariaDB, base et utilisateur `lunara` (accès localhost uniquement) |
| Secrets | `/opt/lunara/server/.env` (chmod 600) |

Redéployer après une modification du backend : `./deploy.sh` depuis la racine du repo (clé SSH `~/.ssh/lunara_deploy`). Le `.env` et les avatars du serveur sont conservés.

Ajouter une clé (Stripe, Daily, Claude) : la mettre dans `/opt/lunara/server/.env` puis `systemctl restart lunara`.

Webhook à déclarer quand les clés seront en place :
- Stripe : `https://api-lunara.duapar.fr/payments/stripe/webhook` (événement `payment_intent.succeeded`)

## Déploiement sur un nouveau serveur Debian

```bash
# sur le serveur
git clone https://github.com/Duapar13/Lunara.git && cd Lunara/server
npm ci --omit=dev
cp .env.example .env && nano .env      # PUBLIC_URL=https://api.ton-domaine, clés de prod
npm run migrate
```

Service systemd `/etc/systemd/system/lunara.service` :

```ini
[Unit]
Description=Lunara API
After=network.target mysql.service

[Service]
WorkingDirectory=/opt/Lunara/server
ExecStart=/usr/bin/node src/index.js
Restart=always
User=www-data
Environment=NODE_ENV=production

[Install]
WantedBy=multi-user.target
```

Nginx (HTTPS obligatoire pour les webhooks et la visio) — les en-têtes `Upgrade` sont indispensables à Socket.io :

```nginx
server {
  server_name api.ton-domaine;
  client_max_body_size 5m;
  location / {
    proxy_pass http://127.0.0.1:4000;
    proxy_http_version 1.1;
    proxy_set_header Upgrade $http_upgrade;
    proxy_set_header Connection "upgrade";
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

Puis `sudo certbot --nginx -d api.ton-domaine` et `sudo systemctl enable --now lunara`.

## Fonctionnement clé

- **Forfaits** : chat 1/3/5 questions, visio 30/60 min. Chaque message du client dans un chat consomme une question (décompte atomique côté serveur) ; la question posée à la réservation compte comme la 1re.
- **Paiement** : la réservation est créée en `pending_payment`, puis passe à `paid` uniquement après vérification serveur (webhook Stripe ou relecture du PaymentIntent, montant contrôlé). Les réservations non payées sont libérées au bout de 2 h.
- **Visio** : salle Daily privée à 2 personnes, créée à la première entrée, qui expire et éjecte tout le monde à la fin du créneau (+10 min). Ouverture 10 min avant l'heure réservée.
- **Annulation** : tant que la consultation n'a pas commencé, client ou voyante peut annuler, avec remboursement automatique.
- **IA** : « Tirada del día » (3 cartes) et « Profundizar » sur la tirada saisie par la voyante, avec un quota par utilisateur et par jour.
- **Temps réel** : Socket.io pour le chat, l'indicateur « escribiendo… », la présence « En línea » et les bannières de notification dans l'app.

## Limites actuelles et suites possibles

- **Notifications push** : Expo Go ne les supporte plus sur Android. Il faudra une *development build* (`eas build --profile development`) puis `expo-notifications`. En attendant, les notifications sont des bannières dans l'app (Socket.io).
- **Reversement aux voyantes** : les gains sont calculés (commission `PLATFORM_COMMISSION`) mais le virement est manuel. Étape suivante : Stripe Connect (Express).
- **Apple Pay** ne fonctionne pas dans Expo Go (il faut une build signée avec le merchant ID).
- **Visio** en WebView : bonne qualité pour du 1-à-1. Pour une visio native (LiveKit, Agora), passer à une development build.
- **Langue** : l'interface est en espagnol uniquement.
