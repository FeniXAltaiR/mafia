<template>
  <div>
    <v-row>
      <v-col class="text-center">
        <v-row class="justify-center align-center">
          <span class="mr-2 white--text">{{ gameInfo.text }}</span>
          <span class="mr-2 white--text">{{ time }}</span>
          <v-btn
            v-if="gameIsStarted && isInitiator"
            icon
            small
            @click="pauseGame"
            class="white--text"
          >
            <v-icon>mdi-{{ isPause ? 'play' : 'pause' }}</v-icon>
          </v-btn>
          <v-btn
            v-else-if="!gameIsStarted && isInitiator"
            icon
            small
            @click="startGame"
            class="white--text"
          >
            <v-icon>mdi-play</v-icon>
          </v-btn>
          <v-btn
            v-if="gameIsStarted && isInitiator"
            icon
            small
            @click="addDuration"
            class="white--text"
          >
            <v-icon>mdi-plus</v-icon>
          </v-btn>
        </v-row>
      </v-col>
    </v-row>
    <v-row class="align-center flex-wrap">
      <v-col md="3" sm="6" v-for="player in getPlayerStreams" :key="player.id">
        <template v-if="player.stream">
          <video
            :srcObject.prop="player.stream"
            muted
            autoplay
            style="max-height: calc((100vh - 120px - 16px) / 3); max-width: 100%; border-radius: 8px; border: 2px solid grey"
          ></video>
          <div>
            <v-btn icon class="white mr-2" @click="toggleVideo(player)">
              <v-icon>mdi-stop</v-icon>
            </v-btn>
            <v-btn icon class="white mr-2" @click="checkRole(player)">
              <v-icon>mdi-magnify</v-icon>
            </v-btn>
            <p>{{ player.role || 'undefined' }}</p>
          </div>
        </template>
      </v-col>
    </v-row>
  </div>
</template>

<script>
import moment from 'moment'

