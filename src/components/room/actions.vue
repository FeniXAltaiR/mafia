<template>
  <v-row class="align-center justify-end">
    <v-tooltip open-delay="250" bottom v-if="!game.gameIsStarted && findPc($socket.id).isInitiator">
      <template v-slot:activator="{on}">
        <v-btn icon small @click="sortPlayers" class="white--text" v-on="on">
          <v-icon>mdi-update</v-icon>
        </v-btn>
      </template>
      <span>{{ $t('mafia.sortPlayers') }}</span>
    </v-tooltip>
    <v-tooltip open-delay="250" bottom>
      <template v-slot:activator="{on}">
        <v-btn icon class="white--text" v-on="on" @click="openDialogSettings">
          <v-icon>mdi-cog</v-icon>
        </v-btn>
      </template>
      <span>{{ $t('mafia.settings') }}</span>
    </v-tooltip>
    <v-tooltip open-delay="250" bottom>
      <template v-slot:activator="{on}">
        <v-btn icon class="white--text" v-on="on" @click="openDialogAlert({method: exit})">
          <v-icon>mdi-exit-to-app</v-icon>
        </v-btn>
      </template>
      <span>{{ $t('mafia.exit') }}</span>
    </v-tooltip>

    <v-dialog v-model="dialogSettings.value" persistent max-width="600px" dark>
      <v-card>
        <v-card-title class="justify-space-between">
          <span class="headline">{{ $t('mafia.settings') }}</span>
          <v-btn icon small color="main_color" @click="dialogSettings.value = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text class="pa-0">
          <v-tabs background-color="transparent" class="elevation-2 px-2" dark>
            <v-tabs-slider color="accent_color"></v-tabs-slider>

            <v-tab>
              <span>{{ $t(`mafia.personal`) }}</span>
            </v-tab>
            <v-tab v-if="findPc($socket.id).isInitiator">
              <span>{{ $t(`mafia.room`) }}</span>
            </v-tab>
            <v-tab v-if="findPc($socket.id).isInitiator">
              <span>{{ $t(`mafia.other`) }}</span>
            </v-tab>

            <v-tab-item dark>
              <v-card flat tile dark>
                <v-card-text>
                  <v-text-field
                    autofocus
                    :label="$t('mafia.nickname')"
                    v-model="dialogSettings.displayName"
                    required
                    @keypress.enter="updateSettings"
                    color="accent_color"
                  ></v-text-field>
                </v-card-text>

                <v-divider class="main_color"></v-divider>

                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn color="accent_color" text @click="updateSettings">{{
                    $t('mafia.save')
                  }}</v-btn>
                </v-card-actions>
              </v-card>
            </v-tab-item>

            <v-tab-item dark v-if="findPc($socket.id).isInitiator">
              <v-card flat tile dark>
                <v-card-text>
                  <v-text-field
                    v-if="findPc($socket.id).isInitiator"
                    :label="$t('mafia.nameOfTheRoom')"
                    v-model="dialogSettings.name"
                    required
                    @keypress.enter="updateSettings"
                    color="accent_color"
                  ></v-text-field>
                  <v-text-field
                    v-if="findPc($socket.id).isInitiator"
                    type="number"
                    :max="20"
                    :min="1"
                    :label="$t('mafia.limitOfPlayers')"
                    v-model="dialogSettings.limit"
                    required
                    @keypress.enter="updateSettings"
                    color="accent_color"
                  ></v-text-field>
                  <v-text-field
                    v-if="findPc($socket.id).isInitiator"
                    type="password"
                    :label="$t('mafia.password')"
                    v-model="dialogSettings.password"
                    required
                    @keypress.enter="updateSettings"
                    color="accent_color"
                  ></v-text-field>
                </v-card-text>

                <v-divider class="main_color"></v-divider>

                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn color="accent_color" text @click="updateSettings">{{
                    $t('mafia.save')
                  }}</v-btn>
                </v-card-actions>
              </v-card>
            </v-tab-item>

            <v-tab-item dark v-if="findPc($socket.id).isInitiator">
              <v-card flat tile dark>
                <v-card-text>
                  <v-text-field
                    v-if="findPc($socket.id).isInitiator"
                    :label="$t('mafia.speech')"
                    v-model="dialogSettings.speech"
                    required
                    @keypress.enter="updateSettings"
                    color="accent_color"
                  ></v-text-field>
                </v-card-text>

                <v-divider class="main_color"></v-divider>

                <v-card-actions>
                  <v-spacer></v-spacer>
                  <v-btn color="accent_color" text @click="updateSettings">{{
                    $t('mafia.save')
                  }}</v-btn>
                </v-card-actions>
              </v-card>
            </v-tab-item>
          </v-tabs>
        </v-card-text>
      </v-card>
    </v-dialog>
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
import {mapGetters} from 'vuex'
import mixinMafia from '@/mixins/mafia'
import roomAlert from '@/components/room/alert'

export default {
  components: {
    roomAlert
  },

  mixins: [mixinMafia],

  data: () => ({
    dialogSettings: {
      value: false,
      displayName: '',
      speech: ''
    },
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
    sortPlayers({players}) {
      players.forEach(player => {
        this.$set(this.findPc(player.id), 'order', player.index)
      })
      this.peerConnections.sort((playerA, playerB) => (playerA.order > playerB.order ? 1 : -1))
      this.peerConnections.forEach(pc => {
        this.$delete(pc, 'order')
      })
    }
  },

  methods: {
    sortPlayers() {
      const numbers = this.peerConnections
        .map((pc, index) => index)
        .sort(() => (Math.random() > 0.5 ? 1 : -1))
      const players = this.peerConnections.map(({id}) => ({index: numbers.shift(), id}))

      this.$socket.emit('sortPlayers', {
        room: this.game.room,
        players
      })
    },
    openDialogSettings() {
      const {displayName} = this.findPc(this.$socket.id)
      this.dialogSettings = {
        value: true,
        displayName,
        name: this.game.name,
        limit: this.game.limit,
        password: this.game.password
      }
    },
    updateSettings() {
      this.dialogSettings.value = false
      const {value, speech, displayName, name, limit, password} = this.dialogSettings
      localStorage.setItem('displayName', displayName)
      this.$socket.emit('updatePlayerInfo', {
        room: this.game.room,
        id: this.$socket.id,
        displayName
      })

      const settings = {
        name,
        limit,
        password
      }
      this.$store.commit('SET_GAME', settings)
      this.$socket.emit('updateRoomInfo', {
        room: this.game.room,
        ...settings
      })

      if (speech) {
        this.speechSpeak({text: speech})
        this.$store.commit('SET_GAME', {speech: null})
      }
    },
    exit() {
      this.$router.push('/')
    }
  }
}
</script>
