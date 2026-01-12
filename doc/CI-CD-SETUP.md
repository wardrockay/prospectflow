# CI/CD Pipeline Configuration Guide

This guide explains how to configure GitHub Actions workflows for ProspectFlow.

## GitHub Repository Settings

### 1. Enable GitHub Actions

1. Go to repository **Settings** → **Actions** → **General**
2. Ensure "Allow all actions and reusable workflows" is selected
3. Set workflow permissions to "Read and write permissions"

### 2. Configure GitHub Environments

#### Production Environment

1. Go to **Settings** → **Environments** → **New environment**
2. Name: `production`
3. Environment URL: `https://app.lightandshutter.fr`
4. Protection rules:
   - ✅ Required reviewers: Add at least 1 reviewer
   - ✅ Wait timer: 0 minutes (or set delay if desired)
5. Click **Save protection rules**

### 3. Configure GitHub Secrets

Go to **Settings** → **Secrets and variables** → **Actions** → **New repository secret**

Add the following secrets:

#### Production Deployment Secrets

| Secret Name    | Description                    | Example Value                   |
| -------------- | ------------------------------ | ------------------------------- |
| `PROD_HOST`    | Production server hostname/IP  | `vps.lightandshutter.fr`        |
| `PROD_USER`    | SSH username for deployment    | `deploy`                        |
| `PROD_SSH_KEY` | SSH private key for deployment | Contents of `~/.ssh/id_ed25519` |

**To generate SSH key for GitHub Actions:**

```bash
# On your local machine
ssh-keygen -t ed25519 -C "github-actions-deploy" -f ~/.ssh/github_actions_ed25519

# Copy public key to production server
ssh-copy-id -i ~/.ssh/github_actions_ed25519.pub deploy@vps.lightandshutter.fr

# Copy private key to GitHub Secrets
cat ~/.ssh/github_actions_ed25519
# → Copy this entire content to PROD_SSH_KEY secret in GitHub
```

### 4. Configure Branch Protection Rules

1. Go to **Settings** → **Branches** → **Add branch protection rule**
2. Branch name pattern: `main`
3. Protection settings:
   - ✅ Require a pull request before merging
     - Required approvals: 1
     - ✅ Dismiss stale pull request approvals when new commits are pushed
   - ✅ Require status checks to pass before merging
     - ✅ Require branches to be up to date before merging
     - Status checks:
       - `Lint`
       - `Test Ingest API`
       - `Build Docker Images`
   - ✅ Require conversation resolution before merging
   - ⚠️ Do not require signed commits (optional, enable if you use GPG)
   - ⚠️ Include administrators (recommended during initial setup)
4. Click **Create**

## Using the CI/CD Pipeline

### Continuous Integration (CI)

**Trigger:** Automatic on every push or pull request to `main` or `develop` branches

**What it does:**

1. **Lint**: Runs ESLint on ingest-api and ui-web
2. **Test Ingest API**:
   - Unit tests
   - Integration tests (with PostgreSQL and Redis)
   - Coverage tests with 70% threshold enforcement
3. **Test UI Web**: Build validation
4. **Build**: Docker image builds for both services (validation only, not pushed)

**Coverage Requirements:**

- Minimum 70% line coverage for ingest-api
- Pipeline fails if coverage drops below threshold
- Coverage report generated at `apps/ingest-api/coverage/coverage-summary.json`

**Duration:** ~5-8 minutes

**Viewing results:**

- Go to **Actions** tab in GitHub
- Click on the latest workflow run
- Review each job (Lint, Test Ingest API, Test UI Web, Build)
- Check coverage details in "Check coverage threshold" step

### Continuous Deployment (CD) - Production

**Trigger:** Manual via GitHub Actions UI

**Steps to deploy:**

1. Go to **Actions** → **Deploy to Production**
2. Click **Run workflow**
3. Enter version/commit SHA to deploy (e.g., `abc1234` or `v1.0.0`)
4. Click **Run workflow**
5. Workflow will wait for manual approval (configured reviewer will receive notification)
6. Reviewer approves deployment
7. Workflow completes:
   - Builds Docker images
   - Pushes to GitHub Container Registry
   - Deploys to production server via SSH
   - Runs smoke tests
   - Creates GitHub release

