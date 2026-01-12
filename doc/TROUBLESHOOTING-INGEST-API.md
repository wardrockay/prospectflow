# Troubleshooting: Ingest API Unhealthy

## Problème Rencontré

L'ingest-api était marquée "unhealthy" malgré le démarrage visible dans les logs.

## Causes Identifiées

### 1. ❌ Mauvais nom de container RabbitMQ

**Fichier**: `apps/ingest-api/env/.env.production`  
**Problème**: `RABBITMQ_HOST=rabbitmq` (ancien nom)  
**Solution**: `RABBITMQ_HOST=prospectflow-rabbitmq` (nouveau nom standardisé)

### 2. ❌ Infrastructure pas démarrée

**Problème**: Redis et RabbitMQ n'étaient pas en cours d'exécution  
**Solution**: Toujours démarrer l'infrastructure avant les apps

### 3. ⚠️ Health check échouait silencieusement

**Problème**: Le container redémarrait car Redis/RabbitMQ étaient inaccessibles  
**Solution**: Les logs montraient "Connection timeout" pour Redis et "EAI_AGAIN" pour RabbitMQ

## Solution Complète

### 1. Fix du container name

```bash
# Dans apps/ingest-api/env/.env.production
RABBITMQ_HOST=prospectflow-rabbitmq  # au lieu de 'rabbitmq'
```

### 2. Ordre de démarrage correct

```bash
# TOUJOURS démarrer dans cet ordre:

# 1. Infrastructure d'abord
make infra-only

# 2. Ensuite les applications
make apps-only

# OU directement
make dev-ready  # démarre infra + apps dans le bon ordre
```

### 3. Vérification

```bash
# Vérifier que tout est healthy
make health

# Ou individuellement
docker ps --filter "name=prospectflow"
```

## Symptômes d'un Problème de Dépendances

```bash
# Dans les logs de l'ingest-api:
[ERROR] Redis: Connection timeout
[ERROR] RabbitMQ: getaddrinfo EAI_AGAIN rabbitmq
[INFO] SIGTERM received, starting graceful shutdown
```

**Signification**: L'application ne peut pas se connecter aux services requis et s'arrête.

## Checklist de Diagnostic

Si l'ingest-api est unhealthy:

1. ✅ Vérifier que l'infrastructure tourne:

   ```bash
   docker ps | grep -E "postgres|redis|rabbitmq|clickhouse"
   ```

2. ✅ Vérifier les logs de l'ingest-api:

   ```bash
   docker logs prospectflow-ingest-api --tail 50
   ```

3. ✅ Chercher des erreurs de connexion:

   - `Connection timeout` → Service non démarré
   - `EAI_AGAIN` → Mauvais nom d'hôte
   - `ECONNREFUSED` → Service pas prêt ou port incorrect

4. ✅ Tester le health endpoint manuellement:

   ```bash
   docker exec prospectflow-ingest-api curl http://localhost:3000/health
   # Doit retourner: {"status":"ok"}
   ```

5. ✅ Vérifier les variables d'environnement:
   ```bash
   docker exec prospectflow-ingest-api env | grep -E "REDIS|RABBITMQ|POSTGRES"
   ```

## Prévention

### Container Names Standardisés

Tous les services utilisent le préfixe `prospectflow-`:

| Service    | Container Name            |
| ---------- | ------------------------- |
| PostgreSQL | `prospectflow-postgres`   |
| RabbitMQ   | `prospectflow-rabbitmq`   |
| Redis      | `prospectflow-redis`      |
| ClickHouse | `prospectflow-clickhouse` |
| Ingest API | `prospectflow-ingest-api` |
| UI Web     | `prospectflow-ui-web`     |

### Variables d'Environnement

**Production** (`apps/ingest-api/env/.env.production`):

```bash
POSTGRES_HOST=prospectflow-postgres
REDIS_HOST=prospectflow-redis
RABBITMQ_HOST=prospectflow-rabbitmq
```

**Development local** (hors Docker):

```bash
POSTGRES_HOST=localhost
REDIS_HOST=localhost
RABBITMQ_HOST=localhost
```

## Commandes Utiles

```bash
# Redémarrer l'ingest-api après fix
docker compose -f apps/ingest-api/docker-compose.yaml restart

# Voir les logs en temps réel
docker logs -f prospectflow-ingest-api

# Forcer un rebuild complet
docker compose -f apps/ingest-api/docker-compose.yaml up -d --build

# Nettoyer et redémarrer tout
make clean
make dev-ready
```
