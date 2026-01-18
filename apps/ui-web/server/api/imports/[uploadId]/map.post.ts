import { consola } from 'consola';

const logger = consola.withTag('ImportsMapProxy');

/**
 * Server API proxy for saving column mappings
 * Routes: POST /api/imports/:uploadId/map
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

  // Get request body
  const body = await readBody(event);

  const backendUrl = config.ingestApiUrl || 'http://localhost:4000';
  const url = `${backendUrl}/api/v1/imports/${uploadId}/map`;

  logger.info({ uploadId, backendUrl, url }, 'Proxying column mapping request to ingest-api');

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
      throw createError({
        statusCode: response.status,
        message: errorData.message || 'Failed to save mappings',
      });
    }

    return await response.json();
  } catch (error: any) {
    logger.error({ err: error, uploadId }, 'Failed to save column mappings');
    throw createError({
      statusCode: error.statusCode || 500,
      message: error.message || 'Erreur lors de la sauvegarde des mappings',
    });
  }
});
