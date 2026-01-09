---
name: ProspectFlow Frontend Epics
description: User interface implementation for ProspectFlow
stack: Nuxt 3, NuxtUI, Tailwind CSS, TypeScript
version: 1.0
created: 2026-01-09
---

# ProspectFlow Frontend Epics

## Overview

This document provides the complete epic and story breakdown for implementing the ProspectFlow frontend user interface using Nuxt 3, NuxtUI, and Tailwind CSS.

## Technology Stack

- **Framework**: Nuxt 3 (Vue 3 + SSR/SSG)
- **UI Library**: NuxtUI (Tailwind-based components)
- **Styling**: Tailwind CSS
- **Language**: TypeScript (strict mode)
- **State Management**: Pinia (if needed)
- **HTTP Client**: ofetch (Nuxt native)
- **Auth**: AWS Cognito integration
- **API Base**: http://localhost:3001 (ingest-api)

## Design System Resources

All UI implementations should reference:

- `/doc/ux-design/03-Wireframes.md` - Screen layouts
- `/doc/ux-design/04-Component-Specifications.md` - Component specs
- `/doc/ux-design/05-Interaction-Patterns.md` - User interactions
- `/doc/ux-design/06-Responsive-Design-Guidelines.md` - Responsive behavior
- `/doc/ux-design/07-Accessibility-Standards.md` - A11y requirements

---

## Epic UI-0: Frontend Foundation & Authentication (8 SP)

**Goal**: Establish Nuxt project infrastructure with authentication and navigation

**Dependencies**: Story 0.4 (AWS Cognito backend completed)

**Deliverables**:

- Nuxt project running on localhost:3000
- Login/logout flow working with Cognito
- Protected app layout with navigation
- Foundation for all future UI development

---

### Story UI-0.1: Nuxt Project Setup & Configuration (3 SP)

**As a** frontend developer  
**I want** a Nuxt 3 project configured with NuxtUI and TypeScript  
**So that** I have a solid foundation for building the UI

**Acceptance Criteria:**

**Given** I need to start frontend development  
**When** I set up the Nuxt project  
**Then** Nuxt 3 project is created in `apps/ui-web`  
**And** NuxtUI is installed and configured in `nuxt.config.ts`  
**And** Tailwind CSS is working with NuxtUI  
**And** TypeScript strict mode is enabled  
**And** Dev server runs successfully on `http://localhost:3000`

**Given** the project needs API configuration  
**When** I configure runtime config  
**Then** `nuxt.config.ts` includes `runtimeConfig.public` with:

- `apiBase`: Backend API URL
- `cognitoHostedUI`: Cognito hosted UI URL
- `cognitoClientId`: Cognito app client ID
- `cognitoRedirectUri`: OAuth callback URL  
  **And** environment variables are loaded from `.env`

**Given** the project needs TypeScript configuration  
**When** I configure TypeScript  
**Then** `tsconfig.json` has strict mode enabled  
**And** `typeCheck: true` in nuxt.config  
**And** Auto-imports are typed correctly  
**And** No TypeScript errors in build

**Given** the project needs development tools  
**When** I configure dev environment  
**Then** `devtools: { enabled: true }` in nuxt.config  
**And** Hot module replacement works  
**And** Error overlay displays properly  
**And** Dev server restarts on config changes

**Given** the project needs consistent code style  
**When** I set up code quality tools  
**Then** ESLint is configured for Vue 3 + TypeScript  
**And** Prettier is configured for consistent formatting  
**And** `.editorconfig` enforces consistent indentation  
**And** Pre-commit hooks (optional) run linting

**Technical Requirements:**

```bash
# Installation commands
pnpm dlx nuxi@latest init apps/ui-web
cd apps/ui-web
pnpm add @nuxt/ui
pnpm add ofetch
pnpm add -D @nuxtjs/tailwindcss
```

**Files to create:**

- `apps/ui-web/nuxt.config.ts` - Main configuration
- `apps/ui-web/.env.example` - Environment variables template
- `apps/ui-web/.env` - Local environment variables
- `apps/ui-web/tsconfig.json` - TypeScript configuration
- `apps/ui-web/app.vue` - Root component

**Testing:**

- ✅ `pnpm dev` starts without errors
- ✅ Navigate to localhost:3000 shows welcome page
- ✅ TypeScript compilation succeeds
- ✅ Tailwind classes work in components

---

### Story UI-0.2: Authentication UI (Login/Logout) (3 SP)

**As a** user  
**I want** to login and logout via Cognito  
**So that** I can access the protected application securely

**Acceptance Criteria:**

**Given** I am not authenticated  
**When** I visit the application  
**Then** I am redirected to `/login` page  
**And** I see a clean login interface with ProspectFlow branding  
**And** I see a "Se connecter" button

