import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { createChildLogger } from '../utils/logger.js';
import { env } from '../config/env.js';
import { createHmac } from 'crypto';

const logger = createChildLogger('EmailService');

// Initialize SES client
const getSESClient = (): SESClient | null => {
  const { awsRegion, awsAccessKeyId, awsSecretAccessKey } = env.leadMagnet;

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    logger.warn('AWS credentials not configured - email sending disabled');
    return null;
  }

  return new SESClient({
    region: awsRegion || 'eu-west-3',
    credentials: {
      accessKeyId: awsAccessKeyId,
      secretAccessKey: awsSecretAccessKey,
    },
  });
};

const sesClient = getSESClient();

/**
 * Generate unsubscribe token from subscriber ID
 * Format: {subscriberId}.{signature}
 */
function generateUnsubscribeToken(subscriberId: string): string {
  // Use AWS secret or fallback - this is secure enough for unsubscribe tokens
  const secret = env.leadMagnet.awsSecretAccessKey || process.env.POSTGRES_PASSWORD || 'fallback-unsubscribe-secret';
  const signature = createHmac('sha256', secret)
    .update(subscriberId)
    .digest('base64url');
  
  return `${subscriberId}.${signature}`;
}

/**
 * Get HTML email template for confirmation email
 */
function getHtmlTemplate(confirmationUrl: string, unsubscribeUrl: string): string {
  return `
<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Confirmez votre inscription</title>
  <style>
    body {
      font-family: 'Montserrat', 'Helvetica Neue', Arial, sans-serif;
      background-color: #f4f4f4;
      margin: 0;
      padding: 0;
    }
    .container {
      max-width: 600px;
      margin: 40px auto;
      background-color: #ffffff;
      border-radius: 8px;
      overflow: hidden;
      box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
    }
    .header {
      background-color: #2C5364;
      color: #ffffff;
      text-align: center;
      padding: 30px 20px;
    }
    .header h1 {
      margin: 0;
      font-size: 24px;
      font-weight: 600;
    }
    .content {
      padding: 40px 30px;
      color: #333333;
    }
    .content p {
      font-size: 16px;
      line-height: 1.6;
      margin: 0 0 20px;
    }
    .cta-button {
      display: inline-block;
      background-color: #D4AF37;
      color: #ffffff !important;
      text-decoration: none;
      padding: 15px 40px;
      border-radius: 6px;
      font-size: 18px;
      font-weight: 600;
      margin: 20px 0;
      text-align: center;
    }
    .cta-button:hover {
      background-color: #c49d2f;
    }
    .fallback-link {
      font-size: 14px;
      color: #666666;
      margin-top: 20px;
      word-break: break-all;
    }
    .footer {
      background-color: #f9f9f9;
      padding: 20px 30px;
      text-align: center;
      font-size: 12px;
      color: #999999;
      border-top: 1px solid #eeeeee;
    }
    .footer a {
      color: #2C5364;
      text-decoration: none;
    }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>✨ Light & Shutter Photography</h1>
    </div>
    
    <div class="content">
      <p><strong>Bonjour,</strong></p>
      
      <p>Merci de votre intérêt pour le <strong>Guide de la Mariée Sereine</strong> !</p>
      
      <p>Cliquez sur le bouton ci-dessous pour télécharger votre guide gratuit :</p>
      
      <div style="text-align: center;">
        <a href="${confirmationUrl}" class="cta-button">📥 Télécharger le Guide</a>
      </div>
      
      <p class="fallback-link">
        Si le bouton ne fonctionne pas, copiez ce lien dans votre navigateur :<br>
        <a href="${confirmationUrl}">${confirmationUrl}</a>
      </p>
      
      <p style="font-size: 14px; color: #666;">
        <em>Ce lien expire dans 48 heures.</em>
      </p>
      
      <p style="margin-top: 30px; font-size: 14px; color: #999;">
        Si vous n'avez pas demandé ce guide, vous pouvez ignorer cet email.
      </p>
    </div>
    
    <div class="footer">
      <p>
        <strong>Light & Shutter Photography</strong><br>
        123 Rue de la Photographie, 75001 Paris, France<br>
        <a href="https://lightandshutter.fr/politique-confidentialite">Politique de confidentialité</a>
      </p>
      <p style="margin-top: 10px;">
        <a href="${unsubscribeUrl}" style="color: #999; text-decoration: underline;">Se désinscrire de tous les emails</a>
      </p>
    </div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Get plain text email template
 */
function getTextTemplate(confirmationUrl: string, unsubscribeUrl: string): string {
  return `
Bonjour,

Merci de votre intérêt pour le Guide de la Mariée Sereine!

Cliquez sur le lien ci-dessous pour télécharger votre guide gratuit:

${confirmationUrl}

Ce lien expire dans 48 heures.

Si vous n'avez pas demandé ce guide, vous pouvez ignorer cet email.

---
Light & Shutter Photography
123 Rue de la Photographie, 75001 Paris, France
Politique de confidentialité: https://lightandshutter.fr/privacy
Pour vous désinscrire: ${unsubscribeUrl}
  `.trim();
}

/**
 * Send confirmation email via AWS SES
 * @param email Recipient email address
 * @param token Plain token for confirmation URL
 * @param subscriberId Subscriber ID for generating unsubscribe token
 */
export async function sendConfirmationEmail(email: string, token: string, subscriberId: string): Promise<void> {
  if (!sesClient) {
    logger.error('SES client not initialized - cannot send email');
    throw new Error('Email service not configured');
  }

  const { sesFromEmail, baseUrl } = env.leadMagnet;

  if (!sesFromEmail || !baseUrl) {
    logger.error('SES_FROM_EMAIL or BASE_URL not configured');
    throw new Error('Email configuration incomplete');
  }

  // AC2.9: Confirmation link format with query param
  const confirmationUrl = `${baseUrl}/lead-magnet/confirm?token=${token}`;
  
  // Generate unsubscribe URL
  const unsubscribeToken = generateUnsubscribeToken(subscriberId);
  const unsubscribeUrl = `${baseUrl}/api/lead-magnet/unsubscribe?token=${unsubscribeToken}`;

  const command = new SendEmailCommand({
    Source: sesFromEmail,
    Destination: {
      ToAddresses: [email],
    },
    Message: {
      Subject: {
        Data: 'Confirmez votre inscription - Guide de la Mariée Sereine',
        Charset: 'UTF-8',
      },
      Body: {
        Html: {
          Data: getHtmlTemplate(confirmationUrl, unsubscribeUrl),
          Charset: 'UTF-8',
        },
        Text: {
          Data: getTextTemplate(confirmationUrl, unsubscribeUrl),
          Charset: 'UTF-8',
        },
      },
    },
  });

  logger.info({ email: email.substring(0, 3) + '***' }, 'Sending confirmation email');

  try {
    const response = await sesClient.send(command);
    logger.info(
      { email: email.substring(0, 3) + '***', messageId: response.MessageId },
      'Confirmation email sent successfully',
    );
  } catch (error) {
    logger.error({ err: error, email: email.substring(0, 3) + '***' }, 'Failed to send email via SES');
    throw new Error('Failed to send confirmation email');
  }
}
