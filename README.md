# ProspectFlow

> Plateforme d'automatisation d'emails personnalisés avec IA pour la prospection B2B

## 🚀 Démarrage Rapide

### Environnement de Développement

```bash
# Démarrer tous les services (PostgreSQL, RabbitMQ, Redis, ClickHouse)
make dev-ready

# Vérifier le statut des services
make dev-status

# Voir les logs
make dev-logs

# Arrêter les services
make dev-down
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

## 📁 Structure du projet

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
