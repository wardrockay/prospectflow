# ProspectFlow UI Web

Frontend application for ProspectFlow built with Nuxt 3 and NuxtUI.

## Tech Stack

- **Framework**: Nuxt 3
- **UI Library**: NuxtUI (Tailwind CSS components)
- **Language**: TypeScript (strict mode)
- **Authentication**: AWS Cognito
- **HTTP Client**: ofetch

## Getting Started

### Prerequisites

- Node.js 20.x
- pnpm 10.x

### Installation

```bash
# Install dependencies
pnpm install

# Copy environment variables
cp .env.example .env

# Update .env with your Cognito credentials
```

### Development

```bash
# Start dev server (http://localhost:4000)
pnpm dev

# Type checking
pnpm typecheck
```

### Build

```bash
# Build for production
pnpm build

# Preview production build
pnpm preview
```

## Docker Deployment

### Build and run with Docker Compose

```bash
# Create .env file from template
cp .env.docker .env
# Edit .env with your Cognito credentials

# Build and start container
docker-compose up -d

# View logs
docker-compose logs -f

# Stop container
docker-compose down
```

### Build Docker image manually

```bash
# Build from project root
docker build -f apps/ui-web/Dockerfile -t prospectflow-ui-web .

# Run container
docker run -p 4000:4000 \
  -e API_BASE_URL=http://localhost:3001 \
  -e COGNITO_HOSTED_UI=https://prospectflow-dev.auth.eu-west-1.amazoncognito.com \
  -e COGNITO_CLIENT_ID=your_client_id \
  -e COGNITO_REDIRECT_URI=http://localhost:4000/auth/callback \
  prospectflow-ui-web
```

**Note**: The Dockerfile uses multi-stage builds for optimized production images.

## Project Structure

```
apps/ui-web/
├── pages/              # File-based routing
│   ├── index.vue       # Dashboard (/)
│   ├── login.vue       # Login page (/login)
│   └── auth/
│       └── callback.vue # OAuth callback
├── layouts/            # Layout templates
│   ├── default.vue     # Main app layout
│   └── empty.vue       # Empty layout (login, etc.)
├── components/         # Vue components (auto-imported)
├── composables/        # Composables (auto-imported)
│   └── useAuth.ts      # Authentication logic
├── middleware/         # Route middleware
│   └── auth.ts         # Auth guard
├── nuxt.config.ts      # Nuxt configuration
└── app.vue             # Root component
```

## Authentication Flow

1. User visits protected route → redirected to `/login`
2. Click "Se connecter" → redirect to Cognito Hosted UI
3. User authenticates on Cognito
4. Cognito redirects to `/auth/callback?code=...`
5. Callback page exchanges code for tokens via backend API
6. Tokens stored in secure cookies
7. User redirected to dashboard

## Environment Variables

Required in `.env`:

```bash
API_BASE_URL=http://localhost:3001
COGNITO_HOSTED_UI=https://prospectflow-dev.auth.eu-west-1.amazoncognito.com
COGNITO_CLIENT_ID=your_client_id
COGNITO_REDIRECT_URI=http://localhost:4000/auth/callback
```

For Docker deployment, use `.env.docker` as template.

## Available Routes

- `/` - Dashboard (protected)
- `/login` - Login page (public)
- `/auth/callback` - OAuth callback (public)
- `/campaigns/*` - Campaign management (protected) - Coming soon
- `/prospects/*` - Prospect management (protected) - Coming soon

## Development Guidelines

- Use TypeScript strict mode
- All components/composables are auto-imported
- Use NuxtUI components for consistency
- Follow Vue 3 Composition API with `<script setup>`
- Protected routes must use `definePageMeta({ middleware: 'auth' })`

## Testing

```bash
# Run tests (to be configured)
pnpm test

# Run E2E tests (to be configured)
pnpm test:e2e
```

## Production Considerations

- Application runs on port **4000**
- Uses Node.js 20 Alpine for minimal image size
- Multi-stage Docker build for optimization
- Connects to `prospectflow` Docker network
- Environment variables configurable via `.env` file

## Links

- [Nuxt Documentation](https://nuxt.com/docs)
- [NuxtUI Documentation](https://ui.nuxt.com)
- [Backend API](../ingest-api/README.md)
