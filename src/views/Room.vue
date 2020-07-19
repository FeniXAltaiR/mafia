<template>
  <div class="d-flex fill-height">
    <v-row class="fill-height">
      <v-col md="3" v-for="(stream, index) in streams" :key="index">
        <video
          :srcObject.prop="stream.srcObject"
          muted
          autoplay
          controls
          style="width: inherit;"
        ></video>
      </v-col>
    </v-row>
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
    fullRoom() {
      alert('ROOM IS FOOL')
      this.$router.push('/')
    },
    join({uuid: peerUuid, displayName}) {
      this.setUpPeer(peerUuid, displayName)
      this.$socket.emit('createOffer', {
        displayName: this.$socket.id,
        uuid: this.$socket.id,
        dest: peerUuid,
        room: this.room
      })
    },
    createOffer({uuid: peerUuid, displayName}) {
      this.setUpPeer(peerUuid, displayName)
      this.peerConnections[peerUuid].pc
        .createOffer()
        .then(description => this.createdDescription(description, peerUuid))
        .catch(this.errorHandler)
    },
    description({uuid: peerUuid, sdp}) {
      console.log('SDP_TYPE', sdp.type)
      this.peerConnections[peerUuid].pc
        .setRemoteDescription(new RTCSessionDescription(sdp))
        .then(() => {
          // Only create answers in response to offers
          if (sdp.type == 'offer') {
            this.peerConnections[peerUuid].pc
              .createAnswer()
              .then(description => this.createdDescription(description, peerUuid))
              .catch(this.errorHandler)
          }
        })
        .catch(this.errorHandler)
    },
    iceCandidate({uuid: peerUuid, ice}) {
      this.peerConnections[peerUuid].pc
        .addIceCandidate(new RTCIceCandidate(ice))
        .catch(this.errorHandler)
    },
    message(message) {
      console.log('MESSAGE:', message)
    }
  },

  mounted() {
    this.init()
  },

  methods: {
    init() {
      const {room} = this.$route.params
      if (room) {
        this.room = room
      }

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
    gotStream(stream) {
      console.log('Adding local stream.')
      this.localStream = stream
      this.streams.push({
        srcObject: stream,
        id: this.$socket.id
      })
      this.$socket.emit('join', {
        displayName: this.$socket.id,
        uuid: this.$socket.id,
        room: this.room
      })
    },
    setUpPeer(peerUuid, displayName) {
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
    },
    createdDescription(description, uuid) {
      console.log('got description', uuid)

      this.peerConnections[uuid].pc
        .setLocalDescription(description)
        .then(() => {
          this.$socket.emit('description', {
            sdp: this.peerConnections[uuid].pc.localDescription,
            uuid: this.$socket.id,
            dest: uuid,
            room: this.room
          })
        })
        .catch(this.errorHandler)
    },
    handleRemoteStreamAdded(event, peerUuid) {
      console.log('Remote stream added.', peerUuid)
      this.streams.push({
        srcObject: event.stream,
        id: peerUuid
      })
    },
    gotIceCandidate(event) {
      if (event.candidate != null) {
        console.log('candidate')
        this.$socket.emit('iceCandidate', {
          ice: event.candidate,
          uuid: this.$socket.id,
          room: this.room
        })
      }
    },
    checkPeerDisconnect(event, peerUuid) {
      const state = this.peerConnections[peerUuid].pc.iceConnectionState
      console.log(`connection with peer ${peerUuid} ${state}`)
      if (['failed', 'closed', 'disconnected'].includes(state)) {
        console.log('DELETE PEER', peerUuid)
        delete this.peerConnections[peerUuid]
        this.streams = this.streams.filter(stream => stream.id !== peerUuid)
      }
    },
    errorHandler(e) {
      console.error(e)
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
    }
  }
}
</script>
