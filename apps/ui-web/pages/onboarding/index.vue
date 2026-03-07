<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

useHead({ title: 'Onboarding Mariage | ProspectFlow' });

const toast = useToast();

// ─── Email selection ───────────────────────────────────────────────────────
const selectedEmailId = ref<1 | 2 | 3 | 4>(1);

const emails = [
  {
    id: 1 as const,
    label: 'Email 1',
    title: 'Bienvenue',
    description: 'Confirmation de réservation & récapitulatif',
    icon: '🎉',
  },
  {
    id: 2 as const,
    label: 'Email 2',
    title: 'Périmètre',
    description: 'Ce qui est inclus dans la formule',
    icon: '📋',
  },
  {
    id: 3 as const,
    label: 'Email 3',
    title: 'Planning',
    description: 'Jalons & calendrier',
    icon: '📅',
  },
  {
    id: 4 as const,
    label: 'Email 4',
    title: 'Communication',
    description: 'Comment on travaille ensemble',
    icon: '💬',
  },
];

// ─── Form state ────────────────────────────────────────────────────────────
const form = reactive({
  // Client
  prenoms: '',
  emailClient: '',

  // Prestation (emails 1–3)
  nomFormule: '',
  dateMariage: '',
  lieuMariage: '',
  montantTotal: '',
  montantSolde: '',
  semainesLivraison: '',

  // Photographer contact
  emailPhotographe: 'etienne.maillot@lightandshutter.fr',
  telephone: '',
  numeroWhatsApp: '',

  // Email 2 — options
  option1: '',
  prixOption1: '',
  option2: '',
  prixOption2: '',

  // Email 3 — planning
  dateEngagement: '',
  lieuEngagement: '',
  dateBriefing: '',
  duree: '',
  heureDebut: '',
  heureFin: '',
  nombrePhotos: '',
  dureeAcces: '',
});

// ─── Send email ────────────────────────────────────────────────────────────
const sending = ref(false);

async function sendEmail() {
  if (!form.prenoms || !form.emailClient) {
    toast.add({ title: 'Champs requis manquants', description: 'Le prénom et l\'email client sont obligatoires.', color: 'red' });
    return;
  }

  sending.value = true;
  try {
    await $fetch('/api/onboarding/send', {
      method: 'POST',
      body: {
        emailId: selectedEmailId.value,
        to: form.emailClient,
        variables: {
          prenoms: form.prenoms,
          emailPhotographe: form.emailPhotographe,
          telephone: form.telephone,
          nomFormule: form.nomFormule,
          dateMariage: form.dateMariage,
          lieuMariage: form.lieuMariage,
          montantTotal: form.montantTotal,
          montantSolde: form.montantSolde,
          semainesLivraison: form.semainesLivraison,
          option1: form.option1,
          prixOption1: form.prixOption1,
          option2: form.option2,
          prixOption2: form.prixOption2,
          dateEngagement: form.dateEngagement,
          lieuEngagement: form.lieuEngagement,
          dateBriefing: form.dateBriefing,
          duree: form.duree,
          heureDebut: form.heureDebut,
          heureFin: form.heureFin,
          nombrePhotos: form.nombrePhotos,
          dureeAcces: form.dureeAcces,
          numeroWhatsApp: form.numeroWhatsApp,
        },
      },
    });

    toast.add({
      title: 'Email envoyé ✓',
      description: `L'email ${selectedEmailId.value} a bien été envoyé à ${form.emailClient}.`,
      color: 'green',
    });
  } catch (err: unknown) {
    const message = err && typeof err === 'object' && 'data' in err
      ? (err.data as { error?: string })?.error ?? "Erreur lors de l'envoi"
      : "Erreur lors de l'envoi";
    toast.add({ title: 'Échec de l\'envoi', description: message, color: 'red' });
  } finally {
    sending.value = false;
  }
}
</script>

