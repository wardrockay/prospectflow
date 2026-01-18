export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { campaignId } = getRouterParams(event);
  const query = getQuery(event);
  
  // Get auth token from cookie - use id_token like other campaign endpoints
  const idToken = getCookie(event, 'id_token');
  
  if (!idToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - No auth token',
    });
  }

  try {
    // Build query string for status filter
    const queryString = query.status ? `?status=${query.status}` : '';
    
    // Use ingest API URL (server-side config, not public)
    const backendUrl = config.ingestApiUrl || 'http://localhost:4000';
    
    const response = await $fetch(
      `${backendUrl}/api/v1/campaigns/${campaignId}/imports${queryString}`,
      {
        method: 'GET',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
    );

    return response;
  } catch (error: any) {
    console.error('Failed to fetch imports list:', error);
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to fetch imports list',
    });
  }
});
