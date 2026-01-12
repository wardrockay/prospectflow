# Story UI-0.3: App Layout & Navigation

**Status:** ready-for-dev  
**Epic:** UI-0 - Frontend Foundation & Authentication  
**Story Points:** 2  
**Priority:** P0 (MVP Foundation)

---

## Story

As a **user**,  
I want **a consistent application layout with navigation**,  
So that **I can access different sections of the application easily and have a cohesive user experience**.

---

## Acceptance Criteria

### AC1: Authenticated User Layout

**Given** I am authenticated  
**When** I access the application  
**Then** I see the default layout with:

- Header with ProspectFlow logo on the left
- Navigation menu (Campagnes, Prospects) in the center
- User menu with logout option on the right  
  **And** Layout is responsive on mobile, tablet, desktop  
  **And** Current page is highlighted in navigation

### AC2: Header Component

**Given** I am on any page  
**When** I look at the header  
**Then** I see:

- "ProspectFlow" logo/title on the left (clickable → redirects to `/`)
- Navigation links in the center (desktop) or hamburger menu (mobile)
- User profile/logout button on the right  
  **And** Header is sticky at the top  
  **And** Header has subtle shadow for visual separation

### AC3: Navigation Links

**Given** I click on "Campagnes"  
**When** navigation triggers  
**Then** I am taken to `/campaigns`  
**And** "Campagnes" link is visually highlighted as active  
**And** Navigation happens instantly (client-side routing, no full page reload)

**Given** I click on "Prospects"  
**When** navigation triggers  
**Then** I am taken to `/prospects`  
**And** "Prospects" link is visually highlighted as active

### AC4: User Menu Dropdown

**Given** I click my profile/user menu  
**When** dropdown opens  
**Then** I see:

- "Mon compte" label with user icon
- "Déconnexion" option with appropriate icon  
  **And** Clicking "Déconnexion" calls `logout()` from `useAuth` composable

### AC5: Mobile Responsive Layout

**Given** I am on a mobile device (< 768px)  
**When** I view the layout  
**Then** Navigation collapses to hamburger menu icon  
**And** Clicking hamburger opens a mobile sidebar/drawer  
**And** Mobile menu shows all navigation links vertically  
**And** Clicking a link closes the menu and navigates  
**And** User can close menu by clicking outside or X button

### AC6: Content Area Styling

**Given** page content loads  
**When** rendering inside layout  
**Then** Content area has proper padding (`py-8`)  
**And** Content uses `<UContainer>` for centered max-width  
**And** Footer stays at bottom with copyright text  
**And** Page is scrollable when content exceeds viewport

### AC7: Layout Exclusion for Auth Pages

**Given** I am on `/login` or `/auth/callback`  
**When** the page renders  
**Then** The page uses `empty` layout (no header/navigation)  
**And** Only the login/callback content is displayed

### AC8: Active Route Highlighting

**Given** I am on any protected route  
**When** I look at the navigation  
**Then** The current route's navigation link has a distinct active style  
**And** Active style uses primary color or underline indicator  
**And** Non-active links have default styling

---

## Tasks / Subtasks

### Task 1: Refactor Layout Components into Separate Files

- [ ] **1.1** Create `components/Layout/Header.vue` - Extract header from default.vue
- [ ] **1.2** Create `components/Layout/Navigation.vue` - Desktop navigation links
- [ ] **1.3** Create `components/Layout/UserMenu.vue` - User dropdown menu
- [ ] **1.4** Create `components/Layout/MobileMenu.vue` - Mobile sidebar menu
- [ ] **1.5** Create `components/Layout/Footer.vue` - Footer component
- [ ] **1.6** Update `layouts/default.vue` to compose new components

**Acceptance Criteria:**
✅ Components are reusable and follow single-responsibility  
✅ All TypeScript types properly defined  
✅ Components use NuxtUI library consistently

---

### Task 2: Implement Desktop Navigation with Active State

- [ ] **2.1** Create navigation items configuration with icons and routes
- [ ] **2.2** Use `NuxtLink` for client-side navigation
- [ ] **2.3** Implement active route detection using `useRoute()`
- [ ] **2.4** Style active link with primary color variant
- [ ] **2.5** Add hover states for non-active links

**Technical Implementation:**

```typescript
// Navigation configuration
const navigation = [
  { label: 'Campagnes', to: '/campaigns', icon: 'i-heroicons-folder' },
  { label: 'Prospects', to: '/prospects', icon: 'i-heroicons-users' },
];

// Active route detection
const route = useRoute();
const isActive = (to: string) => route.path.startsWith(to);
```

**Acceptance Criteria:**
✅ Navigation links work with client-side routing  
✅ Active route is visually distinct  
✅ Icons display correctly next to labels

---

### Task 3: Implement Mobile Navigation Menu

