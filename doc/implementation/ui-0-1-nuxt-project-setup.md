# Story UI-0-1: Nuxt 3 Project Setup & Configuration

**Status:** done
**Epic:** UI-0 - Frontend Foundation & Authentication  
**Story Points:** 3  
**Priority:** P0 (MVP Foundation)

---

## Story

As a **frontend developer**,  
I want **a fully configured Nuxt 3 project with TypeScript, NuxtUI, and development tooling**,  
So that **we have a solid foundation for building responsive UI components and pages**.

---

## Acceptance Criteria

### AC1: Nuxt 3 Project Initialization

**Given** the workspace monorepo structure is set up  
**When** the Nuxt project is initialized in `apps/ui-web`  
**Then** it should be a Nuxt 3.x project with:

- TypeScript enabled by default
- Auto-imports configured for components and composables
- Module auto-import working
- `.nuxt` directory properly generated on first build

**And** the project should have proper `tsconfig.json` and `nuxt.config.ts`

### AC2: NuxtUI Component Library Integration

**Given** the Nuxt project is initialized  
**When** NuxtUI is installed as a dependency  
**Then** it should be properly configured in `nuxt.config.ts`  
**And** all NuxtUI components should be auto-imported  
**And** Tailwind CSS should be configured via NuxtUI  
**And** the color scheme and UI components should be accessible in all pages

### AC3: Development Environment Setup

**Given** the project dependencies are installed  
**When** the development server starts with `pnpm dev`  
**Then** it should:

- Start on `http://localhost:3000` by default
- Support hot module replacement (HMR) for components and pages
- Watch for file changes and auto-reload
- Provide clear error messages in console
- Have no console warnings for missing dependencies

### AC4: TypeScript Configuration

**Given** TypeScript is enabled  
**When** developing components and pages  
**Then** all files should:

- Use `.vue` extension with `<script setup lang="ts">`
- Have proper type checking with strict mode enabled
- Support auto-completion in IDE
- Build without TypeScript errors

### AC5: Directory Structure & File Organization

**Given** the Nuxt project is initialized  
**When** exploring the project structure  
**Then** the following directories should exist with proper purpose:

- `composables/` - reusable composition functions
- `components/` - Vue components (auto-imported)
- `pages/` - route pages (auto-routed)
- `layouts/` - layout components
- `middleware/` - navigation middleware
- `public/` - static assets
- `app.vue` - root component

### AC6: Build & Production Setup

**Given** the development environment is working  
**When** running `pnpm build`  
**Then** it should:

- Generate optimized production build in `.output` directory
- Create minimal bundle size
- Bundle separately the components, utilities, and pages
- Support `pnpm preview` to run production build locally
- Have all assets properly minified and optimized

### AC7: Package.json Scripts

**Given** the project is initialized  
**When** looking at `apps/ui-web/package.json`  
**Then** it should have these scripts:

- `dev` - start development server
- `build` - create production build
- `preview` - run production build locally
- `generate` - generate static site (if needed)
- `lint` - run ESLint
- `format` - run Prettier

### AC8: Git Integration

**Given** the project has been set up  
**When** committing to Git  
**Then** the following should be ignored:

- `.nuxt/` directory
- `.output/` directory
- `dist/` directory
- `node_modules/`
- `.env.local` and similar files

---

## Technical Requirements

### Dependencies

- **Nuxt:** 3.x (latest stable)
- **Vue:** 3.x (included with Nuxt)
- **TypeScript:** 5.8.2+
- **NuxtUI:** Latest stable (includes Tailwind CSS)
- **Tailwind CSS:** 3.x (via NuxtUI)
- **pnpm:** 10.9.0+ (for workspace management)

### Configuration Files

#### `nuxt.config.ts`

```typescript
export default defineNuxtConfig({
  // Module configuration
  modules: ['@nuxt/ui'],

  // TypeScript strict mode
  typescript: {
    strict: true,
  },

  // Build settings
  nitro: {
    prerender: {
      crawlLinks: false,
    },
  },

  // App configuration
  app: {
    head: {
      title: 'ProspectFlow',
      meta: [
        { charset: 'utf-8' },
        { name: 'viewport', content: 'width=device-width, initial-scale=1' },
      ],
    },
  },
});
```

