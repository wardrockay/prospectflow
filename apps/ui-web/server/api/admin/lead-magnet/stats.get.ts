/**
 * Server API proxy for lead magnet admin stats
 * Routes: GET /api/admin/lead-magnet/stats
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Get ID token from cookies
  const idToken = getCookie(event, 'id_token');

  if (!idToken) {
    throw createError({
      statusCode: 401,
      message: 'Non authentifié. Veuillez vous connecter.',
    });
  }

  // Get query params
  const query = getQuery(event);

  // Build query string
  const queryString = new URLSearchParams();
  if (query.period) queryString.append('period', String(query.period));

  // Determine backend URL
  const backendUrl = config.ingestApiUrl || 'http://localhost:4000';
  const url = `${backendUrl}/api/admin/lead-magnet/stats${queryString.toString() ? `?${queryString.toString()}` : ''}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw createError({
        statusCode: response.status,
        message:
          (errorData as { error?: string })?.error ||
          'Erreur lors de la récupération des statistiques',
      });
    }

    return await response.json();
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    console.error('Lead magnet stats API proxy error:', error);
    throw createError({
      statusCode: 500,
      message: 'Erreur serveur lors de la récupération des statistiques',
    });
  }
});
