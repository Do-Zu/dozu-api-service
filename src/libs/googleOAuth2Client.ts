import { OAuth2Client } from 'google-auth-library';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID;
const GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET;
const GOOGLE_REDIRECT_URI = `${process.env.BACKEND_BASE_URL}/api/auth/google`;

// if (!GOOGLE_CLIENT_ID || !GOOGLE_CLIENT_SECRET || !GOOGLE_REDIRECT_URI) {
//   throw new InternalServerError('Missing required environment variables for Google OAuth.');
// }
//todo: Consider if env validation is needed

export const googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);

export const getOAuthToken = async (code: any) => {
  try {
    console.log(
      'google request body:',
      JSON.stringify({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      })
    );
    const response = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        code,
        client_id: GOOGLE_CLIENT_ID,
        client_secret: GOOGLE_CLIENT_SECRET,
        redirect_uri: GOOGLE_REDIRECT_URI,
        grant_type: 'authorization_code',
      }),
    }).then(res => res.json());

    console.log('google oauth response', response);

    // The `response` object contains id_token which is a jwt token with the payload of the user information. If you have existing application authorization logic
    // you can use it here by checking if the email address in the jwt payload exists in your database and return the authorization token to the user.
    // In this article we are using the id_token provided by google as the authorization token.

    return response.id_token;
  } catch (error) {
    console.error('Error during token exchange:', error);
    //todo: handle error or throw
    return 'a';
  }
};
