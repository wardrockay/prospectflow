/**
 * Server API proxy for lead magnet unsubscribe
 * Routes: GET /api/lead-magnet/unsubscribe
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Get query params
  const query = getQuery(event);
  const token = query.token as string;

  if (!token) {
    throw createError({
      statusCode: 400,
      message: 'Token manquant',
    });
  }

  // Determine backend URL
  const backendUrl = config.ingestApiUrl || 'http://localhost:4000';
  const url = `${backendUrl}/api/lead-magnet/unsubscribe?token=${encodeURIComponent(token)}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    const data = await response.json();

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        message: data.error || 'Erreur lors de la désinscription',
      });
    }

    return data;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    throw createError({
      statusCode: 500,
      message: 'Erreur de connexion au serveur',
    });
  }
});
