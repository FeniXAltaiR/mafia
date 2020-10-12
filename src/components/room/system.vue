<template>
  <v-row class="px-5 justify-space-between mb-2">
    <v-col md="2">
      <v-row class="align-start">
        <h3 class="white--text">{{ game.name }}</h3>
      </v-row>
    </v-col>
    <v-col md="5" class="grey darken-4 elevation-2 rounded-pill pa-0 d-flex align-center">
      <v-row class="justify-center align-center fill-height">
        <v-col
          md="5"
          class="d-flex justify-end align-center align-self-stretch"
          style="border-right: solid 2px #1e1e1e"
        >
          <h3
            class="white--text"
            :class="{
              'accent_color--text': game.gameInfo.text === $t('mafia.citizenWin'),
              'main_color--text': game.gameInfo.text === $t('mafia.mafiaWin')
            }"
          >
            {{ game.gameInfo.text }}
          </h3>
        </v-col>

        <v-col md="2" class="d-flex justify-center align-center">
          <h3 class="white--text mx-2">{{ getTime }}</h3>
        </v-col>

        <v-col
          md="5"
          class="d-flex align-center align-self-stretch"
          style="border-left: solid 2px #1e1e1e"
        >
          <v-tooltip open-delay="250" bottom>
            <template v-slot:activator="{on}">
              <v-btn
                icon
                small
                @click="pauseGame"
                class="white--text"
                v-on="on"
                v-show="game.gameIsStarted && findPc($socket.id).isInitiator"
              >
                <v-icon>mdi-{{ game.isPause ? 'play' : 'pause' }}</v-icon>
              </v-btn>
            </template>
            <span>{{ game.isPause ? $t('mafia.play') : $t('mafia.pause') }}</span>
          </v-tooltip>
          <v-tooltip open-delay="250" bottom>
            <template v-slot:activator="{on}">
              <v-btn
                icon
                small
                @click="startGame"
                class="white--text"
                v-on="on"
                v-show="!game.gameIsStarted && findPc($socket.id).isInitiator"
              >
                <v-icon>mdi-play</v-icon>
              </v-btn>
            </template>
            <span>{{ $t('mafia.startGame') }}</span>
          </v-tooltip>
          <v-tooltip open-delay="250" bottom>
            <template v-slot:activator="{on}">
              <v-btn
                icon
                small
                @click="addDuration"
                class="white--text"
                v-on="on"
                v-show="game.gameIsStarted && findPc($socket.id).isInitiator"
              >
                <v-icon>mdi-plus</v-icon>
              </v-btn>
            </template>
            <span>{{ $t('mafia.addDuration') }}</span>
          </v-tooltip>
          <v-tooltip open-delay="250" bottom>
            <template v-slot:activator="{on}">
              <v-btn
                icon
                small
                @click="goToNextStep"
                class="white--text"
                v-on="on"
                v-show="game.gameIsStarted && findPc($socket.id).isInitiator"
              >
                <v-icon>mdi-skip-next</v-icon>
              </v-btn>
            </template>
            <span>{{ $t('mafia.goToNextStep') }}</span>
          </v-tooltip>
          <v-tooltip open-delay="250" bottom>
            <template v-slot:activator="{on}">
              <v-btn
                v-show="game.gameIsStarted && findPc($socket.id).isInitiator"
                icon
                small
                @click="openDialogAlert({method: endGame})"
                class="white--text"
                v-on="on"
              >
                <v-icon>mdi-exit-run</v-icon>
              </v-btn>
            </template>
            <span>{{ $t('mafia.endGame') }}</span>
          </v-tooltip>
          <room-statistics></room-statistics>
          <room-connect></room-connect>
        </v-col>
      </v-row>
    </v-col>
    <v-col md="2">
      <room-actions></room-actions>
    </v-col>
    <canvas class="d-none"></canvas>
    <v-dialog v-model="dialogAlert.value" persistent max-width="600px" dark>
      <room-alert
        @confirm="confirmDialogAlert"
        @close="dialogAlert.value = false"
        :text="dialogAlert.text"
      ></room-alert>
    </v-dialog>
  </v-row>
</template>

<script>
import roomConnect from '@/components/room/connect'
import roomActions from '@/components/room/actions'
import roomStatistics from '@/components/room/statistics'
import roomAlert from '@/components/room/alert'

import {mapGetters} from 'vuex'
import moment from 'moment'
import mixinMafia from '@/mixins/mafia'

