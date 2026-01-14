/**
 * Server API proxy for prospect CSV upload
 * Routes: POST /api/campaigns/:id/prospects/upload
 *
 * This endpoint proxies multipart/form-data requests to the ingest-api service.
 * Handles file upload forwarding with proper authentication.
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const campaignId = event.context.params?.id;

  if (!campaignId) {
    throw createError({
      statusCode: 400,
      message: 'Campaign ID required',
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

  // Read multipart form data
  const formData = await readMultipartFormData(event);

  if (!formData || formData.length === 0) {
    throw createError({
      statusCode: 400,
      message: 'No file uploaded',
    });
  }

  // Find the file in form data
  const fileField = formData.find((field) => field.name === 'file');

  if (!fileField || !fileField.data) {
    throw createError({
      statusCode: 400,
      message: 'No file field found in form data',
    });
  }

  // Determine backend URL
  const backendUrl = config.campaignApiUrl || 'http://localhost:3001';
  const url = `${backendUrl}/api/v1/campaigns/${campaignId}/prospects/upload`;

  try {
    // Create FormData for backend request
    const backendFormData = new FormData();
    // Convert Buffer to ArrayBuffer for Blob compatibility
    const arrayBuffer = fileField.data.buffer.slice(
      fileField.data.byteOffset,
      fileField.data.byteOffset + fileField.data.byteLength
    );
    const blob = new Blob([arrayBuffer], { type: fileField.type || 'text/csv' });
    backendFormData.append('file', blob, fileField.filename || 'upload.csv');

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${idToken}`,
        // Note: Don't set Content-Type for FormData, let fetch set it with boundary
      },
      body: backendFormData,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw createError({
        statusCode: response.status,
        message: (errorData as { error?: string })?.error || 'Upload failed',
      });
    }

    const data = await response.json();
    return data;
  } catch (error: unknown) {
    // Re-throw if already a createError
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    console.error('Prospect upload proxy error:', error);
    throw createError({
      statusCode: 500,
      message: "Erreur lors de l'upload du fichier",
    });
  }
});
