/* global NAF */
const NoOpAdapter = require('./NoOpAdapter');

class EasyRtcAdapter extends NoOpAdapter {

  constructor(easyrtc) {
    super();

    this.easyrtc = easyrtc || window.easyrtc;
    this.app = "default";
    this.room = "default";

    this.audioStreams = {};
    this.videoStreams = {}; //solaris
    this.screenStreams = {}; //solaris

    this.pendingScreenRequest = {};
    this.pendingVideoRequest = {};
    this.pendingAudioRequest = {};

    this.serverTimeRequests = 0;
    this.timeOffsets = [];
    this.avgTimeOffset = 0;
  }

  setServerUrl(url) {
    this.easyrtc.setSocketUrl(url);
  }

  setApp(appName) {
    this.app = appName;
  }

  setRoom(roomName) {
    this.room = roomName;
    this.easyrtc.joinRoom(roomName, null);
  }

  // options: { datachannel: bool, audio: bool }
  setWebRtcOptions(options) {
    // this.easyrtc.enableDebug(true);
    this.easyrtc.enableDataChannels(options.datachannel);

    // if (options.screen) {
    //   this.easyrtc.setScreenCapture();
    // }
    // if (options.screen) {
    //   //this.registerScreenStream()
    // }

    this.easyrtc.enableVideo(true/*false*/); //solaris
    this.easyrtc.enableAudio(options.audio);

    this.easyrtc.enableVideoReceive(true/*false*/);
    this.easyrtc.enableAudioReceive(options.audio);
  }

  registerScreenStream(ownerId, stream) {
    console.log("REGISTER 3rd party local media");
    console.log(stream);
    window.easyrtc.register3rdPartyLocalMediaStream(stream, "screen");
    console.log(ownerId + ' : ' + stream);
    window.localScreenStream = stream;
    AFRAME.scenes[0].emit('connect');

  }

  setServerConnectListeners(successListener, failureListener) {
    this.connectSuccess = successListener;
    this.connectFailure = failureListener;
  }

  setRoomOccupantListener(occupantListener) {
    this.easyrtc.setRoomOccupantListener(function(
      roomName,
      occupants,
      primary
    ) {
      occupantListener(occupants);
    });
  }

  setDataChannelListeners(openListener, closedListener, messageListener) {
    this.easyrtc.setDataChannelOpenListener(openListener);
    this.easyrtc.setDataChannelCloseListener(closedListener);
    this.easyrtc.setPeerListener(messageListener);
  }

  updateTimeOffset() {
    const clientSentTime = Date.now() + this.avgTimeOffset;

    return fetch(document.location.href, { method: "HEAD", cache: "no-cache" })
      .then(res => {
        var precision = 1000;
        var serverReceivedTime = new Date(res.headers.get("Date")).getTime() + (precision / 2);
        var clientReceivedTime = Date.now();
        var serverTime = serverReceivedTime + ((clientReceivedTime - clientSentTime) / 2);
        var timeOffset = serverTime - clientReceivedTime;

        this.serverTimeRequests++;

        if (this.serverTimeRequests <= 10) {
          this.timeOffsets.push(timeOffset);
        } else {
          this.timeOffsets[this.serverTimeRequests % 10] = timeOffset;
        }

        this.avgTimeOffset = this.timeOffsets.reduce((acc, offset) => acc += offset, 0) / this.timeOffsets.length;

        if (this.serverTimeRequests > 10) {
          setTimeout(() => this.updateTimeOffset(), 5 * 60 * 1000); // Sync clock every 5 minutes.
        } else {
          this.updateTimeOffset();
        }
      });
  }

