# ProspectFlow Testing Workflow

## Quick Reference

```bash
# Tests rapides (pas d'infrastructure)
make test-unit

# Tests complets avec infrastructure réelle
make test-integration

# Arrêter l'infrastructure
make dev-down
```

---

## Tests Unitaires (Rapides)

**Commande :** `make test-unit`

**Durée :** ~15 secondes

**Infrastructure requise :** Aucune (tout est mocké)

**Ce qui est testé :**

- Middleware JWT validation
- Session service logic
- User sync service logic
- Organisation scope middleware
- Controllers
- Queue publishers/consumers (mockés)

**Quand l'utiliser :**

- Développement actif (boucle rapide)
- Avant chaque commit
- Dans les pre-commit hooks

```bash
cd /path/to/prospectflow
make test-unit
```

---

## Tests d'Intégration (Complets)

**Commande :** `make test-integration`

**Durée :** ~30 secondes (dont démarrage de l'infrastructure)

**Infrastructure requise :**

- ✅ PostgreSQL (localhost:5432)
- ✅ Redis (localhost:6379)
- ✅ RabbitMQ (localhost:5672)
- ✅ ClickHouse (localhost:8123)

**Ce qui est testé :**

- Authentification end-to-end (JWT → Session Redis → User DB)
- Multi-tenant isolation
- Security (session hijacking, token validation)
- Vraies connexions Redis et PostgreSQL

**Quand l'utiliser :**

- Avant de merger une PR
- Après des changements d'infrastructure
- Pour valider les stories complètes

```bash
cd /path/to/prospectflow
make test-integration    # Lance dev-ready puis les tests
```

**Détail de ce qui se passe :**

1. `make dev-up` - Démarre tous les services Docker
2. `make dev-wait` - Attend que tous les services soient healthy
3. `pnpm test --run tests/integration tests/security` - Lance les tests

---

## Gestion de l'Infrastructure

### Démarrer l'environnement

```bash
make dev-up      # Démarre PostgreSQL, RabbitMQ, Redis, ClickHouse
make dev-wait    # Attend que tout soit prêt
# OU
make dev-ready   # Combine les deux commandes ci-dessus
```

### Vérifier le statut

```bash
make dev-status
```

Exemple de sortie :

```
📊 Service Status:

PostgreSQL:
  prospectflow-postgres: Up 2 minutes (healthy)

RabbitMQ:
  rabbitmq: Up 2 minutes (healthy)

Redis:
  prospectflow-redis: Up 2 minutes (healthy)

ClickHouse:
  clickhouse-server: Up 2 minutes (healthy)
```

### Voir les logs

```bash
make dev-logs    # Ctrl+C pour arrêter
```

### Redémarrer tout

```bash
make dev-restart
```

### Arrêter l'environnement

```bash
make dev-down
```

### Nettoyer complètement (volumes inclus)

```bash
make clean
```

---

## Workflow Recommandé

### Développement d'une Feature

```bash
# 1. Écrire le code + tests unitaires
vim src/services/my-service.ts
vim tests/unit/services/my-service.test.ts

# 2. Boucle TDD rapide
make test-unit    # <15s

# 3. Avant de commiter
make test-integration    # Validation complète

# 4. Arrêter l'infra si besoin
make dev-down
```

### CI/CD Pipeline

```yaml
# .github/workflows/test.yml
jobs:
  unit-tests:
    steps:
      - run: make test-unit

  integration-tests:
    services:
      postgres: ...
      redis: ...
      rabbitmq: ...
    steps:
      - run: make test-integration
```

---

## Dépannage

### Erreur : "Redis connection refused"

```bash
# Vérifier si Redis tourne
docker ps | grep redis

# Démarrer Redis
cd infra/redis && docker compose up -d

# Ou tout démarrer
make dev-up
```

### Erreur : "PostgreSQL connection refused"

```bash
# Vérifier si PostgreSQL tourne
docker ps | grep postgres

# Démarrer PostgreSQL
cd infra/postgres && docker compose up -d

# Ou tout démarrer
make dev-up
```

### Tests bloqués sur "Waiting for services..."

```bash
# Vérifier les logs des services
make dev-logs

# Ou vérifier individuellement
docker logs prospectflow-postgres
docker logs prospectflow-redis
docker logs rabbitmq
```

### Nettoyer et recommencer

```bash
make clean        # Supprime tout (containers + volumes)
make dev-ready    # Redémarre proprement
```

---

## Tests par Story

| Story            | Tests Unitaires             | Tests d'Intégration          | Commande                |
| ---------------- | --------------------------- | ---------------------------- | ----------------------- |
| 0.1 PostgreSQL   | ✅ Health checks            | ✅ Connection pooling        | `make test-integration` |
| 0.2 Express API  | ✅ Controllers, middlewares | ✅ Routes, error handling    | `make test-unit`        |
| 0.3 RabbitMQ     | ✅ Publishers, consumers    | ⏸️ Skipped (RabbitMQ requis) | `make test-unit`        |
| 0.4 Cognito Auth | ✅ JWT, Session, User Sync  | ✅ Auth flow, Multi-tenant   | `make test-integration` |

---

## Références

- [Testing Guide](../apps/ingest-api/docs/TESTING.md) - Guide détaillé des tests
- [Redis Runbook](../apps/ingest-api/docs/redis-runbook.md) - Gestion Redis en production
- [Auth Setup](../apps/ingest-api/docs/auth-setup.md) - Configuration Cognito
