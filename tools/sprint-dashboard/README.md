# 🚀 Sprint Dashboard - BMAD Module

Dashboard de visualisation en temps réel de la progression du projet ProspectFlow.

## 📋 Fonctionnalités

- ✅ Vue d'ensemble de la progression globale
- 📊 Statistiques en temps réel (stories done/in-progress/backlog)
- 🎯 Cartes visuelles pour chaque Epic
- 📈 Graphiques de progression (Chart.js)
- 🔍 Filtres par status (All/En cours/Terminés/Backlog)
- 🗓️ Timeline des sprints
- 📱 Design responsive et moderne

## 🚀 Démarrage Rapide

### Via Makefile (recommandé)

```bash
# Depuis la racine du projet
make dashboard
```

Le dashboard s'ouvre automatiquement sur: **http://localhost:8080/tools/sprint-dashboard/**

### Alternative: Serveur HTTP manuel

```bash
# Depuis la racine du projet
npx http-server -p 8080 -c-1 -o /tools/sprint-dashboard/
```

## 📁 Structure

```
tools/sprint-dashboard/
├── index.html          # Page principale
├── app.js              # Logic + parsing YAML
├── styles.css          # Styling moderne
└── README.md           # Documentation
```

## 🔄 Mise à jour des données

Le dashboard lit automatiquement `/doc/sprint-status.yaml`.

Pour rafraîchir les données:

1. Cliquer sur le bouton "🔄 Rafraîchir" en bas
2. Ou recharger la page (F5)

## 🎨 Personnalisation

### Couleurs

Modifier les variables CSS dans `styles.css`:

```css
:root {
  --primary: #3b82f6;
  --success: #10b981;
  --warning: #f59e0b;
  --danger: #ef4444;
}
```

### Graphiques

Les graphiques utilisent Chart.js. Configuration dans `app.js` -> méthodes `renderEpicProgressChart()` et `renderStatusChart()`.

## 🐛 Troubleshooting

### Page ne charge pas

Assurez-vous de lancer le serveur depuis la **racine du projet** avec `make dashboard`

### Données non chargées

Vérifier:

1. Le fichier `doc/sprint-status.yaml` existe et est valide
2. Le serveur est bien lancé depuis la racine du projet
3. La console du navigateur pour les erreurs

### Port 8080 déjà utilisé

Modifier le port dans le Makefile:

```makefile
dashboard:
    @npx http-server -p 8081 -c-1 -o /tools/sprint-dashboard/
```

## 📝 Notes

- Le dashboard est statique et lit les données côté client
- Aucune dépendance backend nécessaire
- Fonctionne avec n'importe quel serveur HTTP
- Compatible tous navigateurs modernes

## 🔗 Intégration BMAD

Ce module fait partie de l'écosystème BMAD et suit les conventions:

- Lecture du fichier `sprint-status.yaml` officiel
- Pas de modification des données sources
- Interface cohérente avec les autres outils BMAD

---

**Made with ❤️ by BMAD Team | Party Mode Squad**
