import axios from 'axios';

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

    const response = await axios.post(tokenEndpoint, params.toString(), {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
    });

    const { access_token, id_token, refresh_token, expires_in, token_type } = response.data;

    return {
      access_token,
      id_token,
      refresh_token,
      expires_in,
      token_type,
    };
  } catch (error) {
    console.error('OAuth token exchange failed:', error);

    if (axios.isAxiosError(error)) {
      throw createError({
        statusCode: error.response?.status || 500,
        message: error.response?.data?.error_description || 'Failed to exchange authorization code',
      });
    }

    throw createError({
      statusCode: 500,
      message: 'Failed to process authentication callback',
    });
  }
});