**Given** I am on the login page  
**When** I click "Se connecter" button  
**Then** I am redirected to Cognito Hosted UI  
**And** URL includes correct client_id and redirect_uri  
**And** OAuth authorization code flow initiates

**Given** I successfully login on Cognito  
**When** Cognito redirects back to `/auth/callback?code=...`  
**Then** callback page shows "Connexion en cours..." spinner  
**And** Code is exchanged for JWT tokens via backend API  
**And** Tokens are stored in secure httpOnly cookies  
**And** I am redirected to `/` (dashboard)

**Given** token exchange fails  
**When** invalid code or backend error occurs  
**Then** I see an error message "Erreur de connexion"  
**And** I am redirected back to `/login`  
**And** Error is logged for debugging

**Given** I am authenticated  
**When** I access protected routes  
**Then** my session is valid and accessible  
**And** `req.user` contains user information  
**And** API calls include `Authorization: Bearer` header

**Given** I am authenticated  
**When** I click "Déconnexion" button in navigation  
**Then** logout function is called  
**And** Session is cleared in backend via POST /auth/logout  
**And** Tokens are removed from cookies  
**And** I am redirected to Cognito logout URL  
**And** Then redirected back to login page

**Given** I have an expired token  
**When** I try to access the application  
**Then** I am automatically redirected to login  
**And** Old session is cleared  
**And** I must authenticate again

**Technical Requirements:**

**Composable: `useAuth.ts`**

```typescript
export const useAuth = () => {
  const config = useRuntimeConfig();
  const router = useRouter();

  const accessToken = useCookie('access_token', {
    maxAge: 3600,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
  });

  const login = () => {
    // Redirect to Cognito Hosted UI
  };

  const logout = async () => {
    // Clear session and redirect to Cognito logout
  };

  const isAuthenticated = computed(() => !!accessToken.value);

  return { login, logout, isAuthenticated, accessToken };
};
```

**Files to create:**

- `apps/ui-web/pages/login.vue` - Login page
- `apps/ui-web/pages/auth/callback.vue` - OAuth callback handler
- `apps/ui-web/composables/useAuth.ts` - Auth composable
- `apps/ui-web/middleware/auth.ts` - Route protection middleware

**Testing:**

- ✅ Login flow works end-to-end
- ✅ Tokens stored securely in cookies
- ✅ Logout clears session completely
- ✅ Protected routes redirect unauthenticated users
- ✅ Error handling works for failed auth

---

### Story UI-0.3: App Layout & Navigation (2 SP)

**As a** user  
**I want** a consistent application layout with navigation  
**So that** I can access different sections of the application

**Acceptance Criteria:**

**Given** I am authenticated  
**When** I access the application  
**Then** I see the default layout with:

- Header with ProspectFlow logo
- Navigation menu (Campagnes, Prospects)
- User menu with logout option  
  **And** Layout is responsive on mobile, tablet, desktop

**Given** I am on any page  
**When** I look at the header  
**Then** I see:

- "ProspectFlow" logo/title on the left
- Navigation links in the center
- User profile/logout button on the right  
  **And** Active page is highlighted in navigation

**Given** I click on "Campagnes"  
**When** navigation triggers  
**Then** I am taken to `/campaigns`  
**And** "Campagnes" link is highlighted  
**And** Navigation happens instantly (client-side routing)

**Given** I click on "Prospects"  
**When** navigation triggers  
**Then** I am taken to `/prospects`  
**And** "Prospects" link is highlighted

**Given** I click my profile/user menu  
**When** dropdown opens  
**Then** I see:

- My email address or name
- "Déconnexion" option  
  **And** Clicking "Déconnexion" logs me out

**Given** I am on mobile device  
**When** I view the layout  
**Then** Navigation collapses to hamburger menu  
**And** Menu opens in sidebar/overlay  
**And** All links remain accessible

**Given** page content loads  
**When** rendering inside layout  
**Then** Content area has proper padding and max-width  
**And** Page is centered and readable  
**And** Footer (if present) stays at bottom

**Technical Requirements:**

**Files to create:**

- `apps/ui-web/app.vue` - Root app component
- `apps/ui-web/layouts/default.vue` - Default authenticated layout
- `apps/ui-web/layouts/empty.vue` - Empty layout for login/callback pages
- `apps/ui-web/components/Layout/Header.vue` - Header component
- `apps/ui-web/components/Layout/Navigation.vue` - Navigation component
- `apps/ui-web/components/Layout/UserMenu.vue` - User dropdown menu

**NuxtUI Components to use:**

- `<UContainer>` - Content container with max-width
- `<UButton>` - Navigation buttons
- `<UDropdown>` - User menu dropdown
- `<UIcon>` - Icons for navigation
- `<UAvatar>` - User avatar (optional)

