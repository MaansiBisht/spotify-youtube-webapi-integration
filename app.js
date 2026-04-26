// ------------------------IMPORT modules----------------------- //
const express = require('express');
const axios = require('axios');
const cors = require('cors');
const querystring = require('querystring');
const cookieParser = require('cookie-parser');
const fs = require('fs');
const path = require('path');
const { google } = require('googleapis');
const readJson = require('r-json');
const SpotifyWebApi = require('spotify-web-api-node');

const spotifyApi = new SpotifyWebApi();

//---------------------------SPOTIFY AUTH-----------------------//

const web_credentials = readJson(`${__dirname}/web-credentials.json`);
const client_id = web_credentials.web.client_id;
const client_secret = web_credentials.web.client_secret;
const redirect_uri = web_credentials.web.redirect_uris[0];

function generateRandomString(length) {
  const possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  let text = '';
  for (let i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
}

const stateKey = 'spotify_auth_state';

const app = express();

app.use(express.static(path.join(__dirname, 'public')))
   .use(cors())
   .use(cookieParser());

app.get('/spotifyauth', function (req, res) {
  const state = generateRandomString(16);
  res.cookie(stateKey, state);

  const scope = 'user-read-private user-read-email playlist-read-private playlist-read-collaborative';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state,
    }));
});

app.get('/callback', async function (req, res) {
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    return res.redirect('/#' + querystring.stringify({ error: 'state_mismatch' }));
  }

  res.clearCookie(stateKey);

  try {
    const tokenResponse = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code',
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
        },
      }
    );

    const { access_token, refresh_token } = tokenResponse.data;
    spotifyApi.setAccessToken(access_token);
    spotifyApi.setRefreshToken(refresh_token);

    const me = await axios.get('https://api.spotify.com/v1/me', {
      headers: { 'Authorization': 'Bearer ' + access_token },
    });
    console.log('Spotify user:', me.data.display_name || me.data.id);

    res.redirect('/#authorized');
  } catch (error) {
    console.error('Spotify token exchange failed:', error.response?.data || error.message);
    res.redirect('/#' + querystring.stringify({ error: 'invalid_token' }));
  }
});

app.get('/refresh_token', async function (req, res) {
  const refresh_token = req.query.refresh_token;

  try {
    const tokenResponse = await axios.post(
      'https://accounts.spotify.com/api/token',
      new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refresh_token,
      }).toString(),
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + Buffer.from(client_id + ':' + client_secret).toString('base64'),
        },
      }
    );

    res.send({ access_token: tokenResponse.data.access_token });
  } catch (error) {
    console.error('Refresh token failed:', error.response?.data || error.message);
    res.status(500).send({ error: 'refresh_failed' });
  }
});
//-----------------------END SPOTIFY AUTH--------------------------//

// --------------------------YOUTUBE AUTH--------------------------//
const credentials = readJson(`${__dirname}/client_secret.json`);
const SCOPES = [
  'https://www.googleapis.com/auth/youtube',
  'https://www.googleapis.com/auth/youtube.force-ssl',
  'https://www.googleapis.com/auth/userinfo.profile',
].join(' ');
const clientSecret = credentials.web.client_secret;
const clientId = credentials.web.client_id;
const redirectUrl = credentials.web.redirect_uris[0];
const OAuth2 = new google.auth.OAuth2(clientId, clientSecret, redirectUrl);

const stateKeyy = 'youtube-auth-state';

app.get('/googleauth', function (req, res) {
  const state = generateRandomString(16);
  res.cookie(stateKeyy, state);

  res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' +
    querystring.stringify({
      response_type: 'code',
      client_id: clientId,
      scope: SCOPES,
      redirect_uri: redirectUrl,
      state: state,
      access_type: 'offline',
      prompt: 'consent',
    }));
});

app.get('/callback1', async function (req, res) {
  const code = req.query.code || null;
  const state = req.query.state || null;
  const storedState = req.cookies ? req.cookies[stateKeyy] : null;

  if (state === null || state !== storedState) {
    return res.redirect('/#' + querystring.stringify({ error: 'state_mismatch_google' }));
  }

  res.clearCookie(stateKeyy);

  try {
    const tokenResponse = await axios.post(
      'https://oauth2.googleapis.com/token',
      new URLSearchParams({
        code: code,
        redirect_uri: redirectUrl,
        grant_type: 'authorization_code',
        client_id: clientId,
        client_secret: clientSecret,
      }).toString(),
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );

    const { access_token, refresh_token } = tokenResponse.data;
    OAuth2.setCredentials({ access_token, refresh_token });

    const userInfo = await axios.get('https://www.googleapis.com/oauth2/v1/userinfo', {
      headers: { 'Authorization': 'Bearer ' + access_token },
    });
    console.log('YouTube user:', userInfo.data.name || userInfo.data.id);

    res.redirect('/#authorized');
  } catch (error) {
    console.error('Google token exchange failed:', error.response?.data || error.message);
    res.redirect('/#' + querystring.stringify({ error: 'invalid_token' }));
  }
});
//----------------------------END YOUTUBE AUTHENTICATION---------------------//

//----------------------------GET SPOTIFY PLAYLIST---------------------------//

async function fetchPlaylistTracks(inputname) {
  const me = await spotifyApi.getMe();
  const userId = me.body.id;

  const userPlaylists = await spotifyApi.getUserPlaylists(userId);

  const match = userPlaylists.body.items.find((p) => p.name === inputname);
  if (!match) {
    throw new Error(`Playlist "${inputname}" not found for user ${userId}`);
  }

  const tracksResponse = await spotifyApi.getPlaylistTracks(match.id, {
    offset: 0,
    limit: 100,
    fields: 'items',
  });

  const tracks = tracksResponse.body.items
    .map((item) => item.track)
    .filter((track) => track && track.name && track.artists?.length);

  fs.writeFileSync(`${__dirname}/${inputname}.json`, JSON.stringify({ tracks }, null, 2));

  return tracks.map((t) => `${t.name} ${t.artists[0].name}`);
}

//............................Create playlist on youtube................................//

app.get('/convert/:playlisturl', async function (req, res) {
  const inputname = req.params.playlisturl;

  try {
    const queries = await fetchPlaylistTracks(inputname);

    const youtube = google.youtube({ version: 'v3', auth: OAuth2 });

    const created = await youtube.playlists.insert({
      part: ['id', 'snippet'],
      requestBody: {
        snippet: {
          title: inputname,
          description: `Imported from Spotify playlist "${inputname}"`,
        },
      },
    });
    const playlistId = created.data.id;

    let added = 0;
    let failed = 0;

    for (const title of queries) {
      try {
        const search = await youtube.search.list({
          part: ['id', 'snippet'],
          maxResults: 1,
          q: title,
          type: ['video'],
        });

        const videoId = search.data.items?.[0]?.id?.videoId;
        if (!videoId) {
          failed++;
          continue;
        }

        await youtube.playlistItems.insert({
          part: ['id', 'snippet'],
          requestBody: {
            snippet: {
              playlistId: playlistId,
              resourceId: { kind: 'youtube#video', videoId: videoId },
            },
          },
        });
        added++;
      } catch (err) {
        console.error(`Failed to add "${title}":`, err.message);
        failed++;
      }
    }

    res.json({
      success: true,
      playlistId,
      tracksRequested: queries.length,
      added,
      failed,
    });
  } catch (error) {
    console.error('Conversion failed:', error.message);
    res.status(500).json({ success: false, error: error.message });
  }
});

const PORT = process.env.PORT || 8888;
app.listen(PORT, () => console.log(`Listening on ${PORT}`));
