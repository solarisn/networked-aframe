/* global AFRAME, NAF, THREE */
var naf = require('../NafIndex');

AFRAME.registerComponent('networked-video-source', {
  schema: {
    positional: { default: true },
    rotational: { default: true }
  },

  init: function () {
    console.log('initializing a networked-video-source');
    this.listener = null;
    this.stream = null;

    this._setMediaStream = this._setMediaStream.bind(this);

    NAF.utils.getNetworkedEntity(this.el).then((networkedEl) => {
      const ownerId = networkedEl.components.networked.data.owner;

      if (ownerId) {
        NAF.connection.adapter.getMediaStream(ownerId, 'video')
          .then(this._setMediaStream)
          .catch((e) => naf.log.error(`Error getting video stream for ${ownerId}`, e));
      } else {
        // Correctly configured local entity, perhaps do something here for enabling debug audio loopback
      }
    });
  },

  update() {
    //this._setPannerProperties();
  },

  _setMediaStream(newStream) {
    console.log("_setMediaAtream on networked-video-source");
    this.stream = newStream;
    var videoNode = document.createElement("VIDEO");                 // Create a <li> node
    videoNode.setAttribute("id", "local");
    videoNode.autoplay = true;
    videoNode.srcObject = newStream;
    document.getElementsByTagName("a-assets")[0].appendChild(videoNode);
    this.setAttribute("src", "#local");
    //document.getElementById("assets").appendChild(videoNode);
    //document.getElementById('a-assets').a
    // if(!this.sound) {
    //   this.setupSound();
    // }

    // if(newStream != this.stream) {
    //   if(this.stream) {
    //     this.sound.disconnect();
    //   }
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

  // _setPannerProperties() {
  //   if (this.sound && this.data.positional) {
  //     this.sound.setDistanceModel(this.data.distanceModel);
  //     this.sound.setMaxDistance(this.data.maxDistance);
  //     this.sound.setRefDistance(this.data.refDistance);
  //     this.sound.setRolloffFactor(this.data.rolloffFactor);
  //   }
  // },

  remove: function() {
    // if (!this.sound) return;

    // this.el.removeObject3D(this.attrName);
    // if (this.stream) {
    //   this.sound.disconnect();
    // }
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
