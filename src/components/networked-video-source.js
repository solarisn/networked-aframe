/* global AFRAME, NAF, THREE */
var naf = require('../NafIndex');

AFRAME.registerComponent('networked-video-source', {
  schema: {
    positional: { default: true },
    rotational: { default: true },
    message: {default: "SLDHJLSKDJFLKJSLDKFJLSKJDFLKJS"},
    event: {default: "newStream"}
  },

  init: function () {

    var self = this;
    this.eventHandlerFn = function () { console.log(self.data.message); };

    window.extensionInstalled = false;


    console.log('initializing a networked-video-source');
    this.listener = null;
    this.stream = null;
    var randomId = this._makeId(5);
    this.randomId = randomId;
    this.el.setAttribute("id", randomId);

    this._makeId = this._makeId.bind(this);
    this._setMediaStream = this._setMediaStream.bind(this);
    this._startScreenStreamFrom = this._startScreenStreamFrom.bind(this);
    this._registerScreenStream = this._registerScreenStream.bind(this);

    NAF.utils.getNetworkedEntity(this.el).then((networkedEl) => {
      const ownerId = networkedEl.components.networked.data.owner;
      this.ownerId = ownerId;
      console.log("owner of this video element is: " + ownerId);
      if (ownerId) {
        console.log("ownerid exists!");
        NAF.connection.adapter.getMediaStream(ownerId, 'screen')
          .then(this._setMediaStream)
          .catch((e) => naf.log.error(`Error getting video stream for ${ownerId}`, e));
      } else {
        window.localScreenEl = this;
        console.log("ownerid doesn't exist because it belongs to the local player!");
        // Correctly configured local entity, perhaps do something here for enabling debug audio loopback
        // NAF.connection.adapter.getMediaStream(ownerId, 'video')
        //   .then(this._setMediaStream)
        //   .catch((e) => naf.log.error(`Error getting video stream for ${ownerId}`, e));
        // if (navigator.mediaDevices.getUserMedia) { 
        //   //console.log(NAF.connection);
        // console.log("user media exists");      
        //     navigator.mediaDevices.getUserMedia({video: true})
        //   .then(this._setMediaStream)
        //   .catch(function(error) {
        //     console.log("Something went wrong!");
        //     console.log(error);
        //   });



        // }

                // listen for messages from the content-script
    window.addEventListener('message', function (event) {
      console.log("message from chrome extension: ");
      console.log(event);
      if (event.origin != window.location.origin) return;

      // content-script will send a 'SS_PING' msg if extension is installed
      if (event.data.type && (event.data.type === 'SS_PING')) {
        console.log("WE GOT EM'!");
        window.extensionInstalled = true;
        if (!window.localScreenStream) {
          window.postMessage({ type: 'SS_UI_REQUEST', text: 'start' }, '*');

        }
      }

      // user chose a stream
      if (event.data.type && (event.data.type === 'SS_DIALOG_SUCCESS')) {
        //console.log("")
        window.localScreenEl._startScreenStreamFrom(event.data.streamId);

        //this.el.emit('newStream', event.data.streamId);
      }

      // user clicked on 'cancel' in choose media dialog
      if (event.data.type && (event.data.type === 'SS_DIALOG_CANCEL')) {
        console.log('User cancelled!');
      }
    });

        //this._setMediaStream();
      }
    });
  },

  update: function (oldData) {
    var data = this.data;
    var el = this.el;

    if (oldData.event && data.event !== oldData.event) {
      el.removeEventListener(oldData.event, this.eventHandlerFn);
    }

    if (data.event) {
      el.addEventListener(data.event, this.eventHandlerFn);
    } else {
      console.log(data.message);
    }
  },

  _setMediaStream(newStream) {
    console.log("_setMediaAtream on networked-video-source");
    //this.stream = newStream;
    // var allElements = document.getElementsByClassName('avideo');
    // for (var i in allElements) {
    //   var temp = allElements[i];
    //   console.log(temp.networked.networkId);
    // }
    // var randomId = this._makeId(5);
    var videoNode = document.createElement("VIDEO");                 // Create a <li> node
    videoNode.setAttribute("id", "video-" + this.randomId);
    videoNode.autoplay = true;
    console.log('new stream: ');
    console.log(newStream);
    videoNode.srcObject = newStream;
    document.getElementsByTagName("a-assets")[0].appendChild(videoNode);
    //this.setAttribute("src", "#local");
    this.localVideo = videoNode;
    this.element = this.el;
    this.element.setAttribute('src', '#video-' + this.randomId);
    this.stream = newStream;
    // if(!this.sound) {
    //   this.setupSound();
    // }
    
    // if(newStream != this.stream) {
    //   // if(this.stream) {
    //   //   this.sound.disconnect();
    //   // }
    //   if(newStream) {
    //     // Chrome seems to require a MediaStream be attached to an AudioElement before AudioNodes work correctly
    //     // We don't want to do this in other browsers, particularly in Safari, which actually plays the audio despite
    //     // setting the volume to 0.
    //     if (/chrome/i.test(navigator.userAgent)) {
    //       this.audioEl = new Audio();
    //       this.audioEl.setAttribute("autoplay", "autoplay");
    //       this.audioEl.setAttribute("playsinline", "playsinline");
    //       this.audioEl.srcObject = newStream;
    //       this.audioEl.volume = 0; // we don't actually want to hear audio from this element
    //     }

    //     const soundSource = this.sound.context.createMediaStreamSource(newStream); 
    //     this.sound.setNodeSource(soundSource);
    //     this.el.emit('sound-source-set', { soundSource });
    //   }
    //   this.stream = newStream;
    // }
    

  },

  _startScreenStreamFrom(streamId) {
    console.log("startScreenStreamFrom");
    
    navigator.webkitGetUserMedia({
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: 'desktop',
          chromeMediaSourceId: streamId,
          maxWidth: window.screen.width,
          maxHeight: window.screen.height
        }
      }
    },
    // successCallback
    function(screenStream) {
      let videoElement;
      console.log("screenStream retrieved! Trying to set on video element");
      //videoElement = document.getElementById('dtStream');
      //videoElement.srcObject = screenStream;//= URL.createObjectURL(screenStream);
      //videoElement.play();
      window.localScreenEl._registerScreenStream(window.localScreenEl.ownerId, screenStream);
      window.localScreenEl._setMediaStream(screenStream);
    },
    // errorCallback
    function(err) {
      console.log('getUserMedia failed!: ' + err);
    });
    
  },

  _registerScreenStream(ownerId, stream) {
    //NAF.connection.adapter.registerScreenStream(ownerId, stream);
    window.localScreenStream = stream;
    AFRAME.scenes[0].emit('connect');
  },

  _makeId(length) {
    var text = "";
    var possible = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

    for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }

    return text;
  },

  // _setPannerProperties() {
  //   if (this.sound && this.data.positional) {
  //     this.sound.setDistanceModel(this.data.distanceModel);
  //     this.sound.setMaxDistance(this.data.maxDistance);
  //     this.sound.setRefDistance(this.data.refDistance);
  //     this.sound.setRolloffFactor(this.data.rolloffFactor);
  //   }
  // },

  remove: function () {
    var data = this.data;
    var el = this.el;

    // Remove event listener.
    if (data.event) {
      el.removeEventListener(data.event, this.eventHandlerFn);
    }
  },

  setupSound: function() {
    // var el = this.el;
    // var sceneEl = el.sceneEl;

    // if (this.sound) {
    //   el.removeObject3D(this.attrName);
    // }

    // if (!sceneEl.audioListener) {
    //   sceneEl.audioListener = new THREE.AudioListener();
    //   sceneEl.camera && sceneEl.camera.add(sceneEl.audioListener);
    //   sceneEl.addEventListener('camera-set-active', function(evt) {
    //     evt.detail.cameraEl.getObject3D('camera').add(sceneEl.audioListener);
    //   });
    // }
    // this.listener = sceneEl.audioListener;

    // this.sound = this.data.positional
    //   ? new THREE.PositionalAudio(this.listener)
    //   : new THREE.Audio(this.listener);
    // el.setObject3D(this.attrName, this.sound);
    // this._setPannerProperties();
  }
});
