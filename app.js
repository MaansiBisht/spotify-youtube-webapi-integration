// ------------------------IMPORT modules----------------------- //
var express = require('express'); // Express web server framework
var request = require('request'); // "Request" library
var cors = require('cors');
var querystring = require('querystring');
var cookieParser = require('cookie-parser');
var fs = require('fs');
var {google} = require('googleapis');
var readJson = require("r-json");  //"JSON" Module
const SpotifyWebAPi = require('spotify-web-api-node');  //"spotify-web-api-module"
const spotifyApi = new SpotifyWebAPi();




//---------------------------SPOTIFY AUTH-----------------------//

const web_credentials = readJson(`${__dirname}/web-credentials.json`); // Read spotify client credentials
var client_id = web_credentials.web.client_id; // Your client id
var client_secret = web_credentials.web.client_secret; // Your secret
var redirect_uri = web_credentials.web.redirect_uris[0]; // Your redirect uri


/**
 * Generates a random string containing numbers and letters
 * @param  {number} length The length of the string
 * @return {string} The generated string
 */

 var generateRandomString = function(length) {
  var text = '';
  var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';

  for (var i = 0; i < length; i++) {
    text += possible.charAt(Math.floor(Math.random() * possible.length));
  }
  return text;
};

var stateKey = 'spotify_auth_state';

var app = express(); // Initiate express app

app.use(express.static(__dirname + '/public'))
   .use(cors())
   .use(cookieParser())
  
   


app.get('/spotifyauth', function(req, res) {    //  Spotify Authentication 

  var state = generateRandomString(16);
  res.cookie(stateKey, state);

  // your application requests authorization
  var scope = 'user-read-private user-read-email';
  res.redirect('https://accounts.spotify.com/authorize?' +
    querystring.stringify({
      response_type: 'code',
      client_id: client_id,
      scope: scope,
      redirect_uri: redirect_uri,
      state: state
    }));
});


app.get('/callback', function(req, res) {

  // your application requests refresh and access tokens
  // after checking the state parameter

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKey] : null;

  if (state === null || state !== storedState) {
    res.redirect('/#' +
      querystring.stringify({
        error: 'state_mismatch'
      }));
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://accounts.spotify.com/api/token',
      form: {
        code: code,
        redirect_uri: redirect_uri,
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
      },
      json: true
    };
    console.log(authOptions);
    request.post(authOptions, function(error, response, body) {
      if (!error && response.statusCode === 200) {

        var access_token = body.access_token,
            refresh_token = body.refresh_token;
        spotifyApi.setAccessToken(access_token);  
        console.log(access_token);   
        
        var options = {
          url: 'https://api.spotify.com/v1/me',
          headers: { 'Authorization': 'Bearer ' + access_token },
          json: true
        };

        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });
        // we can also pass the token to the browser to make requests from there
        res.redirect('/#authorized')
      } else {
        res.redirect('/#' +
          querystring.stringify({
            error: 'invalid_token'
          }));
      }
    });
  }
});



app.get('/refresh_token', function(req, res) {

  // requesting access token from refresh token
  var refresh_token = req.query.refresh_token;
  var authOptions = {
    url: 'https://accounts.spotify.com/api/token',
    headers: { 'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64')) },
    form: {
      grant_type: 'refresh_token',
      refresh_token: refresh_token
    },
    json: true
  };

  request.post(authOptions, function(error, response, body) {
    if (!error && response.statusCode === 200) {
      var access_token = body.access_token;
      res.send({
        'access_token': access_token
      });
    }
  });
});  
//-----------------------END SPOTIFY AUTH--------------------------//

// --------------------------YOUTUBE AUTH--------------------------//
const credentials = readJson(`${__dirname}/client_secret.json`);
var SCOPES = 'https://www.googleapis.com/auth/youtube.upload https://www.googleapis.com/auth/userinfo.profile https://www.googleapis.com/auth/youtube https://www.googleapis.com/auth/youtube.channel-memberships.creator https://www.googleapis.com/auth/youtube.force-ssl https://www.googleapis.com/auth/youtube.readonly';
var clientSecret = credentials.web.client_secret;
var clientId = credentials.web.client_id;
var redirectUrl = credentials.web.redirect_uris[0];
var OAuth2 = new google.auth.OAuth2(
  clientId, clientSecret, redirectUrl
);

OAuth2.generateAuthUrl({
  access_type: 'offline',
  scope: SCOPES
});
var stateKeyy ='youtube-auth-state';
app.get('/googleauth', function(req, res) {
  var state = generateRandomString(16);
  res.cookie(stateKeyy, state);

  // your application requests authorization
  var scope = SCOPES;
  res.redirect('https://accounts.google.com/o/oauth2/v2/auth?' +
    querystring.stringify({
      response_type: 'code',
      client_id: credentials.web.client_id,
      scope: SCOPES,
      redirect_uri: credentials.web.redirect_uris[0],
      state: state
    }));
});

