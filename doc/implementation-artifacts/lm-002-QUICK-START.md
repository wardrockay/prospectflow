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

**User Journey:**
1. User submits email + consent on landing page
2. System creates subscriber (status='pending')
3. System generates secure token (SHA-256 hashed)
4. System sends confirmation email via AWS SES
5. User receives email with "Confirm and Download" link
6. *(LM-003 handles the click)*

---

## Files to Create

### 1. Token Utility
**File:** `apps/ui-web/server/utils/token.ts`

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

### 2. Email Utility
**File:** `apps/ui-web/server/utils/email.ts`

```typescript
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';

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

  await sesClient.send(new SendEmailCommand(params));
}
```

### 3. API Endpoint
**File:** `apps/ui-web/server/api/lead-magnet/submit.post.ts`

```typescript
import { generateToken } from '~/server/utils/token';
import { sendConfirmationEmail } from '~/server/utils/email';

export default defineEventHandler(async (event) => {
  const body = await readBody(event);
  const { email, consentGiven, source } = body;

  // Validation
  if (!email || !consentGiven) {
    throw createError({ statusCode: 400, message: 'Email et consentement requis' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const ip = getRequestIP(event);
  const userAgent = getRequestHeader(event, 'user-agent');

  // Get database connection (adjust to your setup)
  const db = useDatabase();  // or however you access DB

  try {
    // Check for existing subscriber
    const existingSubscriber = await db.query(
      'SELECT id, status FROM lm_subscribers WHERE LOWER(email) = $1',
      [normalizedEmail]
    );

    let subscriberId: string;

    if (existingSubscriber.rows.length > 0) {
      const subscriber = existingSubscriber.rows[0];
      subscriberId = subscriber.id;

      // If already confirmed, don't send again
      if (subscriber.status === 'confirmed') {
        return { success: true, message: 'Déjà confirmé' };
      }

      // Check if token still valid
      const validToken = await db.query(
        `SELECT id FROM lm_download_tokens 
         WHERE subscriber_id = $1 AND expires_at > NOW() AND purpose = 'confirm_and_download'
         LIMIT 1`,
        [subscriberId]
      );

      if (validToken.rows.length > 0) {
        return { success: true, message: 'Email déjà envoyé' };
      }
    } else {
      // Create new subscriber
      await db.query('BEGIN');
      
      const newSubscriber = await db.query(
        `INSERT INTO lm_subscribers (email, status, source, created_at)
         VALUES ($1, 'pending', $2, NOW())
         RETURNING id`,
        [normalizedEmail, source || 'lead_magnet_form']
      );
      subscriberId = newSubscriber.rows[0].id;

      // Log consent event
      await db.query(
        `INSERT INTO lm_consent_events 
         (subscriber_id, event_type, consent_text, privacy_policy_version, ip, user_agent, occurred_at)
         VALUES ($1, 'signup', $2, $3, $4, $5, NOW())`,
        [
          subscriberId,
          "J'accepte de recevoir des emails de Light & Shutter",
          '2026-02-01',
          ip,
          userAgent
        ]
      );
    }

    // Generate token
    const { token, hash } = generateToken();
    const expiresAt = new Date(Date.now() + 48 * 60 * 60 * 1000);

    // Store token
    await db.query(
      `INSERT INTO lm_download_tokens 
       (subscriber_id, token_hash, purpose, expires_at, max_uses, created_at)
       VALUES ($1, $2, 'confirm_and_download', $3, 999, NOW())`,
      [subscriberId, hash, expiresAt]
    );

    await db.query('COMMIT');

    // Send email
    await sendConfirmationEmail(normalizedEmail, token);

    return { success: true, message: 'Email envoyé' };

  } catch (error) {
    await db.query('ROLLBACK');
    console.error('Lead magnet submission error:', error);
    throw createError({ 
      statusCode: 500, 
      message: 'Une erreur est survenue. Veuillez réessayer.' 
    });
  }
});
```

### 4. Frontend Form
**File:** `apps/ui-web/components/forms/LeadMagnetForm.vue`

