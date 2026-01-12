export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig();
  const { code } = await readBody(event);

  if (!code || typeof code !== 'string') {
    throw createError({
      statusCode: 400,
      message: 'Authorization code is required',
    });
  }

  try {
    // Cognito token endpoint
    const tokenEndpoint = `${config.public.cognitoHostedUI}/oauth2/token`;

    // Exchange authorization code for tokens
    const params = new URLSearchParams({
      grant_type: 'authorization_code',
      client_id: config.public.cognitoClientId,
      code,
      redirect_uri: config.public.cognitoRedirectUri,
    });

    // Add client secret if configured
    if (config.cognitoClientSecret) {
      params.append('client_secret', config.cognitoClientSecret);
    }

    // Use $fetch (Nuxt native) instead of axios for better server compatibility
    const response = await $fetch<{
      access_token: string;
      id_token: string;
      refresh_token: string;
      expires_in: number;
    }>(tokenEndpoint, {
      method: 'POST',
      body: params.toString(),
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, id_token, refresh_token, expires_in } = response;

    // Set tokens in httpOnly cookies (server-side only)
    const isProduction = process.env.NODE_ENV === 'production';

    // Access token (1 hour)
    setCookie(event, 'access_token', access_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    });

    // ID token (1 hour)
    setCookie(event, 'id_token', id_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    });

    // Refresh token (30 days)
    setCookie(event, 'refresh_token', refresh_token, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 2592000,
      path: '/',
    });

    // Store token expiration time for validation
    const expiresAt = Date.now() + expires_in * 1000;
    setCookie(event, 'token_expires_at', expiresAt.toString(), {
      httpOnly: false, // Accessible client-side for expiration check
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 3600,
      path: '/',
    });

    // Return success without exposing tokens
    return {
      success: true,
      expires_in,
    };
  } catch (error: any) {
    console.error('OAuth token exchange failed:', error);

    // Check if it's a fetch error with status code
    if (error.statusCode || error.status) {
      throw createError({
        statusCode: 401,
        message: 'Erreur de connexion. Veuillez réessayer.',
      });
    }

    throw createError({
      statusCode: 500,
      message: 'Erreur de connexion. Veuillez réessayer.',
    });
  }
});
