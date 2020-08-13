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
    <v-row class="align-center flex-wrap px-2">
      <v-col md="3" sm="6" v-for="player in getPlayerStreams" :key="player.id">
        <template v-if="player.stream">
          <v-badge
            color="primary"
            right
            bottom
            :content="player.nominateIndex"
            :value="player.nominateIndex"
          >
            <v-badge color="error" :content="badgeContent(player)" :value="canSeeBadge(player)">
              <video
                :srcObject.prop="player.stream"
                muted
                autoplay
                style="max-height: calc((100vh - 120px - 16px) / 3); max-width: 100%; border-radius: 8px; border: 2px solid grey"
              ></video>
            </v-badge>
          </v-badge>
          <div>
            <v-btn icon class="white--text" @click="toggleVideo(player)">
              <v-icon>mdi-stop</v-icon>
            </v-btn>
            <v-btn v-if="canCheckRole(player)" icon class="white--text" @click="checkRole(player)">
              <v-icon>mdi-magnify</v-icon>
            </v-btn>
            <v-btn
              v-if="canVoteForKill(player)"
              icon
              @click="voteForKill(player)"
              class="error--text white"
            >
              <v-icon>mdi-axe</v-icon>
            </v-btn>
            <v-btn v-if="canHeal(player)" icon @click="heal(player)" class="primary--text white">
              <v-icon>mdi-bottle-tonic-plus</v-icon>
            </v-btn>
            <v-btn
              v-if="canNomination(player)"
              icon
              @click="nomination(player)"
              class="primary--text white"
            >
              <v-icon>mdi-account-alert</v-icon>
            </v-btn>
            <v-btn
              v-if="canVoteForExile(player)"
              icon
              @click="voteForExile(player)"
              class="primary--text white"
            >
              <v-icon>mdi-account-check</v-icon>
            </v-btn>
            <p>{{ formatRole(player) }}</p>
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
    isSecondVoting: false,
    canCheck: true,
    canNominate: true,
    nominateIndex: 1,
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
    getRole({uuid, role}) {
      this.$set(this.findPc(uuid), 'role', role)
    },
    voteForKill({fromId, toId}) {
      this.peerConnections.forEach(pc => {
        if (pc.id === toId) {
          pc.killPlayers.push(fromId)
        } else {
          pc.killPlayers = pc.killPlayers.filter(player => player !== fromId)
        }
      })
    },
    voteForExile({fromId, toId}) {
      this.peerConnections.forEach(pc => {
        if (pc.id === toId) {
          pc.votePlayers.push(fromId)
        } else {
          pc.votePlayers = pc.votePlayers.filter(player => player !== fromId)
        }
      })
    },
    heal({toId}) {
      this.peerConnections.forEach(pc => {
        if (pc.id === toId) {
          this.$set(pc, 'isHeal', true)
        } else {
          this.$set(pc, 'isHeal', false)
        }
      })
    },
    kill({id}) {
      this.$set(this.findPc(id), 'isAlive', false)
    },
    nomination({id}) {
      this.$set(this.findPc(id), 'isNominate', true)
      this.$set(this.findPc(id), 'nominateIndex', this.nominateIndex)
      this.nominateIndex += 1
    },
    setGameInfo(info) {
      this.gameInfo = info
    },
    resetCanCheckRole() {
      this.canCheck = true
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
        room: this.room,
        killPlayers: [],
        votePlayers: [],
        isAlive: true,
        nominateIndex: 0
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
        room: this.room,
        killPlayers: [],
        votePlayers: [],
        isAlive: true,
        nominateIndex: 0
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

    canCheckRole({id}) {
      const {role} = this.findPc(this.$socket.id)

      return (
        this.$socket.id !== id &&
        !this.findPc(id).isVisibleRole &&
        this.findPc(this.$socket.id).isAlive &&
        ['detective', 'boss'].includes(role) &&
        role === this.gameInfo.type &&
        this.canCheck
      )
    },
    checkRole({id}) {
      this.$set(this.findPc(id), 'isVisibleRole', true)
      this.canCheck = false
    },

    canNomination({id, isNominate = false, isAlive}) {
      return (
        this.findPc(this.$socket.id).isAlive &&
        this.gameInfo.type === 'nomination' &&
        this.$socket.id !== id &&
        this.$socket.id === this.gameInfo.active &&
        this.canNominate &&
        !isNominate &&
        isAlive
      )
    },
    nomination({id}) {
      this.canNominate = false
      this.$socket.emit('nomination', {id, room: this.room})
    },

    canVoteForExile({id, isAlive, votePlayers}) {
      return (
        this.$socket.id !== id &&
        this.gameInfo.type === 'exile' &&
        !votePlayers.includes(this.$socket.id) &&
        this.findPc(this.$socket.id).isAlive &&
        isAlive
      )
    },
    voteForExile({id}) {
      this.$socket.emit('voteForExile', {
        fromId: this.$socket.id,
        toId: id,
        room: this.room
      })
    },
    exile(duration = 5000) {
      const maxVotePlayers = this.peerConnections.reduce((result, pc) => {
        const {votePlayers = []} = result[0] || {}

        if (pc.votePlayers.length > votePlayers.length) {
          return [pc]
        } else if (pc.votePlayers.length && pc.votePlayers.length === votePlayers.length) {
          result.push(pc)
          return result
        } else {
          return result
        }
      }, [])

      if (maxVotePlayers.length > 1 || !maxVotePlayers.length) {
        if (this.isSecondVoting) {
          return
        }

        this.isSecondVoting = true
        this.gameSteps.splice(-1, 0, ...this.gameVoting())
      } else {
        const {id} = maxVotePlayers[0]
        this.gameSteps.splice(
          -1,
          0,
          () => {
            this.duration = duration
            this.setGameInfo({text: `Last word ${id}`, type: 'last_word'})
          },
          () => {
            this.$socket.emit('kill', {
              id,
              room: this.room
            })
            this.toggleVideo({id, room: this.room})
          }
        )
      }
    },

    canVoteForKill({id}) {
      const {role} = this.findPc(this.$socket.id)
      const {killPlayers = []} = this.findPc(id)

      return (
        ['boss', 'mafia'].includes(role) &&
        this.gameInfo.type === 'mafia' &&
        this.findPc(this.$socket.id).isAlive &&
        !killPlayers.includes(this.$socket.id)
      )
    },
    voteForKill({id}) {
      this.$socket.emit('voteForKill', {
        fromId: this.$socket.id,
        toId: id,
        room: this.room
      })
    },
    shouldKill() {
      const {id, killPlayers, isHeal, isAlive} = this.peerConnections.reduce((result, pc) => {
        if (pc.killPlayers.length > result.killPlayers.length) {
          return pc
        }
        return result
      })
      if (killPlayers.length && !isHeal && isAlive) {
        this.$socket.emit('kill', {
          id,
          room: this.room
        })
        this.toggleVideo({id, room: this.room})
      }
    },

    canHeal({id}) {
      const {role} = this.findPc(this.$socket.id)
      const {isHeal, isHealedLastRound} = this.findPc(id)

      return (
        role === 'doctor' &&
        role === this.gameInfo.type &&
        this.findPc(this.$socket.id).isAlive &&
        !isHeal &&
        !isHealedLastRound
      )
    },
    heal({id}) {
      this.$socket.emit('heal', {
        toId: id,
        room: this.room
      })
    },

    canSeeBadge(player) {
      const {role} = this.findPc(this.$socket.id)

      return (
        (['boss', 'mafia'].includes(role) && player.killPlayers.length) || player.votePlayers.length
      )
    },
    badgeContent(player) {
      return player.killPlayers.length || player.votePlayers.length
    },

    addDuration(e, duration = 10000) {
      this.duration += duration
    },
    startGame() {
      this.$socket.emit('startGame', {room: this.room})
      this.gameSteps = [...this.randezvous(), ...this.gameNight()]
      // this.gameSteps = [...this.gameDay()]
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
    randezvous(duration = 5000) {
      const result = [
        ...this.peerConnections.map(player => () => {
          this.duration = duration
          this.setGameInfo({text: player.id, type: 'randezvous'})
        })
      ]

      return result
    },
    gameNight(duration = 5000) {
      return [
        () => {
          this.duration = duration
          this.setGameInfo({text: 'night mafia', type: 'mafia'})
        },
        () => {
          this.duration = duration
          this.setGameInfo({text: 'night boss', type: 'boss'})
        },
        () => {
          this.duration = duration
          this.setGameInfo({text: 'night detective', type: 'detective'})
        },
        () => {
          this.duration = duration
          this.setGameInfo({text: 'night doctor', type: 'doctor'})
        },
        () => {
          this.shouldKill()
        },
        () => {
          this.gameSteps.push(this.meeting)
          this.gameSteps.push(...this.gameDay())
        }
      ]
    },
    gameDay(duration = 5000) {
      return [
        () => {
          this.duration = duration
          this.setGameInfo({text: 'nomination', type: 'nomination'})
          this.peerConnections
            .filter(player => player.isAlive)
            .forEach(player => {
              this.gameSteps.splice(1, 0, () => {
                this.duration = duration
                this.setGameInfo({text: player.id, type: 'nomination', active: player.id})
              })
            })
        },
        ...this.gameVoting(),
        () => {
          this.gameSteps.push(...this.gameNight())
        }
      ]
    },
    gameVoting(duration = 5000) {
      return [
        () => {
          this.peerConnections
            .filter(player => player.isAlive && player.isNominate)
            .sort((playerA, playerB) => (playerA.nominateIndex > playerB.nominateIndex ? 1 : -1))
            .forEach(player => {
              this.gameSteps.splice(-4, 0, () => {
                this.duration = duration
                this.setGameInfo({text: `explanation ${player.id}`, type: 'explanation'})
              })
            })
        },
        () => {
          this.duration = 10000
          this.setGameInfo({text: 'vote for exile', type: 'exile'})
        },
        () => {
          this.duration = duration
          this.setGameInfo({text: 'voting', type: 'voting'})
        },
        () => {
          this.exile()
        }
      ]
    },
    meeting(duration = 10000) {
      this.$socket.emit('resetCanCheckRole', {room: this.room})
      this.duration = duration
      this.setGameInfo({text: 'meeting', type: 'meeting'})
    },
    shouldEndGame() {
      const mafia = this.peerConnections.filter(
        player => ['boss', 'mafia'].includes(player.role) && player.isAlive
      )
      const citizen = this.peerConnections.filter(
        player => !['boss', 'mafia'].includes(player.role) && player.isAlive
      )

      return mafia.length >= citizen.length || !mafia.length || !this.gameSteps.length
    },
    formatRole(player) {
      if (player.isVisibleRole || (player.id === this.$socket.id && player.role)) {
        return player.role
      }
      return 'undefined'
    },
    nextStep(f, duration = 5000) {
      this.duration = duration
      this.timer = setInterval(() => {
        if (!this.isPause) {
          this.duration = Math.max(0, this.duration - 1000)
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
