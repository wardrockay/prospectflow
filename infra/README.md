# Infrastructure - ProspectFlow

Configuration Docker pour l'infrastructure du projet ProspectFlow.

## Services disponibles

### PostgreSQL 18 + pgAdmin

📁 `infra/postgres/`

- **PostgreSQL Port**: 5432
- **pgAdmin Port**: 5050 (http://localhost:5050)

### Redis 7

📁 `infra/redis/`

- **Port**: 6379

### RabbitMQ

📁 `infra/rabbitmq/`

- **AMQP Port**: 5672
- **Management UI**: 15672 (http://localhost:15672)

## Démarrage rapide

### Démarrer tous les services

```bash
# PostgreSQL + pgAdmin
cd infra/postgres
cp .env.example .env
# Modifier les mots de passe
docker compose up -d

# Redis
cd ../redis
cp .env.example .env
# Modifier le mot de passe
docker compose up -d

# RabbitMQ
cd ../rabbitmq
docker compose up -d
```

### Démarrer un service spécifique

```bash
cd infra/postgres  # ou redis, ou rabbitmq
docker compose up -d
```

## Connexion aux services

### PostgreSQL

```bash
psql -h localhost -U prospectflow -d prospectflow
```

### pgAdmin

1. Ouvrir http://localhost:5050
2. Se connecter avec les identifiants du .env
3. Ajouter un serveur :
   - Host: postgres
   - Port: 5432
   - Database: prospectflow
   - Username: prospectflow
   - Password: (celui du .env)

### Redis

```bash
redis-cli -h localhost -p 6379 -a your_redis_password_here
```

### RabbitMQ Management

http://localhost:15672 (admin / changeme par défaut)

## Arrêt des services

```bash
# Dans chaque dossier de service
docker compose down

# Pour supprimer aussi les volumes (⚠️ supprime les données)
docker compose down -v
```

## Réseau

Tous les services utilisent le réseau `prospectflow-network` pour communiquer entre eux.
