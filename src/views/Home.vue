<template>
  <v-row class="px-2 justify-center">
    <v-col md="2">
      <v-card dark class="px-4 pb-4 pt-2 d-flex flex-column justify-center">
        <v-form autocomplete="off">
          <v-text-field
            dark
            :label="`${$t('main.name')}*`"
            v-model="name"
            @keypress.enter="createRoom"
            color="accent_color"
            autocomplete="false"
          ></v-text-field>
          <v-text-field
            dark
            type="password"
            :label="$t('main.password')"
            v-model="password"
            color="accent_color"
            autocomplete="false"
          ></v-text-field>
        </v-form>
        <v-btn color="accent_color" class="px-4" dark @click="createRoom" :disabled="!name">{{
          $t('main.createRoom')
        }}</v-btn>
      </v-card>
    </v-col>
    <v-col md="8">
      <v-data-table
        dark
        :headers="headers"
        :items="rooms"
        :search="search"
        sort-by="calories"
        class="elevation-1"
        hide-default-footer
        :no-results-text="$t('messages.noRooms')"
        :no-data-text="$t('messages.noRooms')"
        :items-per-page="-1"
        fixed-header
        height="60vh"
      >
        <template v-slot:header.name="{header}">
          {{ $t(`main.${header.text}`) }}
        </template>
        <template v-slot:header.players="{header}">
          {{ $t(`main.${header.text}`) }}
        </template>
        <template v-slot:header.isInitiator="{header}">
          {{ $t(`main.${header.text}`) }}
        </template>
        <template v-slot:header.gameIsStarted="{header}">
          {{ $t(`main.${header.text}`) }}
        </template>
        <template v-slot:header.password="{header}">
          {{ $t(`main.${header.text}`) }}
        </template>

        <template v-slot:item.gameIsStarted="{value}">
          {{ $t(`main.${value ? 'gameIsStarted' : 'expectation'}`) }}
        </template>
        <template v-slot:item.password="{value}">
          {{ $t(`main.${value ? 'yes' : 'no'}`) }}
        </template>

        <template v-slot:top>
          <v-card flat dark class="px-4 d-flex align-center justify-space-between">
            <v-card-title class="px-0 text-h5">{{ $t('main.rooms') }}</v-card-title>
            <!-- <h2>{{$t('main.rooms')}}</h2> -->
            <v-col md="2" class="pa-0">
              <v-text-field
                dark
                v-model="search"
                color="accent_color"
                @keydown.esc="search = ''"
                clearable
                append-icon="mdi-magnify"
              ></v-text-field>
            </v-col>
          </v-card>
          <v-divider></v-divider>
        </template>
        <template v-slot:item.actions="{item: room}">
          <v-btn color="accent_color" class="px-4" dark @click="goToRoom(room)">{{
            $t('main.goToRoom')
          }}</v-btn>
        </template>
        <template v-slot:no-data>
          <span>{{ $t('messages.noRooms') }}</span>
        </template>
      </v-data-table>
    </v-col>
  </v-row>
</template>

<script>
export default {
  data: () => ({
    name: '',
    password: '',
    search: '',
    timer_getRooms: null,
    headers: [
      {
        text: 'name',
        align: 'start',
        value: 'name'
      },
      {text: 'players', value: 'players'},
      {text: 'isInitiator', value: 'isInitiator'},
      {text: 'state', value: 'gameIsStarted'},
      {text: 'password', value: 'password'},
      {text: '', value: 'actions', sortable: false}
    ],
    rooms: []
  }),

  sockets: {
    getRooms(rooms) {
      this.rooms = rooms.map(({peerConnections, name, room, players, gameIsStarted, password}) => {
        const isInitiator = Object.values(peerConnections).find(pc => pc.isInitiator)
        return {
          name: name || room,
          room,
          players: players.length,
          isInitiator: isInitiator.displayName || isInitiator.id,
          gameIsStarted,
          password
        }
      })
    }
  },

  mounted() {
    this.getRooms()
    this.timer_getRooms = setInterval(this.getRooms, 5000)
  },
  beforeDestroy() {
    clearInterval(this.timer_getRooms)
  },

  methods: {
    createRoom() {
      if (!this.name) return

      const shortUrl = () => {
        return ('000000' + ((Math.random() * Math.pow(36, 6)) << 0).toString(36)).slice(-6)
      }

      const room = shortUrl()
      const options = {
        name: this.name,
        password: this.password,
        room
      }
      this.$socket.emit('createRoom', options)

      this.goToRoom(options)
    },
    goToRoom({room}) {
      this.$router.push(`/mafia/${room}`)
    },
    getRooms() {
      this.$socket.emit('getRooms')
    }
  }
}
</script>

<style lang="sass">
input:-webkit-autofill,
input:-webkit-autofill:hover,
input:-webkit-autofill:focus,
textarea:-webkit-autofill,
textarea:-webkit-autofill:hover,
textarea:-webkit-autofill:focus,
select:-webkit-autofill,
select:-webkit-autofill:hover,
select:-webkit-autofill:focus
  -webkit-text-fill-color: white
  background-color: transparent
  transition: background-color 5000s ease-in-out 0s
</style>
