# PeerJS
Simplifies the process of configuration, connection and transmission management on all APIs involved around P2P communication.

It follows common implementation patterns of WebRTC by using custom events and a modest Api.

> Work in progress!

Read more about about WebRTC connectivity at [https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Architecture/Connectivity](https://developer.mozilla.org/en-US/docs/Web/API/WebRTC_API/Architecture/Connectivity)

The idea is to try to do 1 configuration and use a set of events to handle actions. This assumes you have a Signaling server that uses Web Sockets for communication and STUN/TURN servers to deal with connectivity (because of firewalls or whatever).

## Example
There is only 1 configuration and some events to handle responses.

```javascript
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
    signalingServer : 'wss://www.webrtcblueprints.com/chapter1/signaling',
    iceServers : [{ url : 'stun:23.21.150.121' }, { url : 'stun:stun.l.google.com:19302' }],
    media : { video : true, audio : true }
  });

  /**
   * Events bound to class:
   * connect - When a connection through WebSocket is opened.
   * disconnect - When a connection through WebSocket is closed.
   * error - Response with error types.
   */
  peer
    .on('connect', function(e) {
      console.log("Client can send signals now.", e);
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

  peer.connect();
```
