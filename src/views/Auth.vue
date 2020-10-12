<template>
  <v-row class="justify-center">
    <v-col md="4">
      <v-card dark>
        <v-card-title class="justify-center">
          <span class="headline">{{ $t('main.auth') }}</span>
        </v-card-title>
        <v-divider class="main_color"></v-divider>
        <v-card-text>
          <div id="firebaseui-auth-container" class="pr-6"></div>
        </v-card-text>
      </v-card>
    </v-col>
  </v-row>
</template>

<script>
import firebase from 'firebase'
import * as firebaseui from 'firebaseui'

export default {
  data: () => ({
    uiConfig: {
      callbacks: {},
      // signInSuccessUrl: '/',
      signInOptions: [
        {
          provider: firebase.auth.GoogleAuthProvider.PROVIDER_ID
          // buttonColor: '#2F2F2F',
        },
        {
          provider: firebase.auth.GithubAuthProvider.PROVIDER_ID
        }
      ]
    }
  }),

  mounted() {
    this.uiConfig.callbacks.signInSuccessWithAuthResult = this.signInSuccessWithAuthResult
    this.$nextTick(() => {
      const ui = firebaseui.auth.AuthUI.getInstance() ?? new firebaseui.auth.AuthUI(firebase.auth())
      ui.start('#firebaseui-auth-container', this.uiConfig)
    })
  },

  methods: {
    signInSuccessWithAuthResult(authResult, redirectUrl) {
      // var user = authResult.user;
      // var credential = authResult.credential;
      // var isNewUser = authResult.additionalUserInfo.isNewUser;
      // var providerId = authResult.additionalUserInfo.providerId;
      // var operationType = authResult.operationType;
      // Do something with the returned AuthResult.
      // Return type determines whether we continue the redirect automatically
      // or whether we leave that to developer to handle.
      // console.dir(authResult.user)
      this.$store.commit('SET_USER_DATA', authResult.user)
      this.$router.push('/')
      // const token = authResult.user.uid
      // const token = authResult.user.xa
      // localStorage.setItem('token', token)
      // return true
    }
  }
}
</script>