<template>
  <UContainer class="py-8 max-w-3xl mx-auto">
    <!-- Header -->
    <div class="mb-8">
      <h1 class="text-2xl font-bold text-gray-900">Onboarding client mariage</h1>
      <p class="mt-1 text-sm text-gray-500">
        Envoyez la séquence d'emails d'onboarding après signature du devis dans Odoo.
      </p>
    </div>

    <!-- Email selector -->
    <div class="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
      <button
        v-for="email in emails"
        :key="email.id"
        type="button"
        class="text-left rounded-xl border-2 p-4 transition-all focus:outline-none"
        :class="selectedEmailId === email.id
          ? 'border-primary-500 bg-primary-50 shadow-sm'
          : 'border-gray-200 bg-white hover:border-gray-300'"
        @click="selectedEmailId = email.id"
      >
        <div class="text-2xl mb-2">{{ email.icon }}</div>
        <div class="text-xs font-semibold text-gray-400 uppercase tracking-wide mb-0.5">{{ email.label }}</div>
        <div class="font-semibold text-gray-900 text-sm leading-tight">{{ email.title }}</div>
        <div class="text-xs text-gray-500 mt-1 leading-tight">{{ email.description }}</div>
      </button>
    </div>

    <form @submit.prevent="sendEmail" class="space-y-6">

      <!-- Client info -->
      <UCard>
        <template #header>
          <h2 class="font-semibold text-gray-900">Informations client</h2>
        </template>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormGroup label="Prénom(s) du/des mariés" required>
            <UInput v-model="form.prenoms" placeholder="Sophie & Thomas" />
          </UFormGroup>
          <UFormGroup label="Email du client (destinataire)" required>
            <UInput v-model="form.emailClient" type="email" placeholder="couple@exemple.fr" />
          </UFormGroup>
        </div>
      </UCard>

      <!-- Prestation (emails 1, 2, 3) -->
      <UCard v-if="[1, 2, 3].includes(selectedEmailId)">
        <template #header>
          <h2 class="font-semibold text-gray-900">Détails de la prestation</h2>
        </template>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormGroup label="Nom de la formule">
            <UInput v-model="form.nomFormule" placeholder="Formule Intégrale" />
          </UFormGroup>
          <UFormGroup label="Date du mariage">
            <UInput v-model="form.dateMariage" placeholder="14 juin 2026" />
          </UFormGroup>
          <UFormGroup v-if="selectedEmailId === 1" label="Lieu du mariage">
            <UInput v-model="form.lieuMariage" placeholder="Château de Versailles" />
          </UFormGroup>
          <UFormGroup label="Montant total (€)">
            <UInput v-model="form.montantTotal" placeholder="2 800" />
          </UFormGroup>
          <UFormGroup v-if="selectedEmailId === 1" label="Solde restant (€)">
            <UInput v-model="form.montantSolde" placeholder="2 100" />
          </UFormGroup>
          <UFormGroup v-if="[1, 3].includes(selectedEmailId)" label="Délai de livraison">
            <UInput v-model="form.semainesLivraison" placeholder="6 semaines" />
          </UFormGroup>
        </div>
      </UCard>

      <!-- Email 2 — Options upsell -->
      <UCard v-if="selectedEmailId === 2">
        <template #header>
          <h2 class="font-semibold text-gray-900">Options & prestations complémentaires</h2>
        </template>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormGroup label="Option 1">
            <UInput v-model="form.option1" placeholder="Album 30×30 50 pages" />
          </UFormGroup>
          <UFormGroup label="Prix option 1 (€)">
            <UInput v-model="form.prixOption1" placeholder="350" />
          </UFormGroup>
          <UFormGroup label="Option 2">
            <UInput v-model="form.option2" placeholder="Séance drone" />
          </UFormGroup>
          <UFormGroup label="Prix option 2 (€)">
            <UInput v-model="form.prixOption2" placeholder="250" />
          </UFormGroup>
        </div>
      </UCard>

      <!-- Email 3 — Planning details -->
      <UCard v-if="selectedEmailId === 3">
        <template #header>
          <h2 class="font-semibold text-gray-900">Planning & jalons</h2>
        </template>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormGroup label="Date séance engagement">
            <UInput v-model="form.dateEngagement" placeholder="15 mars 2026" />
          </UFormGroup>
          <UFormGroup label="Lieu séance engagement">
            <UInput v-model="form.lieuEngagement" placeholder="Bois de Vincennes" />
          </UFormGroup>
          <UFormGroup label="Date point de préparation">
            <UInput v-model="form.dateBriefing" placeholder="25 mai 2026" />
          </UFormGroup>
          <UFormGroup label="Durée de couverture">
            <UInput v-model="form.duree" placeholder="10h" />
          </UFormGroup>
          <UFormGroup label="Heure début">
            <UInput v-model="form.heureDebut" placeholder="10h00" />
          </UFormGroup>
          <UFormGroup label="Heure fin">
            <UInput v-model="form.heureFin" placeholder="20h00" />
          </UFormGroup>
          <UFormGroup label="Nombre de photos livrées">
            <UInput v-model="form.nombrePhotos" placeholder="400" />
          </UFormGroup>
          <UFormGroup label="Durée accès galerie">
            <UInput v-model="form.dureeAcces" placeholder="12 mois" />
          </UFormGroup>
        </div>
      </UCard>

      <!-- Photographer contact -->
      <UCard>
        <template #header>
          <h2 class="font-semibold text-gray-900">Vos coordonnées (photographe)</h2>
        </template>
        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <UFormGroup label="Votre email" required>
            <UInput v-model="form.emailPhotographe" type="email" placeholder="etienne@lightandshutter.fr" />
          </UFormGroup>
          <UFormGroup label="Votre téléphone">
            <UInput v-model="form.telephone" placeholder="+33 6 12 34 56 78" />
          </UFormGroup>
          <UFormGroup v-if="selectedEmailId === 4" label="Numéro WhatsApp">
            <UInput v-model="form.numeroWhatsApp" placeholder="+33612345678" />
          </UFormGroup>
        </div>
      </UCard>

      <!-- Submit -->
      <div class="flex justify-end">
        <UButton
          type="submit"
          size="lg"
          :loading="sending"
          icon="i-heroicons-paper-airplane"
        >
          Envoyer l'email {{ selectedEmailId }}
        </UButton>
      </div>

    </form>
  </UContainer>
</template>
