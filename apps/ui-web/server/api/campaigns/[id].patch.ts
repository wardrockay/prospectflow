/**
 * Server API proxy for campaign updates
 * Routes: PATCH /api/campaigns/:id
 *
 * This endpoint proxies PATCH requests to the campaign-api service.
 * Used for archiving and other status updates.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const campaignId = event.context.params?.id;
  const body = await readBody(event);

  if (!campaignId) {
    throw createError({
      statusCode: 400,
      message: 'Campaign ID required',
    });
  }

  // Get ID token from cookies (campaign-api validates ID tokens)
  const idToken = getCookie(event, 'id_token');

  if (!idToken) {
    throw createError({
      statusCode: 401,
      message: 'Non authentifié. Veuillez vous connecter.',
    });
  }

  // Determine backend URL
  const backendUrl = config.campaignApiUrl || 'http://localhost:3001';
  const url = `${backendUrl}/api/v1/campaigns/${campaignId}`;

  try {
    const response = await fetch(url, {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw createError({
        statusCode: response.status,
        message: (errorData as { message?: string })?.message || 'Erreur de mise à jour',
      });
    }

    const responseData = await response.json();
    // CRITICAL: Extract .data from backend response
    // Backend returns { success: true, data: {...updatedCampaign} }
    return responseData.data || responseData;
  } catch (error: unknown) {
    // Re-throw if already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    console.error('Campaign update proxy error:', error);
    throw createError({
      statusCode: 500,
      message: 'Erreur de communication avec le serveur',
    });
  }
});
