/**
 * Server API proxy for prospect CSV template download
 * Routes: GET /api/campaigns/prospects/template
 *
 * This endpoint proxies requests to the ingest-api service to download
 * the CSV template for prospect imports.
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

  // Determine backend URL
  const backendUrl = config.campaignApiUrl || 'http://localhost:3001';
  const url = `${backendUrl}/api/v1/campaigns/prospects/template`;

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
        message: 'Failed to download template',
      });
    }

    // Set response headers for CSV download
    setResponseHeader(event, 'Content-Type', 'text/csv');
    setResponseHeader(
      event,
      'Content-Disposition',
      'attachment; filename="prospect_import_template.csv"'
    );

    // Return CSV content
    const csvContent = await response.text();
    return csvContent;
  } catch (error: unknown) {
    // Re-throw if already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    console.error('Template download proxy error:', error);
    throw createError({
      statusCode: 500,
      message: 'Erreur lors du téléchargement du modèle',
    });
  }
});
