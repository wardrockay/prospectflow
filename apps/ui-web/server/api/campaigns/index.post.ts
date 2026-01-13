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

  // Get access token from cookies (set during auth callback)
  const accessToken = getCookie(event, 'access_token');

  if (!accessToken) {
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

  const url = `${backendUrl}/api/campaigns`;

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
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

    const data = await response.json();
    return data;
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
