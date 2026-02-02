# LM-002: Email Capture & Double Opt-in - QUICK START GUIDE

**⚡ Fast reference for implementing LM-002**

---

## Prerequisites

✅ **LM-001 MUST be complete:**
- [ ] Database tables: `lm_subscribers`, `lm_consent_events`, `lm_download_tokens`
- [ ] AWS SES configured and out of sandbox
- [ ] IAM credentials in environment variables
- [ ] S3 bucket created (used in LM-003)

---

## What You're Building

**Backend API in Express.js (ingest-api service):**
1. Endpoint: `POST /api/lead-magnet/signup`
2. Landing page (separate repo) calls this API
3. System creates subscriber (status='pending')
4. System generates secure token (SHA-256 hashed)
5. System sends confirmation email via AWS SES
6. User receives email with "Confirm and Download" link
7. *(LM-003 handles the click)*

**Architecture:**
- **API Backend:** `apps/ingest-api/` (Express.js layered architecture)
- **Frontend UI:** `apps/ui-web/` (statistics + subscriber list - future story LM-004)
- **Landing Page:** Separate Nuxt repo (not part of ProspectFlow)

---

## Files to Create

### 1. Token Utility
**File:** `apps/ingest-api/src/utils/token.utils.ts`

```typescript
import crypto from 'crypto';

export function generateToken(): { token: string; hash: string } {
  const token = crypto.randomBytes(32).toString('base64url');
  const hash = crypto.createHash('sha256').update(token).digest('hex');
  return { token, hash };
}

export function hashToken(token: string): string {
  return crypto.createHash('sha256').update(token).digest('hex');
}
```

### 2. Email Service
**File:** `apps/ingest-api/src/services/email.service.ts`

```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('EmailService');

const sesClient = new SESClient({ 
  region: process.env.AWS_REGION || 'eu-west-3',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!
  }
});

export async function sendConfirmationEmail(
  toEmail: string,
  token: string
): Promise<void> {
  const confirmUrl = `${process.env.BASE_URL}/api/lead-magnet/confirm/${token}`;
  
  const htmlBody = `
    <!DOCTYPE html>
    <html>
    <body style="font-family: Lato, sans-serif; color: #213E60; background: #F4F2EF; padding: 20px;">
      <div style="max-width: 600px; margin: 0 auto; background: white; padding: 40px; border-radius: 8px;">
        <h1 style="color: #213E60; font-family: 'Cormorant Garamond', serif;">
          Confirmez votre téléchargement
        </h1>
        <p>Merci de votre intérêt pour le <strong>Guide de la Mariée Sereine</strong> !</p>
        <p>Cliquez pour confirmer votre adresse email et accéder immédiatement à votre guide :</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${confirmUrl}" 
             style="background: #FFCC2B; color: #213E60; padding: 15px 30px; 
                    text-decoration: none; border-radius: 5px; font-weight: bold; display: inline-block;">
            Confirmer et Télécharger
          </a>
        </div>
        <p style="color: #666; font-size: 14px;">
          Ce lien est valide pendant <strong>48 heures</strong>.
        </p>
      </div>
    </body>
    </html>
  `;

  const textBody = `Confirmez votre téléchargement\n\nCliquez: ${confirmUrl}\n\nValide 48h.`;

  const params = {
    Source: process.env.SES_FROM_EMAIL!,
    Destination: { ToAddresses: [toEmail] },
    Message: {
      Subject: { Data: 'Confirmez votre téléchargement - Guide Mariée Sereine', Charset: 'UTF-8' },
      Body: {
        Html: { Data: htmlBody, Charset: 'UTF-8' },
        Text: { Data: textBody, Charset: 'UTF-8' }
      }
    }
  };

  logger.info({ email: toEmail.substring(0, 3) + '***' }, 'Sending confirmation email');
  await sesClient.send(new SendEmailCommand(params));
  logger.info('Email sent successfully');
}
```

### 3. Repository Layer
**File:** `apps/ingest-api/src/repositories/lead-magnet.repository.ts`

