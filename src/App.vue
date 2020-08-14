<template>
  <v-app>
    <!-- <v-navigation-drawer app color="#0079BF" v-model="drawer">
    </v-navigation-drawer> -->

    <v-app-bar app dark dense color="#0079BF" v-model="bar">
      <!-- <v-btn icon small class="mr-2" @click="toggleDrawer">
        <v-icon>mdi-menu</v-icon>
      </v-btn> -->
      <h1 @click="goToMainPage">MAFIA</h1>
      <v-spacer></v-spacer>
      <v-btn color="#0067A3" @click="createRoom">Create room</v-btn>
    </v-app-bar>

    <v-main>
      <v-container fluid style="background: #404040">
        <router-view></router-view>
      </v-container>
    </v-main>

    <!-- <v-footer app></v-footer> -->
  </v-app>
</template>

<script>
export default {
  data: () => ({
    drawer: false,
    bar: true
  }),

  sockets: {
    connect() {
      console.log('CONNECT:', this.$socket.id)
    }
  },

  methods: {
    toggleDrawer() {
      this.drawer = !this.drawer
    },
    goToMainPage() {
      if (location.pathname === '/') return
      this.$router.push('/')
    },
    createRoom() {
      const shortUrl = () => {
        return ('000000' + ((Math.random() * Math.pow(36, 6)) << 0).toString(36)).slice(-6)
      }

      this.$router.push(shortUrl())
    }
  }
}
</script>

<style lang="sass">
::-webkit-scrollbar
  display: none
</style>