  connect() {
    Promise.all([
      this.updateTimeOffset(),
      new Promise((resolve, reject) => {
        var mediaEnabled = false;
        //temporary REMOVED AUDIO
        // if (this.easyrtc.audioEnabled) {
        //   NAF.log.write("connect() : audioEnabled");
        //   this._connectWithAudio(resolve, reject);
        //   mediaEnabled = true;
        // } 
        // if (this.easyrtc.videoEnabled) {
        //   NAF.log.write("connect() : videoEnabled");
        //   this._connectWithVideo(resolve, reject);
        //   mediaEnabled = true;
        // }
        if (/*this.easyrtc.screenEnabled*/true) {
          NAF.log.write("connect() : screenEnabled");
          NAF.log.write('register3rd party');
          window.easyrtc.register3rdPartyLocalMediaStream(window.localScreenStream);
          this._connectWithScreen(resolve, reject);
          mediaEnabled = true;
        }

//        if (!mediaEnabled) {
          NAF.log.write("Connecting without media");
          this.easyrtc.connect(this.app, resolve, reject);
        // } else {
        //   NAF.log.write("connecting with media");
        //   this._connectWithMedia(resolve, reject);
        // }
      })
    ]).then(([_, clientId]) => {
      // NAF.log.write('_storeAudioStream');
      // this._storeAudioStream(
      //   this.easyrtc.myEasyrtcid,
      //   this.easyrtc.getLocalStream()
      // );
      NAF.log.write('_storeScreenStream');
      console.log('local screen stream: ');
      console.log(window.localScreenStream);
      this._storeScreenStream(
        this.easyrtc.myEasyrtcid,
        window.localScreenStream
      );
      // NAF.log.write('_storeVideoStream');
      // this._storeVideoStream(
      //   this.easyrtc.myEasyrtcid,
      //   window.easyrtc.getLocalStream()
      // );
      //this._store

      this._myRoomJoinTime = this._getRoomJoinTime(clientId);
      this.connectSuccess(clientId);
    }).catch(this.connectFailure);
  }

  shouldStartConnectionTo(client) {
    return this._myRoomJoinTime <= client.roomJoinTime;
  }

  startStreamConnection(clientId) {
    this.easyrtc.call(
      clientId,
      function(caller, media) {
        if (media === "datachannel") {
          NAF.log.write("Successfully started datachannel to ", caller);
        }
      },
      function(errorCode, errorText) {
        NAF.log.error(errorCode, errorText);
      },
      function(wasAccepted) {
        // console.log("was accepted=" + wasAccepted);
      }
    );
  }

  closeStreamConnection(clientId) {
    // Handled by easyrtc
  }

  sendData(clientId, dataType, data) {
    // send via webrtc otherwise fallback to websockets
    this.easyrtc.sendData(clientId, dataType, data);
  }

  sendDataGuaranteed(clientId, dataType, data) {
    this.easyrtc.sendDataWS(clientId, dataType, data);
  }

  broadcastData(dataType, data) {
    var roomOccupants = this.easyrtc.getRoomOccupantsAsMap(this.room);

    // Iterate over the keys of the easyrtc room occupants map.
    // getRoomOccupantsAsArray uses Object.keys which allocates memory.
    for (var roomOccupant in roomOccupants) {
      if (
        roomOccupants.hasOwnProperty(roomOccupant) &&
        roomOccupant !== this.easyrtc.myEasyrtcid
      ) {
        // send via webrtc otherwise fallback to websockets
        this.easyrtc.sendData(roomOccupant, dataType, data);
      }
    }
  }

  broadcastDataGuaranteed(dataType, data) {
    var destination = { targetRoom: this.room };
    this.easyrtc.sendDataWS(destination, dataType, data);
  }

  getConnectStatus(clientId) {
    var status = this.easyrtc.getConnectStatus(clientId);

    if (status == this.easyrtc.IS_CONNECTED) {
      return NAF.adapters.IS_CONNECTED;
    } else if (status == this.easyrtc.NOT_CONNECTED) {
      return NAF.adapters.NOT_CONNECTED;
    } else {
      return NAF.adapters.CONNECTING;
    }
  }

