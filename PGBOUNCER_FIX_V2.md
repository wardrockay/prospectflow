# PgBouncer Fix v2 - VPS Deployment

## Problème Sur VPS

PgBouncer crashait avec:

```
ERROR syntax error in configuration (/etc/pgbouncer/pgbouncer.ini:3)
FATAL cannot load config file
```

La configuration générée était cassée:

```ini
[databases]
dZ#I@postgres:5432/prospectflow = host=prospectflow port=zo{*hd`BI-"n auth_user=prospectflow
```

**Cause**: Le password PostgreSQL `zo{*hd`BI-"n/dZ#I` contient des caractères spéciaux (`{`, `}`, `"`, `/`) qui cassent le parsing du `DATABASE_URL`par l'image`edoburu/pgbouncer`.

## Solution: Migration vers Bitnami PgBouncer

Changement d'image: `edoburu/pgbouncer` → `bitnami/pgbouncer`

**Avantages Bitnami**:

- ✅ Gère correctement les **caractères spéciaux dans les passwords**
- ✅ Variables d'environnement séparées (pas de URL parsing)
- ✅ Image **production-ready** et maintenue par Bitnami
- ✅ Supporte **TOUS** les caractères spéciaux: `{}[]()@#$%^&*"'/\`

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

### 3. Démarrer avec la nouvelle image Bitnami

```bash
cd ~/starlightcoder/prospectflow
docker compose -f infra/postgres/docker-compose.yaml pull pgbouncer
docker compose -f infra/postgres/docker-compose.yaml up -d pgbouncer
```

### 4. Vérifier le statut

```bash
# Le container devrait démarrer sans erreur
docker ps | grep pgbouncer

# Logs devrait être propres (pas d'erreurs syntax)
docker logs prospectflow-pgbouncer

# Test connexion
docker exec prospectflow-pgbouncer pg_isready -h localhost -p 6432 -U prospectflow
```

### 5. Tester la connexion poolée

```bash
# Depuis le host VPS (port 6432 maintenant!)
psql -h localhost -p 6432 -U prospectflow -d prospectflow

# Voir les stats de pools
psql -h localhost -p 6432 -U prospectflow -d pgbouncer -c "SHOW POOLS;"
```

## ⚠️ Changement Important: Port

**Avant**: PgBouncer sur port `5432` (interne)  
**Maintenant**: PgBouncer sur port `6432`

Les applications doivent se connecter sur **6432** pour utiliser le pooling:

```bash
# Nouvelle configuration app
POSTGRES_HOST=prospectflow-pgbouncer
POSTGRES_PORT=6432

# Ou connection string
DATABASE_URL=postgresql://prospectflow:password@prospectflow-pgbouncer:6432/prospectflow
```

## Configuration Bitnami vs edoburu

### Avant (edoburu - CASSÉ avec special chars):

```yaml
environment:
  DATABASE_URL: postgres://user:p@ss{w}rd@host:5432/db # ❌ Parse error!
```

### Maintenant (Bitnami - FONCTIONNE):

```yaml
environment:
  POSTGRESQL_HOST: postgres
  POSTGRESQL_PORT: 5432
  POSTGRESQL_USERNAME: prospectflow
  POSTGRESQL_PASSWORD: 'zo{*hd`BI-"n/dZ#I' # ✅ Special chars OK!
  POSTGRESQL_DATABASE: prospectflow
  PGBOUNCER_PORT: 6432
```

## Validation

```bash
# 1. Container healthy
docker ps --filter "name=pgbouncer" --format "{{.Names}}\t{{.Status}}"
# Devrait afficher: prospectflow-pgbouncer   Up X seconds (healthy)

# 2. Logs propres
docker logs prospectflow-pgbouncer 2>&1 | grep -i error
# Devrait être vide

# 3. Connexion fonctionne
psql -h localhost -p 6432 -U prospectflow -d prospectflow -c "SELECT version();"
# Devrait retourner la version PostgreSQL
```

## Troubleshooting

### "FATAL: No such user: prospectflow"

**Solution**: Attendre que PostgreSQL soit complètement prêt:

```bash
docker exec prospectflow-postgres pg_isready -U prospectflow
```

### "Connection refused on port 6432"

**Cause**: Container pas démarré ou port mapping incorrect  
**Solution**:

```bash
docker ps | grep pgbouncer  # Vérifier si running
docker logs prospectflow-pgbouncer  # Voir les erreurs
```

### Apps ne peuvent pas se connecter

**Cause**: Apps utilisent encore port 5432 ou ancien hostname  
**Solution**: Mettre à jour les variables d'env des apps:

```bash
POSTGRES_HOST=prospectflow-pgbouncer
POSTGRES_PORT=6432  # Important: port 6432 pour pgbouncer!
```

## Références

- [Bitnami PgBouncer Docs](https://hub.docker.com/r/bitnami/pgbouncer)
- [PgBouncer Official](https://www.pgbouncer.org/)
- [infra/postgres/pgbouncer/README.md](../../../infra/postgres/pgbouncer/README.md)
