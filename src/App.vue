<template>
  <v-app style="background: #212121">
    <!-- <v-navigation-drawer app color="#0079BF" v-model="drawer">
    </v-navigation-drawer> -->

    <v-app-bar app dark dense color="main_color" v-model="bar">
      <!-- <v-btn icon small class="mr-2" @click="toggleDrawer">
        <v-icon>mdi-menu</v-icon>
      </v-btn> -->
      <v-btn icon class="grey darken-4 ml-1" small @click="goToMainPage" style="cursor: pointer;">
        <img src="@/assets/logo.svg" alt="" height="24px" width="24px" />
      </v-btn>
      <v-spacer></v-spacer>
      <v-menu absolute>
        <template v-slot:activator="{on}">
          <v-slide-x-transition>
            <v-btn icon v-on="on">
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
      <v-menu
        absolute
        :close-on-content-click="false"
        min-width="280px"
        max-width="360px"
        v-model="menuAccount"
      >
        <template v-slot:activator="{on}">
          <v-slide-x-transition>
            <v-btn icon v-on="on" v-if="userData.uid">
              <v-img
                :src="userData.photoURL"
                class="rounded-pill"
                style="max-height: 24px; max-width: 24px"
              ></v-img>
            </v-btn>
          </v-slide-x-transition>
        </template>
        <v-card dark class="px-4">
          <v-col>
            <v-row class="justify-space-between align-center">
              <span>{{ $t('main.account') }}</span>
              <v-btn icon small color="main_color" @click="menuAccount = false">
                <v-icon>mdi-close</v-icon>
              </v-btn>
            </v-row>
          </v-col>
          <v-divider class="main_color"></v-divider>
          <v-col>
            <v-row class="align-center my-2">
              <v-img
                :src="userData.photoURL"
                class="rounded-pill"
                style="max-height: 48px; max-width: 48px"
              ></v-img>
              <div class="ml-4">
                <h4>{{ userData.displayName }}</h4>
                <h5 class="grey--text">{{ userData.email }}</h5>
              </div>
            </v-row>
          </v-col>
          <v-divider class="main_color"></v-divider>
          <v-col>
            <v-row class="justify-end">
              <v-btn color="accent_color" text @click="signOut">
                {{ $t('main.signOut') }}
              </v-btn>
            </v-row>
          </v-col>
        </v-card>
      </v-menu>
      <v-btn class="accent_color" v-if="!userData.uid" @click="$router.push('/auth')">
        <span>{{ $t('main.signIn') }}</span>
      </v-btn>
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
import firebase from 'firebase'

import {mapGetters} from 'vuex'

export default {
  data: () => ({
    drawer: false,
    bar: true,
    footer: false,

    menuAccount: false,

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
    this.init()
    // fetch('/test')
    this.setBar()
  },

  methods: {
    init() {
      const firebaseConfig = {
        apiKey: 'AIzaSyAtykimv3bVxDrP5_Ha554Jdz6AwP4bSYY',
        authDomain: 'green-diagram-263013.firebaseapp.com',
        databaseURL: 'https://green-diagram-263013.firebaseio.com',
        projectId: 'green-diagram-263013',
        storageBucket: 'green-diagram-263013.appspot.com',
        messagingSenderId: '143390169121',
        appId: '1:143390169121:web:61a376935c510939ee2b60',
        measurementId: 'G-GDTWSNECG4'
      }
      firebase.initializeApp(firebaseConfig)
      firebase.auth().onAuthStateChanged(user => {
        this.$store.commit('SET_USER_DATA', user ?? {})
        if (user.displayName) {
          localStorage.setItem('displayName', user.displayName)
        }
      })
    },
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
    signOut() {
      this.menuAccount = false
      firebase.auth().signOut()
    }
  }
}
</script>

<style lang="sass">
::-webkit-scrollbar
  display: none
</style>