**Styling:**

- Use NuxtUI utility classes
- Responsive breakpoints: sm, md, lg, xl
- Consistent spacing with Tailwind classes
- Dark mode support (optional for MVP)

**Testing:**

- ✅ Layout renders correctly on all screen sizes
- ✅ Navigation links work and highlight active page
- ✅ Logout function works from user menu
- ✅ Mobile menu opens/closes properly
- ✅ Layout does NOT render on login/callback pages

---

## Epic UI-1: Campaign Management UI (13 SP)

**Goal**: Build complete campaign management interface

**Dependencies**:

- Epic UI-0 (Frontend foundation)
- Epic E1 backend (Campaign APIs)

**Deliverables**:

- Campaign list view with filters
- Campaign creation form
- Campaign details page
- Campaign editing and archiving

---

### Story UI-1.1: Campaign List View (3 SP)

**As a** user  
**I want** to view all my campaigns in a list  
**So that** I can see an overview and select campaigns to manage

**Acceptance Criteria:**

**Given** I navigate to `/campaigns`  
**When** the page loads  
**Then** I see a list of all campaigns for my organisation  
**And** Each campaign shows: name, status, created date, prospect count  
**And** Campaigns are sorted by created date (newest first)

**Given** I have no campaigns  
**When** I visit the campaigns page  
**Then** I see an empty state message "Aucune campagne"  
**And** I see a "Créer une campagne" button  
**And** Button redirects to campaign creation form

**Given** I have many campaigns  
**When** I view the list  
**Then** I see pagination controls (10 per page)  
**And** I can navigate between pages  
**And** Page number is reflected in URL query param

**Given** campaigns have different statuses  
**When** I view the list  
**Then** Status is displayed with color badges:

- Draft (gray)
- Active (green)
- Paused (yellow)
- Completed (blue)  
  **And** I can filter by status using dropdown

**Given** I want to find a specific campaign  
**When** I use the search box  
**Then** campaigns are filtered by name (client-side)  
**And** Results update as I type  
**And** Search is case-insensitive

**Given** I click on a campaign row  
**When** row is clicked  
**Then** I navigate to campaign details page `/campaigns/:id`  
**And** Campaign ID is in the URL

**Technical Requirements:**

**Files to create:**

- `apps/ui-web/pages/campaigns/index.vue` - Campaign list page
- `apps/ui-web/components/Campaign/Card.vue` - Campaign card component
- `apps/ui-web/components/Campaign/StatusBadge.vue` - Status badge component
- `apps/ui-web/composables/useCampaigns.ts` - Campaign data fetching

**API Integration:**

- GET `/api/campaigns` - Fetch all campaigns
- Query params: page, limit, status

**NuxtUI Components:**

- `<UTable>` - Data table for campaigns
- `<UBadge>` - Status badges
- `<UInput>` - Search input
- `<USelect>` - Status filter dropdown
- `<UPagination>` - Pagination controls
- `<UButton>` - "Créer une campagne" button

**Testing:**

- ✅ Campaigns load from API
- ✅ Empty state displays when no campaigns
- ✅ Pagination works correctly
- ✅ Status filter works
- ✅ Search filters campaigns
- ✅ Click navigates to details

---

### Story UI-1.2: Campaign Creation Form (5 SP)

**As a** user  
**I want** to create a new campaign  
**So that** I can start prospecting

**Acceptance Criteria:**

**Given** I click "Créer une campagne" button  
**When** I navigate to `/campaigns/new`  
**Then** I see a campaign creation form with fields:

- Name (required, text input)
- Description (optional, textarea)  
  **And** I see "Créer" and "Annuler" buttons

**Given** I fill in the campaign name  
**When** I type in the name field  
**Then** Name field accepts text input  
**And** Character count shows (max 100 characters)  
**And** Field validation shows error if empty

**Given** I fill in optional description  
**When** I type in description field  
**Then** Textarea expands as needed  
**And** Character count shows (max 500 characters)  
**And** Field is optional (no error if empty)

**Given** form has validation errors  
**When** I try to submit with empty name  
**Then** I see validation error "Le nom est requis"  
**And** Name field is highlighted in red  
**And** Form does NOT submit  
**And** Focus returns to invalid field

**Given** form is valid  
**When** I click "Créer" button  
**Then** Campaign is created via POST /api/campaigns  
**And** Loading spinner shows during API call  
**And** Button is disabled during submission  
**And** Success toast notification appears

**Given** campaign creation succeeds  
**When** API returns 201 Created  
**Then** I am redirected to campaign details page `/campaigns/:id`  
**And** I see the newly created campaign  
**And** Success message: "Campagne créée avec succès"

**Given** campaign creation fails  
**When** API returns error (400, 500)  
**Then** Error message is displayed above form  
**And** Form remains filled (data not lost)  
**And** User can correct and retry  
**And** Specific error details are shown if available