```vue
<template>
  <form @submit.prevent="handleSubmit" class="lead-magnet-form">
    <h3>Téléchargez le Guide Gratuit</h3>
    
    <div class="form-group">
      <label for="email">Votre email</label>
      <input
        id="email"
        v-model="formData.email"
        type="email"
        required
        placeholder="vous@example.com"
        :disabled="isSubmitting || isSuccess"
      />
      <span v-if="errors.email" class="error">{{ errors.email }}</span>
    </div>

    <div class="form-group checkbox">
      <label>
        <input
          v-model="formData.consentGiven"
          type="checkbox"
          required
          :disabled="isSubmitting || isSuccess"
        />
        J'accepte de recevoir des emails de Light & Shutter
      </label>
      <span v-if="errors.consent" class="error">{{ errors.consent }}</span>
    </div>

    <p class="privacy-note">
      <a href="/politique-de-confidentialite">Politique de confidentialité</a>
    </p>

    <button type="submit" :disabled="isSubmitting || isSuccess" class="submit-button">
      {{ buttonText }}
    </button>

    <div v-if="isSuccess" class="success-message">
      ✅ Vérifiez votre email ! Un lien de confirmation vous a été envoyé.
    </div>

    <div v-if="errorMessage" class="error-message">
      {{ errorMessage }}
    </div>
  </form>
</template>

<script setup lang="ts">
const formData = ref({
  email: '',
  consentGiven: false
});

const isSubmitting = ref(false);
const isSuccess = ref(false);
const errorMessage = ref('');
const errors = ref({ email: '', consent: '' });

const buttonText = computed(() => {
  if (isSuccess.value) return '✓ Email envoyé';
  if (isSubmitting.value) return 'Envoi en cours...';
  return 'Télécharger le Guide Gratuit';
});

async function handleSubmit() {
  errors.value = { email: '', consent: '' };
  errorMessage.value = '';

  if (!formData.value.email) {
    errors.value.email = 'Email requis';
    return;
  }
  if (!formData.value.consentGiven) {
    errors.value.consent = 'Veuillez accepter de recevoir nos emails';
    return;
  }

  isSubmitting.value = true;

  try {
    const response = await $fetch('/api/lead-magnet/submit', {
      method: 'POST',
      body: {
        email: formData.value.email,
        consentGiven: formData.value.consentGiven,
        source: 'landing_page'
      }
    });

    if (response.success) {
      isSuccess.value = true;
    }
  } catch (error: any) {
    errorMessage.value = error.data?.message || 'Une erreur est survenue. Veuillez réessayer.';
  } finally {
    isSubmitting.value = false;
  }
}
</script>

<style scoped>
.lead-magnet-form {
  background: white;
  padding: 30px;
  border-radius: 8px;
  max-width: 500px;
  margin: 0 auto;
}

h3 {
  color: #213E60;
  font-family: 'Cormorant Garamond', serif;
  margin-bottom: 20px;
}

.form-group {
  margin-bottom: 20px;
}

label {
  display: block;
  margin-bottom: 8px;
  color: #213E60;
  font-weight: 500;
}

input[type="email"] {
  width: 100%;
  padding: 12px;
  border: 2px solid #E0E0E0;
  border-radius: 5px;
}

.checkbox label {
  display: flex;
  align-items: center;
  gap: 10px;
}

.submit-button {
  width: 100%;
  background: #FFCC2B;
  color: #213E60;
  padding: 15px;
  border: none;
  border-radius: 5px;
  font-weight: bold;
  cursor: pointer;
}

.submit-button:disabled {
  opacity: 0.6;
  cursor: not-allowed;
}

.success-message {
  margin-top: 20px;
  padding: 15px;
  background: #E8F5E9;
  border-left: 4px solid #4CAF50;
  color: #2E7D32;
}

.error-message {
  margin-top: 20px;
  padding: 15px;
  background: #FFEBEE;
  border-left: 4px solid #F44336;
  color: #C62828;
}

.error {
  color: #F44336;
  font-size: 14px;
  margin-top: 5px;
  display: block;
}
</style>
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

### Quick Smoke Test
1. [ ] Submit form with valid email + consent
2. [ ] Check database: subscriber created with status='pending'
3. [ ] Check email: confirmation email received
4. [ ] Click confirmation link (will fail - LM-003 not done yet)

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
