<template>
  <div>
    <v-tooltip open-delay="250" bottom>
      <template v-slot:activator="{on}">
        <v-btn
          icon
          small
          @click="openDialogStat"
          class="white--text"
          v-on="on"
          v-show="!game.gameIsStarted && game.statistics.length"
        >
          <v-icon>mdi-view-list</v-icon>
        </v-btn>
      </template>
      <span>{{ $t('mafia.statistics') }}</span>
    </v-tooltip>

    <v-dialog v-model="dialogStat.value" persistent max-width="1280px">
      <v-row class="justify-space-between align-center mx-0 py-2 px-1 grey darken-4 white--text">
        <span class="text-center display-2">{{ $t('mafia.statistics') }}</span>
        <v-btn icon small color="main_color" @click="dialogStat.value = false">
          <v-icon>mdi-close</v-icon>
        </v-btn>
      </v-row>
      <v-divider class="main_color"></v-divider>
      <v-card
        class="px-2 pt-2 grey darken-4 white--text"
        flat
        tile
        v-for="(stat, index) in game.statistics"
        :key="index"
      >
        <template v-if="stat.players.length">
          <h2 v-if="stat.title">{{ $t(`mafia.${stat.title}`) }}</h2>
          <v-row class="justify-space-between" v-for="(players, i) in stat.players" :key="i">
            <v-col>
              <v-row class="align-center mx-0">
                <div
                  v-for="id in players.from"
                  :key="id"
                  class="d-inline-flex flex-column justify-center mr-2"
                >
                  <span class="text-center subtitle-2">{{ findPc(id).displayName }}</span>
                  <v-img
                    class="mx-auto"
                    :src="findPc(id).src"
                    style="border-radius: 50%; height: 80px; max-width: 80px"
                  ></v-img>
                  <span class="text-center subtitle-2">{{ $t(`mafia.${findPc(id).role}`) }}</span>
                </div>
              </v-row>
            </v-col>
            <v-col v-if="players.to">
              <v-row class="justify-end align-center mx-0">
                <v-icon
                  v-if="stat.icon"
                  :class="stat.iconClass"
                  class="mr-2 white pa-1"
                  style="border-radius: 50%"
                  >{{ stat.icon }}</v-icon
                >
                <div class="d-inline-flex flex-column justify-center ml-2">
                  <span class="text-center subtitle-2">{{ findPc(players.to).displayName }}</span>
                  <v-img
                    class="mx-auto"
                    :src="findPc(players.to).src"
                    style="border-radius: 50%; height: 80px; max-width: 80px"
                  ></v-img>
                  <span class="text-center subtitle-2">{{
                    $t(`mafia.${findPc(players.to).role}`)
                  }}</span>
                </div>
              </v-row>
            </v-col>
          </v-row>
          <v-divider class="main_color"></v-divider>
        </template>
      </v-card>
    </v-dialog>
  </div>
</template>

<script>
import {mapGetters} from 'vuex'
import mixinMafia from '@/mixins/mafia'

export default {
  mixins: [mixinMafia],

  data: () => ({
    dialogStat: {
      value: false
    }
  }),
  computed: {
    ...mapGetters(['game', 'peerConnections'])
  },

  methods: {
    openDialogStat() {
      this.dialogStat.value = true
    }
  }
}
</script>
