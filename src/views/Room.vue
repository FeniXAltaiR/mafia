<template>
  <div>
    <v-row>
      <v-col class="text-center">
        <v-row class="justify-center align-center">
          <span class="mr-2 white--text">{{ time }}</span>
          <v-btn icon small @click="startGame" :disabled="streams.length < 2" class="white--text">
            <v-icon>mdi-play</v-icon>
          </v-btn>
        </v-row>
      </v-col>
    </v-row>
    <v-row class="align-center flex-wrap">
      <v-col md="3" sm="6" v-for="(stream, index) in streams" :key="index">
        <video
          :srcObject.prop="stream.srcObject"
          muted
          autoplay
          controls
          style="height: calc((100vh - 120px - 16px) / 3); max-width: 100%; border-radius: 20px; border: 4px solid grey"
        ></video>
        <div>
          <v-btn @click="toggleVideo(stream)">
            <v-icon>mdi-pause</v-icon>
          </v-btn>
        </div>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import moment from 'moment'

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
    peerConnections: [],
    time: null,
    timer: null,
    gameSteps: []
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
    toggleVideo(id) {
      console.log(id)
      const {srcObject: existStream} = this.streams.find(stream => stream.id === id) || {}

      if (existStream) {
        const videoTracks = existStream.getVideoTracks()

        videoTracks.forEach(track => {
          track.enabled = !track.enabled
        })
      }
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

      this.gameSteps = [this.alertA, this.alertB, this.alertA]

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
        id: this.$socket.id,
        room: this.room
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
        id: peerUuid,
        room: this.room
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
    },

    toggleVideo({id, room}) {
      // const videoTracks = stream.getVideoTracks()

      // videoTracks.forEach(track => {
      //   track.enabled = !track.enabled
      // })
      this.$socket.emit('toggleVideo', {id, room})
    },
    startGame() {
      this.nextStep(this.gameSteps[0], 30000)
    },
    alertA() {
      alert('A')
    },
    alertB() {
      alert('B')
    },
    endGame() {
      clearInterval(this.timer)
      alert('Game is over')
    },
    shouldEndGame() {
      return this.gameSteps.length === 0
    },
    nextStep(f, duration = 15000) {
      this.gameSteps.shift()
      this.timer = setInterval(() => {
        duration -= 1000
        this.time = moment(duration).format('mm:ss')

        if (duration <= 0) {
          f()
          clearInterval(this.timer)
          if (this.shouldEndGame()) {
            this.endGame()
          } else {
            this.nextStep(this.gameSteps[0])
          }
        }
      }, 1000)
    }
  }
}
</script>