app.get('/callback1' , (req, res) => {

  var code = req.query.code || null;
  var state = req.query.state || null;
  var storedState = req.cookies ? req.cookies[stateKeyy] : null;

  
  if (state === null || state !== storedState) {
    res.redirect('/')
  } else {
    res.clearCookie(stateKey);
    var authOptions = {
      url: 'https://oauth2.googleapis.com/token',
      form: {
        code: code,
        redirect_uri: credentials.web.redirect_uris[0],
        grant_type: 'authorization_code'
      },
      headers: {
        'Authorization': 'Basic ' + (new Buffer(clientId + ':' + clientSecret).toString('base64'))
      },
      json: true
    };
  }

 // console.log(authOptions);
 request.post(authOptions, function(error, response, body) {
  if (!error && response.statusCode === 200) {

    var ytaccess_token = body.access_token,
        ytrefresh_token = body.refresh_token;


        //console.log(ytaccess_token);
        OAuth2.setCredentials({
          access_token: ytaccess_token,
          refresh_token: ytrefresh_token
        });

        var options = {
          url: 'https://www.googleapis.com/oauth2/v1/userinfo',
          headers: { 'Authorization': 'Bearer ' + ytaccess_token },
          json: true
        };
      
        // use the access token to access the Spotify Web API
        request.get(options, function(error, response, body) {
          console.log(body);
        });
    // we can also pass the token to the browser to make requests from there
    res.redirect('/#authorized');
  } else {
    res.redirect('/#' +
      querystring.stringify({
        error: 'invalid_token'
      }));
  }
});
});
//----------------------------END YOUTUBE AUTHENTICATION---------------------//

//----------------------------GET SPOTIFY PLAYLIST---------------------------//

//GET MY SPOTIFY DATA
function getMyData(inputid) {
  (async () => {
      const me = await spotifyApi.getMe();
   //   console.log(me.body);
       getUserPlaylists(me.body.id , inputid);
  })().catch(e => {
      console.error(e);
  });
}

//GET MY  SPOTIFY PLAYLIST
async function getUserPlaylists(userName, inputid) {
  const data = await spotifyApi.getUserPlaylists(userName)

  console.log( "-----------------------------");
  let playlists = [];
  
  for (let playlist of data.body.items){
      if(playlist.id == inputid){
      console.log(playlist.name + " " + playlist.id);
      
      let tracks  = await getPlayliststracks(playlist.id, playlist.name);
     // console.log(tracks);

      const toJSON =  { tracks }
      let data = JSON.stringify(toJSON);
      fs.writeFileSync(playlist.id+'.json',data);
  }
}
}

async function getPlayliststracks(playlistId, playlistName) {
  const data  = await spotifyApi.getPlaylistTracks(playlistId, {
      offset :1,
      limit : 100,
      fields: 'items'
  })

  //console.log('The playlist contains these tracks', data.body);
  let tracks = [];

  for (let track_ob of data.body.items) {
      const track = track_ob.track
      tracks.push(track);
     console.log(track.name + ":" +track.artists[0].name)
  }

  return tracks;
}




//...........................Read JSON file ............................//

var namearr = [];
async function name(inputid) {
  const content = readJson(`${__dirname}/${inputid}.json`);
  for (let i = 0; i <content.tracks.length; i++){
  var namee =   content.tracks[i]["name"];
  var artist = content.tracks[i]["artists"][0]["name"];
  var result = namee + artist;
  namearr.push(result);
  }
  return namearr;
}


//............................Create playlist on youtube................................//

app.get('/:playlisturl', async function (req, res) {
  var inputid = req.params.playlisturl;  // Read input id 
  getMyData(inputid);
  await sleep(3000);
  name(inputid); 
  await sleep(3000);

  const youtube = google.youtube({ version: "v3", auth: OAuth2 });
  youtube.playlists.insert({
    part: 'id,snippet',
    resource: {
        snippet: {
            title: "spotifyPlaylist",
            description:"Description",
        }
    }
}, async function (err, data, response) {

          if (err) {
             console.log('Error: ' + err);
          }
          if (data) {
              let playlistId = await (data.data.id);

              for(let i =0 ; i < namearr.length; i++){
                var title = await namearr[i];
                
                youtube.search.list({
                  part: 'id,snippet',
                  maxResults : 1,
                  q : title 
                },
                    async function (err, data) {
                    if (err) {
                      console.error('Error: ' + err);
                    }
                    if (data) { 
                       let videoId = await (data.data.items[0].id.videoId);

                         youtube.playlistItems.insert({
                          part :"id,snippet",
                          resource:{
                                  snippet: {
                                    playlistId: playlistId, 
                                     resourceId: {
                                            kind: 'youtube#video',
                                            videoId: videoId
                                      }
                                  }
                          }
                         
                       }); 
                    
                       
                      
                    }   
                     
          })
          await sleep(5000);  }
             
          }
        
        })
        function sleep(ms) {
          return new Promise((resolve) => {
            setTimeout(resolve, ms);
          });
        } 
});


console.log('Listening on 8888');
app.listen(8888);


