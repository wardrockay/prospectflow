/**
 * Server API proxy for lead magnet subscribers list
 * Routes: GET /api/admin/lead-magnet/subscribers
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const idToken = getCookie(event, 'id_token');

  if (!idToken) {
    throw createError({
      statusCode: 401,
      message: 'Non authentifié. Veuillez vous connecter.',
    });
  }

  const query = getQuery(event);

  // Build query string
  const queryString = new URLSearchParams();
  if (query.page) queryString.append('page', String(query.page));
  if (query.limit) queryString.append('limit', String(query.limit));
  if (query.search) queryString.append('search', String(query.search));
  if (query.sortBy) queryString.append('sortBy', String(query.sortBy));
  if (query.sortOrder) queryString.append('sortOrder', String(query.sortOrder));

  const backendUrl = config.ingestApiUrl || 'http://localhost:4000';
  const url = `${backendUrl}/api/admin/lead-magnet/subscribers${queryString.toString() ? `?${queryString.toString()}` : ''}`;

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
          'Erreur lors de la récupération des subscribers',
      });
    }

    return await response.json();
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    console.error('Subscribers list API proxy error:', error);
    throw createError({
      statusCode: 500,
      message: 'Erreur serveur lors de la récupération des subscribers',
    });
  }
});