**Duration:** ~10-15 minutes (including approval wait time)

## Rollback Process

If a deployment fails or introduces issues:

1. **Identify last working version:**

   ```bash
   git log --oneline -n 10
   ```

2. **Trigger rollback deployment:**

   - Go to **Actions** → **Deploy to Production**
   - Click **Run workflow**
   - Enter previous working commit SHA
   - Approve deployment

3. **Verify rollback:**
   ```bash
   curl https://app.lightandshutter.fr/api/health
   ```

## Troubleshooting

### CI Pipeline Failures

**Lint fails:**

- Run `pnpm lint:fix` locally to auto-fix issues
- Commit and push changes

**Tests fail:**

- Run tests locally: `pnpm --filter prospectflow-ingest-api test`
- Fix failing tests
- Ensure test database is properly configured

**Build fails:**

- Check Dockerfile syntax
- Verify all dependencies are in package.json
- Test Docker build locally:
  ```bash
  docker build -t test-image ./apps/ingest-api
  ```

### CD Pipeline Failures

**SSH connection fails:**

- Verify `PROD_HOST` and `PROD_USER` secrets are correct
- Ensure `PROD_SSH_KEY` contains complete private key (including `-----BEGIN` and `-----END` lines)
- Test SSH connection manually:
  ```bash
  ssh -i ~/.ssh/github_actions_ed25519 deploy@vps.lightandshutter.fr
  ```

**Smoke tests fail:**

- Services may need more time to start (increase sleep time in workflow)
- Check service health on server:
  ```bash
  ssh deploy@vps.lightandshutter.fr
  docker ps
  docker logs prospectflow-ingest-api
  ```

**Image pull fails:**

- Ensure GitHub Container Registry permissions are correct
- Check image was pushed successfully
- Verify server can access ghcr.io

## Monitoring Deployments

### GitHub Actions Dashboard

View all workflow runs: **Actions** tab

### Production Server Monitoring

SSH into production server:

```bash
ssh deploy@vps.lightandshutter.fr
cd /opt/prospectflow

# View running containers
docker ps

# View logs
docker logs prospectflow-ingest-api --tail 100 -f
docker logs prospectflow-ui-web --tail 100 -f

# Check health endpoints
curl http://localhost:3000/health
curl http://localhost:4000
```

### Grafana Dashboards

Access monitoring: `http://vps.lightandshutter.fr:3001`

- Default credentials: `admin/admin`
- Dashboards show metrics from all services

## Best Practices

1. **Always run CI before merging PRs** - Never bypass status checks
2. **Test locally first** - Run `pnpm test` and `pnpm lint` before pushing
3. **Use meaningful commit messages** - Helps identify versions for rollback
4. **Deploy during low-traffic periods** - Minimize user impact
5. **Monitor after deployment** - Watch logs and metrics for 10-15 minutes
6. **Keep rollback plan ready** - Know the last stable commit SHA
7. **Use semantic versioning** - Tag releases as `v1.0.0`, `v1.1.0`, etc.

## Security Notes

- ✅ SSH keys are stored as GitHub Secrets (encrypted at rest)
- ✅ Docker images are pushed to GitHub Container Registry (private by default)
- ✅ Production environment requires manual approval
- ⚠️ Never commit secrets or API keys to git
- ⚠️ Rotate SSH keys periodically (every 6-12 months)
- ⚠️ Limit GitHub token permissions to minimum required

## Next Steps

After configuration:

1. Test CI pipeline:

   ```bash
   git checkout -b test-ci
   # Make a small change
   git commit -am "test: CI pipeline"
   git push origin test-ci
   # Create PR and verify CI runs
   ```

2. Test CD pipeline:

   - Merge PR to `main`
   - Manually trigger **Deploy to Production**
   - Monitor deployment progress
   - Verify smoke tests pass

3. Set up monitoring alerts:
   - Configure Grafana alerts for critical metrics
   - Set up Sentry notifications for errors
   - Monitor resource usage (CPU, memory, disk)