```typescript
import { Pool, PoolClient } from 'pg';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('LeadMagnetRepository');

export class LeadMagnetRepository {
  constructor(private pool: Pool) {}

  async createSubscriberWithToken(
    email: string,
    tokenHash: string,
    consentText: string,
    ipAddress: string,
    userAgent: string,
    source: string = 'landing_page'
  ): Promise<string> {
    const client: PoolClient = await this.pool.connect();
    
    try {
      await client.query('BEGIN');
      
      const subscriberResult = await client.query(
        `INSERT INTO lm_subscribers (email, status, source, created_at)
         VALUES ($1, 'pending', $2, NOW())
         RETURNING id`,
        [email.toLowerCase().trim(), source]
      );
      const subscriberId = subscriberResult.rows[0].id;
      
      await client.query(
        `INSERT INTO lm_consent_events (subscriber_id, event_type, consent_text, privacy_policy_version, ip, user_agent, occurred_at)
         VALUES ($1, 'signup', $2, '2026-02-01', $3, $4, NOW())`,
        [subscriberId, consentText, ipAddress, userAgent]
      );
      
      await client.query(
        `INSERT INTO lm_download_tokens (subscriber_id, token_hash, purpose, expires_at, max_uses, created_at)
         VALUES ($1, $2, 'confirm_and_download', NOW() + INTERVAL '48 hours', 999, NOW())`,
        [subscriberId, tokenHash]
      );
      
      await client.query('COMMIT');
      logger.info({ subscriberId }, 'Subscriber created');
      
      return subscriberId;
    } catch (error) {
      await client.query('ROLLBACK');
      logger.error({ err: error }, 'Transaction failed');
      throw error;
    } finally {
      client.release();
    }
  }
  
  async findSubscriberByEmail(email: string) {
    const result = await this.pool.query(
      'SELECT id, status FROM lm_subscribers WHERE LOWER(email) = LOWER($1)',
      [email]
    );
    return result.rows[0] || null;
  }
  
  async checkUnexpiredToken(subscriberId: string): Promise<boolean> {
    const result = await this.pool.query(
      `SELECT id FROM lm_download_tokens 
       WHERE subscriber_id = $1 AND expires_at > NOW() AND purpose = 'confirm_and_download'
       LIMIT 1`,
      [subscriberId]
    );
    return result.rows.length > 0;
  }
}
```

### 4. Service Layer
**File:** `apps/ingest-api/src/services/lead-magnet.service.ts`

```typescript
import { LeadMagnetRepository } from '../repositories/lead-magnet.repository.js';
import { sendConfirmationEmail } from './email.service.js';
import { generateToken } from '../utils/token.utils.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('LeadMagnetService');

export class LeadMagnetService {
  constructor(private repository: LeadMagnetRepository) {}

  async handleSignup(
    email: string,
    consentGiven: boolean,
    ipAddress: string,
    userAgent: string,
    source: string = 'landing_page'
  ): Promise<{ success: boolean; message: string }> {
    if (!consentGiven) {
      throw new Error('CONSENT_REQUIRED');
    }

    const normalizedEmail = email.toLowerCase().trim();
    const existingSubscriber = await this.repository.findSubscriberByEmail(normalizedEmail);

    if (existingSubscriber) {
      const { id: subscriberId, status } = existingSubscriber;

      if (status === 'confirmed') {
        throw new Error('ALREADY_SUBSCRIBED');
      }

      if (status === 'unsubscribed') {
        throw new Error('UNSUBSCRIBED');
      }

      if (status === 'pending') {
        const hasUnexpiredToken = await this.repository.checkUnexpiredToken(subscriberId);
        if (hasUnexpiredToken) {
          logger.info({ subscriberId }, 'Token still valid, not resending');
          return { success: true, message: 'Email déjà envoyé' };
        }
      }
    }

    const { token, hash } = generateToken();
    const consentText = "J'accepte de recevoir des emails de Light & Shutter";

    const subscriberId = await this.repository.createSubscriberWithToken(
      normalizedEmail,
      hash,
      consentText,
      ipAddress,
      userAgent,
      source
    );

    await sendConfirmationEmail(normalizedEmail, token);
    logger.info({ subscriberId }, 'Signup completed');

    return { success: true, message: 'Email envoyé' };
  }
}
```

### 5. Controller
**File:** `apps/ingest-api/src/controllers/lead-magnet.controller.ts`