**Given** I click "Annuler" button  
**When** I want to cancel creation  
**Then** I am navigated back to `/campaigns`  
**And** No campaign is created  
**And** Form data is discarded

**Technical Requirements:**

**Files to create:**

- `apps/ui-web/pages/campaigns/new.vue` - Campaign creation page
- `apps/ui-web/components/Campaign/Form.vue` - Reusable campaign form
- `apps/ui-web/composables/useCampaignForm.ts` - Form state and validation

**Validation schema (Zod or Vuelidate):**

```typescript
const campaignSchema = z.object({
  name: z.string().min(1, 'Le nom est requis').max(100),
  description: z.string().max(500).optional(),
});
```

**API Integration:**

- POST `/api/campaigns` - Create new campaign
- Body: `{ name, description }`
- Response: `{ id, name, description, status, created_at }`

**NuxtUI Components:**

- `<UForm>` - Form wrapper with validation
- `<UInput>` - Name input field
- `<UTextarea>` - Description textarea
- `<UButton>` - Submit and cancel buttons
- `<UAlert>` - Error message display
- `<UNotification>` - Success toast

**Testing:**

- ✅ Form renders correctly
- ✅ Validation works for all fields
- ✅ Successful submission creates campaign
- ✅ Error handling displays messages
- ✅ Cancel button navigates back
- ✅ Loading states work properly

---

### Story UI-1.3: Campaign Details Page (3 SP)

**As a** user  
**I want** to view campaign details  
**So that** I can see campaign information and statistics

**Acceptance Criteria:**

**Given** I navigate to `/campaigns/:id`  
**When** the page loads  
**Then** I see campaign details:

- Name (editable inline)
- Description
- Status badge
- Created date
- Prospect count
- Email sent count (if available)  
  **And** Data is fetched from GET /api/campaigns/:id

**Given** campaign is loading  
**When** API request is in progress  
**Then** I see loading skeleton placeholders  
**And** No flash of empty content  
**And** Layout structure is visible

**Given** campaign does not exist  
**When** API returns 404  
**Then** I see "Campagne introuvable" message  
**And** Button to return to campaigns list  
**And** No error console spam

**Given** I am viewing campaign details  
**When** I look at the action buttons  
**Then** I see:

- "Modifier" button
- "Archiver" button (if status is not archived)
- "Retour" button to campaigns list  
  **And** Buttons are styled with appropriate colors

**Given** I click "Modifier" button  
**When** I want to edit campaign  
**Then** I navigate to `/campaigns/:id/edit`  
**And** Edit form is pre-filled with current data

**Given** I click "Archiver" button  
**When** I want to archive campaign  
**Then** Confirmation modal appears  
**And** Modal asks "Êtes-vous sûr de vouloir archiver cette campagne?"  
**And** I see "Confirmer" and "Annuler" buttons

**Given** I confirm archiving  
**When** I click "Confirmer" in modal  
**Then** Campaign status is updated to "archived" via API  
**And** Success toast appears  
**And** Status badge updates to "Archivé"  
**And** "Archiver" button becomes disabled or hidden

**Given** campaign has prospects  
**When** I view the details  
**Then** I see a section "Prospects (X)"  
**And** Section shows preview of first 5 prospects  
**And** Button "Voir tous les prospects" navigates to prospects tab/page

**Technical Requirements:**

**Files to create:**

- `apps/ui-web/pages/campaigns/[id].vue` - Campaign details page
- `apps/ui-web/components/Campaign/Details.vue` - Details display component
- `apps/ui-web/components/Campaign/ArchiveModal.vue` - Archive confirmation modal
- `apps/ui-web/composables/useCampaign.ts` - Single campaign fetching

**API Integration:**

- GET `/api/campaigns/:id` - Fetch campaign details
- PATCH `/api/campaigns/:id` - Update campaign (for archiving)
- Body: `{ status: 'archived' }`

**NuxtUI Components:**

- `<UCard>` - Card for details sections
- `<UBadge>` - Status badge
- `<UButton>` - Action buttons
- `<UModal>` - Archive confirmation modal
- `<USkeleton>` - Loading skeletons

**Testing:**

- ✅ Campaign details load correctly
- ✅ 404 handling works
- ✅ Loading states display properly
- ✅ Archive flow works end-to-end
- ✅ Navigation buttons work
- ✅ Edit button navigates correctly

---

### Story UI-1.4: Campaign Editing (2 SP)

**As a** user  
**I want** to edit campaign details  
**So that** I can update campaign information

**Acceptance Criteria:**

**Given** I navigate to `/campaigns/:id/edit`  
**When** the page loads  
**Then** I see the campaign form pre-filled with:

- Current name
- Current description  
  **And** Form is in edit mode (not creation mode)

**Given** the form is pre-filled  
**When** I modify the name or description  
**Then** Changes are tracked in form state  
**And** "Sauvegarder" button is enabled  
**And** "Annuler" button remains available

**Given** I click "Sauvegarder"  
**When** form validation passes  
**Then** Campaign is updated via PATCH /api/campaigns/:id  
**And** Loading spinner shows during save  
**And** Button is disabled during save

**Given** update succeeds  
**When** API returns 200 OK  
**Then** I am redirected back to campaign details `/campaigns/:id`  
**And** Success toast shows "Campagne mise à jour"  
**And** Updated data is displayed

**Given** update fails  
**When** API returns error  
**Then** Error message displays above form  
**And** Form data is preserved  
**And** User can correct and retry

**Given** I click "Annuler"  
**When** I want to discard changes  
**Then** I am navigated back to campaign details  
**And** No API call is made  
**And** Changes are discarded

**Given** I made changes and navigate away  
**When** I click browser back or other navigation  
**Then** Confirmation prompt appears (optional for MVP)  
**And** "Vous avez des modifications non sauvegardées"

**Technical Requirements:**

**Files to create:**

- `apps/ui-web/pages/campaigns/[id]/edit.vue` - Campaign edit page
- Reuse: `components/Campaign/Form.vue` - Same form component as creation

**API Integration:**

- GET `/api/campaigns/:id` - Fetch current data for pre-fill
- PATCH `/api/campaigns/:id` - Update campaign
- Body: `{ name?, description? }`

**Form Differences:**

- Creation: POST to `/api/campaigns`
- Edit: PATCH to `/api/campaigns/:id`
- Form component accepts `mode` prop: 'create' | 'edit'
- Form component accepts `initialData` prop for pre-filling

**Testing:**

- ✅ Form pre-fills with current data
- ✅ Updates save correctly
- ✅ Navigation back works
- ✅ Error handling works
- ✅ Cancel discards changes

---

## Epic UI-2: Prospect Management UI (13 SP)

**Goal**: Build prospect import and management interface

**Dependencies**:

- Epic UI-0 (Frontend foundation)
- Epic E2 backend (Prospect import APIs)

**Deliverables**:

- CSV upload interface
- Column mapping UI
- Validation results display
- Prospect list view

---

### Story UI-2.1: CSV Upload Interface (5 SP)

**As a** user  
**I want** to upload a CSV file with prospects  
**So that** I can import them into a campaign

**Acceptance Criteria:**

**Given** I navigate to `/prospects/import`  
**When** the page loads  
**Then** I see:

- File upload dropzone
- "Parcourir" button to select file
- Supported formats: "CSV, Excel (.xlsx)"
- Max file size: "50 MB"  
  **And** I can drag & drop files into dropzone

**Given** I drag a CSV file over dropzone  
**When** file hovers over dropzone  
**Then** Dropzone highlights with border color change  
**And** Cursor shows "copy" icon  
**And** Visual feedback indicates drop is allowed

**Given** I drop or select a file  
**When** file is valid (CSV or XLSX, < 50MB)  
**Then** File upload starts immediately  
**And** Progress bar shows upload percentage  
**And** File name is displayed

**Given** file upload succeeds  
**When** API returns upload_id  
**Then** I am redirected to `/prospects/import/map?upload_id=...`  
**And** Upload ID is in URL query param  
**And** File is ready for column mapping

**Given** I select invalid file type  
**When** file is not CSV or XLSX  
**Then** Error message shows "Format non supporté"  
**And** Supported formats are listed  
**And** Upload does NOT proceed

**Given** I select file too large  
**When** file size > 50MB  
**Then** Error message shows "Fichier trop volumineux (max 50 MB)"  
**And** Upload does NOT proceed  
**And** User can select different file

**Given** upload fails  
**When** network error or server error occurs  
**Then** Error message shows specific error  
**And** "Réessayer" button allows retry  
**And** File selection remains active

**Given** I want to download a template  
**When** I click "Télécharger un exemple de CSV"  
**Then** CSV template file downloads  
**And** Template includes correct headers  
**And** Template has example data in first row

**Technical Requirements:**

**Files to create:**

- `apps/ui-web/pages/prospects/import/index.vue` - Upload page
- `apps/ui-web/components/Prospect/FileUpload.vue` - Upload component
- `apps/ui-web/composables/useFileUpload.ts` - Upload logic

**API Integration:**

- POST `/api/imports/upload` - Upload file (multipart/form-data)
- Response: `{ upload_id, filename, columns, row_count }`
- GET `/api/imports/csv/template` - Download template

**NuxtUI Components:**