- [ ] **3.1** Add hamburger menu button (visible only on mobile < md)
- [ ] **3.2** Implement `USlideover` or custom drawer component
- [ ] **3.3** Display navigation items vertically in mobile menu
- [ ] **3.4** Add close button (X) and click-outside-to-close
- [ ] **3.5** Include logout option in mobile menu
- [ ] **3.6** Close menu automatically on navigation

**Technical Implementation:**

```vue
<script setup lang="ts">
const isMobileMenuOpen = ref(false);
const route = useRoute();

// Close menu on route change
watch(
  () => route.path,
  () => {
    isMobileMenuOpen.value = false;
  },
);
</script>

<template>
  <!-- Hamburger button (mobile only) -->
  <UButton
    class="md:hidden"
    icon="i-heroicons-bars-3"
    variant="ghost"
    @click="isMobileMenuOpen = true"
  />

  <!-- Mobile Slideover -->
  <USlideover v-model="isMobileMenuOpen">
    <div class="p-4 space-y-4">
      <UButton
        v-for="item in navigation"
        :key="item.to"
        :to="item.to"
        :icon="item.icon"
        :variant="isActive(item.to) ? 'solid' : 'ghost'"
        block
      >
        {{ item.label }}
      </UButton>
      <UDivider />
      <UButton
        icon="i-heroicons-arrow-right-on-rectangle"
        variant="ghost"
        color="red"
        block
        @click="logout"
      >
        Déconnexion
      </UButton>
    </div>
  </USlideover>
</template>
```

**Acceptance Criteria:**
✅ Hamburger visible only on mobile (<768px)  
✅ Slideover animates smoothly  
✅ Menu closes on navigation or click outside  
✅ All links accessible in mobile view

---

### Task 4: User Menu Enhancement

- [ ] **4.1** Keep existing dropdown structure but enhance styling
- [ ] **4.2** Add user email display if available from token
- [ ] **4.3** Ensure dropdown positioning is correct
- [ ] **4.4** Hide user menu on mobile (logout is in mobile menu)

**Technical Implementation:**

```vue
<UDropdown :items="userMenuItems" :popper="{ placement: 'bottom-end' }">
  <UButton
    class="hidden md:flex"
    icon="i-heroicons-user-circle"
    variant="ghost"
    trailing-icon="i-heroicons-chevron-down"
  >
    Mon compte
  </UButton>
</UDropdown>
```

**Acceptance Criteria:**
✅ Dropdown works correctly on desktop  
✅ Hidden on mobile (users use slideover menu)  
✅ Logout function calls `useAuth().logout()`

---

### Task 5: Footer Component

- [ ] **5.1** Create `components/Layout/Footer.vue`
- [ ] **5.2** Display copyright with dynamic year
- [ ] **5.3** Style with border-top and subtle background
- [ ] **5.4** Ensure footer stays at bottom (min-h-screen on parent)

**Technical Implementation:**

```vue
<template>
  <footer class="mt-auto py-8 border-t bg-white">
    <UContainer>
      <div class="text-center text-sm text-gray-500">
        © {{ new Date().getFullYear() }} ProspectFlow. Tous droits réservés.
      </div>
    </UContainer>
  </footer>
</template>
```

**Acceptance Criteria:**
✅ Footer always at bottom of viewport  
✅ Year updates automatically  
✅ Consistent styling with design system

---

### Task 6: Create Placeholder Pages for Navigation

- [ ] **6.1** Create `pages/campaigns/index.vue` - Placeholder campaigns page
- [ ] **6.2** Create `pages/prospects/index.vue` - Placeholder prospects page
- [ ] **6.3** Add `definePageMeta({ middleware: 'auth' })` to protect routes
- [ ] **6.4** Add simple placeholder content with title and back-to-dashboard link

**Technical Implementation:**

```vue
<!-- pages/campaigns/index.vue -->
<script setup lang="ts">
definePageMeta({
  middleware: 'auth',
});
</script>

<template>
  <div>
    <h1 class="text-3xl font-bold mb-4">Campagnes</h1>
    <p class="text-gray-600">Page des campagnes - À venir dans l'Epic UI-1</p>
    <UButton to="/" variant="link" class="mt-4"> ← Retour au Dashboard </UButton>
  </div>
</template>
```

**Acceptance Criteria:**
✅ Navigation links lead to real pages (not 404)  
✅ Pages are protected by auth middleware  
✅ Placeholder content indicates future work

---

### Task 7: Testing & Validation

- [ ] **7.1** Test navigation on desktop (Chrome, Firefox, Safari)
- [ ] **7.2** Test mobile menu on mobile viewport (DevTools or real device)
- [ ] **7.3** Verify logout works from both desktop dropdown and mobile menu
- [ ] **7.4** Verify active route highlighting on all routes
- [ ] **7.5** Test responsive breakpoints (resize browser)
- [ ] **7.6** Verify layout does NOT appear on login/callback pages

**Acceptance Criteria:**
✅ All acceptance criteria pass manual testing  
✅ No console errors or warnings  
✅ Responsive behavior works correctly  
✅ Auth flow unaffected by layout changes

