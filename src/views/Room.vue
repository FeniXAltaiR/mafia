<template>
  <div>
    <v-row class="px-5">
      <v-col md="5">
        <v-row class="align-center">
          <span class="mr-2 white--text">{{ gameInfo.text }}</span>
        </v-row>
      </v-col>
      <v-col md="2">
        <v-row class="justify-center align-center">
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
          <v-btn
            v-if="gameIsStarted && isInitiator"
            icon
            small
            @click="goToNextStep"
            class="white--text"
          >
            <v-icon>mdi-skip-next</v-icon>
          </v-btn>
        </v-row>
      </v-col>
    </v-row>
    <draggable
      tag="v-row"
      v-model="peerConnections"
      ghostClass="ghost"
      class="align-center flex-wrap px-2 justify-center"
    >
      <v-col md="3" sm="6" v-for="player in getPlayerStreams" :key="player.id">
        <template v-if="player.stream">
          <v-row class="justify-center px-1">
            <v-badge
              color="primary"
              right
              bottom
              :content="player.nominateIndex"
              :value="player.nominateIndex"
            >
              <v-badge color="error" :value="canSeeBadge(player)">
                <template v-slot:badge>
                  <v-tooltip left>
                    <template v-slot:activator="{on}">
                      <span class="pointer" v-on="on">{{ badgeContent(player) }}</span>
                    </template>
                    <div v-for="id in getListPlayers(player)" :key="id">
                      <span>{{ findPc(id).displayName }}</span>
                    </div>
                  </v-tooltip>
                </template>
                <v-hover v-slot:default="{hover}" open-delay="200">
                  <div>
                    <video
                      :srcObject.prop="player.stream"
                      autoplay
                      style="max-height: calc((100vh - 120px - 32px) / 3); max-width: 100%; border-radius: 8px; border: 2px solid grey"
                    ></video>
                    <div
                      v-if="!player.isVideo"
                      class="d-flex px-2 pb-3 pt-1 align-center justify-center white--text"
                      style="height: 100%; width: 100%; position: absolute; top: 0; border-radius: 8px;"
                    >
                      <h1>{{ findPc(player.id).displayName }}</h1>
                    </div>
                    <div
                      class="d-flex px-2 pb-3 pt-1 flex-column justify-space-between white--text"
                      style="height: 100%; width: 100%; position: absolute; top: 0; border-radius: 8px;"
                    >
                      <v-row class="justify-space-between">
                        <v-col md="5" class="py-0">
                          <div>
                            <v-slide-x-transition>
                              <v-btn
                                icon
                                class="white--text"
                                @click="toggleVideo(player)"
                                v-if="hover && canSeeToggleVideo(player)"
                              >
                                <v-icon v-if="player.isVideo">mdi-video</v-icon>
                                <v-icon v-else class="error--text">mdi-video-off</v-icon>
                              </v-btn>
                            </v-slide-x-transition>
                          </div>
                          <div>
                            <v-slide-x-transition>
                              <v-btn
                                icon
                                class="white--text"
                                @click="toggleAudio(player)"
                                v-if="hover && canSeeToggleAudio(player)"
                              >
                                <v-icon v-if="player.isAudio">mdi-volume-high</v-icon>
                                <v-icon v-else class="error--text">mdi-volume-off</v-icon>
                              </v-btn>
                            </v-slide-x-transition>
                          </div>
                          <div>
                            <v-dialog v-model="dialog.value" persistent max-width="600px">
                              <template v-slot:activator="{on}">
                                <v-slide-x-transition>
                                  <v-btn
                                    v-on="on"
                                    v-if="hover && player.id === $socket.id"
                                    icon
                                    class="white--text"
                                    @click="openDialog(player)"
                                  >
                                    <v-icon small>mdi-cog</v-icon>
                                  </v-btn>
                                </v-slide-x-transition>
                              </template>
                              <v-card>
                                <v-card-title>
                                  <span class="headline">Settings</span>
                                </v-card-title>
                                <v-card-text>
                                  <v-container>
                                    <v-row>
                                      <v-col cols="12" md="12">
                                        <v-text-field
                                          autofocus
                                          label="Nickname*"
                                          v-model="dialog.displayName"
                                          required
                                          @keypress.enter="updateSettings"
                                        ></v-text-field>
                                      </v-col>
                                    </v-row>
                                  </v-container>
                                </v-card-text>
                                <v-card-actions>
                                  <v-spacer></v-spacer>
                                  <v-btn color="blue darken-1" text @click="dialog.value = false"
                                    >Close</v-btn
                                  >
                                  <v-btn color="blue darken-1" text @click="updateSettings"
                                    >Save</v-btn
                                  >
                                </v-card-actions>
                              </v-card>
                            </v-dialog>
                          </div>
                        </v-col>
                        <v-col md="2" class="py-0">
                          <v-row class="justify-center">
                            <v-slide-y-transition>
                              <v-icon
                                v-if="
                                  hover &&
                                    !isInitiator &&
                                    !player.isVideo &&
                                    player.id !== $socket.id
                                "
                                class="error--text"
                                >mdi-video-off</v-icon
                              >
                            </v-slide-y-transition>
                            <v-slide-y-transition>
                              <v-icon
                                v-if="
                                  hover &&
                                    !isInitiator &&
                                    !player.isAudio &&
                                    player.id !== $socket.id
                                "
                                class="error--text"
                                >mdi-volume-off</v-icon
                              >
                            </v-slide-y-transition>
                          </v-row>
                        </v-col>
                        <v-col md="5" class="py-1 d-flex justify-end">
                          <v-slide-x-reverse-transition>
                            <v-btn
                              v-if="canCheckRole(player)"
                              icon
                              class="white--text"
                              @click="checkRole(player)"
                            >
                              <v-icon>mdi-magnify</v-icon>
                            </v-btn>
                          </v-slide-x-reverse-transition>
                          <v-slide-x-reverse-transition>
                            <v-btn
                              v-if="canVoteForKill(player)"
                              icon
                              @click="voteForKill(player)"
                              class="error--text white"
                            >
                              <v-icon>mdi-axe</v-icon>
                            </v-btn>
                          </v-slide-x-reverse-transition>
                          <v-slide-x-reverse-transition>
                            <v-btn
                              v-if="canHeal(player)"
                              icon
                              @click="heal(player)"
                              class="primary--text white"
                            >
                              <v-icon>mdi-bottle-tonic-plus</v-icon>
                            </v-btn>
                          </v-slide-x-reverse-transition>
                          <v-slide-x-reverse-transition>
                            <v-btn
                              v-if="canNomination(player)"
                              icon
                              @click="nomination(player)"
                              class="primary--text white"
                            >
                              <v-icon>mdi-account-alert</v-icon>
                            </v-btn>
                          </v-slide-x-reverse-transition>
                          <v-slide-x-reverse-transition>
                            <v-btn
                              v-if="canVoteForExile(player)"
                              icon
                              @click="voteForExile(player)"
                              class="primary--text white"
                            >
                              <v-icon>mdi-account-check</v-icon>
                            </v-btn>
                          </v-slide-x-reverse-transition>
                        </v-col>
                      </v-row>
                      <div class="d-flex justify-space-between align-end">
                        <div class="d-flex align-end">
                          <div class="bgtext px-1 py-1">
                            <span>{{ findIndexPc(player.id) + 1 }}. </span>
                            <span>{{ findPc(player.id).displayName }}</span>
                          </div>
                          <v-slide-y-reverse-transition>
                            <v-icon v-if="activePlayer(player)" class="primary--text ml-2"
                              >mdi-chat-alert</v-icon
                            >
                          </v-slide-y-reverse-transition>
                        </div>
                        <div class="d-flex align-end">
                          <v-slide-y-reverse-transition>
                            <v-icon v-if="player.isDeadLastRound" class="error--text ml-2"
                              >mdi-emoticon-dead</v-icon
                            >
                          </v-slide-y-reverse-transition>
                          <v-slide-x-transition>
                            <div class="bgtext px-1 py-1">
                              <span>{{ formatRole(player) }}</span>
                            </div>
                          </v-slide-x-transition>
                        </div>
                      </div>
                    </div>
                  </div>
                </v-hover>
              </v-badge>
            </v-badge>
          </v-row>
        </template>
      </v-col>
    </draggable>
  </div>