- `<UInput type="file">` - File input
- `<UProgress>` - Upload progress bar
- `<UAlert>` - Error messages
- `<UButton>` - Browse and download buttons

**File Handling:**

- Use FormData for multipart upload
- Show upload progress with progress event
- Validate file type and size client-side
- Handle drag & drop events

**Testing:**

- ✅ File upload works with drag & drop
- ✅ File upload works with file picker
- ✅ Validation rejects invalid files
- ✅ Progress bar shows during upload
- ✅ Navigation to mapping page works
- ✅ Template download works

---

### Story UI-2.2: Column Mapping Interface (5 SP)

**As a** user  
**I want** to map CSV columns to CRM fields  
**So that** data imports into correct fields

**Acceptance Criteria:**

**Given** I navigate to `/prospects/import/map?upload_id=...`  
**When** page loads  
**Then** I see:

- List of CSV columns detected
- For each column: dropdown to select CRM field
- Auto-detected mappings pre-selected  
  **And** Data is fetched from GET /api/imports/:upload_id/columns

**Given** column names match CRM fields  
**When** auto-detection runs  
**Then** Mappings are suggested:

- "Company Name" → companies.name
- "SIREN" → companies.siren
- "Email" → people.email  
  **And** Matched mappings have checkmark icon  
  **And** Confidence level is shown (high/medium/low)

**Given** I want to change a mapping  
**When** I click on dropdown  
**Then** I see all available CRM fields grouped by entity:

- **Company fields**: name, siren, siret, website, etc.
- **Person fields**: first_name, last_name, email, phone, etc.  
  **And** I can select different field  
  **And** Selection updates immediately

**Given** CSV column doesn't match any CRM field  
**When** I look at unmapped column  
**Then** Dropdown shows "Ignorer cette colonne" option  
**And** I can choose to skip this column  
**And** Skipped columns won't be imported

**Given** I want to map custom field  
**When** CSV has extra columns  
**Then** I can select "Champ personnalisé"  
**And** Data will be stored in external_data JSONB  
**And** Custom field name is preserved

**Given** I completed mapping  
**When** I click "Valider le mapping" button  
**Then** Mapping configuration is saved via POST /api/imports/:upload_id/map  
**And** I am redirected to validation page  
**And** Loading spinner shows during save

**Given** mapping is invalid  
**When** required fields are not mapped  
**Then** Validation error shows: "Le champ 'nom' est requis"  
**And** Missing fields are highlighted  
**And** Button is disabled until valid

**Given** I want to go back  
**When** I click "Retour" button  
**Then** I return to upload page  
**And** Can upload different file  
**And** Previous upload is discarded

**Technical Requirements:**

**Files to create:**

- `apps/ui-web/pages/prospects/import/map.vue` - Mapping page
- `apps/ui-web/components/Prospect/ColumnMapper.vue` - Mapping component
- `apps/ui-web/composables/useColumnMapping.ts` - Mapping logic

**API Integration:**

- GET `/api/imports/:upload_id/columns` - Get detected columns
- Response: `{ columns: [{ name, type, sample_values }] }`
- POST `/api/imports/:upload_id/map` - Save mapping
- Body: `{ mappings: { csv_column: crm_field } }`

**NuxtUI Components:**

- `<USelect>` - Field selection dropdowns
- `<UBadge>` - Confidence indicators
- `<UButton>` - Navigation buttons
- `<UAlert>` - Validation errors
- `<UIcon>` - Checkmark for matched fields

**Mapping Logic:**

- Auto-detection with fuzzy matching
- Required fields validation
- Support for custom fields
- Preview sample values for each column

**Testing:**

- ✅ Columns load from API
- ✅ Auto-detection works
- ✅ Manual mapping changes work
- ✅ Validation enforces required fields
- ✅ Mapping saves correctly
- ✅ Navigation works

---

### Story UI-2.3: Validation Results & Import Execution (3 SP)

**As a** user  
**I want** to see validation results before importing  
**So that** I can fix errors and confirm import

**Acceptance Criteria:**

**Given** I navigate to `/prospects/import/validate?upload_id=...`  
**When** validation runs  
**Then** I see validation summary:

- Total rows: X
- Valid rows: Y (green)
- Rows with errors: Z (red)
- Duplicates detected: N (yellow)  
  **And** Data from GET /api/imports/:upload_id/validate

**Given** validation finds errors  
**When** I view error details  
**Then** I see grouped errors:

- Missing required fields (count)
- Invalid email format (count)
- Invalid SIREN format (count)  
  **And** I can expand each group to see affected rows  
  **And** Row numbers are listed

**Given** duplicates are detected  
**When** I view duplicate section  
**Then** I see:

- Duplicate match criteria (SIREN, email, etc.)
- Number of duplicates
- Action to take: "Mettre à jour" or "Ignorer"  
  **And** I can choose deduplication strategy

