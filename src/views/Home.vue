<template>
  <v-row class="px-2 justify-center">
    <v-col md="2">
      <v-card dark class="px-2 pb-4 pt-2 d-flex flex-column justify-center">
        <v-text-field
          dark
          :label="`${$t('main.name')}*`"
          v-model="name"
          required
          @keypress.enter="createRoom"
          color="accent_color"
        ></v-text-field>
        <v-text-field
          dark
          :label="$t('main.password')"
          v-model="password"
          required
          color="accent_color"
        ></v-text-field>
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
          {{ $t(`main.${header.value}`) }}
        </template>
        <template v-slot:header.players="{header}">
          {{ $t(`main.${header.value}`) }}
        </template>
        <template v-slot:header.isInitiator="{header}">
          {{ $t(`main.${header.value}`) }}
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
        text: 'Name',
        align: 'start',
        sortable: false,
        value: 'name'
      },
      {text: 'Players', value: 'players'},
      {text: 'Initiator', value: 'isInitiator'},
      {text: '', value: 'actions', sortable: false}
    ],
    rooms: []
  }),

  sockets: {
    getRooms(rooms) {
      this.rooms = rooms.map(room => {
        const peerConnections = Object.values(room.peerConnections)
        const isInitiator = peerConnections.find(pc => pc.isInitiator)
        return {
          name: room.name || room.room,
          players: room.players.length,
          isInitiator: isInitiator.displayName || isInitiator.id,
          room: room.room
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
