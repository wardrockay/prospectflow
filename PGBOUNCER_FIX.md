# PgBouncer Fix - VPS Deployment

## Problème Identifié

PgBouncer redémarrait continuellement avec l'erreur:
```
/entrypoint.sh: exec: line 45: pgbouncer: not found
```

**Cause**: L'entrypoint personnalisé ne trouvait pas le binaire `pgbouncer` dans le PATH.

## Solution Appliquée

Remplacement de l'image officielle `pgbouncer/pgbouncer` par `edoburu/pgbouncer` qui:
- Configure via variables d'environnement (12-factor app)
- Pas besoin d'entrypoint personnalisé
- Plus simple et plus robuste

## Déploiement sur VPS

### 1. Stopper le container actuel

```bash
cd ~/starlightcoder/prospectflow
docker compose -f infra/postgres/docker-compose.yaml down pgbouncer
```

### 2. Pull les changements

```bash
git pull origin main
```

### 3. Redémarrer pgbouncer avec la nouvelle configuration

```bash
cd ~/starlightcoder/prospectflow
docker compose -f infra/postgres/docker-compose.yaml up -d pgbouncer
```

### 4. Vérifier le statut

```bash
# Vérifier que le container tourne
docker ps | grep pgbouncer

# Vérifier les logs (devrait être propre)
docker logs prospectflow-pgbouncer

# Tester la connexion
docker exec prospectflow-pgbouncer pg_isready -h localhost -p 5432
```

### 5. Tester la connexion poolée

```bash
# Depuis le host VPS
psql -h localhost -p 6432 -U prospectflow -d prospectflow

# Voir les pools actifs
psql -h localhost -p 6432 -U prospectflow -d pgbouncer -c "SHOW POOLS;"
```

## Validation

✅ Container démarre sans erreur
✅ `pg_isready` retourne succès
✅ Connexion depuis applications fonctionne
✅ Pas de restart loops dans `docker ps`

## Rollback (si nécessaire)

Si problème, revenir à connexion directe PostgreSQL:

```bash
# Stopper pgbouncer
docker compose -f infra/postgres/docker-compose.yaml stop pgbouncer

# Les apps utilisent directement postgres sur port 5432
```

## Configuration Apps

Les applications doivent maintenant utiliser:

```bash
# Connection poolée (recommandé)
POSTGRES_HOST=prospectflow-pgbouncer
POSTGRES_PORT=5432

# Ou connection string complète
DATABASE_URL=postgresql://prospectflow:password@prospectflow-pgbouncer:5432/prospectflow
```