export default {
  components: {
    roomConnect,
    roomActions,
    roomStatistics,
    roomAlert
  },

  mixins: [mixinMafia],

  data: () => ({
    dialogAlert: {
      value: false,
      method: null,
      text: '',
      args: []
    }
  }),
  computed: {
    getTime() {
      return moment(this.game.duration).format('mm:ss')
    },
    ...mapGetters(['userData', 'game', 'peerConnections'])
  },

  sockets: {
    newInitiator() {
      if (this.game.gameIsStarted) {
        this.nextStep(this.game.gameSteps[0], this.game.duration)
      }
    }
  },

  methods: {
    pauseGame() {
      this.$store.commit('SET_GAME', {isPause: !this.game.isPause})
      this.$socket.emit('updateRoomInfo', {room: this.game.room, isPause: this.game.isPause})
    },
    startGame() {
      const settings = {
        statistics: [],
        gameSteps: [...this.randezvous()],
        duration: 5000,
        gameIsStarted: true,
        isPause: false
      }
      this.$store.commit('SET_GAME', settings)
      this.$socket.emit('startGame', {room: this.game.room, ...settings})
      this.setGameInfo({text: this.$t('mafia.startingGame'), type: 'start'})
      this.nextStep(this.game.gameSteps[0], 5000)
      this.makeScreenshots()
      this.addStatPlayers()
    },
    endGame() {
      this.peerConnections.forEach(({id, room}) => {
        this.toggleVideo({id, room, state: true})
        this.toggleAudio({id, room, state: true})
      })
      this.resetGameNight()
      this.resetGameDay()
      this.peerConnections.forEach(pc => {
        this.$set(pc, 'isAlive', true)
        this.$set(pc, 'isVisibleRole', [...this.peerConnections.map(pc => pc.global_id)])
        this.$socket.emit('updatePlayerInfo', {
          room: this.game.room,
          id: pc.id,
          isAlive: pc.isAlive,
          isVisibleRole: pc.isVisibleRole
        })
      })

      const settings = {
        duration: 0,
        isSecondVoting: false,
        gameIsStarted: false
      }
      this.$store.commit('SET_GAME', settings)
      this.$socket.emit('updateRoomInfo', {
        room: this.game.room,
        ...settings
      })

      this.$store.commit('CLEAR_TIMER')
    },

    setGameInfo(info) {
      this.$store.commit('SET_GAME', {
        gameInfo: info
      })
      this.$socket.emit('setGameInfo', {
        gameInfo: info,
        room: this.game.room
      })
    },

    addDuration(e, duration = 10000) {
      this.$store.commit('SET_GAME', {duration: this.game.duration + duration})
      this.$socket.emit('updateRoomInfo', {room: this.game.room, duration: this.game.duration})
    },

    nextStep({method, options = {}}, duration = null) {
      const timer = setInterval(() => {
        if (!this.game.isPause) {
          this.$store.commit('SET_GAME', {duration: Math.max(0, this.game.duration - 1000)})
          this.$socket.emit('updateRoomInfo', {room: this.game.room, duration: this.game.duration})

          if (this.game.duration <= 0) {
            this.executeNextStep({method, options})
          }
        }
      }, 1000)
      this.$store.commit('SET_TIMER', timer)
    },
    executeNextStep({method, options = {}}) {
      const {done, winner} = this.shouldEndGame()
      if (done) {
        this.endGame()
        this.setGameInfo({text: this.$t(`mafia.${winner}`), type: 'end'})
        this.speechSpeak({text: this.$t(`mafia.${winner}`)})
      } else {
        this[method](options)
        this.$store.commit('CLEAR_TIMER')
        this.removeNextStep()
        this.nextStep(this.game.gameSteps[0], this.game.duration)
      }
    },
    removeNextStep() {
      const {gameSteps} = this.game
      gameSteps.shift()
      this.$store.commit('SET_GAME', {gameSteps})
      this.$socket.emit('updateRoomInfo', {id: this.game.room, gameSteps: this.game.gameSteps})
    },
    goToNextStep() {
      this.$store.commit('SET_GAME', {duration: 0})
      this.executeNextStep(this.game.gameSteps[0])
    },

    // Stats
    addStat(stat) {
      const lastEl = this.game.statistics[this.game.statistics.length - 1] ?? {}
      if (lastEl.title === stat.title) {
        lastEl.players = [...lastEl.players, ...stat.players]
      } else {
        const {statistics} = this.game
        statistics.push(stat)
        this.$store.commit('SET_GAME', {statistics})
      }
      this.$socket.emit('updateRoomInfo', {
        room: this.game.room,
        statistics: this.game.statistics
      })
    },
    addStatPlayers() {
      const players = [
        {
          from: this.peerConnections.map(pc => pc.global_id)
        }
      ]

      this.addStat({
        title: 'players',
        players
      })
    },
    addStatMafia() {
      const players = this.peerConnections
        .filter(pc => pc.killPlayers.length)
        .map(pc => ({
          from: pc.killPlayers,
          to: pc.id
        }))

      this.addStat({
        title: 'mafia',
        icon: 'mdi-axe',
        iconClass: 'error--text',
        players
      })
    },
    addStatCheckRole({fromId, toId}) {
      const {role} = this.findPc(fromId)

      this.addStat({
        title: role,
        icon: 'mdi-magnify',
        iconClass: 'warning--text',
        players: [
          {
            from: [fromId],
            to: toId
          }
        ]
      })
    },
    addStatDoctor() {
      const doctor = this.peerConnections.find(pc => pc.role === 'doctor' && pc.isAlive)
      if (!doctor) return

      const playerIsHealed = this.peerConnections.find(pc => pc.isHeal)

      this.addStat({
        title: 'doctor',
        icon: 'mdi-bottle-tonic-plus',
        iconClass: 'primary--text',
        players: [
          {
            from: [doctor.global_id],
            to: playerIsHealed ? playerIsHealed.id : null
          }
        ]
      })
    },
    addStatNomination({id}) {
      const {global_id} = this.findPc(this.$socket.id)
      this.addStat({
        title: 'nomination',
        icon: 'mdi-account-alert',
        iconClass: 'primary--text',
        players: [
          {
            from: [global_id],
            to: id
          }
        ]
      })
    },
    addStatVoting() {
      const players = this.peerConnections
        .filter(pc => pc.votePlayers.length)
        .map(pc => ({
          from: pc.votePlayers,
          to: pc.id
        }))

      this.addStat({
        title: this.game.isSecondVoting ? 'secondVotingResult' : 'votingResult',
        icon: 'mdi-account-check',
        iconClass: 'primary--text',
        players
      })
    },
    addStatKill({id}) {
      const {global_id} = this.findPc(id)
      this.addStat({
        title: 'dead',
        icon: 'mdi-emoticon-dead',
        iconClass: 'error--text',
        players: [
          {
            from: [global_id]
          }
        ]
      })
    },

    // gameSteps
    executeGameStep({
      duration = this.game.duration,
      info = null,
      speech = null,
      emit = null,
      methods = []
    } = {}) {
      this.$store.commit('SET_GAME', {duration})

      if (info) {
        this.setGameInfo(info)
      }

      if (speech) {
        this.speechSpeak(speech)
      }

      if (emit) {
        this.$socket.emit(emit.name, emit.options)
      }

      methods.forEach(({f, args = []}) => {
        this[f](...args)
      })
    },
    setGameNight() {
      this.resetGameDay()
      const {gameSteps} = this.game
      gameSteps.push(...this.gameNight())
      this.$store.commit('SET_GAME', {gameSteps})
    },
    setGameDay() {
      const {gameSteps} = this.game
      gameSteps.push(...this.gameDay())
      this.$store.commit('SET_GAME', {gameSteps})
    },
    setGameVoting() {
      const {gameSteps} = this.game
      gameSteps.splice(-1, 0, ...this.gameVoting())
      this.$store.commit('SET_GAME', {gameSteps})
      this.$socket.emit('gameVoting', {room: this.game.room})
    },
    setGameExplanation({duration = 30000} = {}) {
      this.peerConnections
        .filter(player => player.isAlive && player.isNominate)
        .sort((playerA, playerB) => (playerA.nominateIndex > playerB.nominateIndex ? 1 : -1))
        .forEach(player => {
          this.gameExplanation({duration, player})
        })
    },
    randezvous(duration = 60000) {
      return [
        ...this.peerConnections
          .filter(player => player.stream)
          .map(player => ({
            method: 'executeGameStep',
            options: {
              duration,
              info: {
                text: `${this.$t('mafia.randezvous')}: ${player.displayName}`,
                type: 'randezvous',
                active: player.id
              }
            }
          })),
        {
          method: 'setGameNight'
        }
      ]
    },
    gameNight(duration = 5000) {
      return [
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.citySleep')
            },
            speech: {
              text: this.$t('mafia.citySleep')
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.mafiaWakeUp')
            },
            speech: {
              text: this.$t('mafia.mafiaWakeUp')
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration: 20000,
            info: {
              text: `${this.$t('mafia.night')}: ${this.$t('mafia.mafia')}`,
              type: 'mafia'
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.mafiaSleep')
            },
            speech: {
              text: this.$t('mafia.mafiaSleep')
            },
            methods: [
              {
                f: 'addStatMafia'
              }
            ]
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.bossWakeUp')
            },
            speech: {
              text: this.$t('mafia.bossWakeUp')
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration: 20000,
            info: {
              text: `${this.$t('mafia.night')}: ${this.$t('mafia.boss')}`,
              type: 'boss'
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.bossSleep')
            },
            speech: {
              text: this.$t('mafia.bossSleep')
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.detectiveWakeUp')
            },
            speech: {
              text: this.$t('mafia.detectiveWakeUp')
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration: 20000,
            info: {
              text: `${this.$t('mafia.night')}: ${this.$t('mafia.detective')}`,
              type: 'detective'
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.detectiveSleep')
            },
            speech: {
              text: this.$t('mafia.detectiveSleep')
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.doctorWakeUp')
            },
            speech: {
              text: this.$t('mafia.doctorWakeUp')
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration: 20000,
            info: {
              text: `${this.$t('mafia.night')}: ${this.$t('mafia.doctor')}`,
              type: 'doctor'
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.doctorSleep')
            },
            speech: {
              text: this.$t('mafia.doctorSleep')
            },
            methods: [
              {
                f: 'addStatDoctor'
              }
            ]
          }
        },
        {
          method: 'shouldKill',
          options: {
            duration: 0
          }
        },
        {
          method: 'setGameDay'
        }
      ]
    },
    gameDay(duration = 5000) {
      return [
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.cityWakeUp')
            },
            speech: {
              text: this.$t('mafia.cityWakeUp')
            }
          }
        },
        {
          method: 'meeting'
        },
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.prepareToTheNomination'),
              type: 'nomination'
            }
          }
        },
        ...this.peerConnections
          .filter(player => player.isAlive && player.stream)
          .map(player => ({
            method: 'executeGameStep',
            options: {
              duration: 60000,
              info: {
                text: `${this.$t('mafia.nomination')}: ${player.displayName}`,
                type: 'nomination',
                active: player.id
              }
            }
          })),
        {
          method: 'setGameVoting'
        },
        {
          method: 'setGameNight'
        }
      ]
    },
    gameVoting(duration = 5000) {
      return [
        {
          method: 'setGameExplanation'
        },
        {
          method: 'executeGameStep',
          options: {
            duration: 10000,
            info: {
              text: this.$t('mafia.voteForExile'),
              type: 'exile'
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration: 10000,
            info: {
              text: this.$t('mafia.votingResult'),
              type: 'voting'
            },
            methods: [
              {
                f: 'addStatVoting'
              }
            ]
          }
        },
        {
          method: 'exile',
          options: {
            duration: 5000
          }
        }
      ]
    },
    gameExplanation({duration, player}) {
      const {gameSteps} = this.game
      gameSteps.splice(-4, 0, {
        method: 'executeGameStep',
        options: {
          duration,
          info: {
            text: `${this.$t('mafia.explanation')}: ${player.displayName}`,
            type: 'explanation',
            active: player.id
          }
        }
      })
      this.$store.commit('SET_GAME', {gameSteps})
    },
    gameLastWord({duration = 5000, id, displayName}) {
      return [
        {
          method: 'executeGameStep',
          options: {
            duration: 60000,
            info: {
              text: `${this.$t('mafia.lastWord')}: ${displayName}`,
              type: 'last_word',
              active: id
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.prepareToTheNight')
            },
            methods: [
              {
                f: 'killPlayer',
                args: [{id}]
              },
              {
                f: 'addStatKill',
                args: [{id}]
              },
              {
                f: 'toggleVideo',
                args: [{id, room: this.game.room, state: false}]
              },
              {
                f: 'toggleAudio',
                args: [{id, room: this.game.room, state: false}]
              }
            ]
          }
        }
      ]
    },
    meeting({duration = 180000} = {}) {
      this.resetGameNight()
      this.$store.commit('SET_GAME', {duration})
      this.setGameInfo({text: this.$t('mafia.meeting'), type: 'meeting'})
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
        this.$set(pc, 'canCheck', true)
        this.$socket.emit('updatePlayerInfo', {
          room: this.game.room,
          id: pc.id,
          isHealedLastRound: pc.isHealedLastRound,
          isHeal: pc.isHeal,
          killPlayers: pc.killPlayers,
          canCheck: pc.canCheck
        })
      })
    },
    resetGameDay() {
      this.peerConnections.forEach(pc => {
        this.$set(pc, 'isNominate', false)
        this.$set(pc, 'nominateIndex', 0)
        this.$set(pc, 'votePlayers', [])
        this.$set(pc, 'isDeadLastRound', false)
        this.$set(pc, 'canNominate', true)
        this.$socket.emit('updatePlayerInfo', {
          room: this.game.room,
          id: pc.id,
          isNominate: pc.isNominate,
          nominateIndex: pc.nominateIndex,
          votePlayers: pc.votePlayers,
          isDeadLastRound: pc.isDeadLastRound,
          canNominate: pc.canNominate
        })
      })

      const settings = {
        nominateIndex: 1,
        isSecondVoting: false
      }
      this.$store.commit('SET_GAME', settings)
      this.$socket.emit('updateRoomInfo', {
        room: this.game.room,
        ...settings
      })
    },
    shouldEndGame() {
      const mafia = this.peerConnections.filter(
        player =>
          ['boss', 'mafia'].includes(player.role) && player.isAlive && player.role && player.stream
      )
      const citizen = this.peerConnections.filter(
        player =>
          !['boss', 'mafia'].includes(player.role) && player.isAlive && player.role && player.stream
      )

      const getWinner = () => {
        if (mafia.length >= citizen.length) {
          return 'mafiaWin'
        } else if (!mafia.length) {
          return 'citizenWin'
        } else {
          return null
        }
      }

      return {
        done: mafia.length >= citizen.length || !mafia.length,
        winner: getWinner()
      }
    },

    shouldKill() {
      const {id, killPlayers, isHeal, isAlive} = this.peerConnections.reduce((result, pc) => {
        if (pc.killPlayers.length > result.killPlayers.length) {
          return pc
        }
        return result
      })
      if (killPlayers.length && !isHeal && isAlive) {
        this.killPlayer({id})
        this.toggleVideo({id, room: this.game.room, state: false})
        this.toggleAudio({id, room: this.game.room, state: false})
        this.addStatKill({id})
      }
    },
    killPlayer({id}) {
      this.$set(this.findPc(id), 'isAlive', false)
      this.$set(this.findPc(id), 'isDeadLastRound', true)
      this.$socket.emit('updatePlayerInfo', {
        room: this.game.room,
        id,
        isAlive: false,
        isDeadLastRound: true
      })
    },
    exile({duration = 5000} = {}) {
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
        if (this.game.isSecondVoting) {
          return
        }

        const maxVotePlayersIds = maxVotePlayers.map(player => player.id)
        this.secondVoting(maxVotePlayersIds)
        const {gameSteps} = this.game
        gameSteps.splice(-1, 0, ...this.gameVoting())
        this.$store.commit('SET_GAME', {gameSteps})
      } else {
        const {id, displayName} = maxVotePlayers[0]
        const {gameSteps} = this.game
        gameSteps.splice(-1, 0, ...this.gameLastWord({duration, id, displayName}))
        this.$store.commit('SET_GAME', {gameSteps})
      }
    },
    secondVoting(players) {
      const settings = {
        isSecondVoting: true,
        nominateIndex: 1
      }
      this.$store.commit('SET_GAME', settings)
      this.$socket.emit('updateRoomInfo', {
        room: this.game.room,
        ...settings
      })
      this.peerConnections.forEach(pc => {
        this.$set(pc, 'isNominate', false)
        this.$set(pc, 'nominateIndex', 0)
        this.$set(pc, 'votePlayers', [])
        if (players.includes(pc.id)) {
          this.$set(pc, 'isNominate', true)
          this.$set(pc, 'nominateIndex', this.game.nominateIndex)
          this.$store.commit('SET_GAME', {nominateIndex: this.game.nominateIndex + 1})
          this.$socket.emit('updateRoomInfo', {
            room: this.game.room,
            nominateIndex: this.game.nominateIndex
          })
        }
        this.$socket.emit('updatePlayerInfo', {
          room: this.game.room,
          id: pc.id,
          isNominate: pc.isNominate,
          nominateIndex: pc.nominateIndex,
          votePlayers: pc.votePlayers
        })
      })
    },

    makeScreenshots() {
      const canvas = document.querySelector('canvas')
      const videos = document.querySelectorAll('video')

      videos.forEach(video => {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)

        const src = canvas.toDataURL('image/png')
        const player = this.findPc(video.dataset.id)
        this.$set(player, 'src', src)
      })

      canvas.width = 0
      canvas.height = 0
      this.peerConnections.forEach(pc => {
        this.$socket.emit('updatePlayerInfo', {
          room: this.game.room,
          id: pc.id,
          src: pc.src
        })
      })
    }
  }
}
</script>
