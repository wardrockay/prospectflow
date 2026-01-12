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

### 📊 Sprint Dashboard

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
