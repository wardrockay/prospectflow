/**
 * Server API proxy for CSV parsing with column mappings
 * Routes: POST /api/imports/:uploadId/parse
 *
 * This endpoint proxies parse requests to the ingest-api service.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const uploadId = event.context.params?.uploadId;

  if (!uploadId) {
    throw createError({
      statusCode: 400,
      message: 'Upload ID required',
    });
  }

  // Get ID token from cookies
  const idToken = getCookie(event, 'id_token');

  if (!idToken) {
    throw createError({
      statusCode: 401,
      message: 'Non authentifié. Veuillez vous connecter.',
    });
  }

  // Read request body (column mappings)
  const body = await readBody(event).catch(() => ({}));

  const backendUrl = config.ingestApiUrl || 'http://localhost:4000';
  const url = `${backendUrl}/api/v1/imports/${uploadId}/parse`;

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
        message: (errorData as { error?: string })?.error || 'Parse failed',
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