</template>

<script>
import moment from 'moment'
import draggable from 'vuedraggable'

export default {
  components: {
    draggable
  },

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
    gameInfo: {},
    dialog: {
      value: false,
      displayName: ''
    }
  }),
  computed: {
    getPlayerStreams() {
      return this.peerConnections
    }
  },

  sockets: {
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
      this.$set(this.findPc(uuid), 'isVisibleRole', false)
      this.$set(this.findPc(uuid), 'role', role)
      // this.$set(this.findPc(uuid), 'displayName', role)
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
      this.$set(this.findPc(id), 'isDeadLastRound', true)
    },
    nomination({id}) {
      this.$set(this.findPc(id), 'isNominate', true)
      this.$set(this.findPc(id), 'nominateIndex', this.nominateIndex)
      this.nominateIndex += 1
    },
    secondVoting(players) {
      this.secondVoting(players)
    },
    updateSettings({id, displayName}) {
      this.$set(this.findPc(id), 'displayName', displayName)
    },
    setGameInfo(info) {
      this.gameInfo = info
    },
    resetGameNight() {
      this.peerConnections.forEach(pc => {
        if (pc.isHeal) {
          this.$set(pc, 'isHealedLastRound', true)
        } else if (pc.isHealedLastRound && !pc.isHeal) {
          this.$set(pc, 'isHealedLastRound', false)
        }
        this.$set(pc, 'isHeal', false)
        this.$set(pc, 'killPlayers', [])
      })
      this.canCheck = true
    },
    resetGameDay() {
      this.peerConnections.forEach(pc => {
        this.$set(pc, 'isNominate', false)
        this.$set(pc, 'nominateIndex', 0)
        this.$set(pc, 'votePlayers', [])
        this.$set(pc, 'isDeadLastRound', false)
      })
      this.nominateIndex = 1
      this.canNominate = true
      this.isSecondVoting = false
    },
    startGame() {
      this.gameIsStarted = true
    },
    endGame() {
      this.$socket.emit('resetGameNight', {room: this.room})
      this.$socket.emit('resetGameDay', {room: this.room})
      this.peerConnections.forEach(pc => {
        this.$set(pc, 'isAlive', true)
        this.$set(pc, 'isVisibleRole', true)
      })
      this.isSecondVoting = false
      this.gameIsStarted = false
    },
    fullRoom() {
      alert('ROOM IS FOOL')
      this.$router.push('/')
    },
    join(settings) {
      const {displayName, isAudio, isVideo} = this.findPc(this.$socket.id)
      this.setUpPeer(settings)
      this.$socket.emit('createOffer', {
        id: this.$socket.id,
        displayName,
        dest: settings.id,
        room: this.room,
        isAudio,
        isVideo
      })
    },
    createOffer(settings) {
      this.setUpPeer(settings)
      this.findPc(settings.id)
        .pc.createOffer()
        .then(description => this.createdDescription(description, settings.id))
        .catch(this.errorHandler)
    },
    description({uuid: peerUuid, sdp}) {
      // console.log('SDP_TYPE', sdp.type)
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
    toggleVideo({id, state}) {
      const player = this.findPc(id)

      if (player.stream) {
        const videoTracks = player.stream.getVideoTracks()

        videoTracks.forEach(track => {
          track.enabled = state
        })
        this.$set(player, 'isVideo', state)
      }
    },
    toggleAudio({id, state}) {
      const player = this.findPc(id)

      if (player.stream) {
        const audioTracks = player.stream.getAudioTracks()

        audioTracks.forEach(track => {
          track.enabled = state
        })
        this.$set(player, 'isAudio', state)
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
      // console.log('Adding local stream.')
      this.peerConnections.push({
        stream,
        id: this.$socket.id,
        room: this.room,
        killPlayers: [],
        votePlayers: [],
        isAlive: true,
        nominateIndex: 0,
        isVideo: true,
        isAudio: true
      })
      this.$socket.emit('isInitiator', {
        room: this.room
      })
      this.$socket.emit('join', {
        id: this.$socket.id,
        room: this.room,
        isVideo: true,
        isAudio: true
      })
      // this.$socket.emit('test')
    },
    setUpPeer({id, displayName, isAudio, isVideo}) {
      // console.log('SET UP PEER')
      const {stream} = this.findPc(this.$socket.id)
      this.peerConnections.push({
        pc: new RTCPeerConnection(this.pcConfig),
        id,
        displayName,
        room: this.room,
        killPlayers: [],
        votePlayers: [],
        isAlive: true,
        nominateIndex: 0,
        isVideo,
        isAudio
      })
      const existPc = this.findPc(id)
      existPc.pc.onicecandidate = event => this.gotIceCandidate(event, id)
      existPc.pc.onaddstream = event => this.handleRemoteStreamAdded(event, id)
      existPc.pc.oniceconnectionstatechange = event => this.checkPeerDisconnect(event, id)
      existPc.pc.addStream(stream)
    },
    createdDescription(description, uuid) {
      // console.log('got description', uuid)

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
      // console.log('Remote stream added.', peerUuid)
      this.$set(this.findPc(peerUuid), 'stream', event.stream)
    },
    gotIceCandidate(event) {
      if (event.candidate != null) {
        // console.log('candidate')
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
    findIndexPc(id) {
      return this.peerConnections.findIndex(pc => pc.id === id)
    },

    canSeeToggleVideo(player) {
      return (
        player.stream.getVideoTracks()[0] && (player.id === this.$socket.id || this.isInitiator)
      )
    },
    toggleVideo({id, room, state = null}) {
      // console.log(id, room)
      const {stream} = this.findPc(id)
      const track = stream.getVideoTracks()[0]
      if (track) {
        this.$socket.emit('toggleVideo', {id, room, state: state ?? !track.enabled})
      }
    },

    canSeeToggleAudio(player) {
      return (
        player.stream.getAudioTracks()[0] && (player.id === this.$socket.id || this.isInitiator)
      )
    },
    toggleAudio({id, room, state = null}) {
      // console.log(id, room)
      const {stream} = this.findPc(id)
      const track = stream.getAudioTracks()[0]
      if (track) {
        this.$socket.emit('toggleAudio', {id, room, state: state ?? !track.enabled})
      }
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

    canVoteForExile({id, isAlive, votePlayers, isNominate}) {
      return (
        this.$socket.id !== id &&
        this.gameInfo.type === 'exile' &&
        !votePlayers.includes(this.$socket.id) &&
        this.findPc(this.$socket.id).isAlive &&
        isAlive &&
        isNominate
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

      if (!maxVotePlayers.length) {
        return
      }

      if (maxVotePlayers.length > 1) {
        if (this.isSecondVoting) {
          return
        }

        this.isSecondVoting = true
        const maxVotePlayersIds = maxVotePlayers.map(player => player.id)
        this.secondVoting(maxVotePlayersIds)
        this.$socket.emit('secondVoting', {
          room: this.room,
          players: maxVotePlayersIds
        })
        this.gameSteps.splice(-1, 0, ...this.gameVoting())
      } else {
        const {id, displayName} = maxVotePlayers[0]
        this.gameSteps.splice(
          -1,
          0,
          () => {
            this.duration = duration
            this.setGameInfo({text: `Last word ${displayName}`, type: 'last_word', active: id})
          },
          () => {
            this.duration = duration
            this.$socket.emit('kill', {
              id,
              room: this.room
            })
            this.toggleVideo({id, room: this.room, state: false})
            this.toggleAudio({id, room: this.room, state: false})
            this.setGameInfo({text: 'Prepare to the night'})
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
        this.toggleVideo({id, room: this.room, state: false})
        this.toggleAudio({id, room: this.room, state: false})
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
        this.gameInfo.type !== 'exile' &&
        ((['boss', 'mafia'].includes(role) && player.killPlayers.length) ||
          player.votePlayers.length)
      )
    },
    badgeContent(player) {
      return player.killPlayers.length || player.votePlayers.length
    },
    getListPlayers(player) {
      const {role} = this.findPc(this.$socket.id)

      if (['boss', 'mafia'].includes(role) && player.killPlayers.length) {
        return player.killPlayers
      } else {
        return player.votePlayers
      }
    },

    secondVoting(players) {
      this.nominateIndex = 1
      this.peerConnections.forEach(pc => {
        this.$set(pc, 'isNominate', false)
        this.$set(pc, 'nominateIndex', 0)
        this.$set(pc, 'votePlayers', [])
        if (players.includes(pc.id)) {
          this.$set(pc, 'isNominate', true)
          this.$set(pc, 'nominateIndex', this.nominateIndex)
          this.nominateIndex += 1
        }
      })
    },
    addDuration(e, duration = 10000) {
      this.duration += duration
    },
    startGame() {
      this.$socket.emit('startGame', {room: this.room})
      this.setGameInfo({text: 'Start game', type: 'start'})
      this.gameSteps = [...this.randezvous()]
      // this.gameSteps = [...this.gameDay()]
      this.nextStep(this.gameSteps[0], 5000)
      this.gameIsStarted = true
    },
    pauseGame() {
      this.isPause = !this.isPause
    },
    endGame() {
      this.peerConnections.forEach(({id, room}) => {
        this.toggleVideo({id, room, state: true})
        this.toggleAudio({id, room, state: true})
      })
      this.$socket.emit('endGame', {room: this.room})
      this.setGameInfo({text: 'Game over', type: 'end'})
      clearInterval(this.timer)
      this.gameIsStarted = false
    },
    setGameInfo(info) {
      this.gameInfo = info
      this.$socket.emit('setGameInfo', {
        ...info,
        room: this.room
      })
    },
    activePlayer(player) {
      return player.role && player.id === this.gameInfo.active
    },
    randezvous(duration = 5000) {
      const result = [
        ...this.peerConnections.map(player => () => {
          this.duration = duration
          this.setGameInfo({text: player.displayName, type: 'randezvous', active: player.id})
        }),
        () => {
          this.gameSteps.push(...this.gameNight())
        }
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
          this.gameSteps.push(...this.gameDay())
        }
      ]
    },
    gameDay(duration = 5000) {
      return [
        this.meeting,
        () => {
          this.duration = duration
          this.setGameInfo({text: 'nomination', type: 'nomination'})
          this.peerConnections
            .filter(player => player.isAlive)
            .forEach(player => {
              this.gameSteps.splice(1, 0, () => {
                this.duration = duration
                this.setGameInfo({text: player.displayName, type: 'nomination', active: player.id})
              })
            })
        },
        ...this.gameVoting(),
        () => {
          this.$socket.emit('resetGameDay', {room: this.room})
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
                this.setGameInfo({
                  text: `explanation ${player.displayName}`,
                  type: 'explanation',
                  active: player.id
                })
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
      this.$socket.emit('resetGameNight', {room: this.room})
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
    openDialog({displayName}) {
      this.dialog.value = true
      this.dialog.displayName = displayName
    },
    updateSettings() {
      this.dialog.value = false
      this.$socket.emit('updateSettings', {
        ...this.dialog,
        id: this.$socket.id,
        room: this.room
      })
    },
    goToNextStep() {
      this.duration = 0
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

<style lang="sass">
.pointer
  &:hover
    cursor: pointer

.bgtext
  background: rgba(0, 0, 0, .8)
  border-radius: 10px

.ghost
  opacity: 0.5
  background: #0079BF
  border-radius: 10px
</style>