**Given** I want to see preview  
**When** I click "Prévisualiser" tab  
**Then** I see first 10 rows with mapped data  
**And** Table shows how data will be imported  
**And** I can verify mappings are correct

**Given** validation passes and I confirm  
**When** I click "Lancer l'import" button  
**Then** Import job starts via POST /api/imports/:upload_id/execute  
**And** I am redirected to import progress page  
**And** Job ID is in URL

**Given** import is executing  
**When** I view progress page `/prospects/import/progress/:job_id`  
**Then** I see:

- Progress bar with percentage
- Rows processed: X / Y
- Status: "En cours..."  
  **And** Progress updates automatically (polling or SSE)

**Given** import completes  
**When** job status = completed  
**Then** I see success summary:

- Rows imported: X
- Created: Y
- Updated: Z
- Skipped: N  
  **And** "Voir les prospects" button navigates to prospect list  
  **And** Success toast notification appears

**Given** import fails  
**When** job status = failed  
**Then** I see error message with details  
**And** "Télécharger le rapport d'erreurs" button  
**And** "Réessayer" button to restart import

**Technical Requirements:**

**Files to create:**

- `apps/ui-web/pages/prospects/import/validate.vue` - Validation page
- `apps/ui-web/pages/prospects/import/progress/[job_id].vue` - Progress page
- `apps/ui-web/components/Prospect/ValidationResults.vue` - Results component
- `apps/ui-web/components/Prospect/ImportProgress.vue` - Progress component
- `apps/ui-web/composables/useImportJob.ts` - Job tracking

**API Integration:**

- GET `/api/imports/:upload_id/validate` - Validation results
- GET `/api/imports/:upload_id/preview` - Preview data
- POST `/api/imports/:upload_id/execute` - Start import
- GET `/api/import-jobs/:job_id` - Poll job status (every 2s)

**NuxtUI Components:**

- `<UCard>` - Summary cards
- `<UTable>` - Preview table
- `<UProgress>` - Import progress bar
- `<UBadge>` - Status badges
- `<UButton>` - Action buttons
- `<UAlert>` - Error messages

**Progress Polling:**

```typescript
const pollJobStatus = async (jobId) => {
  const interval = setInterval(async () => {
    const job = await $fetch(`/api/import-jobs/${jobId}`);
    if (job.status === 'completed' || job.status === 'failed') {
      clearInterval(interval);
    }
  }, 2000);
};
```

**Testing:**

- ✅ Validation results display correctly
- ✅ Error grouping works
- ✅ Preview shows correct data
- ✅ Import execution starts
- ✅ Progress polling works
- ✅ Completion redirects to prospects

---

## Epic UI-3: Email Review Interface (21 SP)

**Goal**: Build email draft review and approval interface

**Dependencies**:

- Epic UI-0, UI-1 (Foundation + Campaigns)
- Epic E4, E5 backend (AI drafts + Review APIs)

**Deliverables**:

- Review queue layout
- Email preview component
- Inline editor
- Keyboard shortcuts
- Batch approval

---

### Story UI-3.1: Review Queue Layout (5 SP)

[Detailed story for review queue - to be written]

### Story UI-3.2: Email Preview & Edit Component (8 SP)

[Detailed story for email preview - to be written]

### Story UI-3.3: Keyboard Shortcuts (3 SP)

[Detailed story for keyboard shortcuts - to be written]

### Story UI-3.4: Batch Approval Actions (5 SP)

[Detailed story for batch approval - to be written]

---

## Epic UI-4: Analytics Dashboard (13 SP)

**Goal**: Build campaign analytics and metrics visualization

**Dependencies**:

- Epic UI-0, UI-1 (Foundation + Campaigns)
- Epic E8 backend (Analytics APIs)

**Deliverables**:

- Campaign metrics charts
- Response tracking dashboard
- Export functionality

---

### Story UI-4.1: Campaign Metrics Charts (8 SP)

[Detailed story for metrics - to be written]

### Story UI-4.2: Response Tracking Dashboard (3 SP)

[Detailed story for response tracking - to be written]

### Story UI-4.3: Export & Reporting (2 SP)

[Detailed story for export - to be written]

---

## Story Point Estimates Summary

| Epic                          | Stories | Total SP  |
| ----------------------------- | ------- | --------- |
| **UI-0: Foundation & Auth**   | 3       | 8 SP      |
| **UI-1: Campaign Management** | 4       | 13 SP     |
| **UI-2: Prospect Management** | 3       | 13 SP     |
| **UI-3: Email Review**        | 4       | 21 SP     |
| **UI-4: Analytics Dashboard** | 3       | 13 SP     |
| **Total**                     | **17**  | **68 SP** |

---

## Dependencies Map

