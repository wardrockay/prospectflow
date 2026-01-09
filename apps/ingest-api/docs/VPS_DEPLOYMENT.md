# Guide de déploiement sur VPS

## Prérequis

L'application crash en boucle car il manque les variables d'environnement PostgreSQL.

## Étapes de correction sur le VPS

### 1. Créer le fichier `.env`

```bash
cd ~/starlightcoder/prospectflow/apps/ingest-api
nano .env
```

Contenu du fichier `.env` :

```env
# IMPORTANT: Remplacer par votre vrai mot de passe PostgreSQL
POSTGRES_PASSWORD=votre_mot_de_passe_securise
```

### 2. Pull les derniers changements

```bash
git pull origin main
```

### 3. Rebuild et redémarrer

```bash
cd ~/starlightcoder/prospectflow/apps/ingest-api
sudo docker compose down
sudo docker compose build --no-cache
sudo docker compose up -d
```

### 4. Vérifier les logs

```bash
sudo docker logs prospectflow-ingest-api -f
```

Vous devriez voir :

```
{"msg":"PostgreSQL pool created"}
{"msg":"🚀 Server running on http://localhost:3000"}
```

### 5. Tester l'API

```bash
curl http://localhost:3000/health
# Devrait retourner: {"status":"ok"}

curl http://localhost:3000/api/v1/health
# Devrait retourner les infos détaillées avec la connexion DB
```

## Corrections appliquées

1. **Dockerfile** :

   - ✅ Corrigé `CMD` de `dist/app.js` → `dist/server.js`
   - ✅ Supprimé la copie des fichiers `.env` (insécure)
   - ✅ Ajouté `EXPOSE 3000`

2. **docker-compose.yaml** :

   - ✅ Ajouté toutes les variables d'environnement PostgreSQL
   - ✅ Utilise `${POSTGRES_PASSWORD}` depuis `.env`
   - ✅ Ajouté `depends_on` pour attendre PostgreSQL

3. **Sécurité** :
   - ✅ `.env` dans `.gitignore`
   - ✅ Mot de passe non committé dans le repo

## Troubleshooting

### L'API redémarre toujours

Vérifier les logs d'erreur:

```bash
sudo docker logs prospectflow-ingest-api --tail 100
```

### Erreur "POSTGRES_PASSWORD is required"

Le fichier `.env` n'existe pas ou est mal placé:

```bash
ls -la .env
# Doit être dans apps/ingest-api/.env
```

### Erreur "Cannot connect to PostgreSQL"

Vérifier que le container PostgreSQL tourne:

```bash
sudo docker ps | grep postgres
```

Vérifier que le réseau Docker est créé:

```bash
sudo docker network ls | grep prospectflow
```

### Port 3000 déjà utilisé

Changer le port dans docker-compose.yaml:

```yaml
ports:
  - '3001:3000' # Hôte:Container
```