```typescript
import { Request, Response, NextFunction } from 'express';
import { z } from 'zod';
import { LeadMagnetService } from '../services/lead-magnet.service.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('LeadMagnetController');

const signupSchema = z.object({
  email: z.string().email('Email invalide'),
  consentGiven: z.boolean(),
  source: z.string().optional(),
});

export class LeadMagnetController {
  constructor(private service: LeadMagnetService) {}

  async signup(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validatedData = signupSchema.parse(req.body);
      const ipAddress = req.ip || req.socket.remoteAddress || '';
      const userAgent = req.headers['user-agent'] || '';

      const result = await this.service.handleSignup(
        validatedData.email,
        validatedData.consentGiven,
        ipAddress,
        userAgent,
        validatedData.source
      );

      res.status(200).json(result);
    } catch (error: any) {
      if (error.message === 'CONSENT_REQUIRED') {
        res.status(400).json({ success: false, message: 'Vous devez accepter de recevoir des emails' });
        return;
      }
      if (error.message === 'ALREADY_SUBSCRIBED') {
        res.status(400).json({ success: false, message: 'Vous êtes déjà inscrit(e)' });
        return;
      }
      if (error.message === 'UNSUBSCRIBED') {
        res.status(400).json({ success: false, message: 'Adresse désinscrite' });
        return;
      }
      if (error instanceof z.ZodError) {
        res.status(400).json({ success: false, message: error.errors[0].message });
        return;
      }
      next(error);
    }
  }
}
```

### 6. Routes
**File:** `apps/ingest-api/src/routes/lead-magnet.routes.ts`

```typescript
import { Router } from 'express';
import { LeadMagnetController } from '../controllers/lead-magnet.controller.js';
import { LeadMagnetService } from '../services/lead-magnet.service.js';
import { LeadMagnetRepository } from '../repositories/lead-magnet.repository.js';
import { pool } from '../config/database.js';

const router = Router();

const repository = new LeadMagnetRepository(pool);
const service = new LeadMagnetService(repository);
const controller = new LeadMagnetController(service);

router.post('/signup', (req, res, next) => controller.signup(req, res, next));

export default router;
```

**Register in app.ts:**

```typescript
// File: apps/ingest-api/src/app.ts
import leadMagnetRoutes from './routes/lead-magnet.routes.js';

app.use('/api/lead-magnet', leadMagnetRoutes);
```

---

## Environment Variables

Add to `apps/ui-web/.env`:
```bash
AWS_REGION=eu-west-3
AWS_ACCESS_KEY_ID=AKIA...
AWS_SECRET_ACCESS_KEY=***
SES_FROM_EMAIL=etienne.maillot@lightandshutter.fr
BASE_URL=https://lightandshutter.fr
DATABASE_URL=postgresql://...
```

---

## Testing Checklist

### Quick API Test
1. [ ] Start ingest-api service: `pnpm --filter ingest-api dev`
2. [ ] Test endpoint with curl:
     ```bash
     curl -X POST http://localhost:3001/api/lead-magnet/signup \
       -H "Content-Type: application/json" \
       -d '{"email":"test@example.com","consentGiven":true,"source":"test"}'
     ```
3. [ ] Check database: subscriber created with status='pending'
4. [ ] Check email: confirmation email received
5. [ ] Click confirmation link (will fail - LM-003 not done yet)

### Database Verification
```sql
-- Check subscriber created
SELECT * FROM lm_subscribers WHERE email = 'test@example.com';

-- Check consent event logged
SELECT * FROM lm_consent_events WHERE subscriber_id = (
  SELECT id FROM lm_subscribers WHERE email = 'test@example.com'
);

-- Check token created
SELECT token_hash, expires_at FROM lm_download_tokens WHERE subscriber_id = (
  SELECT id FROM lm_subscribers WHERE email = 'test@example.com'
);
```

---

## Common Issues

### "Email not received"
- Check SES is out of sandbox mode
- Verify FROM email: `etienne.maillot@lightandshutter.fr`
- Check AWS credentials in environment
- Look for errors in console logs

### "Database error"
- Verify LM-001 migration ran successfully
- Check all 3 tables exist: `\dt lm_*` in psql
- Verify DATABASE_URL is correct

### "Token generation error"
- Import crypto: `import crypto from 'crypto';`
- Don't use crypto-js (different library)
- Use Node.js built-in crypto module
ingest-api/env
---

## Next Story

After LM-002 complete → **LM-003: Download Delivery & Token Management**
- Implement confirmation endpoint
- Validate token
- Generate S3 signed URL
- Deliver PDF

---

**Need More Details?**
See: [lm-002-email-capture-double-optin-COMPLETE-ANALYSIS.md](./lm-002-email-capture-double-optin-COMPLETE-ANALYSIS.md)
