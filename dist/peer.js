/** 
 * Peer by René Monroy - v0.1
 * ----------------------------------------
 * Simplifies the configuration process that enables Peer to Peer
 * communication. Follows common implementation patterns for WebRTC through
 * the use of events.
 *
 * Read more about about WebRTC connectivity at:
 * https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Architecture/Connectivity
 */

(function(win, doc) {
  'use strict';

  var webRTCSupport, webRTCClient, getUserMedia;

  var adaptStd = function(nav) {
    webRTCClient = 'standard';
    getUserMedia = nav.getUserMedia.bind(nav);
  };

  var adaptWebkit = function(nav) {
    webRTCClient = 'webkit';
    win.RTCPeerConnection = webkitRTCPeerConnection;
    getUserMedia = nav.webkitGetUserMedia.bind(nav);
  };

  var adaptMoz = function(nav) {
    webRTCClient = 'moz';
    RTCPeerConnection = mozRTCPeerConnection;
    RTCSessionDescription = mozRTCSessionDescription;
    RTCIceCandidate = mozRTCIceCandidate;
    getUserMedia = nav.mozGetUserMedia.bind(nav);
  };

  var startWebRTCPolyfill = function() {
    var nav = navigator;
    webRTCSupport = true;
    if ( nav.getUserMedia ) {
      adaptStd(nav);
    } else if ( nav.mozGetUserMedia ) {
      adaptMoz(nav);
    } else if ( nav.webkitGetUserMedia ) {
      adaptWebkit(nav);
    } else {
      webRTCSupport = false;
      return webRTCSupport;
    }
    win.requestFileSystem = win.requestFileSystem || win.webkitRequestFileSystem;
  };

  var peer = function(config) {
    this.init.apply(this, config);
  };

  peer.prototype = {

    constructor : peer,
    media : null,
    channel : null,
    iceServers : null,
    iceOptions : null,
    channelUrl : null,
    channelProtocols : null,
    remote : null,
    _channelOpen : false,
    _events : null,

    init : function(config) {
      if ( webRTCSupport == false ) {
        console.log('WebRTC is not supported.');
        this.emit('error', { type : 'UNSUPPORTED' });
        return;
      }
      for ( var prop in config ) {
        this[prop] = config[prop];
      }
    },

    on : function (type, listener) {
      var listenerExists = false, listenersList, listenersSize;
      if ( !this._events ) this._events = {};
      if ( !this._events[type] ) this._events[type] = [];
      listenersList = this._events[type];
      listenersSize = listenersList.length;
      for ( var i=0; i<listenersSize; i++ ) {
        if ( listenersList[i] === listener ) {
          listenerExists = true;
          break;
        }
      }
      if ( !listenerExists ) this._events[type].push(listener);
      return this;
    },

    emit : function(type) {
      var args, listenersList, listenerSize;
      if ( !this._events ) this._events = {};
      if ( typeof this._events[type] === 'undefined' ) return false;
      args = Array.prototype.slice.call(arguments, 1);
      listenersList = this._events[type] || [];
      listenersSize = listenersList.length;
      for ( var i=0; i<listenersSize; i++ ) {
        listenersList[i].apply(this, args);
      }
      return;
    },

    connect : function() {
      var myPeer = this, peerConnectionConfig, remote, channel;
      if ( !this.remote ) {
        remote = new RTCPeerConnection({
          iceServers : this.iceServers
        });
        remote.onicecandidate = this._onCandidate.bind(this);
        remote.onaddstream = this._onRemoteStream.bind(this);
        this.remote = remote;
      }
      if ( !this.channel ) {
        channel = new WebSocket(this.channelUrl, this.channelProtocols);
        channel.addEventListener('message', this._onChannelMessage.bind(this));
        channel.addEventListener('open', this._onChannelOpen.bind(this));
        channel.addEventListener('close', this._onChannelClose.bind(this));
        channel.addEventListener('error', this._onChannelError.bind(this));
        this.channel = channel;
      }
      getUserMedia(this.media,
        this._onLocalMediaSuccess.bind(this),
        this._onLocalMediaError.bind(this)
      );
      return this;
    },

    play : function(mediaStream, element) {
      switch ( webRTCClient ) {
        case 'webkit' :
          element.src = webkitURL.createObjectURL(mediaStream);
          break;
        case 'moz' :
          element.mozSrcObject = mediaStream;
          element.play();
          break;
        default :
          element.srcObject = mediaStream;
          element.play();
      }
      return this;
    },

    stream : function(mediaStream) {
      this.remote.addStream(mediaStream);
      return this;
    },

    _onCandidate : function(e) {
      if ( e.candidate ) {
        this.channel.send(JSON.stringify({
          type : 'NEW_CANDIDATE',
          candidate : e.candidate
        }));
      } else {
        this.emit('error', { type : 'NO_CANDIDATE' });
      }
    },

    _onRemoteStream : function(e) {
      this.emit('media', { origin : 'remote', media : e.stream });
    },

    _onChannelOpen : function(e) {
      this._channelOpen = true;
      this.emit('connect', e);
    },

    _onChannelClose : function(e) {
      this._channelClose = false;
      this.emit('disconnect', e);
    },

    _onChannelMessage : function(e) {
      this.emit('signal', e);
    },

    _onChannelError : function(e) {
      this.emit('error', e);
    },

    _onLocalMediaSuccess : function(mediaStream) {
      this.emit('media', { type : 'local', media : mediaStream });
    },

    _onLocalMediaError : function(e) {
      this.emit('error', e);
    }

  };

  startWebRTCPolyfill();
  win.Peer = peer;

})(window, document);

/**
 * Peer Example
 * ---------------------------------------- */
var localVideoEl = document.getElementById('local-video'),
  remoteVideoEl = document.getElementById('remote-video');

/**
 * Configuration for communication:
 * channel - Signaling server using websockets.
 */
var peer = new Peer({
  channelUrl : 'wss://www.webrtcblueprints.com/chapter1/signaling',
  iceServers : [{ url : 'stun:23.21.150.121' }, { url : 'stun:stun.l.google.com:19302' }],
  media : { video : true, audio : true }
});

/**
 * Events bound to class:
 * connect - When a connection through WebSocket is opened.
 * signal - A message received via WebSocket.
 * disconnect - When a connection through WebSocket is closed.
 * error - Response with error types.
 */
peer
  .on('connect', function(e) {
    console.log("Client can send signals now.", e);
  })
  .on('signal', function(e) {
    console.log("Client received a message.", e);
    // switch ( e.origin ) {
    //   case 'owner' :
    //     break;
    //   case 'guest' :
    //     peer.joinRoom('room');
    //     break;
    // }
  })
  .on('disconnet', function(e) {
    console.log("Client is not able to send signals now.", e);
  })
  /* 
   * Shows different errors from different types of connections or custom.
   **/
  .on('error', function(e) {
    console.log('Error response.', e);
  })
  /* 
   * When received a media, this could be from local client or a remote peer.
   **/
  .on('media', function(e) {
    console.log('Media obtained successfully.', e);
    switch ( e.origin ) {
      case 'local' :
        peer.play(e.media, localVideoEl);
        peer.stream(e.media);
        break;
      case 'remote' :
        peer.play(e.media, remoteVideoEl);
        break;
    }
  });

// peer.connect();

peer.connect();

