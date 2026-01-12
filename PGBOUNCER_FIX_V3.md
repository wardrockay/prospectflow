# PgBouncer Fix v3 - VPS Deployment (Image Officielle)

## Problème Sur VPS

PgBouncer crashait avec:

```
ERROR syntax error in configuration (/etc/pgbouncer/pgbouncer.ini:3)
FATAL cannot load config file
```

**Tentative Bitnami**: L'image `bitnami/pgbouncer:latest` n'existe pas (404 not found)

## Solution Finale: Image Officielle + Script Init

**Image**: `pgbouncer/pgbouncer:latest` (officielle)  
**Script**: `init.sh` qui génère la config à partir des variables d'env

**Avantages**:

- ✅ **Gère les caractères spéciaux** dans les passwords
- ✅ Variables d'environnement **séparées** (pas de URL parsing)
- ✅ Image **officielle** maintenue par l'équipe PgBouncer
- ✅ Supporte **TOUS** les special chars: `{}[]()@#$%^&*"'/\`
- ✅ Script transparent et auditable

## Déploiement sur VPS

### 1. Stopper l'ancien container

```bash
cd ~/starlightcoder/prospectflow
docker compose -f infra/postgres/docker-compose.yaml down pgbouncer
```

### 2. Pull les changements

```bash
git pull origin main
```

### 3. Démarrer avec l'image officielle

```bash
cd ~/starlightcoder/prospectflow
docker compose -f infra/postgres/docker-compose.yaml up -d pgbouncer
```

### 4. Vérifier le statut

```bash
# Le container devrait démarrer avec message "✅ Created userlist.txt"
docker logs prospectflow-pgbouncer

# Container healthy
docker ps | grep pgbouncer

# Test connexion
docker exec prospectflow-pgbouncer pg_isready -h localhost -p 6432
```

### 5. Tester la connexion poolée

```bash
# Depuis le host VPS
psql -h localhost -p 6432 -U prospectflow -d prospectflow

# Stats de pools
psql -h localhost -p 6432 -U prospectflow -d pgbouncer -c "SHOW POOLS;"
```

## Configuration

**Image officielle avec script init** (`infra/postgres/docker-compose.yaml`):

```yaml
pgbouncer:
  image: pgbouncer/pgbouncer:latest
  volumes:
    - ./pgbouncer/init.sh:/init.sh:ro
  entrypoint: ['/bin/sh', '/init.sh']
  environment:
    DB_HOST: postgres
    DB_PORT: 5432
    DB_NAME: prospectflow
    DB_USER: prospectflow
    DB_PASSWORD: 'zo{*hd`BI-"n/dZ#I' # ✅ Special chars OK!
    PGBOUNCER_PORT: 6432
    PGBOUNCER_POOL_MODE: transaction
    PGBOUNCER_MAX_CLIENT_CONN: 100
    PGBOUNCER_DEFAULT_POOL_SIZE: 25
```

**Le script `init.sh`** génère automatiquement:

1. `/etc/pgbouncer/userlist.txt` avec hash MD5 correct du password
2. `/etc/pgbouncer/pgbouncer.ini` avec toutes les configurations

**Code du script** (`infra/postgres/pgbouncer/init.sh`):

- Calcule le MD5 hash: `md5(password + username)`
- Génère les fichiers de config
- Lance pgbouncer

## Port Important

**Port**: `6432` (standard pgbouncer)

Applications doivent se connecter sur port **6432**:

```bash
POSTGRES_HOST=prospectflow-pgbouncer
POSTGRES_PORT=6432
```

## Logs de Démarrage Attendus

```bash
docker logs prospectflow-pgbouncer
```

**Output attendu**:

```
✅ Created userlist.txt for user: prospectflow
✅ Created pgbouncer.ini

🚀 Starting PgBouncer...
2026-01-12 XX:XX:XX.XXX UTC [1] LOG File descriptor limit: 1024 (H:1048576), max_client_conn: 100, max fds possible: 125
2026-01-12 XX:XX:XX.XXX UTC [1] LOG listening on 0.0.0.0:6432
2026-01-12 XX:XX:XX.XXX UTC [1] LOG process up: PgBouncer X.X.X, libevent X.X.X
```

## Validation

✅ **Container healthy**:

```bash
docker ps --filter "name=pgbouncer" --format "{{.Names}}\t{{.Status}}"
# prospectflow-pgbouncer   Up X seconds (healthy)
```

✅ **Logs propres** (pas d'erreur "syntax error"):

```bash
docker logs prospectflow-pgbouncer 2>&1 | grep -i "error\|fatal"
# Devrait être vide ou juste des logs normaux
```

✅ **Connexion fonctionne**:

```bash
psql -h localhost -p 6432 -U prospectflow -d prospectflow -c "SELECT version();"
```

## Troubleshooting

### Container restart loop

Vérifier les logs:

```bash
docker logs prospectflow-pgbouncer
```

Si erreur "pgbouncer: not found":

- Vérifier que le script `init.sh` est bien monté
- Vérifier que `entrypoint` est défini dans docker-compose

### "Authentication failed"

Le script génère automatiquement le hash MD5. Si problème:

```bash
# Vérifier le userlist généré
docker exec prospectflow-pgbouncer cat /etc/pgbouncer/userlist.txt

# Devrait afficher:
# "prospectflow" "md5XXXXXXXXXXXXX..."
```

### Connexion refusée

Vérifier que PostgreSQL est up:

```bash
docker exec prospectflow-postgres pg_isready -U prospectflow
```

## Fichiers Modifiés

1. ✅ `infra/postgres/docker-compose.yaml` - Config pgbouncer avec script init
2. ✅ `infra/postgres/pgbouncer/init.sh` - Script de génération de config
3. ✅ Ce guide de déploiement

## Références

- [PgBouncer Official Image](https://hub.docker.com/r/pgbouncer/pgbouncer)
- [PgBouncer Docs](https://www.pgbouncer.org/)
- [Script source](infra/postgres/pgbouncer/init.sh)
