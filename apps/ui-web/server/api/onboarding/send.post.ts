/**
 * Server API proxy for onboarding email sending
 * Route: POST /api/onboarding/send
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const idToken = getCookie(event, 'id_token');
  if (!idToken) {
    throw createError({ statusCode: 401, message: 'Non authentifié. Veuillez vous connecter.' });
  }

  const body = await readBody(event);

  const backendUrl = config.ingestApiUrl || 'http://localhost:3000';

  try {
    const response = await fetch(`${backendUrl}/api/onboarding/send-email`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
    });

    const data = await response.json();

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        message: data.error || "Erreur lors de l'envoi",
      });
    }

    return data;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }
    throw createError({ statusCode: 500, message: 'Erreur de connexion au serveur' });
  }
});
