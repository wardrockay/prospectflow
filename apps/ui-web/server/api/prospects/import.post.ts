/**
 * Server API proxy for importing valid prospects
 * Routes: POST /api/prospects/import
 *
 * This endpoint proxies import requests to the ingest-api service.
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

  // Read request body (validation result)
  const body = await readBody(event).catch(() => ({}));

  const backendUrl = config.ingestApiUrl || 'http://localhost:4000';
  const url = `${backendUrl}/api/v1/prospects/import`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw createError({
        statusCode: response.status,
        message: (errorData as { error?: string })?.error || 'Import failed',
      });
    }

    const data = await response.json();
    return data;
  } catch (error: any) {
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: error.message || 'Internal server error',
    });
  }
});
