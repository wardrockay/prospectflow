/**
 * Server API proxy for campaigns list
 * Routes: GET /api/campaigns
 *
 * This endpoint proxies requests to the campaign-api service.
 * In Docker, uses container name as host (campaign-api:3001)
 * In development, uses localhost or configured API_BASE_URL
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Debug: log config to see if NUXT_ variables are loaded
  console.log('[CampaignProxy GET] Config:', {
    campaignApiUrl: config.campaignApiUrl,
    hasConfig: !!config.campaignApiUrl,
  });

  // Get access token from cookies (set during auth callback)
  const accessToken = getCookie(event, 'access_token');

  // Debug: log token presence
  console.log('[CampaignProxy GET] Token:', {
    hasToken: !!accessToken,
    tokenLength: accessToken?.length || 0,
    tokenPreview: accessToken ? `${accessToken.substring(0, 20)}...` : 'none',
  });

  if (!accessToken) {
    throw createError({
      statusCode: 401,
      message: 'Non authentifié. Veuillez vous connecter.',
    });
  }

  // Get query params from request
  const query = getQuery(event);

  // Build query string
  const queryString = new URLSearchParams();
  if (query.page) queryString.append('page', String(query.page));
  if (query.limit) queryString.append('limit', String(query.limit));

  // Determine backend URL
  // In Docker: campaign-api:3001 (via CAMPAIGN_API_URL env var)
  // In dev: localhost:3001
  const backendUrl = config.campaignApiUrl || 'http://localhost:3001';

  const url = `${backendUrl}/api/v1/campaigns${queryString.toString() ? `?${queryString.toString()}` : ''}`;

  try {
    const response = await fetch(url, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw createError({
        statusCode: response.status,
        message:
          (errorData as { message?: string })?.message ||
          'Erreur lors de la récupération des campagnes',
      });
    }

    const data = await response.json();
    return data;
  } catch (error: unknown) {
    // Re-throw if already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    console.error('Campaign API proxy error:', error);
    throw createError({
      statusCode: 500,
      message: 'Erreur de communication avec le service campagnes',
    });
  }
});
