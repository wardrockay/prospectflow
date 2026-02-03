# Guide d'Intégration Landing Page - Lead Magnet

**Epic:** EPIC-LM-001 - Lead Magnet Delivery System  
**Document:** Guide d'intégration pour la landing page externe  
**Dernière mise à jour:** 2026-02-03

---

## 📋 Résumé

Ce document décrit comment intégrer le système Lead Magnet depuis ta landing page externe (Light & Shutter) vers l'API ProspectFlow (`ingest-api`).

**Architecture:**
- **Landing page** (Light & Shutter) → Gère l'UI, les formulaires, les pages
- **API** (`ingest-api`) → Gère la logique métier, emails, tokens, S3

---

## 🔌 Endpoints API

| Méthode | Endpoint | Usage |
|---------|----------|-------|
| `POST` | `/api/lead-magnet/signup` | Inscription au lead magnet |
| `GET` | `/api/lead-magnet/confirm/:token` | Confirmation email + téléchargement |

**Base URL Production:** `https://api.prospectflow.com`  
**Base URL Dev:** `http://localhost:3001`

---

## 📝 Endpoint 1: Inscription

### `POST /api/lead-magnet/signup`

Appelé quand l'utilisateur soumet le formulaire d'inscription.

#### Request

```typescript
fetch('/api/lead-magnet/signup', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    email: string,         // OBLIGATOIRE - Email de l'utilisateur
    consentGiven: boolean, // OBLIGATOIRE - Checkbox RGPD cochée (true)
    source?: string        // OPTIONNEL - Source de tracking (ex: 'landing_page', 'blog')
  })
})
```

#### Responses

**Succès (200)**
```json
{
  "success": true,
  "message": "Un email de confirmation vous a été envoyé"
}
```

**Erreur validation (400)**
```json
{ "success": false, "error": "Email invalide" }
{ "success": false, "error": "Vous devez accepter de recevoir des emails" }
{ "success": false, "error": "Vous êtes déjà inscrit(e)" }
{ "success": false, "error": "Cette adresse a été désinscrite. Contactez-nous pour vous réinscrire." }
```

**Rate limit (429)**
```json
{
  "success": false,
  "error": "Vous avez déjà demandé ce guide récemment. Vérifiez votre boîte de réception ou contactez-nous."
}
```

**Erreur serveur (500)**
```json
{
  "success": false,
  "error": "Erreur d'envoi d'email. Réessayez dans quelques instants."
}
```

---

## 📥 Endpoint 2: Confirmation & Téléchargement

### `GET /api/lead-magnet/confirm/:token`

Appelé quand l'utilisateur clique sur le lien dans l'email de confirmation.

**URL de l'email:** `https://lightandshutter.fr/lead-magnet/confirm?token=xxxxx`

#### Request

```typescript
// Extraire le token de l'URL
const urlParams = new URLSearchParams(window.location.search)
const token = urlParams.get('token')

// Appeler l'API
const response = await fetch(`/api/lead-magnet/confirm/${token}`)
const data = await response.json()
```

#### Responses

**Succès - Première confirmation (200)**
```json
{
  "success": true,
  "status": "confirmed",
  "downloadUrl": "https://s3.eu-west-3.amazonaws.com/lightandshutter-lead-magnets/...",
  "message": "Email confirmé, téléchargement prêt"
}
```

**Succès - Déjà confirmé, re-téléchargement (200)**
```json
{
  "success": true,
  "status": "already_confirmed",
  "downloadUrl": "https://s3.eu-west-3.amazonaws.com/...",
  "message": "Nouveau lien de téléchargement généré"
}
```

**Erreur - Token expiré (410)**
```json
{
  "success": false,
  "status": "expired",
  "error": "TOKEN_EXPIRED",
  "message": "Ce lien a expiré après 48 heures"
}
```

**Erreur - Token invalide (404)**
```json
{
  "success": false,
  "status": "invalid",
  "error": "TOKEN_INVALID",
  "message": "Ce lien n'est pas valide"
}
```

**Erreur - Limite atteinte (429)**
```json
{
  "success": false,
  "status": "limit_reached",
  "error": "USAGE_LIMIT",
  "message": "Limite de téléchargements atteinte"
}
```

---

## 📄 Pages à Créer

### 1. Page de Confirmation `/lead-magnet/confirm`

Cette page reçoit le paramètre `?token=xxx` depuis l'email et affiche le résultat.

