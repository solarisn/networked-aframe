/* global AFRAME, NAF */

AFRAME.registerComponent('networked-scene', {
  schema: {
    serverURL: {default: '/'},
    app: {default: 'default'},
    room: {default: 'default'},
    connectOnLoad: {default: true},
    onConnect: {default: 'onConnect'},
    adapter: {default: 'wsEasyRtc'}, // See https://github.com/networked-aframe/networked-aframe#adapters for list of adapters
    audio: {default: false}, // Only if adapter supports audio
    video: {default: false},
    screen: {default: false},
    debug: {default: false},
  },

  init: function() {
    var el = this.el;
    this.connect = this.connect.bind(this);
    el.addEventListener('connect', this.connect);
    if (this.data.connectOnLoad) {
      el.emit('connect', null, false);
    }
  },

  /**
   * Connect to signalling server and begin connecting to other clients
   */
  connect: function () {
    NAF.log.setDebug(this.data.debug);
    NAF.log.write('Networked-Aframe Connecting...');

    this.checkDeprecatedProperties();
    this.setupNetworkAdapter();

    if (this.hasOnConnectFunction()) {
      this.callOnConnect();
    }
    console.log('connecting with {audio:' + this.data.audio + ',video:' + this.data.video + "screenShare:" + this.data.screenShare +'}');
    return NAF.connection.connect(this.data.serverURL, this.data.app, this.data.room, this.data.audio, this.data.video, this.data.screen);
  },

  checkDeprecatedProperties: function() {
    // No current
  },

  setupNetworkAdapter: function() {
    var adapterName = this.data.adapter;
    var adapter = NAF.adapters.make(adapterName);
    NAF.connection.setNetworkAdapter(adapter);
  },

  hasOnConnectFunction: function() {
    return this.data.onConnect != '' && window.hasOwnProperty(this.data.onConnect);
  },

  callOnConnect: function() {
    NAF.connection.onConnect(window[this.data.onConnect]);
  },

  remove: function() {
    NAF.log.write('networked-scene disconnected');
    this.el.removeEventListener('connect', this.connect);
    NAF.connection.disconnect();
  }
});