#### `tsconfig.json`

```json
{
  "extends": "../../tsconfig.json",
  "compilerOptions": {
    "strict": true,
    "moduleResolution": "bundler",
    "types": ["nuxt/globals", "vitest/globals"]
  },
  "include": [".nuxt/nuxt.d.ts", "**/*.ts", "**/*.tsx", "**/*.vue"]
}
```

#### `package.json` (apps/ui-web)

```json
{
  "name": "@prospectflow/ui-web",
  "version": "0.1.0",
  "scripts": {
    "dev": "nuxt dev",
    "build": "nuxt build",
    "preview": "nuxt preview",
    "generate": "nuxt generate",
    "lint": "eslint .",
    "format": "prettier --write ."
  },
  "dependencies": {
    "nuxt": "^3.x.x",
    "@nuxt/ui": "^latest"
  },
  "devDependencies": {
    "typescript": "^5.8.2",
    "tailwindcss": "^3.x.x"
  }
}
```

### Directory Structure

```
apps/ui-web/
├── app.vue                    # Root component
├── nuxt.config.ts             # Nuxt configuration
├── tsconfig.json              # TypeScript configuration
├── package.json               # Dependencies
├── .gitignore                 # Git ignore rules
├── .nuxtignore                # Nuxt ignore rules
├── public/                    # Static assets
│   └── favicon.ico
├── composables/               # Reusable logic
│   ├── useAuth.ts
│   ├── useApi.ts
│   └── README.md
├── components/                # Vue components (auto-imported)
│   ├── README.md
│   └── (component files)
├── pages/                     # Route pages (auto-routed)
│   ├── index.vue
│   ├── login.vue
│   ├── dashboard.vue
│   └── [id].vue
├── layouts/                   # Layout components
│   ├── default.vue
│   └── auth.vue
├── middleware/                # Navigation middleware
│   └── auth.ts
└── .env.example               # Environment variables template
```

### Development Tools Integration

- **VSCode Extensions:** Volar (Vue 3 support), ESLint, Prettier
- **ESLint:** Configured for Vue 3 + TypeScript
- **Prettier:** Configured for consistent formatting
- **IDE Support:** Auto-completion, type checking, Go to definition all working

---

## Implementation Checklist

- [ ] Create `apps/ui-web` directory
- [ ] Run `nuxi init` or equivalent Nuxt 3 setup
- [ ] Configure `nuxt.config.ts` with NuxtUI
- [ ] Set up TypeScript configuration
- [ ] Install and configure Tailwind CSS via NuxtUI
- [ ] Create directory structure (components, pages, composables, etc.)
- [ ] Configure development server for hot reload
- [ ] Test `pnpm dev` - project should start without errors
- [ ] Test `pnpm build` - should build successfully
- [ ] Configure ESLint and Prettier
- [ ] Add appropriate `.gitignore` rules
- [ ] Verify auto-imports are working for components and composables
- [ ] Test basic page routing

---

## Definition of Done

✅ The Nuxt 3 project is initialized and fully configured  
✅ Development server runs without errors with hot module replacement working  
✅ TypeScript is configured with strict mode and all files compile without errors  
✅ NuxtUI components can be imported and used in any component/page  
✅ `pnpm build` creates a successful production build  
✅ Directory structure follows Nuxt conventions  
✅ Package.json has all necessary scripts  
✅ Project can be committed to Git with proper `.gitignore`

---

## References & Resources

- [Nuxt 3 Documentation](https://nuxt.com/)
- [NuxtUI Documentation](https://ui.nuxt.com/)
- [Vue 3 TypeScript Support](https://vuejs.org/guide/typescript/overview.html)
- [Tailwind CSS with Nuxt](https://tailwindcss.com/docs/guides/nuxtjs)

---

## Deployment Notes

This story is part of Epic UI-0, which establishes the frontend foundation. Completion of this story is required before:

- UI-0-2: Authentication UI
- UI-0-3: App Layout & Navigation
- All subsequent UI stories in later epics