```vue
<template>
  <div class="confirm-page">
    <!-- État chargement -->
    <div v-if="loading" class="loading">
      <p>Confirmation en cours...</p>
    </div>
    
    <!-- État succès -->
    <div v-else-if="downloadUrl" class="success">
      <h1>🎉 Email confirmé !</h1>
      <p>Votre guide est prêt à être téléchargé.</p>
      <a :href="downloadUrl" class="download-btn" download>
        📥 Télécharger le Guide de la Mariée Sereine
      </a>
      <p class="note">Ce lien expire dans 15 minutes.</p>
    </div>
    
    <!-- État erreur -->
    <div v-else-if="error" class="error">
      <h1>😕 Oups...</h1>
      <p>{{ errorMessage }}</p>
      
      <!-- Actions selon l'erreur -->
      <div v-if="errorType === 'TOKEN_EXPIRED'">
        <p>Vous pouvez vous réinscrire pour recevoir un nouveau lien.</p>
        <NuxtLink to="/guide-mariee">Demander un nouveau lien</NuxtLink>
      </div>
      
      <div v-else-if="errorType === 'TOKEN_INVALID'">
        <p>Vérifiez que vous avez cliqué sur le bon lien dans votre email.</p>
      </div>
    </div>
  </div>
</template>

<script setup>
const route = useRoute()
const loading = ref(true)
const downloadUrl = ref(null)
const error = ref(false)
const errorType = ref(null)
const errorMessage = ref('')

onMounted(async () => {
  const token = route.query.token
  
  if (!token) {
    error.value = true
    errorType.value = 'TOKEN_INVALID'
    errorMessage.value = 'Aucun token fourni'
    loading.value = false
    return
  }
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/lead-magnet/confirm/${token}`)
    const data = await response.json()
    
    if (data.success) {
      downloadUrl.value = data.downloadUrl
    } else {
      error.value = true
      errorType.value = data.error
      errorMessage.value = data.message
    }
  } catch (e) {
    error.value = true
    errorMessage.value = 'Erreur de connexion. Réessayez.'
  } finally {
    loading.value = false
  }
})
</script>
```

---

## 🔧 Intégration Composant Formulaire

Le composant formulaire existant doit appeler `POST /api/lead-magnet/signup`.

### Exemple d'intégration

```typescript
async function handleSubmit() {
  loading.value = true
  error.value = null
  
  try {
    const response = await fetch(`${API_BASE_URL}/api/lead-magnet/signup`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: email.value,
        consentGiven: consentGiven.value,
        source: 'landing_page'  // ou 'blog', 'instagram', etc.
      })
    })
    
    const data = await response.json()
    
    if (data.success) {
      // Afficher message succès
      submitted.value = true
    } else {
      // Afficher erreur
      error.value = data.error || data.message
    }
  } catch (e) {
    error.value = 'Erreur de connexion. Réessayez.'
  } finally {
    loading.value = false
  }
}
```

---

## ⚙️ Configuration CORS

L'API `ingest-api` doit autoriser les requêtes depuis le domaine de la landing page.

**Domaines à autoriser:**
- `https://lightandshutter.fr`
- `https://www.lightandshutter.fr`
- `http://localhost:3000` (dev)

---

## 📊 Flow Utilisateur Complet

```
┌─────────────────────────────────────────────────────────────────────┐
│                         LANDING PAGE                                │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  1. Utilisateur remplit formulaire                                  │
│     ├── Email: sophie@example.com                                   │
│     └── ☑ J'accepte de recevoir des conseils par email             │
│                                                                     │
│  2. Clic "Recevoir le guide gratuit"                               │
│     └── POST /api/lead-magnet/signup                               │
│                                                                     │
│  3. Affichage: "Email de confirmation envoyé!"                     │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                         EMAIL (AWS SES)                             │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  De: etienne.maillot@lightandshutter.fr                            │
│  Objet: Confirmez votre inscription - Guide de la Mariée Sereine   │
│                                                                     │
│  Lien: https://lightandshutter.fr/lead-magnet/confirm?token=xxx    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    PAGE /lead-magnet/confirm                        │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│  4. Utilisateur clique sur le lien email                           │
│     └── Landing page appelle GET /api/lead-magnet/confirm/:token   │
│                                                                     │
│  5. API retourne JSON avec downloadUrl                             │
│     └── { success: true, downloadUrl: "https://s3..." }            │
│                                                                     │
│  6. Landing page affiche bouton téléchargement                     │
│     └── "📥 Télécharger le Guide"                                  │
│                                                                     │
│  7. Utilisateur télécharge le PDF (URL S3 signée, valide 15min)    │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

---

## ✅ Checklist Implémentation

- [ ] Configurer la variable `API_BASE_URL` dans la landing page
- [ ] Intégrer l'appel `POST /api/lead-magnet/signup` dans le composant formulaire
- [ ] Créer la page `/lead-magnet/confirm`
- [ ] Intégrer l'appel `GET /api/lead-magnet/confirm/:token`
- [ ] Gérer tous les états UI (loading, success, erreurs)
- [ ] Vérifier CORS entre landing page et ingest-api
- [ ] Tester le flow complet (inscription → email → confirmation → téléchargement)

---

## 📞 Support

**Questions techniques:** Voir les stories LM-002 et LM-003 dans `/doc/implementation-artifacts/`
