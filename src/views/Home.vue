<template>
  <div class="px-2">
    <h1>MAFIA</h1>
    <main id="container">
      <section id="success">
        <div id="room-link">
          <router-link :to="roomUrl">
            <span>{{ roomUrl }}</span>
          </router-link>
        </div>
        <br />
        <div class="bubble">
          Participation link
          <br /><br />
          <span>Send this link to anyone you wish to invite. </span>
        </div>
      </section>
    </main>
    <!-- <v-layout>
      <v-flex md3 class="px-2" v-for="(stream, i) in streams" :key="i">
        <video controls muted autoplay :srcObject.prop="stream.srcObject" style="width: 100%;"></video>
      </v-flex>
    </v-layout> -->
  </div>
</template>

<script>
export default {
  data: () => ({
    streams: [],
    roomUrl: ""
  }),

  mounted() {
    this.init();
  },

  methods: {
    init() {
      this.generateRoomUrl();
    },

    shortUrl() {
      return (
        "000000" + ((Math.random() * Math.pow(36, 6)) << 0).toString(36)
      ).slice(-6);
    },

    generateRoomUrl() {
      const room = this.shortUrl();
      this.roomUrl = "/" + room;
    }
  }
};
</script>
