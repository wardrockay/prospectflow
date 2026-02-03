/**
 * Server API proxy for subscriber deletion (RGPD)
 * Routes: DELETE /api/admin/lead-magnet/subscribers/:id
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  const idToken = getCookie(event, 'id_token');

  if (!idToken) {
    throw createError({
      statusCode: 401,
      message: 'Non authentifié. Veuillez vous connecter.',
    });
  }

  // Get subscriber ID from route params
  const id = getRouterParam(event, 'id');

  if (!id) {
    throw createError({
      statusCode: 400,
      message: 'ID subscriber manquant',
    });
  }

  const backendUrl = config.ingestApiUrl || 'http://localhost:4000';
  const url = `${backendUrl}/api/admin/lead-magnet/subscribers/${id}`;

  try {
    const response = await fetch(url, {
      method: 'DELETE',
      headers: {
        Authorization: `Bearer ${idToken}`,
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw createError({
        statusCode: response.status,
        message:
          (errorData as { error?: string })?.error ||
          'Erreur lors de la suppression du subscriber',
      });
    }

    return await response.json();
  } catch (error: unknown) {
    if (error && typeof error === 'object' && 'statusCode' in error) {
      throw error;
    }

    console.error('Subscriber delete API proxy error:', error);
    throw createError({
      statusCode: 500,
      message: 'Erreur serveur lors de la suppression du subscriber',
    });
  }
});
