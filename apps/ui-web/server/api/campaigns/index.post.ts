/**
 * Server API proxy for campaign creation
 * Routes: POST /api/campaigns
 *
 * This endpoint proxies campaign creation requests to the campaign-api service.
 * In Docker, uses container name as host (campaign-api:3001)
 * In development, uses localhost or configured API_BASE_URL
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Get ID token from cookies (used for backend API authentication)
  // Note: campaign-api validates ID tokens, not access tokens
  const idToken = getCookie(event, 'id_token');

  if (!idToken) {
    throw createError({
      statusCode: 401,
      message: 'Non authentifié. Veuillez vous connecter.',
    });
  }

  // Read request body
  const body = await readBody(event);

  // Validate required fields
  if (!body.name || typeof body.name !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Le nom de la campagne est requis',
    });
  }

  // Determine backend URL
  // In Docker: campaign-api:3001 (via CAMPAIGN_API_URL env var)
  // In dev: localhost:3001
  const backendUrl = config.campaignApiUrl || 'http://localhost:3001';

  const url = `${backendUrl}/api/v1/campaigns`;

  try {
    const response = await fetch(url, {
      method: 'POST',
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
        message:
          (errorData as { message?: string })?.message ||
          'Erreur lors de la création de la campagne',
      });
    }

    const responseData = await response.json();
    // Backend returns { success: true, data: { id, name, ... } }
    // Extract data for frontend consumption
    return responseData.data || responseData;
  } catch (error: unknown) {
    // Re-throw if already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    // Log error with structured context for debugging
    console.error('[CampaignProxy] API error:', {
      error: error instanceof Error ? error.message : String(error),
      url,
      timestamp: new Date().toISOString(),
    });
    throw createError({
      statusCode: 500,
      message: 'Erreur de communication avec le service campagnes',
    });
  }
});
