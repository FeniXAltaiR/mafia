<template>
  <v-hover v-slot:default="{hover}" open-delay="200">
    <div
      class="d-flex px-2 py-2 flex-column justify-space-between white--text"
      style="position: absolute; top: 0; height: 100%; width: 100%; border-radius: 8px;"
    >
      <v-row class="justify-space-between">
        <v-col md="5" class="py-0">
          <div>
            <v-menu absolute>
              <template v-slot:activator="{on}">
                <v-slide-x-transition>
                  <v-btn
                    icon
                    v-on="on"
                    class="white--text grey darken-4 mb-1"
                    v-if="hover && findPc($socket.id).isInitiator && player.id !== $socket.id"
                  >
                    <v-icon>mdi-dots-vertical</v-icon>
                  </v-btn>
                </v-slide-x-transition>
              </template>
              <v-list dense dark>
                <v-list-item @click="openDialogAlert({method: newInitiator, args: [player]})">
                  <v-list-item-title>{{ $t('mafia.newInitiator') }}</v-list-item-title>
                </v-list-item>
                <v-list-item
                  v-if="!game.gameIsStarted"
                  @click="openDialogAlert({method: banPlayer, args: [player]})"
                >
                  <v-list-item-title>{{ $t('mafia.banPlayer') }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </div>
          <div>
            <v-slide-x-transition>
              <v-btn
                icon
                class="white--text grey darken-4 mb-1"
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
                class="white--text grey darken-4 mb-1"
                @click="toggleAudio(player)"
                v-if="hover && canSeeToggleAudio(player)"
              >
                <v-icon v-if="player.isAudio">mdi-volume-high</v-icon>
                <v-icon v-else class="error--text">mdi-volume-off</v-icon>
              </v-btn>
            </v-slide-x-transition>
          </div>
        </v-col>
        <v-col md="2" class="py-1">
          <v-row class="justify-center">
            <v-slide-y-transition>
              <v-icon
                v-if="
                  hover &&
                    !findPc($socket.id).isInitiator &&
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
                    !findPc($socket.id).isInitiator &&
                    !player.isAudio &&
                    player.id !== $socket.id
                "
                class="error--text"
                >mdi-volume-off</v-icon
              >
            </v-slide-y-transition>
            <v-slide-y-transition>
              <v-icon v-if="hover && !player.stream && player.id !== $socket.id" class="error--text"
                >mdi-lan-disconnect</v-icon
              >
            </v-slide-y-transition>
            <v-slide-y-transition>
              <v-icon v-if="player.isDeadLastRound" class="main_color--text"
                >mdi-emoticon-dead</v-icon
              >
            </v-slide-y-transition>
            <v-slide-y-transition>
              <v-icon v-if="activePlayer(player)" class="accent_color--text">mdi-chat-alert</v-icon>
            </v-slide-y-transition>
          </v-row>
        </v-col>
        <v-col md="5" class="py-1 pr-4 d-flex justify-end">
          <v-slide-x-reverse-transition>
            <v-btn
              v-if="canCheckRole(player)"
              icon
              class="warning--text grey darken-4"
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
              class="error--text grey darken-4"
            >
              <v-icon>mdi-axe</v-icon>
            </v-btn>
          </v-slide-x-reverse-transition>
          <v-slide-x-reverse-transition>
            <v-btn
              v-if="canHeal(player)"
              icon
              @click="heal(player)"
              class="primary--text grey darken-4"
            >
              <v-icon>mdi-bottle-tonic-plus</v-icon>
            </v-btn>
          </v-slide-x-reverse-transition>
          <v-slide-x-reverse-transition>
            <v-btn
              v-if="canNomination(player)"
              icon
              @click="nomination(player)"
              class="primary--text grey darken-4"
            >
              <v-icon>mdi-account-alert</v-icon>
            </v-btn>
          </v-slide-x-reverse-transition>
          <v-slide-x-reverse-transition>
            <v-btn
              v-if="canVoteForExile(player)"
              icon
              @click="voteForExile(player)"
              class="primary--text grey darken-4"
            >
              <v-icon>mdi-account-check</v-icon>
            </v-btn>
          </v-slide-x-reverse-transition>
        </v-col>
      </v-row>
      <div class="d-flex justify-space-between align-end">
        <div class="d-flex align-end">
          <v-badge
            color="accent_color"
            right
            :content="player.nominateIndex"
            :value="player.nominateIndex"
          >
            <div class="bgtext bgtext--left px-2 py-2 elevation-4 grey darken-4">
              <span class="font-weight-black">{{ findIndexPc(player.id) + 1 }} | </span>
              <span>{{ findPc(player.id).displayName }}</span>
              <span v-if="findPc(player.id).isInitiator"> ({{ $t('mafia.leader') }})</span>
            </div>
          </v-badge>
        </div>
        <div class="d-flex align-end">
          <v-slide-x-transition>
            <v-badge color="error" left :value="canSeeBadge(player)">
              <template v-slot:badge>
                <v-tooltip left>
                  <template v-slot:activator="{on}">
                    <span class="pointer" v-on="on">{{ badgeContent(player) }}</span>
                  </template>
                  <div v-for="id in getListPlayers(player)" :key="id">
                    <span>{{ findIndexPc(id) + 1 }} | </span>
                    <span>{{ findPc(id).displayName }}</span>
                  </div>
                </v-tooltip>
              </template>
              <div class="bgtext bgtext--right px-2 py-1 elevation-4 accent_color">
                <!-- <span class="mr-2">{{ $t(`mafia.${formatRole(player)}`) }}</span> -->
                <v-tooltip open-delay="250" top>
                  <template v-slot:activator="{on}">
                    <div v-on="on">
                      <v-icon v-if="formatRole(player) === 'mafia'" class="black--text"
                        >mdi-alien</v-icon
                      >
                      <v-icon v-else-if="formatRole(player) === 'boss'" class="black--text"
                        >mdi-alpha-w-circle</v-icon
                      >
                      <v-icon v-else-if="formatRole(player) === 'citizen'" class="main_color--text"
                        >mdi-baby-face</v-icon
                      >
                      <v-icon
                        v-else-if="formatRole(player) === 'detective'"
                        class="main_color--text"
                        >mdi-binoculars</v-icon
                      >
                      <v-icon v-else-if="formatRole(player) === 'doctor'" class="main_color--text"
                        >mdi-medical-bag</v-icon
                      >
                      <v-icon v-else>mdi-artstation</v-icon>
                    </div>
                  </template>
                  <span>{{ $t(`mafia.${formatRole(player)}`) }}</span>
                </v-tooltip>
              </div>
            </v-badge>
          </v-slide-x-transition>
        </div>
      </div>
      <v-dialog v-model="dialogAlert.value" persistent max-width="600px" dark>
        <room-alert
          @confirm="confirmDialogAlert"
          @close="dialogAlert.value = false"
          :text="dialogAlert.text"
        ></room-alert>
      </v-dialog>
    </div>
  </v-hover>
</template>

<script>
import {mapGetters} from 'vuex'
import mixinMafia from '@/mixins/mafia'
import roomAlert from '@/components/room/alert'

export default {
  components: {
    roomAlert
  },

  props: {
    player: {
      type: Object
    }
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
    ...mapGetters(['userData', 'game', 'peerConnections'])
  },

  sockets: {
    banPlayer({id}) {
      this.$store.commit('DELETE_PEER_CONNECTIONS', id)
      if (this.$socket.id === id) {
        alert('You had banned')
      }
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
    }
  },

  methods: {
    newInitiator({id}) {
      this.$store.commit('CLEAR_TIMER')

      const player = this.findPc(this.$socket.id)
      this.$set(player, 'isInitiator', false)
      this.$socket.emit('updatePlayerInfo', {
        room: this.game.room,
        id: player.id,
        isInitiator: player.isInitiator
      })

      const playerInitiator = this.findPc(id)
      this.$set(playerInitiator, 'isInitiator', true)
      this.$socket.emit('updatePlayerInfo', {
        room: this.game.room,
        id: playerInitiator.id,
        isInitiator: playerInitiator.isInitiator
      })

      this.$store.commit('SET_GAME', {isPause: true})
      this.$socket.emit('updateRoomInfo', {
        room: this.game.room,
        isPause: this.game.isPause
      })

      this.$socket.emit('newInitiator', {
        id
      })
    },

    canSeeToggleVideo(player) {
      return (
        player?.stream?.getVideoTracks()[0] &&
        (player.id === this.$socket.id || this.findPc(this.$socket.id).isInitiator)
      )
    },

    canSeeToggleAudio(player) {
      return (
        player?.stream?.getAudioTracks()[0] &&
        (player.id === this.$socket.id || this.findPc(this.$socket.id).isInitiator)
      )
    },

    canCheckRole({id, global_id}) {
      const {role, isAlive, canCheck, isVisibleRole = []} = this.findPc(this.$socket.id) ?? {}

      return (
        this.$socket.id !== id &&
        !isVisibleRole.includes(global_id) &&
        isAlive &&
        ['detective', 'boss'].includes(role) &&
        role === this.game.gameInfo.type &&
        canCheck
      )
    },
    checkRole({global_id}) {
      const {isVisibleRole, global_id: fromId} = this.findPc(this.$socket.id)

      isVisibleRole.push(global_id)
      this.$set(this.findPc(this.$socket.id), 'canCheck', false)
      this.$socket.emit('updatePlayerInfo', {
        room: this.game.room,
        id: this.$socket.id,
        isVisibleRole,
        canCheck: false
      })

      this.addStatCheckRole({fromId, toId: global_id})
    },

    canNomination({id, isNominate = false, isAlive}) {
      const {isAlive: meIsAlive, canNominate} = this.findPc(this.$socket.id) ?? {}

      return (
        meIsAlive &&
        this.game.gameInfo.type === 'nomination' &&
        this.$socket.id !== id &&
        this.$socket.id === this.game.gameInfo.active &&
        canNominate &&
        !isNominate &&
        isAlive
      )
    },
    nomination({id}) {
      this.$set(this.findPc(id), 'isNominate', true)
      this.$set(this.findPc(id), 'nominateIndex', this.game.nominateIndex)
      this.$socket.emit('updatePlayerInfo', {
        room: this.game.room,
        id,
        isNominate: true,
        nominateIndex: this.game.nominateIndex
      })

      this.$store.commit('SET_GAME', {nominateIndex: this.game.nominateIndex + 1})
      this.$socket.emit('updateRoomInfo', {
        room: this.game.room,
        nominateIndex: this.game.nominateIndex
      })

      this.$set(this.findPc(this.$socket.id), 'canNominate', false)
      this.$socket.emit('updatePlayerInfo', {
        room: this.game.room,
        id: this.$socket.id,
        canNominate: false
      })

      this.addStatNomination({id})
    },

    canVoteForExile({id, isAlive, votePlayers, isNominate}) {
      const {global_id} = this.findPc(this.$socket.id)
      return (
        this.$socket.id !== id &&
        this.game.gameInfo.type === 'exile' &&
        !votePlayers.includes(global_id) &&
        this.findPc(this.$socket.id).isAlive &&
        isAlive &&
        isNominate
      )
    },
    voteForExile({id}) {
      const {global_id} = this.findPc(this.$socket.id)
      this.peerConnections.forEach(pc => {
        if (pc.id === id) {
          pc.votePlayers.push(global_id)
        } else {
          pc.votePlayers = pc.votePlayers.filter(id => id !== global_id)
        }
        this.$socket.emit('updatePlayerInfo', {
          room: this.game.room,
          id: pc.id,
          votePlayers: pc.votePlayers
        })
      })
    },

    canVoteForKill({id}) {
      const {role, isAlive, global_id} = this.findPc(this.$socket.id) ?? {}
      const {killPlayers = []} = this.findPc(id) ?? {}

      return (
        ['boss', 'mafia'].includes(role) &&
        this.game.gameInfo.type === 'mafia' &&
        isAlive &&
        !killPlayers.includes(global_id)
      )
    },
    voteForKill({id}) {
      const {global_id} = this.findPc(this.$socket.id)
      this.peerConnections.forEach(pc => {
        if (pc.id === id) {
          pc.killPlayers.push(global_id)
        } else {
          pc.killPlayers = pc.killPlayers.filter(id => id !== global_id)
        }
        this.$socket.emit('updatePlayerInfo', {
          room: this.game.room,
          id: pc.id,
          killPlayers: pc.killPlayers
        })
      })
    },

    canHeal({id}) {
      const {role, isAlive} = this.findPc(this.$socket.id) ?? {}
      const {isHeal, isHealedLastRound} = this.findPc(id) ?? {}

      return (
        role === 'doctor' &&
        role === this.game.gameInfo.type &&
        isAlive &&
        !isHeal &&
        !isHealedLastRound
      )
    },
    heal({id}) {
      this.peerConnections.forEach(pc => {
        if (pc.id === id) {
          this.$set(pc, 'isHeal', true)
        } else {
          this.$set(pc, 'isHeal', false)
        }
        this.$socket.emit('updatePlayerInfo', {
          room: this.game.room,
          id: pc.id,
          isHeal: pc.isHeal
        })
      })
    },

    canSeeBadge(player) {
      const {role} = this.findPc(this.$socket.id) ?? {}

      return (
        this.game.gameInfo.type !== 'exile' &&
        ((['boss', 'mafia'].includes(role) && player.killPlayers.length) ||
          player.votePlayers.length)
      )
    },
    badgeContent(player) {
      return player.killPlayers.length || player.votePlayers.length
    },
    getListPlayers(player) {
      const {role} = this.findPc(this.$socket.id) ?? {}

      if (['boss', 'mafia'].includes(role) && player.killPlayers.length) {
        return player.killPlayers
      } else {
        return player.votePlayers
      }
    },

    activePlayer({id, global_id, role}) {
      return role && [id, global_id].includes(this.game.gameInfo.active)
    },

    formatRole(player) {
      const {role, isVisibleRole} = this.findPc(this.$socket.id)
      if (
        (isVisibleRole.includes(player.global_id) && player.role) ||
        (player.id === this.$socket.id && player.role)
      ) {
        if (!this.game.gameIsStarted || player.id === this.$socket.id) {
          return player.role
        }

        if (['boss', 'mafia'].includes(player.role) && role === 'detective') {
          return 'mafia'
        } else if (!['boss', 'mafia'].includes(player.role) && role === 'detective') {
          return 'citizen'
        } else if (!['boss', 'mafia', 'detective'].includes(player.role) && role === 'boss') {
          return 'citizen'
        }

        return player.role
      }

      return 'undefinedRole'
    },

    banPlayer({id}) {
      this.$socket.emit('banPlayer', {id, room: this.game.room})
    }
  }
}
</script>
