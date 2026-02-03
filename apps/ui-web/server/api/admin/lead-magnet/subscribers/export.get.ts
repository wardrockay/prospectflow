/**
 * Server API proxy for subscribers CSV export
 * Routes: GET /api/admin/lead-magnet/subscribers/export
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
  if (query.search) queryString.append('search', String(query.search));

  const backendUrl = config.ingestApiUrl || 'http://localhost:4000';
  const url = `${backendUrl}/api/admin/lead-magnet/subscribers/export${queryString.toString() ? `?${queryString.toString()}` : ''}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${idToken}`,
      },
    });

    if (!response.ok) {
      throw createError({
        statusCode: response.status,
        message: 'Erreur lors de l\'export des subscribers',
      });
    }

    // Get CSV content
    const csvContent = await response.text();

    // Set CSV headers
    setHeader(event, 'Content-Type', 'text/csv; charset=utf-8');
    setHeader(
      event,
      'Content-Disposition',
      `attachment; filename="subscribers-${new Date().toISOString().split('T')[0]}.csv"`,
    );

    // Return CSV with BOM for Excel UTF-8 compatibility
    return '\ufeff' + csvContent;
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    console.error('Subscribers export API proxy error:', error);
    throw createError({
      statusCode: 500,
      message: 'Erreur serveur lors de l\'export des subscribers',
    });
  }
});