export default {
  data: () => ({
    turnReady: null,
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
    peerConnections: [],
    time: '00:00',
    timer: null,
    isPause: false,
    isInitiator: false,
    gameIsStarted: false,
    duration: 0,
    gameSteps: [],
    gameInfo: {}
  }),
  computed: {
    getPlayerStreams() {
      return this.peerConnections
    }
  },

  sockets: {
    connect() {
      console.log('CONNECT:', this.$socket.id)
    },
    test(msg) {
      console.dir(msg)
    },
    isInitiator({isInitiator = false}) {
      this.isInitiator = isInitiator
      // console.log('TEST:', id, isInitiator)
    },
    time({time}) {
      this.time = time
    },
    checkRole({fromId}) {
      const {role, room = this.room} = this.findPc(this.$socket.id)
      this.$socket.emit('getRole', {fromId: this.$socket.id, toId: fromId, role, room})
    },
    getRole({uuid, role}) {
      this.$set(this.findPc(uuid), 'role', role)
    },
    setGameInfo(info) {
      this.gameInfo = info
    },
    startGame() {
      this.gameIsStarted = true
    },
    endGame() {
      this.gameIsStarted = false
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
      this.findPc(peerUuid)
        .pc.createOffer()
        .then(description => this.createdDescription(description, peerUuid))
        .catch(this.errorHandler)
    },
    description({uuid: peerUuid, sdp}) {
      console.log('SDP_TYPE', sdp.type)
      this.findPc(peerUuid)
        .pc.setRemoteDescription(new RTCSessionDescription(sdp))
        .then(() => {
          // Only create answers in response to offers
          if (sdp.type == 'offer') {
            this.findPc(peerUuid)
              .pc.createAnswer()
              .then(description => this.createdDescription(description, peerUuid))
              .catch(this.errorHandler)
          }
        })
        .catch(this.errorHandler)
    },
    iceCandidate({uuid: peerUuid, ice}) {
      this.findPc(peerUuid)
        .pc.addIceCandidate(new RTCIceCandidate(ice))
        .catch(this.errorHandler)
    },
    toggleVideo(id) {
      const {stream: existStream} = this.findPc(id)

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
      this.peerConnections.push({
        displayName: this.$socket.id,
        stream,
        id: this.$socket.id,
        room: this.room
      })
      this.$socket.emit('isInitiator', {
        room: this.room
      })
      this.$socket.emit('join', {
        displayName: this.$socket.id,
        uuid: this.$socket.id,
        room: this.room
      })
      // this.$socket.emit('test')
    },
    setUpPeer(peerUuid, displayName) {
      console.log('SET UP PEER')
      const {stream} = this.findPc(this.$socket.id)
      this.peerConnections.push({
        displayName,
        pc: new RTCPeerConnection(this.pcConfig),
        id: peerUuid,
        room: this.room
      })
      const existPc = this.findPc(peerUuid)
      existPc.pc.onicecandidate = event => this.gotIceCandidate(event, peerUuid)
      existPc.pc.onaddstream = event => this.handleRemoteStreamAdded(event, peerUuid)
      existPc.pc.oniceconnectionstatechange = event => this.checkPeerDisconnect(event, peerUuid)
      existPc.pc.addStream(stream)
    },
    createdDescription(description, uuid) {
      console.log('got description', uuid)

      this.findPc(uuid)
        .pc.setLocalDescription(description)
        .then(() => {
          this.$socket.emit('description', {
            sdp: this.findPc(uuid).pc.localDescription,
            uuid: this.$socket.id,
            dest: uuid,
            room: this.room
          })
        })
        .catch(this.errorHandler)
    },
    handleRemoteStreamAdded(event, peerUuid) {
      console.log('Remote stream added.', peerUuid)
      this.$set(this.findPc(peerUuid), 'stream', event.stream)
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
      const state = this.findPc(peerUuid).pc.iceConnectionState
      console.log(`connection with peer ${peerUuid} ${state}`)
      if (['failed', 'closed', 'disconnected'].includes(state)) {
        console.log('DELETE PEER', peerUuid)
        this.peerConnections = this.peerConnections.filter(pc => pc.id !== peerUuid)
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
    findPc(id) {
      return this.peerConnections.find(pc => pc.id === id)
    },
    toggleVideo({id, room}) {
      console.log(id, room)
      this.$socket.emit('toggleVideo', {id, room})
    },
    checkRole({id, room}) {
      this.$socket.emit('checkRole', {fromId: this.$socket.id, toId: id, room})
    },
    addDuration(e, duration = 10000) {
      this.duration += duration
    },
    startGame() {
      this.$socket.emit('startGame', {room: this.room})
      this.gameSteps = [...this.randezvous(7000), ...this.gameNight(), this.meeting]
      this.nextStep(this.gameSteps[0], 1000)
      this.gameIsStarted = true
    },
    pauseGame() {
      this.isPause = !this.isPause
    },
    endGame() {
      this.$socket.emit('endGame', {room: this.room})
      clearInterval(this.timer)
      this.gameIsStarted = false
      alert('Game is over')
    },
    setGameInfo(info) {
      this.gameInfo = info
      this.$socket.emit('setGameInfo', {
        ...info,
        room: this.room
      })
    },
    randezvous(duration = 12000) {
      const result = [
        ...this.peerConnections.map(player => () => {
          this.duration = duration
          this.setGameInfo({text: player.id, type: 'randezvous'})
        }),
        () => {
          this.duration = 5000
          this.setGameInfo({text: 'night', type: 'mafia'})
        }
      ]

      return result
    },
    gameNight() {
      return []
    },
    meeting(duration = 10000) {
      this.duration = duration
      this.setGameInfo({text: 'meeting'})
    },
    shouldEndGame() {
      return this.gameSteps.length === 0
    },
    nextStep(f, duration = 5000) {
      this.duration = duration
      this.timer = setInterval(() => {
        if (!this.isPause) {
          this.duration -= 1000
          this.time = moment(this.duration).format('mm:ss')
          this.$socket.emit('time', {
            time: this.time,
            room: this.room
          })

          if (this.duration <= 0) {
            this.duration = null
            if (this.shouldEndGame()) {
              this.endGame()
            } else {
              f()
              clearInterval(this.timer)
              this.gameSteps.shift()
              this.nextStep(this.gameSteps[0], this.duration)
            }
          }
        }
      }, 1000)
    }
  }
}
</script>
