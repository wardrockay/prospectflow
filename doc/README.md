# ProspectFlow Documentation

> Documentation centralisée pour le projet ProspectFlow - Multi-tenant B2B Sales Automation Platform

---

## 🤖 Pour les Agents BMAD - START HERE

| Besoin             | Document                                               | Description                                           |
| ------------------ | ------------------------------------------------------ | ----------------------------------------------------- |
| **🎯 OBLIGATOIRE** | [**project-context.md**](project-context.md)           | Standards de code, patterns obligatoires, déploiement |
| Sprint actuel      | [sprint-status.yaml](sprint-status.yaml)               | État des tâches, progression, blocages                |
| Architecture       | [reference/ARCHITECTURE.md](reference/ARCHITECTURE.md) | Vue système, composants, flux de données              |
| Tests              | [TESTING_WORKFLOW.md](TESTING_WORKFLOW.md)             | Commandes Makefile, stratégie de test                 |

### Workflow Agent

```
1. LIRE project-context.md (standards obligatoires)
2. CONSULTER sprint-status.yaml (tâche assignée)
3. VÉRIFIER reference/ARCHITECTURE.md (si nouveau composant)
4. IMPLÉMENTER selon les patterns
5. TESTER avec make test-unit
```

---

## 📁 Structure de la Documentation

```
doc/
├── project-context.md      # ⭐ CODING STANDARDS & DEPLOYMENT (START HERE)
├── sprint-status.yaml      # État du sprint en cours
├── TESTING_WORKFLOW.md     # Guide des tests (make commands)
│
├── reference/              # Documentation de référence stable
│   ├── ARCHITECTURE.md           # Architecture système
│   ├── PRD-ProspectFlow.md       # Product Requirements
│   └── MULTI_SOURCE_DATA_ARCHITECTURE.md
│
├── planning/               # Planification produit
│   └── epics/                    # Définitions des epics
│
├── implementation/         # Stories implémentées (historique)
│   └── 0-6-structured-logging-with-pino.md
│
├── ux-design/              # Maquettes, wireframes, UX
│
└── _archive/               # Anciens documents (référence historique)
```

---

## 🚀 Quick Commands

```bash
# Démarrer l'environnement de dev
make dev-ready

# Tests unitaires (rapide, pas d'infra)
make test-unit

# Tests d'intégration (avec infra)
make test-integration

# Déployer en production
make prod-up

# Voir toutes les commandes
make help
```

---

## 📋 Références par Domaine

### Développement

| Document                                   | Contenu                                        |
| ------------------------------------------ | ---------------------------------------------- |
| [project-context.md](project-context.md)   | Logging, multi-tenant, error handling, imports |
| [TESTING_WORKFLOW.md](TESTING_WORKFLOW.md) | Stratégie de test, commandes                   |
| [QUICK_REFERENCE.md](QUICK_REFERENCE.md)   | Commandes dev, endpoints, structure            |

### Produit & Planning

| Document                                                       | Contenu                        |
| -------------------------------------------------------------- | ------------------------------ |
| [reference/PRD-ProspectFlow.md](reference/PRD-ProspectFlow.md) | Vision, features, user stories |
| [planning/epics/](planning/epics/)                             | Epics détaillées par priorité  |
| [SPRINT-QUICK-REFERENCE.md](SPRINT-QUICK-REFERENCE.md)         | Roadmap, métriques, risques    |

### Architecture & Design

| Document                                                                                   | Contenu                       |
| ------------------------------------------------------------------------------------------ | ----------------------------- |
| [reference/ARCHITECTURE.md](reference/ARCHITECTURE.md)                                     | Composants, flux, décisions   |
| [reference/MULTI_SOURCE_DATA_ARCHITECTURE.md](reference/MULTI_SOURCE_DATA_ARCHITECTURE.md) | Intégrations externes         |
| [ux-design/](ux-design/)                                                                   | Wireframes, flows, components |

---

## 📦 Archives

Documents historiques et analyses initiales : [\_archive/](_archive/)

Contient les anciennes versions des stories et analyses de migration.
