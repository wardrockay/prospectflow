# ProspectFlow

> Plateforme d'automatisation d'emails personnalisés avec IA pour la prospection B2B

## 🚀 Démarrage Rapide

### Environnement de Développement

```bash
# Option 1: Démarrer infrastructure + applications (recommandé)
make dev-ready

# Option 2: Démarrage par couches
make network-create   # Créer le réseau Docker (une seule fois)
make infra-only       # Infrastructure: PostgreSQL, RabbitMQ, Redis, ClickHouse
make apps-only        # Applications: Ingest API, UI Web

# Option 3: Stack complet avec monitoring
make full-stack       # Tout: infra + apps + Prometheus + Grafana

# Vérifier le statut et la santé des services
make health

# Voir les logs
make dev-logs

# Arrêter les services
make dev-down
```

### 🎯 Gestion des Services par Couches

```bash
# Redémarrer uniquement les applications (garde l'infra active)
make apps-restart

# Redémarrer uniquement l'infrastructure
make infra-restart

# Redémarrer tout
make dev-restart
```

### � Gestion Interactive des Services

Menu interactif pour gérer les services individuellement :

```bash
# Redémarrer un ou plusieurs services (menu interactif avec fzf)
make service-restart

# Ou spécifier directement le service
make service-restart SERVICE=campaign-api
make service-restart SERVICE=ingest-api
make service-restart SERVICE=ui-web

# Arrêter un service
make service-stop SERVICE=postgres

# Voir les logs d'un service
make service-logs SERVICE=campaign-api
```

**Services disponibles:** `postgres`, `rabbitmq`, `redis`, `clickhouse`, `nginx`, `prometheus`, `grafana`, `ingest-api`, `campaign-api`, `ui-web`

### 📦 Migrations Base de Données

```bash
# Exécuter les migrations Flyway
make db-migrate

# Ou directement via le script
./scripts/service-selector.sh flyway
```

Les migrations sont stockées dans `infra/postgres/db/migrations/` avec le format :
`V{YYYYMMDD_HHMMSS}___{description}.sql`

### �📊 Sprint Dashboard

Visualisez la progression du projet en temps réel :

```bash
make dashboard
```

Ouvre automatiquement le dashboard sur http://localhost:8080/tools/sprint-dashboard/

**Features du Dashboard:**

- 📈 Progression globale et par epic
- ✅ Stories terminées/en cours/backlog
- 🎯 Graphiques interactifs
- 🗓️ Timeline des sprints
- 🔍 Filtres par status

## � CI/CD Pipeline

### Continuous Integration

Le pipeline CI s'exécute automatiquement sur chaque push ou pull request:

- ✅ Linting (ESLint)
- ✅ Tests unitaires et d'intégration
- ✅ Build Docker images

### Continuous Deployment

Déploiement en production avec approval gate:

1. Go to **Actions** → **Deploy to Production**
2. Entrer le commit SHA ou tag version
3. Approuver le déploiement
4. Le workflow déploie automatiquement

**Configuration requise:** Voir [CI/CD Setup Guide](doc/CI-CD-SETUP.md)

**Rollback:** Re-déployer avec un ancien commit SHA

## �📁 Structure du projet

```
├── .editorconfig
├── .gitignore
├── README.md
├── apps
│   ├── .gitkeep
│   ├── draft-worker
│   │   └── .gitkeep
│   ├── followup-worker
│   │   └── .gitkeep
│   ├── gmail-notifier
│   │   └── .gitkeep
│   ├── ingest-api
│   │   └── .gitkeep
│   ├── mail-tracker
│   │   └── .gitkeep
│   ├── mail-writer
│   │   └── .gitkeep
│   ├── orchestrator
│   │   └── .gitkeep
│   └── ui
│       └── .gitkeep
├── infra
│   ├── .gitkeep
│   ├── nginx
│   │   └── .gitkeep
│   ├── rabbitmq
│   │   └── .gitkeep
│   ├── redis
│   │   └── .gitkeep
│   └── vault
│       └── .gitkeep
└── packages
    ├── firestore
    │   └── .gitkeep
    ├── gmail
    │   └── .gitkeep
    └── odoo
        └── .gitkeep
```
