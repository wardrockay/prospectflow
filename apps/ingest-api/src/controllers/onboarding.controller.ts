import { Request, Response } from 'express';
import { z } from 'zod';
import { sendOnboardingEmail } from '../services/onboarding-email.service.js';
import { createChildLogger } from '../utils/logger.js';

const logger = createChildLogger('OnboardingController');

const sendEmailSchema = z.object({
  emailId: z.number().int().min(1).max(4),
  to: z.string().email(),
  variables: z.object({
    prenoms: z.string().min(1),
    emailPhotographe: z.string().email(),
    telephone: z.string().optional(),
    nomFormule: z.string().optional(),
    dateMariage: z.string().optional(),
    lieuMariage: z.string().optional(),
    montantTotal: z.string().optional(),
    montantSolde: z.string().optional(),
    semainesLivraison: z.string().optional(),
    option1: z.string().optional(),
    prixOption1: z.string().optional(),
    option2: z.string().optional(),
    prixOption2: z.string().optional(),
    dateEngagement: z.string().optional(),
    lieuEngagement: z.string().optional(),
    dateBriefing: z.string().optional(),
    duree: z.string().optional(),
    heureDebut: z.string().optional(),
    heureFin: z.string().optional(),
    nombrePhotos: z.string().optional(),
    dureeAcces: z.string().optional(),
    numeroWhatsApp: z.string().optional(),
  }),
});

export async function sendOnboardingEmailHandler(req: Request, res: Response) {
  const parsed = sendEmailSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({
      success: false,
      error: 'Données invalides',
      details: parsed.error.flatten(),
    });
  }

  const { emailId, to, variables } = parsed.data;

  try {
    await sendOnboardingEmail(emailId, to, variables);
    res.json({ success: true, message: `Email ${emailId} envoyé avec succès à ${to}` });
  } catch (error) {
    logger.error({ err: error, emailId }, 'Onboarding email send failed');
    res.status(500).json({ success: false, error: "Échec de l'envoi de l'email" });
  }
}
