/**
 * Server API proxy for importing valid prospects
 * Routes: POST /api/prospects/import
 *
 * This endpoint proxies import requests to the ingest-api service.
 */
export default defineEventHandler(async (event) => {
  console.log('[IMPORT] 🚀 Request received');
  
  const config = useRuntimeConfig();

  // Get ID token from cookies
  const idToken = getCookie(event, 'id_token');
  console.log('[IMPORT] 🔐 Token present:', !!idToken);

  if (!idToken) {
    console.error('[IMPORT] ❌ Missing authentication token');
    throw createError({
      statusCode: 401,
      message: 'Non authentifié. Veuillez vous connecter.',
    });
  }

  // Read request body (validation result)
  const body = await readBody(event).catch(() => ({}));
  console.log('[IMPORT] 📦 Body:', JSON.stringify(body).substring(0, 200));

  const backendUrl = config.ingestApiUrl || 'http://localhost:4000';
  const url = `${backendUrl}/api/v1/prospects/import`;
  console.log('[IMPORT] 🎯 Backend URL:', url);

  try {
    console.log('[IMPORT] 📤 Sending request to backend...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${idToken}`,
      },
      body: JSON.stringify(body),
    });

    console.log('[IMPORT] 📥 Response:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[IMPORT] ❌ Backend error:', response.status, errorData);
      throw createError({
        statusCode: response.status,
        message: (errorData as { error?: string })?.error || 'Import failed',
      });
    }

    const data = await response.json();
    console.log('[IMPORT] ✅ Success');
    return data;
  } catch (error: any) {
    console.error('[IMPORT] ❌ Error:', error);
    if (error.statusCode) {
      throw error;
    }
    throw createError({
      statusCode: 500,
      message: error.message || 'Internal server error',
    });
  }
});