---

## Dev Notes

### Architecture Context

This story builds on the authentication foundation from UI-0.2 and the project setup from UI-0.1. The layout structure is partially implemented in `layouts/default.vue` but needs refactoring into proper component architecture.

### Previous Story Intelligence

**From Story UI-0.2 (Authentication UI):**

- ✅ `useAuth()` composable available with `login()`, `logout()`, `isAuthenticated`
- ✅ `layouts/empty.vue` exists for auth pages
- ✅ `layouts/default.vue` has basic header/navigation structure
- ✅ `middleware/auth.ts` protects routes
- ✅ Logout redirects to Cognito logout URL then back to `/login`

**From Story UI-0.1 (Nuxt Project Setup):**

- ✅ NuxtUI configured and working
- ✅ Tailwind CSS available
- ✅ TypeScript strict mode enabled
- ✅ Auto-imports for components and composables

### Git Intelligence Summary

**Recent commits (last 10):**

- `88ac8cf` - chore: remove debug logs from auth callback
- `27f166d` - fix(nginx): increase buffer size for large JWT cookies
- `b716d98` - debug: add logging to auth callback
- `8ccdcab` - fix(auth): improve error logging for Cognito token exchange failure
- `616f3ff` - fix(nginx): remove /api/ proxy rule - Nuxt handles /api routes internally
- `226f780` - fix(ui-web): use native fetch instead of $fetch for Cognito token exchange
- `aa7adad` - feat: replace axios with $fetch for OAuth token exchange
- `175f1a7` - test: improve assertions in useAuth tests
- `faf13ee` - chore: update dependencies and add happy-dom support
- `cc3778e` - feat: implement OAuth 2.0 authentication flow with Cognito

**Key learnings:**

- Auth callback uses native `fetch` for Cognito token exchange (not `$fetch`)
- NGINX handles proxy with increased buffer sizes for JWT cookies
- Nuxt handles `/api` routes internally via server middleware

### Project Structure Notes

**Current File Structure:**

```
apps/ui-web/
├── layouts/
│   ├── default.vue      # UPDATE: Refactor to use components
│   └── empty.vue        # EXISTS: No changes needed
├── pages/
│   ├── index.vue        # EXISTS: Dashboard with auth middleware
│   ├── login.vue        # EXISTS: Login page
│   ├── auth/
│   │   └── callback.vue # EXISTS: OAuth callback
│   ├── campaigns/       # CREATE: New directory
│   │   └── index.vue    # CREATE: Placeholder
│   └── prospects/       # CREATE: New directory
│       └── index.vue    # CREATE: Placeholder
├── components/
│   └── Layout/          # CREATE: New directory
│       ├── Header.vue   # CREATE: Header component
│       ├── Navigation.vue  # CREATE: Desktop nav
│       ├── MobileMenu.vue  # CREATE: Mobile slideover
│       ├── UserMenu.vue    # CREATE: User dropdown
│       └── Footer.vue      # CREATE: Footer
├── composables/
│   └── useAuth.ts       # EXISTS: No changes needed
└── middleware/
    └── auth.ts          # EXISTS: No changes needed
```

### Technical Requirements

#### NuxtUI Components to Use

| Component      | Purpose                       |
| -------------- | ----------------------------- |
| `<UContainer>` | Max-width centered container  |
| `<UButton>`    | Navigation buttons, hamburger |
| `<UDropdown>`  | User menu dropdown            |
| `<USlideover>` | Mobile navigation drawer      |
| `<UDivider>`   | Visual separator in menus     |
| `<UIcon>`      | Navigation icons              |
| `<NuxtLink>`   | Client-side navigation        |

#### Responsive Breakpoints

| Breakpoint | Width          | Behavior                                  |
| ---------- | -------------- | ----------------------------------------- |
| Mobile     | < 768px        | Hamburger menu, vertical nav in slideover |
| Tablet     | 768px - 1024px | Horizontal nav, smaller spacing           |
| Desktop    | > 1024px       | Full horizontal nav, user dropdown        |

#### Styling Guidelines

- Use NuxtUI/Tailwind utility classes
- Primary color for active states
- Gray-500 for secondary text
- Hover states on interactive elements
- Smooth transitions (duration-200)

### References

- [Source: doc/planning/epics/ui-epics.md#Story UI-0.3] - Epic story definition
- [Source: doc/ux-design/03-Wireframes.md] - Layout wireframes
- [Source: doc/ux-design/06-Responsive-Design-Guidelines.md] - Responsive breakpoints
- [Source: doc/project-context.md] - Coding standards and project structure
- [Source: apps/ui-web/layouts/default.vue] - Current layout implementation
- [Source: apps/ui-web/composables/useAuth.ts] - Auth composable

---

## Dev Agent Record

### Agent Model Used

_To be filled by dev agent_

### Debug Log References

_To be filled during development_

### Completion Notes List

_To be filled upon completion_

### File List

_Files created/modified during development_
