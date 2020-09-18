<template>
  <v-app style="background: #212121">
    <!-- <v-navigation-drawer app color="#0079BF" v-model="drawer">
    </v-navigation-drawer> -->

    <v-app-bar app dark dense color="main_color" v-model="bar">
      <!-- <v-btn icon small class="mr-2" @click="toggleDrawer">
        <v-icon>mdi-menu</v-icon>
      </v-btn> -->
      <h2 @click="goToMainPage" style="cursor: pointer;">MAFIOZI</h2>
      <v-spacer></v-spacer>
      <v-menu absolute>
        <template v-slot:activator="{on}">
          <v-slide-x-transition>
            <v-btn icon v-on="on" class="white--text">
              <v-icon>mdi-web</v-icon>
            </v-btn>
          </v-slide-x-transition>
        </template>
        <v-list dense dark>
          <v-list-item @click="changeLang('ru')">
            <v-list-item-title>Rus</v-list-item-title>
          </v-list-item>
          <v-list-item @click="changeLang('en')">
            <v-list-item-title>Eng</v-list-item-title>
          </v-list-item>
        </v-list>
      </v-menu>
      <v-slide-x-transition>
        <v-btn icon v-if="userData.id">
          <v-img :src="userData.avatar_url" style="max-height: 20px; max-width: 20px"></v-img>
        </v-btn>
      </v-slide-x-transition>
      <v-slide-x-transition>
        <v-btn icon v-if="userData.id" @click="logout">
          <v-icon>mdi-exit-to-app</v-icon>
        </v-btn>
      </v-slide-x-transition>
    </v-app-bar>

    <v-main>
      <v-container fluid class="grey darken-4">
        <v-scale-transition mode="out-in">
          <!-- <keep-alive> -->
          <router-view></router-view>
          <!-- </keep-alive> -->
        </v-scale-transition>
      </v-container>
    </v-main>

    <v-slide-y-reverse-transition>
      <v-footer app class="grey darken-4" v-if="footer">
        <v-spacer></v-spacer>
        <v-btn dark class="accent_color" @click="dialogContacts.value = true">
          <span>{{ $t('main.contacts') }}</span>
        </v-btn>
      </v-footer>
    </v-slide-y-reverse-transition>

    <v-dialog v-model="dialogContacts.value" persistent max-width="600px" dark>
      <v-card>
        <v-card-title class="justify-space-between">
          <span class="headline">{{ $t('main.contacts') }}</span>
          <v-btn icon small color="main_color" @click="dialogContacts.value = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-divider class="main_color mb-4"></v-divider>
        <v-card-text>
          <p class="mb-2">Email: <span class="text-subtitle-2">gameoveran@yandex.ru</span></p>
          <p class="mb-0">
            Github:
            <a href="https://github.com/FeniXAltaiR" target="_blank" class="text-subtitle-2"
              >FeniXAltaiR</a
            >
          </p>
        </v-card-text>
      </v-card>
    </v-dialog>
  </v-app>
</template>

<script>
import {mapGetters} from 'vuex'

export default {
  data: () => ({
    drawer: false,
    bar: true,
    footer: false,

    dialogContacts: {
      value: false
    }
  }),
  computed: {
    ...mapGetters(['userData'])
  },

  sockets: {
    connect() {
      console.log('CONNECT:', this.$socket.id)
      if (!localStorage.getItem('id')) {
        localStorage.setItem('id', this.$socket.id)
      }
    }
  },

  watch: {
    $route() {
      this.setBar()
    }
  },
  mounted() {
    // fetch('/test')
    // this.getToken()
    this.setBar()
  },

  methods: {
    setBar() {
      const {room} = this.$route.params
      if (room) {
        this.bar = false
        this.footer = false
      } else {
        this.bar = true
        this.footer = true
      }
    },
    toggleDrawer() {
      this.drawer = !this.drawer
    },
    goToMainPage() {
      if (location.pathname === '/') return
      this.$router.push('/')
    },
    changeLang(locale) {
      this.$i18n.locale = locale
      localStorage.setItem('locale', locale)
    },
    async getToken() {
      const getUrl = () => {
        const {code} = this.$route.query

        if (code) {
          return `/login/github/callback?code=${code}`
        }

        return `/login/github/user`
      }

      const url = getUrl()
      const res = await fetch(url)
      const data = await res.json()
      this.$store.commit('SET_USER_DATA', data)
      // this.$router.push('/')
    },
    async logout() {
      await fetch('/login/logout')
      this.$store.commit('SET_USER_DATA', {})
    }
  }
}
</script>

<style lang="sass">
::-webkit-scrollbar
  display: none
</style>