  getMediaStream(clientId, type) {
    NAF.log.write("trying to get media stream: " + type);
    var that = this;
    let streams;
    let pendingRequestLocal;
    if (type === 'video') {
      console.log("getting video stream");
      streams = this.videoStreams;
      pendingRequestLocal = that.pendingVideoRequest;
      console.log(streams);
      console.log(pendingRequestLocal);
    } else if (type === 'audio') {
      streams = this.audioStreams;
      pendingRequestLocal = that.pendingAudioRequest;
    } else if (type === 'screen') {
      console.log('GETTING SCREEN STREAM');
      streams = this.screenStreams;
      pendingRequestLocal = that.pendingScreenRequest;
    } else {
      console.log("Failed to getMediaStream for unknown or null type");
      return;
    }

    if (streams[clientId]) {
      NAF.log.write("Already had media for " + clientId);
      return Promise.resolve(streams[clientId]);
    } else {
      NAF.log.write("Waiting on media for " + clientId);
      return new Promise(function(resolve) {
        pendingRequestLocal[clientId] = resolve;
      });
    }
  }

  disconnect() {
    this.easyrtc.disconnect();
  }

  /**
   * Privates
   */

  _storeAudioStream(easyrtcid, stream) {
    this.audioStreams[easyrtcid] = stream;
    if (this.pendingAudioRequest[easyrtcid]) {
      NAF.log.write("got pending audio for " + easyrtcid);
      this.pendingAudioRequest[easyrtcid](stream);
      delete this.pendingAudioRequest[easyrtcid](stream);
    }
  }

  _storeVideoStream(easyrtcid, stream) {
    this.videoStreams[easyrtcid] = stream;
    if (this.pendingVideoRequest[easyrtcid]) {
      NAF.log.write("got pending video for " + easyrtcid);
      this.pendingVideoRequest[easyrtcid](stream);
      delete this.pendingVideoRequest[easyrtcid](stream);
    }
  }

  _storeScreenStream(easyrtcid, stream) {
    console.log('storing screen stream: _storeScreenStream');
    this.screenStreams[easyrtcid] = stream;
    if (this.pendingScreenRequest[easyrtcid]) {
      NAF.log.write("got pending screen for " + easyrtcid);
      this.pendingScreenRequest[easyrtcid](stream);
      delete this.pendingScreenRequest[easyrtcid](stream);
    }
  }

  _connectWithAudio(connectSuccess, connectFailure) {
    var that = this;

    this.easyrtc.setStreamAcceptor(this._storeAudioStream.bind(this));

    this.easyrtc.setOnStreamClosed(function(easyrtcid) {
      delete that.audioStreams[easyrtcid];
    });

    // this.easyrtc.initMediaSource(
    //   function() {
    //     that.easyrtc.connect(that.app, connectSuccess, connectFailure);
    //   },
    //   function(errorCode, errmesg) {
    //     NAF.log.error(errorCode, errmesg);
    //   }
    // );
    //_connectWithMedia(connectSuccess, connectFailure);
  }

  _connectWithMedia(connectSuccess, connectFailure) {
    var that = this;
    this.easyrtc.initMediaSource(
      function() {
        that.easyrtc.connect(that.app, connectSuccess, connectFailure);
      },
      function(errorCode, errmesg) {
        NAF.log.error(errorCode, errmesg);
      }
    );
  }

// solaris
  _connectWithVideo(connectSuccess, connectFailure) {
    var that = this;

    this.easyrtc.setStreamAcceptor(this._storeVideoStream.bind(this));

    this.easyrtc.setOnStreamClosed(function(easyrtcid) {
      delete that.videoStreams[easyrtcid];
    });

    // this.easyrtc.initMediaSource(
    //   function() {
    //     that.easyrtc.connect(that.app, connectSuccess, connectFailure);
    //   },
    //   function(errorCode, errmesg) {
    //     NAF.log.error(errorCode, errmesg);
    //   }
    // );
    //_connectWithMedia();
  }

  _connectWithScreen(connectSuccess, connectFailure) {
    var that = this;
    this.easyrtc.setStreamAcceptor(this._storeScreenStream.bind(this));

    this.easyrtc.setOnStreamClosed(function (easyrtcid) {
      delete that.screenStreams[easyrtcid];
    });
  }
// end solaris

  _getRoomJoinTime(clientId) {
    var myRoomId = NAF.room;
    var joinTime = this.easyrtc.getRoomOccupantsAsMap(myRoomId)[clientId]
      .roomJoinTime;
    return joinTime;
  }

  getServerTime() {
    return Date.now() + this.avgTimeOffset;
  }
}

module.exports = EasyRtcAdapter;
