import { readFileSync } from 'fs';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { SESClient, SendEmailCommand } from '@aws-sdk/client-ses';
import { createChildLogger } from '../utils/logger.js';
import { env } from '../config/env.js';

const logger = createChildLogger('OnboardingEmailService');

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const TEMPLATE_DIR = join(__dirname, '../data/onboarding');

const EMAIL_SUBJECTS: Record<number, string> = {
  1: "C'est officiel — votre mariage est dans mon agenda",
  3: 'Votre planning Light & Shutter — de la séance engagement à la livraison',
  4: 'Comment on travaille ensemble — communication et retours',
};

const TEMPLATE_FILES: Record<number, string> = {
  1: 'email-1-bienvenue.html',
  2: 'email-2-perimetre.html',
  3: 'email-3-planning.html',
  4: 'email-4-communication.html',
};

export interface OnboardingEmailVariables {
  // Common — all emails
  prenoms: string;
  emailPhotographe: string;
  telephone: string;

  // Formule — emails 1, 2, 3
  nomFormule?: string;
  dateMariage?: string;
  lieuMariage?: string;
  montantTotal?: string;
  montantSolde?: string;
  semainesLivraison?: string;

  // Email 2 — options upsell
  option1?: string;
  prixOption1?: string;
  option2?: string;
  prixOption2?: string;

  // Email 3 — planning
  dateEngagement?: string;
  lieuEngagement?: string;
  dateBriefing?: string;
  duree?: string;
  heureDebut?: string;
  heureFin?: string;
  nombrePhotos?: string;
  dureeAcces?: string;

  // Email 4
  numeroWhatsApp?: string;
}

function loadTemplate(emailId: number): string {
  const filename = TEMPLATE_FILES[emailId];
  if (!filename) throw new Error(`Unknown email ID: ${emailId}`);
  return readFileSync(join(TEMPLATE_DIR, filename), 'utf-8');
}

function applyVariables(html: string, emailId: number, vars: OnboardingEmailVariables): string {
  const replacements: Record<string, string> = {
    '[Prénom(s)]': vars.prenoms,
    '[EMAIL]': vars.emailPhotographe,
    '[TÉLÉPHONE]': vars.telephone,
  };

  if (emailId === 1) {
    Object.assign(replacements, {
      '[NOM DE LA FORMULE]': vars.nomFormule ?? '',
      '[DATE DU MARIAGE]': vars.dateMariage ?? '',
      '[LIEU DU MARIAGE]': vars.lieuMariage ?? '',
      '[MONTANT]': vars.montantTotal ?? '',
      '[MONTANT SOLDE]': vars.montantSolde ?? '',
      '[X semaines]': vars.semainesLivraison ?? '',
    });
  } else if (emailId === 2) {
    Object.assign(replacements, {
      '[NOM FORMULE]': vars.nomFormule ?? '',
      '[PRIX TOTAL]': vars.montantTotal ?? '',
      '[OPTION 1]': vars.option1 ?? '',
      '[OPTION 2]': vars.option2 ?? '',
    });
  } else if (emailId === 3) {
    Object.assign(replacements, {
      '[DATE]': vars.dateEngagement ?? '',
      '[LIEU CHOISI]': vars.lieuEngagement ?? '',
      '[X semaines]': vars.semainesLivraison ?? '',
      '[DATE 2–3 sem. avant]': vars.dateBriefing ?? '',
      '[DATE DU MARIAGE]': vars.dateMariage ?? '',
      '[DURÉE]': vars.duree ?? '',
      '[HEURE DÉBUT]': vars.heureDebut ?? '',
      '[HEURE FIN]': vars.heureFin ?? '',
      '[NOMBRE]': vars.nombrePhotos ?? '',
      '[6 / 12 / 24 mois]': vars.dureeAcces ?? '',
    });
  } else if (emailId === 4) {
    Object.assign(replacements, {
      '[NUMÉRO]': vars.numeroWhatsApp ?? '',
    });
  }

  let result = html;
  for (const [placeholder, value] of Object.entries(replacements)) {
    result = result.replaceAll(placeholder, value);
  }

  // Email 2: two separate [PRIX] occurrences — replace first, then second
  if (emailId === 2) {
    result = result.replace('[PRIX]', vars.prixOption1 ?? '');
    result = result.replace('[PRIX]', vars.prixOption2 ?? '');
  }

  return result;
}

export async function sendOnboardingEmail(
  emailId: number,
  to: string,
  vars: OnboardingEmailVariables,
): Promise<void> {
  const { awsRegion, awsAccessKeyId, awsSecretAccessKey, sesFromEmail } = env.leadMagnet;

  if (!awsAccessKeyId || !awsSecretAccessKey) {
    throw new Error('AWS credentials not configured');
  }
  if (!sesFromEmail) {
    throw new Error('SES_FROM_EMAIL not configured');
  }

  const sesClient = new SESClient({
    region: awsRegion || 'eu-west-1',
    credentials: { accessKeyId: awsAccessKeyId, secretAccessKey: awsSecretAccessKey },
  });

  const html = applyVariables(loadTemplate(emailId), emailId, vars);

  const subject =
    emailId === 2
      ? `Ce qui est inclus dans votre formule ${vars.nomFormule ?? ''} — et ce qui ne l'est pas`
      : EMAIL_SUBJECTS[emailId];

  logger.info({ emailId, to: to.substring(0, 3) + '***' }, 'Sending onboarding email');

  const command = new SendEmailCommand({
    Source: sesFromEmail,
    Destination: { ToAddresses: [to] },
    Message: {
      Subject: { Data: subject, Charset: 'UTF-8' },
      Body: {
        Html: { Data: html, Charset: 'UTF-8' },
      },
    },
  });

  try {
    const response = await sesClient.send(command);
    logger.info(
      { emailId, to: to.substring(0, 3) + '***', messageId: response.MessageId },
      'Onboarding email sent successfully',
    );
  } catch (error) {
    logger.error(
      { err: error, emailId, to: to.substring(0, 3) + '***' },
      'Failed to send onboarding email',
    );
    throw new Error('Failed to send onboarding email');
  }
}