```
UI-0 (Foundation)
  ↓
  ├─→ UI-1 (Campaigns)
  ├─→ UI-2 (Prospects)
  └─→ UI-3 (Email Review)
        ↓
        UI-4 (Analytics)
```

**Backend Dependencies:**

- UI-0 depends on: Story 0.4 (Cognito Auth backend)
- UI-1 depends on: Epic E1 (Campaign Management APIs)
- UI-2 depends on: Epic E2 (Prospect Import APIs)
- UI-3 depends on: Epic E4, E5 (AI Drafts + Review APIs)
- UI-4 depends on: Epic E8 (Analytics APIs)

---

## Sprint Recommendations

### Sprint 0 (Current - Week of Jan 9)

- **UI-0.1**: Nuxt Setup (3 SP)
- **UI-0.2**: Auth UI (3 SP)
- **UI-0.3**: App Layout (2 SP)
- **Total**: 8 SP
- **Deliverable**: Login flow working

### Sprint 1 (Next Week)

- **UI-1.1**: Campaign List (3 SP)
- **UI-1.2**: Campaign Creation (5 SP)
- **UI-1.3**: Campaign Details (3 SP)
- **UI-1.4**: Campaign Editing (2 SP)
- **Total**: 13 SP
- **Deliverable**: Full campaign CRUD

### Sprint 2 (Week 3)

- **UI-2.1**: CSV Upload (5 SP)
- **UI-2.2**: Column Mapping (5 SP)
- **UI-2.3**: Validation & Import (3 SP)
- **Total**: 13 SP
- **Deliverable**: CSV import flow

### Sprint 3-4

- **UI-3**: Email Review Interface (21 SP)
- **Deliverable**: Email review and approval

### Sprint 5

- **UI-4**: Analytics Dashboard (13 SP)
- **Deliverable**: Campaign analytics

---

## Technical Standards

### Code Organization

- Pages in `pages/` - File-based routing
- Components in `components/` - Auto-imported
- Composables in `composables/` - Reusable logic
- Layouts in `layouts/` - Layout templates
- Middleware in `middleware/` - Route guards

### Naming Conventions

- Components: PascalCase (e.g., `CampaignCard.vue`)
- Composables: camelCase with `use` prefix (e.g., `useCampaigns.ts`)
- Pages: kebab-case (e.g., `campaigns/[id].vue`)
- CSS classes: Tailwind utilities (no custom CSS)

### TypeScript Standards

- Strict mode enabled
- Type all props, events, composables
- Use `interface` for object shapes
- Use `type` for unions/intersections
- No `any` types (use `unknown` if needed)

### Component Standards

- Use `<script setup lang="ts">`
- Define props with `defineProps<T>()`
- Define emits with `defineEmits<T>()`
- Use composables for logic extraction
- Keep components < 200 lines (split if larger)

### API Integration

- Use `$fetch` or `useFetch` from Nuxt
- Error handling with try/catch
- Loading states for async operations
- Toast notifications for user feedback
- Optimistic UI updates where applicable

### Accessibility

- Use semantic HTML
- ARIA labels where needed
- Keyboard navigation support
- Focus management
- Color contrast WCAG AA compliant
- Screen reader tested

---

## Testing Strategy

### Unit Tests (Vitest)

- Composables logic
- Utility functions
- Complex component logic

### Component Tests (Vitest + Testing Library)

- Component rendering
- User interactions
- Props and emits
- Conditional rendering

### E2E Tests (Playwright)

- Critical user flows
- Auth flow (login/logout)
- Campaign CRUD
- Prospect import
- Email review

### Test Coverage Goals

- Overall: 80%
- Composables: 90%
- Components: 70%
- Pages: 60% (E2E covers most)

---

## Performance Requirements

### Load Time

- Initial page load: < 2s
- Subsequent navigations: < 500ms
- API responses: < 200ms (local)

### Bundle Size

- Initial JS: < 200KB gzipped
- CSS: < 50KB gzipped
- Use code splitting for routes
- Lazy load heavy components

### Optimization Techniques

- Image optimization (nuxt-image)
- Lazy loading (v-lazy)
- Virtual scrolling for large lists
- Debounce search inputs
- Memoize expensive computations

---

## Notes

**Current Status**: Epic UI-0 ready to start (Jan 9, 2026)

**Next Steps**:

1. Set up Nuxt project (Story UI-0.1)
2. Implement auth flow (Story UI-0.2)
3. Create app layout (Story UI-0.3)
4. Demo login/logout to stakeholders

**References**:

- Backend API docs: `apps/ingest-api/README.md`
- UX Design specs: `/doc/ux-design/`
- Architecture: `/doc/ARCHITECTURE.md`

---

**Version**: 1.0  
**Last Updated**: 2026-01-09  
**Status**: ✅ Ready for Development
