/**
 * Token Refresh Endpoint
 * Exchanges refresh_token for new access/id tokens
 */
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();

  // Get refresh token from cookie
  const refreshToken = getCookie(event, 'refresh_token');

  if (!refreshToken) {
    throw createError({
      statusCode: 401,
      message: 'No refresh token available',
    });
  }

  try {
    // Cognito token endpoint
    const tokenEndpoint = `${config.public.cognitoHostedUI}/oauth2/token`;

    // Exchange refresh token for new tokens
    const params = new URLSearchParams({
      grant_type: 'refresh_token',
      client_id: config.public.cognitoClientId,
      refresh_token: refreshToken,
    });

    // Add client secret if configured
    if (config.cognitoClientSecret) {
      params.append('client_secret', config.cognitoClientSecret);
    }

    const fetchResponse = await fetch(tokenEndpoint, {
      method: 'POST',
      body: params.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    if (!fetchResponse.ok) {
      console.error('Token refresh failed:', fetchResponse.status, fetchResponse.statusText);
      throw createError({
        statusCode: 401,
        message: 'Token refresh failed',
      });
    }

    const response = (await fetchResponse.json()) as {
      access_token: string;
      id_token: string;
      expires_in: number;
    };

    const { access_token, id_token, expires_in } = response;

    const isProduction = process.env.NODE_ENV === 'production';

    // Update access token
    setCookie(event, 'access_token', access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    });

    // Update ID token
    setCookie(event, 'id_token', id_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    });

    // Update token expiration time
    const expiresAt = Date.now() + expires_in * 1000;
    setCookie(event, 'token_expires_at', expiresAt.toString(), {
      httpOnly: false,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    });

    return {
      success: true,
      expiresAt,
    };
  } catch (error) {
    console.error('Token refresh error:', error);
    throw createError({
      statusCode: 401,
      message: 'Failed to refresh token',
    });
  }
});
