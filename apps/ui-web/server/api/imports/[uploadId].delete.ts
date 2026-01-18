export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { uploadId } = getRouterParams(event);
  
  // Get auth token from cookie
  const idToken = getCookie(event, 'id_token');
  
  if (!idToken) {
    throw createError({
      statusCode: 401,
      statusMessage: 'Unauthorized - No auth token',
    });
  }

  try {
    // Use ingest API URL (server-side config, not public)
    const backendUrl = config.ingestApiUrl || 'http://localhost:4000';
    
    const response = await $fetch(
      `${backendUrl}/api/v1/imports/${uploadId}`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${idToken}`,
        },
      }
    );

    return response;
  } catch (error: any) {
    console.error('Failed to delete import:', error);
    
    throw createError({
      statusCode: error.statusCode || 500,
      statusMessage: error.message || 'Failed to delete import',
    });
  }
});
