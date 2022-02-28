# Spotify playlists to  Youtube
### This project uses spotify and googleapis to convert your spotify playlists to youtube playlists. 



## Setup and Installation 

#### Install Node and Initialize package.json using :
      sudo apt update
      sudo apt install nodejs
      sudo npm init
      
####  Dependencies and modules
      sudo npm install spotify-web-api-node --save
      npm install --save youtube-api
      npm install googleapis --save
      npm install google-auth-library --save      

#### git clone the source code in src folder
      git clone https://github.com/MaansiBisht/spotify-youtube-webapi-integration.git
#### Spotify Authentication 
##### Through the Spotify Web API , external applications retrieve Spotify content such as album data and playlists.
###### Register an application with spotify.
###### Enter client web credentials in the app.js file or save it as a seperate file as credentials.json and read the data.
              
 ![image](https://user-images.githubusercontent.com/66878185/154221077-a4cdd0a9-68c4-46dc-8eed-0d3ae16bf7f8.png)

###### for more refer https://developer.spotify.com/documentation/web-api/quick-start/
   
#### Youtube Authentication 
###### Register your application with youtube and download client-credentials.json file in your directory.
   
 ![image](https://user-images.githubusercontent.com/66878185/154222079-19732f79-2330-447c-8533-0be6b9e148c5.png)
           
###### for more refer https://developers.google.com/identity/protocols/oauth2/

   
#### After all the above steps you can run the app.js file 
     node app.js
    
## User Interface 
 ![image](https://user-images.githubusercontent.com/66878185/156002876-f3bd0ad8-7fa7-4363-97fe-723a854b8d06.png)


##### Steps 
  ##### - Authorize spotify .
  ##### - Connect your youtube account.
  ##### - Enter the playlistName you want to convert.
  ##### - Click on convert and Voila 👏 your youtube playlist is generated!!!
