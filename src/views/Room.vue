<template>
  <div>
    <h1>Realtime communication with WebRTC</h1>

    <div id="videos">
      <video
        v-for="(stream, index) in streams"
        :key="index"
        :srcObject.prop="stream.srcObject"
        muted
        autoplay
        controls
        style="width: 480px"
      ></video>
      <!-- <video id="localVideo" autoplay muted playsinline controls></video> -->
      <!-- <video id="remoteVideo" autoplay muted playsinline controls></video> -->
    </div>
  </div>
</template>

<script>
export default {
  data: () => ({
    turnReady: null,
    isChannelReady: false,
    isInitiator: false,
    isStarted: false,
    localStream: null,
    pc: null,
    remoteStream: null,
    pcConfig: {
      iceServers: [
        {
          urls: 'stun:stun.stunprotocol.org:3478'
        },
        {
          urls: 'stun:stun.l.google.com:19302'
        }
      ]
    },
    room: null,
    streams: [],
    peerConnections: []
  }),

  sockets: {
    connect() {
      console.log('CONNECT:', this.$socket.id)
    },
    test(msg) {
      console.log('TEST:', msg)
    },
    message(message) {
      console.log('MESSAGE:', message)
      const peerUuid = message.uuid

      // Ignore messages that are not for us or from ourselves
      // if (
      //   peerUuid == this.$socket.id
      //   || (message.dest != this.$socket.id && message.dest != 'all')
      // ) {
      //   return
      // }

      if (message.displayName && message.dest == 'all') {
        // set up peer connection object for a newcomer peer
        this.setUpPeer(peerUuid, message.displayName)
        this.$socket.emit('message', {
          displayName: this.$socket.id,
          uuid: this.$socket.id,
          dest: peerUuid
        })
      } else if (message.displayName && message.dest == this.$socket.id) {
        // initiate call if we are the newcomer peer
        this.setUpPeer(peerUuid, message.displayName, true)
      } else if (message.sdp && message.dest === this.$socket.id) {
        this.peerConnections[peerUuid].pc
          .setRemoteDescription(new RTCSessionDescription(message.sdp))
          .then(() => {
            // Only create answers in response to offers
            if (message.sdp.type == 'offer') {
              this.peerConnections[peerUuid].pc
                .createAnswer()
                .then(description => this.createdDescription(description, peerUuid))
                .catch(this.errorHandler)
            }
          })
          .catch(this.errorHandler)
      } else if (message.ice) {
        this.peerConnections[peerUuid].pc
          .addIceCandidate(new RTCIceCandidate(message.ice))
          .catch(this.errorHandler)
      }
    }
  },

  mounted() {
    this.init()
  },
  beforeDestroy() {
    this.sendMessage('bye')
  },

  methods: {
    init() {
      // this.$socket.emit('test', 'test')
      // const {room} = this.$route.params
      // if (room) {
      //   this.room = room
      // }

      // if (this.room !== '') {
      //   this.$socket.emit('create or join', this.room)
      // }

      const constraints = {
        video: true,
        audio: true
      }

      navigator.mediaDevices
        // .getUserMedia(constraints)
        .getDisplayMedia(constraints)
        .then(this.gotStream)
        .catch(function(e) {
          console.log('getUserMedia() error: ' + e.name)
        })

      // if (location.hostname !== 'localhost') {
      //   this.requestTurn(
      //     'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
      //   )
      // }
    },
    sendMessage(message) {
      console.log('Client sending message: ', message)
      this.$socket.emit('message', message)
    },
    gotStream(stream) {
      console.log('Adding local stream.')
      this.localStream = stream
      this.streams.push({
        srcObject: stream
      })
      this.$socket.emit('message', {
        displayName: this.$socket.id,
        uuid: this.$socket.id,
        dest: 'all'
      })
    },
    requestTurn(turnURL) {
      let turnExists = false
      for (const i in this.pcConfig.iceServers) {
        if (this.pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
          turnExists = true
          this.turnReady = true
          break
        }
      }
      if (!turnExists) {
        console.log('Getting TURN server from ', turnURL)
        // No TURN server. Get one from computeengineondemand.appspot.com:
        const xhr = new XMLHttpRequest()
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4 && xhr.status === 200) {
            const turnServer = JSON.parse(xhr.responseText)
            console.log('Got TURN server: ', turnServer)
            this.pcConfig.iceServers.push({
              urls: 'turn:' + turnServer.username + '@' + turnServer.turn,
              credential: turnServer.password
            })
            this.turnReady = true
          }
        }
        xhr.open('GET', turnURL, true)
        xhr.send()
      }
    },
    handleRemoteStreamAdded(event, peerUuid) {
      console.log('Remote stream added.', peerUuid)
      this.streams.push({
        srcObject: event.stream
      })
    },
    handleRemoteStreamRemoved(event) {
      console.log('Remote stream removed. Event: ', event)
    },
    handleRemoteHangup() {
      console.log('Session terminated.')
      this.stop()
      this.isInitiator = false
    },
    stop() {
      this.isStarted = false
      this.pc.close()
      this.pc = null
    },
    errorHandler(e) {
      console.error(e)
    },
    gotIceCandidate(event) {
      if (event.candidate != null) {
        console.log('candidate')
        this.$socket.emit('message', {
          ice: event.candidate,
          uuid: this.$socket.id
        })
      }
    },
    createdDescription(description, uuid) {
      console.log('got description', uuid)

      this.peerConnections[uuid].pc
        .setLocalDescription(description)
        .then(() => {
          this.$socket.emit('message', {
            sdp: this.peerConnections[uuid].pc.localDescription,
            uuid: this.$socket.id,
            dest: uuid
          })
        })
        .catch(this.errorHandler)
    },
    checkPeerDisconnect(event, peerUuid) {
      const state = this.peerConnections[peerUuid].pc.iceConnectionState
      console.log(`connection with peer ${peerUuid} ${state}`)
      if (['failed', 'closed', 'disconnected'].includes(state)) {
        console.log('DELETE PEER', peerUuid)
        delete this.peerConnections[peerUuid]
      }
    },
    setUpPeer(peerUuid, displayName, initCall = false) {
      console.log('SET UP PEER')
      this.peerConnections[peerUuid] = {
        displayName,
        pc: new RTCPeerConnection(this.pcConfig)
      }
      this.peerConnections[peerUuid].pc.onicecandidate = event =>
        this.gotIceCandidate(event, peerUuid)
      this.peerConnections[peerUuid].pc.onaddstream = event =>
        this.handleRemoteStreamAdded(event, peerUuid)
      this.peerConnections[peerUuid].pc.oniceconnectionstatechange = event =>
        this.checkPeerDisconnect(event, peerUuid)
      this.peerConnections[peerUuid].pc.addStream(this.localStream)

      if (initCall) {
        this.peerConnections[peerUuid].pc
          .createOffer()
          .then(description => this.createdDescription(description, peerUuid))
          .catch(this.errorHandler)
      }
    }
  }
}
</script>
