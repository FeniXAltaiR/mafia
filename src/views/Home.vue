<template>
  <v-row class="px-2 justify-center">
    <v-btn color="accent_color" class="px-4 white--text" @click="createRoom">{{
      $t('main.createRoom')
    }}</v-btn>
  </v-row>
</template>

<script>
export default {
  methods: {
    createRoom() {
      const shortUrl = () => {
        return ('000000' + ((Math.random() * Math.pow(36, 6)) << 0).toString(36)).slice(-6)
      }

      this.$router.push(`/mafia/${shortUrl()}`)
    }
  }
}
</script>
