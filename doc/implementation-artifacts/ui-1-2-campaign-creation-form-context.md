# Story UI-1.2: Campaign Creation Form - Implementation Context Report

**Generated:** January 13, 2026  
**Purpose:** Comprehensive context for implementing Story UI-1.2  
**Epic:** UI-1 (Campaign Management UI)  
**Story Points:** 5  
**Priority:** P0 (MVP)

---

## Executive Summary

This document provides all necessary context for implementing Story UI-1.2: Campaign Creation Form. It consolidates:

- ✅ Architecture requirements and patterns from existing codebase
- ✅ UX/UI specifications and design system requirements
- ✅ Backend API integration details and validation schemas
- ✅ Code standards, templates, and mandatory patterns
- ✅ Testing requirements and framework setup
- ✅ Lessons learned from previous UI stories

**Key Finding:** All prerequisites are in place. The backend API (`POST /api/campaigns`) is fully implemented and tested. The frontend foundation (authentication, layout, composables pattern) is established. No blockers exist for implementation.

---

## Table of Contents

1. [Story Requirements](#1-story-requirements)
2. [Architecture & Tech Stack](#2-architecture--tech-stack)
3. [Backend API Integration](#3-backend-api-integration)
4. [UX/UI Design Requirements](#4-uxui-design-requirements)
5. [Coding Standards & Templates](#5-coding-standards--templates)
6. [File Structure & Organization](#6-file-structure--organization)
7. [Testing Requirements](#7-testing-requirements)
8. [Lessons from Previous Stories](#8-lessons-from-previous-stories)
9. [Implementation Checklist](#9-implementation-checklist)

---

## 1. Story Requirements

### User Story

**As a** user  
**I want** to create a new campaign  
**So that** I can start prospecting

### Acceptance Criteria (from ui-epics.md)

#### AC1: Form Display

**Given** I click "Créer une campagne" button  
**When** I navigate to `/campaigns/new`  
**Then** I see a campaign creation form with fields:

- Name (required, text input, max 100 characters)
- Description (optional, textarea, max 500 characters)

**And** I see "Créer" and "Annuler" buttons

#### AC2: Real-time Validation

**Given** I fill in the campaign name  
**When** I type in the name field  
**Then** Name field accepts text input  
**And** Character count shows (max 100 characters)  
**And** Field validation shows error if empty

**Given** form has validation errors  
**When** I try to submit with empty name  
**Then** I see validation error "Le nom est requis"  
**And** Name field is highlighted in red  
**And** Form does NOT submit  
**And** Focus returns to invalid field

#### AC3: Successful Creation

**Given** form is valid  
**When** I click "Créer" button  
**Then** Campaign is created via POST /api/campaigns  
**And** Loading spinner shows during API call  
**And** Button is disabled during submission  
**And** Success toast notification appears

**Given** campaign creation succeeds  
**When** API returns 201 Created  
**Then** I am redirected to campaign details page `/campaigns/:id`  
**And** Success message: "Campagne créée avec succès"

#### AC4: Error Handling

**Given** campaign creation fails  
**When** API returns error (400, 500)  
**Then** Error message is displayed above form  
**And** Form remains filled (data not lost)  
**And** User can correct and retry  
**And** Specific error details are shown if available

#### AC5: Cancel Action

**Given** I click "Annuler" button  
**When** I want to cancel creation  
**Then** I am navigated back to `/campaigns`  
**And** No campaign is created  
**And** Form data is discarded

---

## 2. Architecture & Tech Stack

### Frontend Stack (from ui-web/package.json & nuxt.config.ts)

**Framework:** Nuxt 3.10.0

- Vue 3.4.15 with Composition API (`<script setup lang="ts">`)
- TypeScript 5.3.3 (strict mode enabled)
- File-based routing (pages directory)
- Auto-imports for components and composables

**UI Framework:** @nuxt/ui 2.14.2

- Tailwind CSS-based component library
- Provides: UForm, UInput, UTextarea, UButton, UAlert, UNotification
- Documentation: https://ui.nuxt.com/components

**HTTP Client:** ofetch 1.3.3 + axios 1.13.2

- Native Nuxt fetching with `useFetch()` for SSR
- Alternative: `$fetch` for client-side only

**Testing:** Vitest 1.2.0

- @vue/test-utils 2.4.3 for component testing
- happy-dom 12.10.3 for DOM simulation
- @vitest/ui 1.2.0 for test UI

**Dev Server:** Port 4000 (0.0.0.0 host)

### Backend Integration Architecture

**Server API Proxy Pattern** (established in UI-1.1):

- Frontend calls Nuxt server API routes: `/api/campaigns`
- Nuxt server proxies to backend: `campaign-api:3001` (Docker) or `localhost:3001` (dev)
- Authentication via `access_token` cookie (Bearer token)
- Error translation from backend to user-friendly French messages

**Key Files:**

- `apps/ui-web/server/api/campaigns/index.get.ts` - Existing GET proxy
- `apps/ui-web/server/api/campaigns/index.post.ts` - **TO CREATE** for POST

### Runtime Configuration (from nuxt.config.ts)

```typescript
runtimeConfig: {
  // Private (server-side only)
  campaignApiUrl: process.env.CAMPAIGN_API_URL || 'http://localhost:3001',

  // Public (client-side accessible)
  public: {
    apiBase: process.env.API_BASE_URL || 'http://localhost:3001',
    // ... other public config
  }
}
```

### Authentication & Multi-Tenancy

**Route Protection:**

```typescript
definePageMeta({
  middleware: 'auth', // Ensures user is logged in
  layout: 'default', // Uses default layout with navigation
});
```

**Multi-Tenant Isolation:**

- Backend extracts `organisation_id` from JWT token automatically
- Frontend does NOT pass organisation_id in requests
- User can only create campaigns in their organization

---

## 3. Backend API Integration

### API Endpoint: POST /api/campaigns

**Full Path:** `http://localhost:3001/api/campaigns` (via proxy: `/api/campaigns`)

**Authentication:** Bearer token (automatically included via cookies)

**Headers:**

```
Authorization: Bearer <access_token>
Content-Type: application/json
```

### Request Schema (Zod Validation)

**Source:** `apps/campaign-api/src/schemas/campaign.schema.ts`

```typescript
export const createCampaignSchema = z.object({
  name: z
    .string()
    .min(1, 'Campaign name is required')
    .max(100, 'Campaign name must be 100 characters or less')
    .trim(),
  valueProp: z
    .string()
    .min(1, 'Value proposition is required')
    .max(150, 'Value proposition must be 150 characters or less')
    .trim(),
  templateId: z.string().uuid('Invalid template ID format').optional(),
});

export type CreateCampaignDto = z.infer<typeof createCampaignSchema>;
```

**⚠️ IMPORTANT DISCREPANCY:**

- Backend expects: `{ name, valueProp, templateId? }`
- Frontend story spec says: `{ name, description }`

**Resolution:** Backend schema takes precedence. Frontend must use `valueProp` field (not `description`). Update UI labels accordingly.

### Request Body Example

```json
{
  "name": "Social Media Content Upgrade",
  "valueProp": "Help businesses create engaging product showcase videos",
  "templateId": "550e8400-e29b-41d4-a716-446655440000"
}
```

**Note:** `templateId` is optional for MVP.

### Response Schema (201 Created)

**Source:** `apps/campaign-api/src/types/campaign.ts`

```typescript
interface Campaign {
  id: string;
  organisationId: string;
  name: string;
  valueProp: string;
  templateId: string | null;
  status: 'draft' | 'running' | 'paused' | 'archived';
  createdAt: Date;
  updatedAt: Date;
}
```

**Success Response:**

```json
{
  "success": true,
  "data": {
    "id": "uuid",
    "organisationId": "uuid",
    "name": "Social Media Content Upgrade",
    "valueProp": "Help businesses create...",
    "templateId": null,
    "status": "draft",
    "createdAt": "2026-01-13T10:00:00Z",
    "updatedAt": "2026-01-13T10:00:00Z"
  },
  "message": "Campaign created successfully"
}
```

### Error Responses

**400 Validation Error:**

```json
{
  "status": "error",
  "message": "Validation failed",
  "errors": [
    {
      "code": "too_small",
      "minimum": 1,
      "type": "string",
      "inclusive": true,
      "exact": false,
      "message": "Campaign name is required",
      "path": ["name"]
    }
  ]
}
```

**500 Server Error:**

```json
{
  "status": "error",
  "message": "Internal server error"
}
```

### Validation Rules Summary

| Field      | Type          | Required | Min    | Max       | Transform |
| ---------- | ------------- | -------- | ------ | --------- | --------- |
| name       | string        | ✅ Yes   | 1 char | 100 chars | .trim()   |
| valueProp  | string        | ✅ Yes   | 1 char | 150 chars | .trim()   |
| templateId | string (UUID) | ❌ No    | -      | -         | -         |

**Frontend Validation Must Match:**

- Name: Required, 1-100 characters, trimmed
- ValueProp: Required, 1-150 characters, trimmed
- Display character counts for both fields

---

## 4. UX/UI Design Requirements

### Design System Foundation

**Source:** `doc/ux-design/00-UX-Design-Overview.md`

**Color Palette (Tailwind Classes):**

- Primary: `blue-600` (#2563EB) - CTA buttons
- Success: `green-600` (#10B981) - Success toasts
- Error: `red-600` (#EF4444) - Validation errors
- Warning: `amber-600` (#F59E0B) - Low confidence
- Neutral: `gray-50` to `gray-900` - Text, borders, backgrounds

**Typography:**

- Font: Inter (default via NuxtUI)
- Page Title: `text-2xl font-bold`
- Section Headers: `text-lg font-semibold`
- Body Text: `text-base`
- Labels: `text-sm font-medium`
- Helper Text: `text-sm text-gray-500`
- Error Text: `text-sm text-red-600`

**Spacing (8px grid):**

- Form fields: `space-y-6` (24px vertical gap)
- Field groups: `space-y-2` (8px label to input)
- Page padding: `p-6` (24px)
- Button padding: `px-5 py-2.5` (NuxtUI default)

### Component Specifications

**Source:** `doc/ux-design/04-Component-Specifications.md`

#### Button Component

```vue
<UButton
  variant="primary"     // blue background
  size="md"            // 40px height
  :loading="isSubmitting"
  :disabled="!isValid || isSubmitting"
>
  Créer
</UButton>
```

**Props:**

- `variant`: 'primary' | 'secondary' | 'ghost' | 'danger'
- `size`: 'sm' | 'md' | 'lg'
- `loading`: boolean (shows spinner)
- `disabled`: boolean

#### Input Component

```vue
<UInput
  v-model="form.name"
  placeholder="ex: Campagne Q1 2026"
  :error="nameError"
  maxlength="100"
  required
/>
```

**Props:**

- `v-model`: string (two-way binding)
- `placeholder`: string
- `error`: string | boolean (error message or state)
- `maxlength`: number
- `required`: boolean

#### Textarea Component

```vue
<UTextarea
  v-model="form.valueProp"
  placeholder="ex: Aide les entreprises à créer..."
  :rows="4"
  :error="valuePropError"
  maxlength="150"
/>
```

**Props:**

- `v-model`: string
- `placeholder`: string
- `rows`: number (default 3)
- `error`: string | boolean
- `maxlength`: number

### Form Layout Pattern

**Source:** `doc/ux-design/04-Component-Specifications.md` (lines 766-800)

```vue
<div class="space-y-6">
  <!-- Field Group -->
  <div>
    <label for="name" class="block text-sm font-medium mb-2">
      Nom de la campagne *
    </label>
    <UInput
      id="name"
      v-model="form.name"
      placeholder="ex: Campagne Q1 2026"
      :error="nameError"
      maxlength="100"
    />
    <p v-if="nameError" class="mt-1 text-sm text-red-600">
      {{ nameError }}
    </p>
    <p v-else class="mt-1 text-sm text-gray-500">
      {{ form.name.length }}/100 caractères
    </p>
  </div>

  <!-- Repeat for other fields -->
</div>
```

### Interaction Patterns

**Source:** `doc/ux-design/05-Interaction-Patterns.md`

#### Input Focus (lines 70-80)

- Border: `border-gray-300` → `border-blue-500` (focus)
- Shadow: `focus:ring-2 focus:ring-blue-500 focus:ring-opacity-10`
- Transition: 150ms ease

#### Form Validation (lines 102-130)

- **On Blur:** Validate immediately
- **On Submit:** Validate all fields before API call
- **Valid State:** No error message, show character count
- **Invalid State:** Red border, error message below field, focus field

#### Button States (lines 10-50)

- **Normal:** Default colors
- **Hover:** Slightly darker background (`hover:bg-blue-700`)
- **Active/Pressed:** Scale 0.98x (`active:scale-98`)
- **Loading:** Spinner left icon, button disabled, 70% opacity
- **Disabled:** 50% opacity, cursor not-allowed

### Toast Notifications

**Source:** `doc/ux-design/04-Component-Specifications.md`

**Success Toast:**

```typescript
const toast = useToast();
toast.add({
  title: 'Succès',
  description: 'Campagne créée avec succès',
  color: 'green',
  icon: 'i-heroicons-check-circle',
});
```

**Error Toast:**

```typescript
toast.add({
  title: 'Erreur',
  description: 'Impossible de créer la campagne',
  color: 'red',
  icon: 'i-heroicons-exclamation-triangle',
});
```

### Responsive Design

**Source:** `doc/ux-design/06-Responsive-Design-Guidelines.md`

**Breakpoints:**

- Mobile (< 640px): Full-width form, stack buttons vertically
- Tablet (640-1024px): Max-width 600px, horizontal buttons
- Desktop (> 1024px): Max-width 600px, centered form

**Button Sizing:**

- Mobile: 48px height (larger touch targets)
- Tablet/Desktop: 40px height

### Accessibility Requirements

**Source:** `doc/ux-design/07-Accessibility-Standards.md` (WCAG 2.1 AA)

#### Mandatory Requirements

1. **Labels:** All inputs must have associated `<label>` with `for` attribute
2. **Focus Visible:** Keyboard navigation must show focus ring
3. **Keyboard Support:** Tab, Shift+Tab, Enter (submit), Escape (cancel)
4. **Error Announcement:** Use `aria-live="polite"` for error messages
5. **Required Fields:** Indicate with `*` and `aria-required="true"`
6. **Color Contrast:** Text ≥ 4.5:1, UI elements ≥ 3:1

**Example:**

```vue
<label for="campaign-name" class="block text-sm font-medium mb-2">
  Nom de la campagne *
</label>
<UInput
  id="campaign-name"
  v-model="form.name"
  aria-required="true"
  aria-describedby="name-error name-helper"
/>
<p
  v-if="nameError"
  id="name-error"
  class="mt-1 text-sm text-red-600"
  role="alert"
  aria-live="polite"
>
  {{ nameError }}
</p>
<p v-else id="name-helper" class="mt-1 text-sm text-gray-500">
  {{ form.name.length }}/100 caractères
</p>
```

---

## 5. Coding Standards & Templates

### Mandatory Patterns (from project-context.md)

#### Logging Standards (MANDATORY)

**Source:** `doc/project-context.md` (lines 42-90)

⚠️ **Note:** Logging standards apply to backend services, NOT frontend Vue components. Frontend uses console methods and browser DevTools.

#### Multi-Tenant Isolation (MANDATORY)

**Source:** `doc/project-context.md` (lines 92-102)

✅ **Frontend:** No action needed. Backend enforces via JWT token.

#### Error Handling

**Source:** `doc/project-context.md` (lines 104-115)

**Frontend Pattern:**

```typescript
try {
  const response = await $fetch('/api/campaigns', {
    method: 'POST',
    body: formData,
  });
  // Success handling
} catch (error: any) {
  if (error.statusCode === 400) {
    // Validation errors
    setErrors(error.data.errors);
  } else if (error.statusCode === 500) {
    // Server error
    toast.add({
      title: 'Erreur',
      description: 'Une erreur serveur est survenue',
      color: 'red',
    });
  }
}
```

#### File Structure (MANDATORY)

**Source:** `doc/project-context.md` (lines 137-150)

**Frontend Structure:**

```
apps/ui-web/
├── pages/
│   └── campaigns/
│       ├── index.vue          # List page (existing)
│       └── new.vue            # ✅ CREATE THIS
├── components/
│   └── Campaign/
│       ├── StatusBadge.vue    # Existing
│       └── Form.vue           # ✅ CREATE THIS (reusable)
├── composables/
│   ├── useCampaigns.ts        # Existing (list)
│   └── useCampaignForm.ts     # ✅ CREATE THIS (form logic)
├── server/
│   └── api/
│       └── campaigns/
│           ├── index.get.ts   # Existing
│           └── index.post.ts  # ✅ CREATE THIS (proxy)
```

#### Import Conventions

**Source:** `doc/project-context.md` (lines 152-167)

**⚠️ Frontend Note:**

- Nuxt 3 uses auto-imports for components and composables
- No manual imports needed for: Vue, ref, computed, watch, etc.
- Only import for: types, utilities, external libraries

**Example:**

```vue
<script setup lang="ts">
// ❌ NOT NEEDED (auto-imported):
// import { ref, computed } from 'vue'
// import { useRoute, useRouter } from 'vue-router'

// ✅ NEEDED:
import type { Campaign } from '~/types/campaign';

// Auto-imported: ref, computed, useRoute, useRouter, useFetch, etc.
const form = ref({ name: '', valueProp: '' });
const route = useRoute();
</script>
```

### TypeScript Standards

**Source:** `doc/project-context.md` + existing code

**Strict Mode:** Enabled in `tsconfig.json`

- All variables must have explicit or inferred types
- No implicit `any` allowed
- Nullable values must be explicitly typed: `string | null`

**Type Definitions:**

```typescript
// Define interfaces for form data
interface CampaignForm {
  name: string;
  valueProp: string;
  templateId?: string;
}

// Define API response types
interface CampaignResponse {
  success: boolean;
  data: Campaign;
  message: string;
}

// Use type annotations for props
defineProps<{
  initialData?: CampaignForm;
  mode: 'create' | 'edit';
}>();
```

### Vue 3 Composition API Patterns

**Source:** Existing codebase + Vue 3 best practices

**Use `<script setup lang="ts">`:**

```vue
<script setup lang="ts">
// Reactive state
const form = ref<CampaignForm>({
  name: '',
  valueProp: '',
});

// Computed properties
const isValid = computed(() => {
  return form.value.name.length > 0 && form.value.valueProp.length > 0;
});

// Methods
const handleSubmit = async () => {
  // ...
};

// Lifecycle hooks
onMounted(() => {
  // ...
});
</script>
```

### NuxtUI Component Standards

**Source:** Existing pages/campaigns/index.vue + NuxtUI docs

**Component Usage:**

```vue
<!-- Form wrapper -->
<UForm @submit="handleSubmit">
  <!-- Input fields -->
  <UInput v-model="form.name" />
  
  <!-- Buttons -->
  <UButton type="submit">Submit</UButton>
  <UButton variant="ghost" @click="cancel">Cancel</UButton>
</UForm>
```

**Auto-imported Components (no import needed):**

- UForm, UInput, UTextarea, UButton
- UAlert, UCard, UContainer
- UIcon (for icons: `icon="i-heroicons-plus"`)

---

## 6. File Structure & Organization

### Files to Create

#### 1. Page: `apps/ui-web/pages/campaigns/new.vue`

**Purpose:** Campaign creation page route `/campaigns/new`

**Key Elements:**

- Page metadata with auth middleware
- SEO head tags
- Form component integration
- Navigation to list page on cancel
- Navigation to details on success

**Template Structure:**

```vue
<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

useHead({
  title: 'Créer une campagne | ProspectFlow',
});

// Form handling logic
</script>

<template>
  <UContainer>
    <div class="p-6 max-w-2xl mx-auto">
      <h1 class="text-2xl font-bold mb-6">Créer une campagne</h1>
      <CampaignForm mode="create" @success="handleSuccess" @cancel="handleCancel" />
    </div>
  </UContainer>
</template>
```

#### 2. Component: `apps/ui-web/components/Campaign/Form.vue`

**Purpose:** Reusable campaign form component (for create & edit)

**Props:**

- `mode`: 'create' | 'edit'
- `initialData?: CampaignForm` (for edit mode)

**Events:**

- `@success`: Emitted on successful save with campaign ID
- `@cancel`: Emitted when user cancels

**Key Responsibilities:**

- Form state management (reactive refs)
- Validation logic (real-time + on submit)
- API call to create/update campaign
- Loading states
- Error handling
- Success/error toasts

**Template Structure:**

```vue
<script setup lang="ts">
const props = defineProps<{
  mode: 'create' | 'edit';
  initialData?: CampaignForm;
}>();

const emit = defineEmits<{
  success: [campaignId: string];
  cancel: [];
}>();

// Form state and validation logic
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Name field -->
    <div>
      <label for="name">Nom de la campagne *</label>
      <UInput id="name" v-model="form.name" />
      <!-- Error message -->
      <!-- Character count -->
    </div>

    <!-- ValueProp field -->
    <div>
      <label for="valueProp">Proposition de valeur *</label>
      <UTextarea id="valueProp" v-model="form.valueProp" />
      <!-- Error message -->
      <!-- Character count -->
    </div>

    <!-- Buttons -->
    <div class="flex gap-4">
      <UButton type="submit" :loading="isSubmitting" :disabled="!isValid">
        {{ mode === 'create' ? 'Créer' : 'Sauvegarder' }}
      </UButton>
      <UButton variant="ghost" @click="emit('cancel')"> Annuler </UButton>
    </div>
  </form>
</template>
```

#### 3. Composable: `apps/ui-web/composables/useCampaignForm.ts`

**Purpose:** Extract form logic for reusability and testing

**Exports:**

- `form`: Reactive form data
- `errors`: Validation errors object
- `isValid`: Computed validity state
- `isSubmitting`: Loading state
- `validate()`: Manual validation trigger
- `submitForm()`: Form submission handler
- `resetForm()`: Reset to initial state

**Example Structure:**

```typescript
export function useCampaignForm(initialData?: CampaignForm) {
  const form = ref<CampaignForm>({
    name: initialData?.name || '',
    valueProp: initialData?.valueProp || '',
  });

  const errors = ref<Record<string, string>>({});

  const isValid = computed(() => {
    return form.value.name.length > 0 && form.value.valueProp.length > 0;
  });

  const validate = () => {
    errors.value = {};
    if (!form.value.name) {
      errors.value.name = 'Le nom est requis';
    }
    // ... more validation
    return Object.keys(errors.value).length === 0;
  };

  const submitForm = async () => {
    // API call logic
  };

  return {
    form,
    errors,
    isValid,
    isSubmitting: ref(false),
    validate,
    submitForm,
    resetForm: () => {
      /* ... */
    },
  };
}
```

#### 4. Server API: `apps/ui-web/server/api/campaigns/index.post.ts`

**Purpose:** Proxy POST requests to campaign-api backend

**Key Responsibilities:**

- Extract access token from cookies
- Validate authentication
- Forward request to backend with Bearer token
- Handle errors and translate to French
- Return response to client

**Structure (based on existing GET proxy):**

```typescript
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Get access token from cookies
  const accessToken = getCookie(event, 'access_token');

  if (!accessToken) {
    throw createError({
      statusCode: 401,
      message: 'Non authentifié. Veuillez vous connecter.',
    });
  }

  // Get request body
  const body = await readBody(event);

  // Backend URL
  const backendUrl = config.campaignApiUrl || 'http://localhost:3001';
  const url = `${backendUrl}/api/campaigns`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw createError({
        statusCode: response.status,
        message: errorData.message || 'Erreur lors de la création de la campagne',
      });
    }

    const data = await response.json();
    return data;
  } catch (error: unknown) {
    // Error handling
    throw createError({
      statusCode: 500,
      message: 'Erreur de communication avec le service campagnes',
    });
  }
});
```

### Files to Reference (Existing)

- `apps/ui-web/pages/campaigns/index.vue` - List page patterns
- `apps/ui-web/composables/useCampaigns.ts` - Composable pattern
- `apps/ui-web/server/api/campaigns/index.get.ts` - Server proxy pattern
- `apps/ui-web/components/Campaign/StatusBadge.vue` - Component pattern
- `apps/ui-web/layouts/default.vue` - Layout with navigation

### Directory Structure

```
apps/ui-web/
├── pages/
│   └── campaigns/
│       ├── index.vue          # ✅ Existing
│       └── new.vue            # ✅ CREATE
├── components/
│   └── Campaign/
│       ├── StatusBadge.vue    # ✅ Existing
│       └── Form.vue           # ✅ CREATE
├── composables/
│   ├── useCampaigns.ts        # ✅ Existing
│   └── useCampaignForm.ts     # ✅ CREATE
├── server/
│   └── api/
│       └── campaigns/
│           ├── index.get.ts   # ✅ Existing
│           └── index.post.ts  # ✅ CREATE
└── tests/
    ├── components/
    │   └── Campaign/
    │       └── Form.test.ts   # ✅ CREATE (optional)
    └── composables/
        └── useCampaignForm.test.ts # ✅ CREATE (optional)
```

---

## 7. Testing Requirements

### Testing Framework Setup

**Source:** `apps/ui-web/package.json` + existing tests

**Framework:** Vitest 1.2.0

- Test files: `*.test.ts` or `*.spec.ts`
- Component tests: `@vue/test-utils 2.4.3`
- DOM: `happy-dom 12.10.3`

**Test Commands:**

```bash
pnpm test              # Run all tests
pnpm test:ui           # Open Vitest UI
pnpm test:coverage     # Generate coverage report
```

### Testing Standards (from project-context.md)

**Source:** `doc/project-context.md` (lines 117-135)

**Requirements:**

- Unit tests for all composables
- Component tests for complex components
- Mock external dependencies (API calls, router)
- All acceptance criteria must have test coverage

**Mock Pattern (from existing tests):**

```typescript
// tests/setup.ts - Global mocks
import { vi } from 'vitest';

globalThis.useFetch = vi.fn();
globalThis.$fetch = vi.fn();
globalThis.useRouter = vi.fn();
globalThis.useToast = vi.fn();
```

### Test Coverage Requirements

**Composable Tests (useCampaignForm.test.ts):**

- ✅ Form initialization with default values
- ✅ Form initialization with initial data (edit mode)
- ✅ Name validation (required, max 100)
- ✅ ValueProp validation (required, max 150)
- ✅ isValid computed property
- ✅ Successful form submission
- ✅ Form submission with API error (400, 500)
- ✅ Reset form functionality

**Component Tests (Form.vue test - optional for MVP):**

- ✅ Renders form fields correctly
- ✅ Shows validation errors on blur
- ✅ Disables submit button when invalid
- ✅ Shows loading state during submission
- ✅ Emits success event on successful submit
- ✅ Emits cancel event on cancel button click

### Manual Testing Checklist

**Source:** `doc/implementation-artifacts/ui-1-1-campaign-list-view.md` (testing section)

**Functional Tests:**

- [ ] Page loads at `/campaigns/new` with authentication
- [ ] Form fields render correctly (name, valueProp)
- [ ] Character counts display correctly
- [ ] Validation errors show on blur and submit
- [ ] Submit button disabled when form invalid
- [ ] Loading spinner shows during API call
- [ ] Success toast appears on successful creation
- [ ] Redirect to `/campaigns/:id` after success
- [ ] Error message displays on API failure (400, 500)
- [ ] Form data preserved after API error
- [ ] Cancel button navigates to `/campaigns`

**UX Tests:**

- [ ] Focus management (first field on load, error field on validation)
- [ ] Keyboard navigation works (Tab, Shift+Tab, Enter, Escape)
- [ ] Responsive design works on mobile, tablet, desktop
- [ ] Accessibility: Screen reader announces errors
- [ ] Accessibility: Labels properly associated with inputs

**Edge Cases:**

- [ ] Empty form submission (should show all errors)
- [ ] Name at exactly 100 characters
- [ ] ValueProp at exactly 150 characters
- [ ] Very long strings (should truncate at maxlength)
- [ ] Special characters in inputs
- [ ] Network timeout during submission

**Browser Compatibility:**

- [ ] Chrome (latest)
- [ ] Firefox (latest)
- [ ] Safari (latest)
- [ ] Mobile Safari (iOS)
- [ ] Chrome Mobile (Android)

---

## 8. Lessons from Previous Stories

### From Story UI-1.1 (Campaign List View)

**Source:** `doc/implementation-artifacts/ui-1-1-campaign-list-view.md`

**Key Lessons:**

1. **Server API Proxy Pattern Works Well**

   - Frontend calls `/api/campaigns` (Nuxt server)
   - Nuxt server proxies to `campaign-api:3001`
   - Authentication via `access_token` cookie
   - Error translation to French on server side
   - ✅ **Reuse this pattern for POST requests**

2. **useFetch() for SSR Compatibility**

   - Use `useFetch()` for data fetching in pages
   - Provides: data, pending, error, refresh
   - SSR-compatible out of the box
   - ✅ **But for form submission, use `$fetch()` (client-side only)**

3. **TypeScript Strict Mode Challenges**

   - All types must be explicitly defined
   - API response types must match backend exactly
   - Use `as` for type assertions carefully
   - ✅ **Define all types in separate interface file or inline**

4. **NuxtUI Auto-imports**

   - No need to import: UButton, UInput, UForm, etc.
   - Components auto-imported from `@nuxt/ui`
   - ✅ **Check NuxtUI docs for latest API (v2.14.2)**

5. **Error Handling Patterns**

   - 401: Redirect to login (handled by middleware)
   - 403: Show "Accès refusé"
   - 500: Show generic error with retry button
   - ✅ **Implement same error handling in form**

6. **Testing Setup**
   - Global mocks in `tests/setup.ts`
   - Mock Nuxt auto-imports (useFetch, useRouter, etc.)
   - Use `vi.fn()` for function mocks
   - ✅ **Extend mocks for useToast and router.push**

### From Story UI-0.2 (Authentication UI)

**Source:** `doc/_archive/epic-ui-1/ui-0-2-authentication-ui.md`

**Key Lessons:**

1. **Toast Notifications**

   - Use `useToast()` composable (auto-imported)
   - Toast notifications for success/error feedback
   - Colors: 'green' (success), 'red' (error), 'yellow' (warning)
   - ✅ **Use toasts for form submission feedback**

2. **Loading States**
   - Always show loading feedback during async operations
   - Disable buttons during submission
   - Use `:loading` prop on UButton
   - ✅ **Apply same pattern in form submission**

### From Story UI-0.3 (App Layout & Navigation)

**Source:** `doc/_archive/epic-ui-1/ui-0-3-app-layout-navigation.md`

**Key Lessons:**

1. **Navigation Integration**

   - "Créer une campagne" button already exists in header
   - Links to `/campaigns/new` (this story!)
   - ✅ **No navigation changes needed**

2. **Responsive Design**
   - Use `UContainer` for max-width and centering
   - Mobile: Full-width, vertical stacking
   - Desktop: Max-width 2xl (1536px)
   - ✅ **Use max-w-2xl for form container (600px)**

### Backend Implementation Lessons

**Source:** `doc/_archive/epic-1-campaign-management/1-1-create-new-campaign.md`

**Key Findings:**

1. **Backend Fully Implemented**

   - POST /api/campaigns endpoint working
   - Zod validation enforced
   - Multi-tenant isolation enforced
   - 13/13 backend tests passing
   - ✅ **No backend changes needed**

2. **Field Name Discrepancy**

   - Backend uses: `valueProp` (not `description`)
   - Max 150 characters (not 500)
   - ✅ **Frontend MUST use `valueProp`**

3. **Validation Rules**
   - Name: 1-100 chars, trimmed
   - ValueProp: 1-150 chars, trimmed
   - TemplateId: Optional, must be valid UUID
   - ✅ **Frontend validation must match exactly**

---

## 9. Implementation Checklist

### Pre-Implementation

- [ ] Review all sections of this context document
- [ ] Verify backend API is running (`make dev-ready`)
- [ ] Verify frontend dev server is running (`cd apps/ui-web && pnpm dev`)
- [ ] Test POST /api/campaigns with Postman/curl to confirm backend works
- [ ] Review existing campaign list page (`pages/campaigns/index.vue`)
- [ ] Review existing server proxy (`server/api/campaigns/index.get.ts`)

### Phase 1: Server API Proxy (15 minutes)

- [ ] Create `apps/ui-web/server/api/campaigns/index.post.ts`
- [ ] Copy pattern from `index.get.ts`
- [ ] Update method to POST
- [ ] Add `readBody()` to get request body
- [ ] Test with curl: `curl -X POST localhost:4000/api/campaigns -H "Content-Type: application/json" -d '{"name":"Test","valueProp":"Test value"}' -H "Cookie: access_token=YOUR_TOKEN"`

### Phase 2: Form Composable (30 minutes)

- [ ] Create `apps/ui-web/composables/useCampaignForm.ts`
- [ ] Define `CampaignForm` interface
- [ ] Implement reactive form state
- [ ] Implement validation logic (name, valueProp)
- [ ] Implement character counting
- [ ] Implement `submitForm()` with $fetch
- [ ] Implement error handling
- [ ] Implement `resetForm()`
- [ ] (Optional) Write unit tests

### Phase 3: Form Component (45 minutes)

- [ ] Create `apps/ui-web/components/Campaign/Form.vue`
- [ ] Define props (mode, initialData)
- [ ] Define emits (success, cancel)
- [ ] Integrate `useCampaignForm` composable
- [ ] Build form template with UInput/UTextarea
- [ ] Add labels with required indicators (\*)
- [ ] Add validation error messages
- [ ] Add character counters
- [ ] Add submit and cancel buttons
- [ ] Implement loading states
- [ ] Add toast notifications
- [ ] Test component in isolation

### Phase 4: Page Route (20 minutes)

- [ ] Create `apps/ui-web/pages/campaigns/new.vue`
- [ ] Add page metadata (auth middleware, layout)
- [ ] Add SEO head tags
- [ ] Add page title
- [ ] Integrate `CampaignForm` component
- [ ] Handle success event (navigate to details)
- [ ] Handle cancel event (navigate to list)
- [ ] Test navigation flow

### Phase 5: Testing (30 minutes)

- [ ] Run all existing tests (should still pass)
- [ ] Write tests for `useCampaignForm` composable (8 tests recommended)
- [ ] (Optional) Write tests for `Form.vue` component
- [ ] Perform manual testing checklist (see section 7)
- [ ] Test all acceptance criteria
- [ ] Test on mobile device or DevTools responsive mode
- [ ] Test keyboard navigation
- [ ] Test with screen reader (NVDA/JAWS/VoiceOver)

### Phase 6: Polish & Finalization (20 minutes)

- [ ] Review code for TypeScript errors
- [ ] Review code for console warnings
- [ ] Ensure all French labels are correct
- [ ] Ensure character limits match backend (100/150)
- [ ] Ensure error messages are user-friendly
- [ ] Add code comments for complex logic
- [ ] Update README if necessary
- [ ] Take screenshots for documentation
- [ ] Mark story as done in sprint board

### Total Estimated Time: 2.5-3 hours

---

## Appendix A: Quick Reference

### API Endpoint Summary

**POST /api/campaigns** (via Nuxt proxy)

- Frontend calls: `/api/campaigns` (POST)
- Backend receives: `http://campaign-api:3001/api/campaigns`
- Auth: Bearer token from `access_token` cookie
- Body: `{ name, valueProp, templateId? }`
- Response: `{ success, data: Campaign, message }`

### Field Requirements

| Field             | Required | Min    | Max         | Backend Field Name |
| ----------------- | -------- | ------ | ----------- | ------------------ |
| Name              | Yes      | 1 char | 100 chars   | `name`             |
| Value Proposition | Yes      | 1 char | 150 chars   | `valueProp`        |
| Template ID       | No       | -      | UUID format | `templateId`       |

### NuxtUI Components

- `<UForm>` - Form wrapper
- `<UInput>` - Text input (name field)
- `<UTextarea>` - Multi-line input (valueProp field)
- `<UButton>` - Submit and cancel buttons
- `<UAlert>` - Error message display
- `useToast()` - Toast notifications

### Key Files to Create

1. `pages/campaigns/new.vue` - Page route
2. `components/Campaign/Form.vue` - Form component
3. `composables/useCampaignForm.ts` - Form logic
4. `server/api/campaigns/index.post.ts` - API proxy

### Testing Commands

```bash
pnpm test                    # Run all tests
pnpm test useCampaignForm   # Run specific test file
pnpm test:ui                # Open Vitest UI
pnpm test:coverage          # Coverage report
```

### Development Commands

```bash
# Start infrastructure (from root)
make dev-ready

# Start frontend (from apps/ui-web)
pnpm dev

# Access app
http://localhost:4000

# Backend API (direct)
http://localhost:3001
```

---

## Appendix B: Code Templates

### Server API Proxy Template

```typescript
// apps/ui-web/server/api/campaigns/index.post.ts
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const accessToken = getCookie(event, 'access_token');

  if (!accessToken) {
    throw createError({
      statusCode: 401,
      message: 'Non authentifié. Veuillez vous connecter.',
    });
  }

  const body = await readBody(event);
  const backendUrl = config.campaignApiUrl || 'http://localhost:3001';

  try {
    const response = await fetch(`${backendUrl}/api/campaigns`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw createError({
        statusCode: response.status,
        message: errorData.message || 'Erreur lors de la création',
      });
    }

    return await response.json();
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: 'Erreur de communication avec le service campagnes',
    });
  }
});
```

### Composable Template

```typescript
// apps/ui-web/composables/useCampaignForm.ts
interface CampaignForm {
  name: string;
  valueProp: string;
  templateId?: string;
}

export function useCampaignForm(initialData?: CampaignForm) {
  const form = ref<CampaignForm>({
    name: initialData?.name || '',
    valueProp: initialData?.valueProp || '',
    templateId: initialData?.templateId,
  });

  const errors = ref<Record<string, string>>({});
  const isSubmitting = ref(false);

  const isValid = computed(() => {
    return form.value.name.trim().length > 0 && form.value.valueProp.trim().length > 0;
  });

  const validate = () => {
    errors.value = {};

    if (!form.value.name.trim()) {
      errors.value.name = 'Le nom est requis';
    } else if (form.value.name.length > 100) {
      errors.value.name = 'Le nom doit faire 100 caractères maximum';
    }

    if (!form.value.valueProp.trim()) {
      errors.value.valueProp = 'La proposition de valeur est requise';
    } else if (form.value.valueProp.length > 150) {
      errors.value.valueProp = 'La proposition de valeur doit faire 150 caractères maximum';
    }

    return Object.keys(errors.value).length === 0;
  };

  const submitForm = async () => {
    if (!validate()) {
      return null;
    }

    isSubmitting.value = true;

    try {
      const response = await $fetch('/api/campaigns', {
        method: 'POST',
        body: {
          name: form.value.name.trim(),
          valueProp: form.value.valueProp.trim(),
          templateId: form.value.templateId,
        },
      });

      return response.data;
    } catch (error: any) {
      if (error.statusCode === 400 && error.data?.errors) {
        // Map backend validation errors
        error.data.errors.forEach((err: any) => {
          if (err.path && err.path[0]) {
            errors.value[err.path[0]] = err.message;
          }
        });
      }
      throw error;
    } finally {
      isSubmitting.value = false;
    }
  };

  const resetForm = () => {
    form.value = {
      name: '',
      valueProp: '',
      templateId: undefined,
    };
    errors.value = {};
  };

  return {
    form,
    errors,
    isValid,
    isSubmitting,
    validate,
    submitForm,
    resetForm,
  };
}
```

### Component Template

```vue
<script setup lang="ts">
const props = defineProps<{
  mode: 'create' | 'edit';
  initialData?: CampaignForm;
}>();

const emit = defineEmits<{
  success: [campaignId: string];
  cancel: [];
}>();

const toast = useToast();
const { form, errors, isValid, isSubmitting, submitForm } = useCampaignForm(props.initialData);

const handleSubmit = async () => {
  try {
    const campaign = await submitForm();
    if (campaign) {
      toast.add({
        title: 'Succès',
        description: 'Campagne créée avec succès',
        color: 'green',
      });
      emit('success', campaign.id);
    }
  } catch (error: any) {
    toast.add({
      title: 'Erreur',
      description: error.data?.message || 'Impossible de créer la campagne',
      color: 'red',
    });
  }
};

const handleCancel = () => {
  emit('cancel');
};
</script>

<template>
  <form @submit.prevent="handleSubmit" class="space-y-6">
    <!-- Name Field -->
    <div>
      <label for="name" class="block text-sm font-medium mb-2"> Nom de la campagne * </label>
      <UInput
        id="name"
        v-model="form.name"
        placeholder="ex: Campagne Q1 2026"
        :error="!!errors.name"
        maxlength="100"
        aria-required="true"
        aria-describedby="name-error name-helper"
      />
      <p
        v-if="errors.name"
        id="name-error"
        class="mt-1 text-sm text-red-600"
        role="alert"
        aria-live="polite"
      >
        {{ errors.name }}
      </p>
      <p v-else id="name-helper" class="mt-1 text-sm text-gray-500">
        {{ form.name.length }}/100 caractères
      </p>
    </div>

    <!-- ValueProp Field -->
    <div>
      <label for="valueProp" class="block text-sm font-medium mb-2">
        Proposition de valeur *
      </label>
      <UTextarea
        id="valueProp"
        v-model="form.valueProp"
        placeholder="ex: Aide les entreprises à créer du contenu vidéo engageant"
        :error="!!errors.valueProp"
        :rows="4"
        maxlength="150"
        aria-required="true"
        aria-describedby="valueProp-error valueProp-helper"
      />
      <p
        v-if="errors.valueProp"
        id="valueProp-error"
        class="mt-1 text-sm text-red-600"
        role="alert"
        aria-live="polite"
      >
        {{ errors.valueProp }}
      </p>
      <p v-else id="valueProp-helper" class="mt-1 text-sm text-gray-500">
        {{ form.valueProp.length }}/150 caractères
      </p>
    </div>

    <!-- Buttons -->
    <div class="flex gap-4">
      <UButton type="submit" :loading="isSubmitting" :disabled="!isValid || isSubmitting">
        {{ mode === 'create' ? 'Créer' : 'Sauvegarder' }}
      </UButton>
      <UButton variant="ghost" @click="handleCancel" :disabled="isSubmitting"> Annuler </UButton>
    </div>
  </form>
</template>
```

### Page Template

```vue
<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
  layout: 'default',
});

useHead({
  title: 'Créer une campagne | ProspectFlow',
});

const router = useRouter();

const handleSuccess = (campaignId: string) => {
  router.push(`/campaigns/${campaignId}`);
};

const handleCancel = () => {
  router.push('/campaigns');
};
</script>

<template>
  <UContainer>
    <div class="p-6 max-w-2xl mx-auto">
      <h1 class="text-2xl font-bold mb-6">Créer une campagne</h1>
      <CampaignForm mode="create" @success="handleSuccess" @cancel="handleCancel" />
    </div>
  </UContainer>
</template>
```

---

**End of Context Report**

**Next Action:** Begin implementation following the checklist in Section 9.

**Estimated Implementation Time:** 2.5-3 hours

**Questions/Issues:** Contact SM Agent (Bob) or consult source documents listed in each section.
