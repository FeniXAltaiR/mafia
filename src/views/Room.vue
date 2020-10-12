<template>
  <div>
    <room-system></room-system>
    <draggable
      tag="v-row"
      v-model="peerConnections"
      ghostClass="ghost"
      class="align-center flex-wrap px-2 justify-center"
      v-if="$route.params.room"
    >
      <v-col
        md="3"
        sm="6"
        xs="12"
        class="align-self-stretch"
        v-for="player in getPlayerStreams"
        :key="player.id"
        style="position: relative;"
        @dblclick="getFullscreen(player.id)"
      >
        <template>
          <v-row class="justify-center px-1 fill-height">
            <div
              style="position: relative; width: 100%; height: 100%; border-radius: 8px"
              class="d-flex align-center align-self-stretch black"
            >
              <div v-if="player.stream" class="d-flex justify-center" style="width: 100%">
                <video
                  :srcObject.prop="player.stream"
                  autoplay
                  :controls="false"
                  :style="getVideoStyle"
                  :data-id="player.id"
                  style="object-fit: cover"
                  :muted="player.id === $socket.id"
                ></video>
              </div>
              <div
                v-if="streamOff(player)"
                class="d-flex px-2 pb-3 pt-1 align-center justify-center white--text black"
                style="height: 100%; width: 100%; top: 0; position: absolute; border-radius: 8px;"
              >
                <v-img
                  v-if="player.photoURL"
                  class="rounded-pill mr-2"
                  :src="player.photoURL"
                  style="max-height: 48px; max-width: 48px"
                ></v-img>
                <h1>{{ findPc(player.id).displayName }}</h1>
              </div>
              <room-info :player="player"></room-info>
            </div>
          </v-row>
        </template>
      </v-col>
    </draggable>

    <v-dialog v-model="dialogAlert.value" persistent max-width="600px" dark>
      <room-alert
        @confirm="confirmDialogAlert"
        @close="dialogAlert.value = false"
        :text="dialogAlert.text"
      ></room-alert>
    </v-dialog>
    <v-dialog v-model="dialogPassword.value" persistent max-width="600px" dark>
      <v-card>
        <v-card-title class="justify-space-between">
          <span class="headline">{{ $t('mafia.enterPassword') }}</span>
          <v-btn icon small color="main_color" @click="dialogPassword.value = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12" md="12">
                <v-text-field
                  type="password"
                  autofocus
                  :label="$t('mafia.password')"
                  v-model="dialogPassword.password"
                  required
                  @keypress.enter="checkPassword"
                  color="accent_color"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="accent_color" text @click="checkPassword">{{
            $t('mafia.checkPassword')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import moment from 'moment'
import draggable from 'vuedraggable'
import roomSystem from '@/components/room/system'
import roomInfo from '@/components/room/info'
import roomAlert from '@/components/room/alert'
import {mapGetters} from 'vuex'
import mixinMafia from '@/mixins/mafia'

export default {
  components: {
    draggable,
    roomSystem,
    roomInfo,
    roomAlert
  },

  mixins: [mixinMafia],

  data: () => ({
    speechSynthesisUtterance: null,

    dialogAlert: {
      value: false,
      method: null,
      text: '',
      args: []
    },
    dialogPassword: {
      value: false,
      password: '',
      orig_password: '',
      stream: null
    }
  }),
  computed: {
    getPlayerStreams() {
      return this.peerConnections
    },
    getVideoStyle() {
      const rows = Math.ceil(this.peerConnections.length / 4)
      return {
        'max-height': `calc((100vh - 120px - ${rows * 20}px) / ${rows})`,
        'max-width': '100%',
        'border-radius': '8px'
      }
    },
    ...mapGetters(['userData', 'game', 'peerConnections'])
  },

  sockets: {
    reconnecting() {
      console.log('reconnecting')
    },
    reconnect_attempt() {
      console.log('reconnect_attempt')
    },
    disconnect() {
      console.log('disconnect')
      this.$store.commit('CLEAR_PEER_CONNECTIONS')
      this.$store.commit('CLEAR_TIMER')
    },
    disconnecting() {
      console.log('disconnecting')
    },
    disconnectPlayer({id}) {
      this.$store.commit('SET_GAME', {
        isPause: true
      })
      const player = this.findPc(id)
      if (player.stream) {
        player.stream.getTracks().forEach(track => {
          track.stop()
        })
      }
      if (player.pc) {
        player.pc.close()
      }
      // this.$delete(player, 'stream')
      // this.$delete(player, 'pc')
    },
    test(msg) {
      console.dir(msg)
    },
    speechSpeak({text}) {
      this.speechSynthesisUtterance.text = text
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(this.speechSynthesisUtterance)
    },
    getRole({id, role}) {
      this.$set(this.findPc(id), 'isVisibleRole', [])
      this.$set(this.findPc(id), 'role', role)
    },
    updatePlayerInfo(settings) {
      const player = this.findPc(settings.global_id || settings.id)
      // console.log('PLAYER_INFO', player)
      if (player.id) {
        Object.entries(settings).forEach(([key, value]) => {
          this.$set(player, key, value)
        })
      }
    },
    updateRoomInfo(settings) {
      // console.log('ROOM_INFO', settings)
      this.$store.commit('SET_GAME', settings)
    },
    message({msg}) {
      alert(msg)
      this.$router.push('/')
    },
    checkPassword({password}) {
      this.dialogPassword = {
        value: true,
        password: '',
        orig_password: password
      }
    }
  },

  mounted() {
    this.setSpeechSettings()
  },
  beforeDestroy() {
    const {stream = null} = this.findPc(this.$socket.id)
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop()
      })
    }
    this.$socket.emit('leaveFromRoom', {room: this.game.room})
  },

  methods: {
    streamOff(player) {
      return (
        !player.stream ||
        !player.isVideo ||
        ['failed', 'closed', 'disconnected'].includes(player?.pc?.connectionState)
      )
    },
    getFullscreen(id) {
      const video = document.querySelector(`video[data-id="${id}"]`)
      video.requestFullscreen()
    },

    checkPassword() {
      const {password, orig_password} = this.dialogPassword
      if (password === orig_password) {
        const {stream, ...player} = this.findPc(this.$socket.id)
        this.$socket.emit('join', {...player, password})
      } else {
        alert('game.password is incorrect')
        this.$store.commit('CLEAR_PEER_CONNECTIONS')
      }
      this.dialogPassword = {
        value: false,
        password: '',
        orig_password: ''
      }
    },

    setSpeechSettings() {
      const voices = window.speechSynthesis.getVoices()

      this.speechSynthesisUtterance = new SpeechSynthesisUtterance()
      this.speechSynthesisUtterance.voice = voices[17]
      this.speechSynthesisUtterance.rate = 0.8
    }
  }
}
</script>

<style lang="sass">
.pointer
  &:hover
    cursor: pointer

.bgtext
  // background: #499500
  &--left
    // border-radius: 0 8px 0 8px
    border-radius: 8px
  &--right
    // border-radius: 8px 0 8px 0
    border-radius: 8px

.ghost
  opacity: 0.25
  background: #920031
  border-radius: 10px

video::-webkit-media-controls
  display:none !important

.v-window__container
  background: #1e1e1e !important
</style>
