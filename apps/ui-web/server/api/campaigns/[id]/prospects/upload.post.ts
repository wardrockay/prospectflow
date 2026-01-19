/**
 * Server API proxy for prospect CSV upload
 * Routes: POST /api/campaigns/:id/prospects/upload
 *
 * This endpoint proxies multipart/form-data requests to the ingest-api service.
 * Handles file upload forwarding with proper authentication.
 */
export default defineEventHandler(async (event) => {
  console.log('[UPLOAD] 🚀 Request received');
  
  const config = useRuntimeConfig();
  const campaignId = event.context.params?.id;

  console.log('[UPLOAD] 📝 Campaign ID:', campaignId);

  if (!campaignId) {
    console.error('[UPLOAD] ❌ Missing campaign ID');
    throw createError({
      statusCode: 400,
      message: 'Campaign ID required',
    });
  }

  // Get ID token from cookies
  const idToken = getCookie(event, 'id_token');

  console.log('[UPLOAD] 🔐 Token present:', !!idToken);

  if (!idToken) {
    console.error('[UPLOAD] ❌ Missing authentication token');
    throw createError({
      statusCode: 401,
      message: 'Non authentifié. Veuillez vous connecter.',
    });
  }

  // Read multipart form data
  console.log('[UPLOAD] 📦 Reading multipart form data...');
  const formData = await readMultipartFormData(event);

  console.log('[UPLOAD] 📋 Form data received:', formData?.length, 'fields');

  if (!formData || formData.length === 0) {
    console.error('[UPLOAD] ❌ No form data received');
    throw createError({
      statusCode: 400,
      message: 'No file uploaded',
    });
  }

  // Find the file in form data
  const fileField = formData.find((field) => field.name === 'file');

  console.log('[UPLOAD] 📄 File field found:', !!fileField, 'Size:', fileField?.data?.length);

  if (!fileField || !fileField.data) {
    console.error('[UPLOAD] ❌ No file field in form data');
    throw createError({
      statusCode: 400,
      message: 'No file field found in form data',
    });
  }

  // Determine backend URL - use ingest-api for prospect imports
  const backendUrl = config.ingestApiUrl || 'http://localhost:4000';
  const url = `${backendUrl}/api/v1/campaigns/${campaignId}/prospects/upload`;

  console.log('[UPLOAD] 🎯 Proxying to:', url);
  console.log('[UPLOAD] 📁 File:', fileField.filename, 'Type:', fileField.type);

  try {
    // Create FormData for backend request
    console.log('[UPLOAD] 🔄 Creating backend FormData...');
    const backendFormData = new FormData();
    // Use Buffer.from to create a new buffer with proper ArrayBuffer type
    const buffer = Buffer.from(fileField.data);
    const blob = new Blob([buffer as unknown as ArrayBuffer], { type: fileField.type || 'text/csv' });
    backendFormData.append('file', blob, fileField.filename || 'upload.csv');

    console.log('[UPLOAD] 📤 Sending request to backend...');
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        // Note: Don't set Content-Type for FormData, let fetch set it with boundary
      },
      body: backendFormData,
    });

    console.log('[UPLOAD] 📥 Backend response:', response.status, response.statusText);

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.error('[UPLOAD] ❌ Backend error:', response.status, errorData);
      throw createError({
        statusCode: response.status,
        message: (errorData as { error?: string })?.error || 'Upload failed',
      });
    }

    const data = await response.json();
    console.log('[UPLOAD] ✅ Success:', data);
    return data;
  } catch (error: unknown) {
    // Re-throw if already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      console.error('[UPLOAD] ❌ HTTP error:', error);
      throw error;
    }

    console.error('[UPLOAD] ❌ Unexpected error:', error);
    throw createError({
      statusCode: 500,
      message: "Erreur lors de l'upload du fichier",
    });
  }
});
