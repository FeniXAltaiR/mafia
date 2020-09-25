<template>
  <div>
    <v-row class="px-5 justify-space-between mb-2">
      <v-col md="2">
        <v-row class="align-start">
          <h3 class="white--text">{{ name }}</h3>
        </v-row>
      </v-col>
      <v-col md="5" class="grey darken-4 elevation-2 rounded-pill pa-0 d-flex align-center">
        <v-row class="justify-center align-center fill-height">
          <v-col
            md="5"
            class="d-flex justify-end align-center align-self-stretch"
            style="border-right: solid 2px #1e1e1e"
          >
            <h3
              class="white--text"
              :class="{
                'accent_color--text': gameInfo.text === $t('mafia.citizenWin'),
                'main_color--text': gameInfo.text === $t('mafia.mafiaWin')
              }"
            >
              {{ gameInfo.text }}
            </h3>
          </v-col>

          <v-col md="2" class="d-flex justify-center align-center">
            <h3 class="white--text mx-2">{{ getTime }}</h3>
          </v-col>

          <v-col
            md="5"
            class="d-flex align-center align-self-stretch"
            style="border-left: solid 2px #1e1e1e"
          >
            <v-tooltip open-delay="250" bottom>
              <template v-slot:activator="{on}">
                <v-btn
                  icon
                  small
                  @click="pauseGame"
                  class="white--text"
                  v-on="on"
                  v-show="gameIsStarted && findPc($socket.id).isInitiator"
                >
                  <v-icon>mdi-{{ isPause ? 'play' : 'pause' }}</v-icon>
                </v-btn>
              </template>
              <span>{{ isPause ? $t('mafia.play') : $t('mafia.pause') }}</span>
            </v-tooltip>
            <v-tooltip open-delay="250" bottom>
              <template v-slot:activator="{on}">
                <v-btn
                  icon
                  small
                  @click="startGame"
                  class="white--text"
                  v-on="on"
                  v-show="!gameIsStarted && findPc($socket.id).isInitiator"
                >
                  <v-icon>mdi-play</v-icon>
                </v-btn>
              </template>
              <span>{{ $t('mafia.startGame') }}</span>
            </v-tooltip>
            <v-tooltip open-delay="250" bottom>
              <template v-slot:activator="{on}">
                <v-btn
                  icon
                  small
                  @click="addDuration"
                  class="white--text"
                  v-on="on"
                  v-show="gameIsStarted && findPc($socket.id).isInitiator"
                >
                  <v-icon>mdi-plus</v-icon>
                </v-btn>
              </template>
              <span>{{ $t('mafia.addDuration') }}</span>
            </v-tooltip>
            <v-tooltip open-delay="250" bottom>
              <template v-slot:activator="{on}">
                <v-btn
                  icon
                  small
                  @click="goToNextStep"
                  class="white--text"
                  v-on="on"
                  v-show="gameIsStarted && findPc($socket.id).isInitiator"
                >
                  <v-icon>mdi-skip-next</v-icon>
                </v-btn>
              </template>
              <span>{{ $t('mafia.goToNextStep') }}</span>
            </v-tooltip>
            <v-tooltip open-delay="250" bottom>
              <template v-slot:activator="{on}">
                <v-btn
                  v-show="gameIsStarted && findPc($socket.id).isInitiator"
                  icon
                  small
                  @click="openDialogAlert({method: endGame})"
                  class="white--text"
                  v-on="on"
                >
                  <v-icon>mdi-exit-run</v-icon>
                </v-btn>
              </template>
              <span>{{ $t('mafia.endGame') }}</span>
            </v-tooltip>
            <v-tooltip open-delay="250" bottom>
              <template v-slot:activator="{on}">
                <v-btn
                  icon
                  small
                  @click="openDialogStat"
                  class="white--text"
                  v-on="on"
                  v-show="!gameIsStarted && statistics.length"
                >
                  <v-icon>mdi-view-list</v-icon>
                </v-btn>
              </template>
              <span>{{ $t('mafia.statistics') }}</span>
            </v-tooltip>
            <v-menu absolute>
              <template v-slot:activator="{on}">
                <v-slide-x-transition>
                  <v-btn icon v-on="on" class="white--text" v-show="!findPc($socket.id).stream">
                    <v-icon>mdi-lan-connect</v-icon>
                  </v-btn>
                </v-slide-x-transition>
              </template>
              <v-list dense dark>
                <v-list-item @click="init('getUserMedia')">
                  <v-list-item-title>{{ $t('mafia.webcam') }}</v-list-item-title>
                </v-list-item>
                <v-list-item @click="init('getDisplayMedia')">
                  <v-list-item-title>{{ $t('mafia.screen') }}</v-list-item-title>
                </v-list-item>
              </v-list>
            </v-menu>
          </v-col>
        </v-row>
      </v-col>
      <v-col md="2">
        <v-row class="align-center justify-end">
          <v-tooltip
            open-delay="250"
            bottom
            v-if="!gameIsStarted && findPc($socket.id).isInitiator"
          >
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
        </v-row>
      </v-col>
    </v-row>
    <draggable
      tag="v-row"
      v-model="peerConnections"
      ghostClass="ghost"
      class="align-center flex-wrap px-2 justify-center"
      v-if="$route.params.room"
    >
      <v-col
        md="3"
        sm="6"
        xs="12"
        class="align-self-stretch"
        v-for="player in getPlayerStreams"
        :key="player.id"
        style="position: relative;"
        @dblclick="getFullscreen(player.id)"
      >
        <template>
          <v-row class="justify-center px-1 fill-height">
            <div
              style="position: relative; width: 100%; height: 100%; border-radius: 8px"
              class="d-flex align-center align-self-stretch black"
            >
              <div v-if="player.stream" class="d-flex justify-center" style="width: 100%">
                <video
                  :srcObject.prop="player.stream"
                  autoplay
                  :controls="false"
                  :style="getVideoStyle"
                  :data-id="player.id"
                  style="object-fit: cover"
                ></video>
              </div>
              <div
                v-if="streamOff(player)"
                class="d-flex px-2 pb-3 pt-1 align-center justify-center white--text black"
                style="height: 100%; width: 100%; top: 0; position: absolute; border-radius: 8px;"
              >
                <v-img
                  v-if="player.photoURL"
                  class="rounded-pill mr-2"
                  :src="player.photoURL"
                  style="max-height: 48px; max-width: 48px"
                ></v-img>
                <h1>{{ findPc(player.id).displayName }}</h1>
              </div>
              <v-hover v-slot:default="{hover}" open-delay="200">
                <div
                  class="d-flex px-2 py-2 flex-column justify-space-between white--text"
                  style="position: absolute; top: 0; height: 100%; width: 100%; border-radius: 8px;"
                >
                  <v-row class="justify-space-between">
                    <v-col md="5" class="py-0">
                      <div>
                        <v-menu absolute>
                          <template v-slot:activator="{on}">
                            <v-slide-x-transition>
                              <v-btn
                                icon
                                v-on="on"
                                class="white--text grey darken-4 mb-1"
                                v-if="
                                  hover &&
                                    findPc($socket.id).isInitiator &&
                                    player.id !== $socket.id
                                "
                              >
                                <v-icon>mdi-dots-vertical</v-icon>
                              </v-btn>
                            </v-slide-x-transition>
                          </template>
                          <v-list dense dark>
                            <v-list-item
                              @click="openDialogAlert({method: newInitiator, args: [player]})"
                            >
                              <v-list-item-title>{{ $t('mafia.newInitiator') }}</v-list-item-title>
                            </v-list-item>
                            <v-list-item
                              v-if="!gameIsStarted"
                              @click="openDialogAlert({method: banPlayer, args: [player]})"
                            >
                              <v-list-item-title>{{ $t('mafia.banPlayer') }}</v-list-item-title>
                            </v-list-item>
                          </v-list>
                        </v-menu>
                      </div>
                      <div>
                        <v-slide-x-transition>
                          <v-btn
                            icon
                            class="white--text grey darken-4 mb-1"
                            @click="toggleVideo(player)"
                            v-if="hover && canSeeToggleVideo(player)"
                          >
                            <v-icon v-if="player.isVideo">mdi-video</v-icon>
                            <v-icon v-else class="error--text">mdi-video-off</v-icon>
                          </v-btn>
                        </v-slide-x-transition>
                      </div>
                      <div>
                        <v-slide-x-transition>
                          <v-btn
                            icon
                            class="white--text grey darken-4 mb-1"
                            @click="toggleAudio(player)"
                            v-if="hover && canSeeToggleAudio(player)"
                          >
                            <v-icon v-if="player.isAudio">mdi-volume-high</v-icon>
                            <v-icon v-else class="error--text">mdi-volume-off</v-icon>
                          </v-btn>
                        </v-slide-x-transition>
                      </div>
                    </v-col>
                    <v-col md="2" class="py-1">
                      <v-row class="justify-center">
                        <v-slide-y-transition>
                          <v-icon
                            v-if="
                              hover &&
                                !findPc($socket.id).isInitiator &&
                                !player.isVideo &&
                                player.id !== $socket.id
                            "
                            class="error--text"
                            >mdi-video-off</v-icon
                          >
                        </v-slide-y-transition>
                        <v-slide-y-transition>
                          <v-icon
                            v-if="
                              hover &&
                                !findPc($socket.id).isInitiator &&
                                !player.isAudio &&
                                player.id !== $socket.id
                            "
                            class="error--text"
                            >mdi-volume-off</v-icon
                          >
                        </v-slide-y-transition>
                        <v-slide-y-transition>
                          <v-icon
                            v-if="hover && !player.stream && player.id !== $socket.id"
                            class="error--text"
                            >mdi-lan-disconnect</v-icon
                          >
                        </v-slide-y-transition>
                        <v-slide-y-transition>
                          <v-icon v-if="player.isDeadLastRound" class="main_color--text"
                            >mdi-emoticon-dead</v-icon
                          >
                        </v-slide-y-transition>
                        <v-slide-y-transition>
                          <v-icon v-if="activePlayer(player)" class="accent_color--text"
                            >mdi-chat-alert</v-icon
                          >
                        </v-slide-y-transition>
                      </v-row>
                    </v-col>
                    <v-col md="5" class="py-1 pr-4 d-flex justify-end">
                      <v-slide-x-reverse-transition>
                        <v-btn
                          v-if="canCheckRole(player)"
                          icon
                          class="warning--text grey darken-4"
                          @click="checkRole(player)"
                        >
                          <v-icon>mdi-magnify</v-icon>
                        </v-btn>
                      </v-slide-x-reverse-transition>
                      <v-slide-x-reverse-transition>
                        <v-btn
                          v-if="canVoteForKill(player)"
                          icon
                          @click="voteForKill(player)"
                          class="error--text grey darken-4"
                        >
                          <v-icon>mdi-axe</v-icon>
                        </v-btn>
                      </v-slide-x-reverse-transition>
                      <v-slide-x-reverse-transition>
                        <v-btn
                          v-if="canHeal(player)"
                          icon
                          @click="heal(player)"
                          class="primary--text grey darken-4"
                        >
                          <v-icon>mdi-bottle-tonic-plus</v-icon>
                        </v-btn>
                      </v-slide-x-reverse-transition>
                      <v-slide-x-reverse-transition>
                        <v-btn
                          v-if="canNomination(player)"
                          icon
                          @click="nomination(player)"
                          class="primary--text grey darken-4"
                        >
                          <v-icon>mdi-account-alert</v-icon>
                        </v-btn>
                      </v-slide-x-reverse-transition>
                      <v-slide-x-reverse-transition>
                        <v-btn
                          v-if="canVoteForExile(player)"
                          icon
                          @click="voteForExile(player)"
                          class="primary--text grey darken-4"
                        >
                          <v-icon>mdi-account-check</v-icon>
                        </v-btn>
                      </v-slide-x-reverse-transition>
                    </v-col>
                  </v-row>
                  <div class="d-flex justify-space-between align-end">
                    <div class="d-flex align-end">
                      <v-badge
                        color="accent_color"
                        right
                        :content="player.nominateIndex"
                        :value="player.nominateIndex"
                      >
                        <div class="bgtext bgtext--left px-2 py-2 elevation-4 grey darken-4">
                          <span class="font-weight-black">{{ findIndexPc(player.id) + 1 }} | </span>
                          <span>{{ findPc(player.id).displayName }}</span>
                          <span v-if="findPc(player.id).isInitiator">
                            ({{ $t('mafia.leader') }})</span
                          >
                        </div>
                      </v-badge>
                    </div>
                    <div class="d-flex align-end">
                      <v-slide-x-transition>
                        <v-badge color="error" left :value="canSeeBadge(player)">
                          <template v-slot:badge>
                            <v-tooltip left>
                              <template v-slot:activator="{on}">
                                <span class="pointer" v-on="on">{{ badgeContent(player) }}</span>
                              </template>
                              <div v-for="id in getListPlayers(player)" :key="id">
                                <span>{{ findIndexPc(id) + 1 }} | </span>
                                <span>{{ findPc(id).displayName }}</span>
                              </div>
                            </v-tooltip>
                          </template>
                          <div class="bgtext bgtext--right px-2 py-1 elevation-4 accent_color">
                            <!-- <span class="mr-2">{{ $t(`mafia.${formatRole(player)}`) }}</span> -->
                            <v-tooltip open-delay="250" top>
                              <template v-slot:activator="{on}">
                                <div v-on="on">
                                  <v-icon v-if="formatRole(player) === 'mafia'" class="black--text"
                                    >mdi-alien</v-icon
                                  >
                                  <v-icon
                                    v-else-if="formatRole(player) === 'boss'"
                                    class="black--text"
                                    >mdi-alpha-w-circle</v-icon
                                  >
                                  <v-icon
                                    v-else-if="formatRole(player) === 'citizen'"
                                    class="main_color--text"
                                    >mdi-baby-face</v-icon
                                  >
                                  <v-icon
                                    v-else-if="formatRole(player) === 'detective'"
                                    class="main_color--text"
                                    >mdi-binoculars</v-icon
                                  >
                                  <v-icon
                                    v-else-if="formatRole(player) === 'doctor'"
                                    class="main_color--text"
                                    >mdi-medical-bag</v-icon
                                  >
                                  <v-icon v-else>mdi-artstation</v-icon>
                                </div>
                              </template>
                              <span>{{ $t(`mafia.${formatRole(player)}`) }}</span>
                            </v-tooltip>
                          </div>
                        </v-badge>
                      </v-slide-x-transition>
                    </div>
                  </div>
                </div>
              </v-hover>
            </div>
          </v-row>
        </template>
      </v-col>
    </draggable>
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
      <v-card>
        <v-alert type="warning" color="transparent" class="mb-0">
          <template v-slot:close>
            <v-btn icon small color="main_color" @click="dialogAlert.value = false">
              <v-icon>mdi-close</v-icon>
            </v-btn>
          </template>
          <span>{{ dialogAlert.text }}</span>
        </v-alert>

        <div class="pb-2">
          <v-divider class="main_color"></v-divider>
        </div>

        <v-card-actions class="justify-end">
          <v-btn color="accent_color" text @click="confirmDialogAlert">
            {{ $t('mafia.confirm') }}
          </v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
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
        v-for="(stat, index) in statistics"
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
    <v-dialog v-model="dialogPassword.value" persistent max-width="600px" dark>
      <v-card>
        <v-card-title class="justify-space-between">
          <span class="headline">{{ $t('mafia.enterPassword') }}</span>
          <v-btn icon small color="main_color" @click="dialogPassword.value = false">
            <v-icon>mdi-close</v-icon>
          </v-btn>
        </v-card-title>
        <v-card-text>
          <v-container>
            <v-row>
              <v-col cols="12" md="12">
                <v-text-field
                  type="password"
                  autofocus
                  :label="$t('mafia.password')"
                  v-model="dialogPassword.password"
                  required
                  @keypress.enter="checkPassword"
                  color="accent_color"
                ></v-text-field>
              </v-col>
            </v-row>
          </v-container>
        </v-card-text>
        <v-card-actions>
          <v-spacer></v-spacer>
          <v-btn color="accent_color" text @click="checkPassword">{{
            $t('mafia.checkPassword')
          }}</v-btn>
        </v-card-actions>
      </v-card>
    </v-dialog>
    <canvas class="d-none"></canvas>
  </div>
</template>

<script>
import moment from 'moment'
import draggable from 'vuedraggable'
import {mapGetters} from 'vuex'

export default {
  components: {
    draggable
  },

  data: () => ({
    pcConfig: {
      iceServers: [
        // {url: 'stun:stun01.sipphone.com'},
        // {url: 'stun:stun.ekiga.net'},
        // {url: 'stun:stun.fwdnet.net'},
        // {url: 'stun:stun.ideasip.com'},
        // {url: 'stun:stun.iptel.org'},
        // {url: 'stun:stun.rixtelecom.se'},
        // {url: 'stun:stun.schlund.de'},
        // {url: 'stun:stun.l.google.com:19302'},
        // {url: 'stun:stun1.l.google.com:19302'},
        // {url: 'stun:stun2.l.google.com:19302'},
        // {url: 'stun:stun3.l.google.com:19302'},
        {url: 'stun:stun4.l.google.com:19302'}
        // {url: 'stun:stunserver.org'},
        // {url: 'stun:stun.softjoys.com'},
        // {url: 'stun:stun.voiparound.com'},
        // {url: 'stun:stun.voipbuster.com'},
        // {url: 'stun:stun.voipstunt.com'},
        // {url: 'stun:stun.voxgratia.org'},
        // {url: 'stun:stun.xten.com'},
        // {url: 'turn:numb.viagenie.ca', credential: 'muazkh', username: 'webrtc@live.com'},
        // {
        //   url: 'turn:192.158.29.39:3478?transport=udp',
        //   credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
        //   username: '28224511:1379330808'
        // },
        // {
        //   url: 'turn:192.158.29.39:3478?transport=tcp',
        //   credential: 'JZEOEt2V3Qb0y27GRntt2u2PAYA=',
        //   username: '28224511:1379330808'
        // }
        // {
        //   credential: 'testtest',
        //   url: 'media16.playmafia.pro:3478',
        //   username: 'ptp1ptp2'
        // }
      ]
    },
    room: null,
    peerConnections: [],
    speechSynthesisUtterance: null,
    timer: null,

    // room options
    name: '',
    password: '',
    limit: 10,
    nominateIndex: 1,
    duration: 0,
    gameSteps: [],
    gameInfo: {},
    statistics: [],
    isPause: false,
    gameIsStarted: false,
    isSecondVoting: false,

    dialogSettings: {
      value: false,
      displayName: '',
      speech: ''
    },
    dialogAlert: {
      value: false,
      method: null,
      text: ''
    },
    dialogStat: {
      value: false
    },
    dialogPassword: {
      value: false,
      password: '',
      orig_password: '',
      stream: null
    }
  }),
  computed: {
    getPlayerStreams() {
      return this.peerConnections
    },
    getVideoStyle() {
      const rows = Math.ceil(this.peerConnections.length / 4)
      return {
        'max-height': `calc((100vh - 120px - ${rows * 20}px) / ${rows})`,
        'max-width': '100%',
        'border-radius': '8px'
      }
    },
    getTime() {
      return moment(this.duration).format('mm:ss')
    },
    ...mapGetters(['userData'])
  },

  sockets: {
    reconnecting() {
      console.log('reconnecting')
    },
    reconnect_attempt() {
      console.log('reconnect_attempt')
    },
    disconnect() {
      console.log('disconnect')
      this.peerConnections = []
      clearInterval(this.timer)
    },
    disconnecting() {
      console.log('disconnecting')
    },
    disconnectPlayer({id}) {
      this.isPause = true
      const player = this.findPc(id)
      if (player.stream) {
        player.stream.getTracks().forEach(track => {
          track.stop()
        })
      }
      if (player.pc) {
        player.pc.close()
      }
      // this.$delete(player, 'stream')
      // this.$delete(player, 'pc')
    },
    test(msg) {
      console.dir(msg)
    },
    speechSpeak({text}) {
      this.speechSynthesisUtterance.text = text
      window.speechSynthesis.cancel()
      window.speechSynthesis.speak(this.speechSynthesisUtterance)
    },
    sortPlayers({players}) {
      players.forEach(player => {
        this.$set(this.findPc(player.id), 'order', player.index)
      })
      this.peerConnections.sort((playerA, playerB) => (playerA.order > playerB.order ? 1 : -1))
      this.peerConnections.forEach(pc => {
        this.$delete(pc, 'order')
      })
    },
    getRole({id, role}) {
      this.$set(this.findPc(id), 'isVisibleRole', [])
      this.$set(this.findPc(id), 'role', role)
    },
    newInitiator() {
      if (this.gameIsStarted) {
        this.nextStep(this.gameSteps[0], this.duration)
      }
    },
    updatePlayerInfo(settings) {
      const player = this.findPc(settings.global_id || settings.id)
      // console.log('PLAYER_INFO', player)
      if (player.id) {
        Object.entries(settings).forEach(([key, value]) => {
          this.$set(player, key, value)
        })
      }
    },
    updateRoomInfo(settings) {
      // console.log('ROOM_INFO', settings)
      Object.entries(settings).forEach(([key, value]) => {
        this[key] = value
      })
    },
    banPlayer({id}) {
      this.peerConnections = this.peerConnections.filter(pc => pc.id !== id)
      if (this.$socket.id === id) {
        alert('You had banned')
      }
    },
    message({msg}) {
      alert(msg)
      this.$router.push('/')
    },
    checkPassword({password}) {
      this.dialogPassword = {
        value: true,
        password: '',
        orig_password: password
      }
    },
    join(settings) {
      console.log('JOIN')
      const {stream, pc, ...mySettings} = this.findPc(this.$socket.id)
      this.setUpPeer(settings)
      this.$socket.emit('createOffer', {
        dest: settings.id,
        ...mySettings
      })
    },
    createOffer(settings) {
      console.log('CREATE OFFER')
      this.setUpPeer(settings)
      this.findPc(settings.id)
        .pc.createOffer()
        .then(description => this.createdDescription(description, settings.id))
        .catch(this.errorHandler)
    },
    description({uuid: peerUuid, sdp}) {
      console.log('SDP_TYPE', sdp.type)
      this.findPc(peerUuid)
        .pc.setRemoteDescription(new RTCSessionDescription(sdp))
        .then(() => {
          // Only create answers in response to offers
          if (sdp.type == 'offer') {
            this.findPc(peerUuid)
              .pc.createAnswer()
              .then(description => this.createdDescription(description, peerUuid))
              .catch(this.errorHandler)
          }
        })
        .catch(this.errorHandler)
    },
    iceCandidate({uuid: peerUuid, ice}) {
      this.findPc(peerUuid)
        .pc.addIceCandidate(new RTCIceCandidate(ice))
        .catch(this.errorHandler)
    },
    toggleVideo({id, state}) {
      const player = this.findPc(id)

      if (player.stream) {
        const videoTracks = player.stream.getVideoTracks()

        videoTracks.forEach(track => {
          track.enabled = state
        })
        this.$set(player, 'isVideo', state)
      }
    },
    toggleAudio({id, state}) {
      const player = this.findPc(id)

      if (player.stream) {
        const audioTracks = player.stream.getAudioTracks()

        audioTracks.forEach(track => {
          track.enabled = state
        })
        this.$set(player, 'isAudio', state)
      }
    }
  },

  mounted() {
    this.setSpeechSettings()
  },
  beforeDestroy() {
    const {stream = null} = this.findPc(this.$socket.id)
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop()
      })
    }
    this.$socket.emit('leaveFromRoom', {room: this.room})
  },

  methods: {
    init(type) {
      const {room} = this.$route.params
      if (room) {
        this.room = room
      }

      const constraints = {
        // video: true,
        video: {
          // frameRate: { max: 30 },
          mandatory: {
            // maxWidth: 640,
            // maxHeight: 360,
            maxWidth: 1280,
            maxHeight: 720
          }
        },
        // audio: true,
        audio: {
          // echoCancellation: true,
          // noiseSuppression: true,
          // googNoiseSuppression: true,
          // googEchoCancellation: true,
          googEchoCancellation: false,
          googNoiseSuppression: false,
          googHighpassFilter: false,
          googTypingNoiseDetection: false,
          sampleRate: 48000,
          channelCount: 2,
          volume: 1.0,
          echoCancellation: true,
          noiseSuppression: false,
          autoGainControl: true
        }
      }

      navigator.mediaDevices[type](constraints)
        // .getUserMedia(constraints)
        // .getDisplayMedia(constraints)
        .then(this.gotStream)
        .catch(function(e) {
          console.log('getUserMedia() error: ' + e.name)
        })

      // const audio = new Audio(require('@/assets/audio/test.mp3'))
      // audio.play()
    },
    gotStream(stream) {
      // console.log('Adding local stream.')
      const settings = {
        id: this.$socket.id,
        displayName: this.userData.name || localStorage.getItem('displayName'),
        photoURL: this.userData?.photoURL,
        room: this.room,
        killPlayers: [],
        votePlayers: [],
        isAlive: true,
        nominateIndex: 0,
        isVideo: true,
        isAudio: true,
        canCheck: true,
        canNominate: true,
        isInitiator: false,
        isVisibleRole: [],
        password: '',
        global_id: localStorage.getItem('id')
      }
      this.peerConnections.push({
        stream,
        ...settings
      })
      this.$socket.emit('join', {
        ...settings
      })
      this.$nextTick(() => {
        const video = document.querySelector(`video[data-id="${this.$socket.id}"]`)
        video.muted = true
      })
    },
    streamOff(player) {
      return (
        !player.stream ||
        !player.isVideo ||
        ['failed', 'closed', 'disconnected'].includes(player?.pc?.connectionState)
      )
    },
    getFullscreen(id) {
      const video = document.querySelector(`video[data-id="${id}"]`)
      video.requestFullscreen()
    },
    setUpPeer(settings) {
      // console.log('SET UP PEER')
      const {stream} = this.findPc(this.$socket.id)
      const player = {
        ...settings,
        pc: new RTCPeerConnection(this.pcConfig)
      }
      // this.peerConnections.push(player)
      const existPlayer = this.findPc(settings.global_id)
      if (existPlayer.id) {
        this.$set(existPlayer, 'pc', player.pc)
      } else {
        this.peerConnections.push(player)
      }
      player.pc.onicecandidate = event => this.gotIceCandidate(event, settings.id)
      player.pc.onaddstream = event => this.handleRemoteStreamAdded(event, settings.id)
      player.pc.oniceconnectionstatechange = event => this.checkPeerDisconnect(event, settings.id)
      player.pc.addStream(stream)
    },
    createdDescription(description, uuid) {
      // console.log('got description', uuid)

      this.findPc(uuid)
        .pc.setLocalDescription(description)
        .then(() => {
          this.$socket.emit('description', {
            sdp: this.findPc(uuid).pc.localDescription,
            uuid: this.$socket.id,
            dest: uuid,
            room: this.room
          })
        })
        .catch(this.errorHandler)
    },
    handleRemoteStreamAdded(event, peerUuid) {
      // console.log('Remote stream added.', peerUuid)
      const player = this.findPc(peerUuid)
      this.$set(player, 'stream', event.stream)
    },
    gotIceCandidate(event) {
      if (event.candidate != null) {
        // console.log('candidate')
        this.$socket.emit('iceCandidate', {
          ice: event.candidate,
          uuid: this.$socket.id,
          room: this.room
        })
      }
    },
    checkPeerDisconnect(event, peerUuid) {
      const state = this.findPc(peerUuid)?.pc?.iceConnectionState
      // console.log(`connection with peer ${peerUuid} ${state}`)
      if (['failed', 'closed', 'disconnected'].includes(state)) {
        this.$delete(this.findPc(peerUuid), 'stream')
        this.$delete(this.findPc(peerUuid), 'pc')
      }
    },
    errorHandler(e) {
      console.error(e)
    },

    checkPassword() {
      const {password, orig_password} = this.dialogPassword
      if (password === orig_password) {
        const {stream, ...player} = this.findPc(this.$socket.id)
        this.$socket.emit('join', {...player, password})
      } else {
        alert('Password is incorrect')
        this.peerConnections = []
      }
      this.dialogPassword = {
        value: false,
        password: '',
        orig_password: ''
      }
    },

    setSpeechSettings() {
      const voices = window.speechSynthesis.getVoices()

      this.speechSynthesisUtterance = new SpeechSynthesisUtterance()
      this.speechSynthesisUtterance.voice = voices[17]
      this.speechSynthesisUtterance.rate = 0.8
    },
    speechSpeak({text}) {
      this.$socket.emit('speechSpeak', {text, room: this.room})
    },

    findPc(id) {
      const player = this.peerConnections.find(pc => pc.id === id || pc.global_id === id) ?? {}
      return player
    },
    findIndexPc(id) {
      return this.peerConnections.findIndex(pc => pc.id === id || pc.global_id === id) ?? {}
    },

    canSeeToggleVideo(player) {
      return (
        player?.stream?.getVideoTracks()[0] &&
        (player.id === this.$socket.id || this.findPc(this.$socket.id).isInitiator)
      )
    },
    toggleVideo({id, room, state = null}) {
      // console.log(id, room)
      const {stream} = this.findPc(id)
      if (stream) {
        const track = stream.getVideoTracks()[0]
        if (track) {
          this.$socket.emit('toggleVideo', {id, room, state: state ?? !track.enabled})
        }
      }
    },

    canSeeToggleAudio(player) {
      return (
        player?.stream?.getAudioTracks()[0] &&
        (player.id === this.$socket.id || this.findPc(this.$socket.id).isInitiator)
      )
    },
    toggleAudio({id, room, state = null}) {
      // console.log(id, room)
      const {stream} = this.findPc(id)
      if (stream) {
        const track = stream.getAudioTracks()[0]
        if (track) {
          this.$socket.emit('toggleAudio', {id, room, state: state ?? !track.enabled})
        }
      }
    },

    canCheckRole({id, global_id}) {
      const {role, isAlive, canCheck, isVisibleRole = []} = this.findPc(this.$socket.id) ?? {}

      return (
        this.$socket.id !== id &&
        !isVisibleRole.includes(global_id) &&
        isAlive &&
        ['detective', 'boss'].includes(role) &&
        role === this.gameInfo.type &&
        canCheck
      )
    },
    checkRole({global_id}) {
      const {isVisibleRole, global_id: fromId} = this.findPc(this.$socket.id)

      isVisibleRole.push(global_id)
      this.$set(this.findPc(this.$socket.id), 'canCheck', false)
      this.$socket.emit('updatePlayerInfo', {
        room: this.room,
        id: this.$socket.id,
        isVisibleRole,
        canCheck: false
      })

      this.addStatCheckRole({fromId, toId: global_id})
    },

    canNomination({id, isNominate = false, isAlive}) {
      const {isAlive: meIsAlive, canNominate} = this.findPc(this.$socket.id) ?? {}

      return (
        meIsAlive &&
        this.gameInfo.type === 'nomination' &&
        this.$socket.id !== id &&
        this.$socket.id === this.gameInfo.active &&
        canNominate &&
        !isNominate &&
        isAlive
      )
    },
    nomination({id}) {
      this.$set(this.findPc(id), 'isNominate', true)
      this.$set(this.findPc(id), 'nominateIndex', this.nominateIndex)
      this.$socket.emit('updatePlayerInfo', {
        room: this.room,
        id,
        isNominate: true,
        nominateIndex: this.nominateIndex
      })

      this.nominateIndex += 1
      this.$socket.emit('updateRoomInfo', {
        room: this.room,
        nominateIndex: this.nominateIndex
      })

      this.$set(this.findPc(this.$socket.id), 'canNominate', false)
      this.$socket.emit('updatePlayerInfo', {
        room: this.room,
        id: this.$socket.id,
        canNominate: false
      })

      this.addStatNomination({id})
    },

    canVoteForExile({id, isAlive, votePlayers, isNominate}) {
      const {global_id} = this.findPc(this.$socket.id)
      return (
        this.$socket.id !== id &&
        this.gameInfo.type === 'exile' &&
        !votePlayers.includes(global_id) &&
        this.findPc(this.$socket.id).isAlive &&
        isAlive &&
        isNominate
      )
    },
    voteForExile({id}) {
      const {global_id} = this.findPc(this.$socket.id)
      this.peerConnections.forEach(pc => {
        if (pc.id === id) {
          pc.votePlayers.push(global_id)
        } else {
          pc.votePlayers = pc.votePlayers.filter(id => id !== global_id)
        }
        this.$socket.emit('updatePlayerInfo', {
          room: this.room,
          id: pc.id,
          votePlayers: pc.votePlayers
        })
      })
    },
    exile({duration = 5000} = {}) {
      const maxVotePlayers = this.peerConnections.reduce((result, pc) => {
        const {votePlayers = []} = result[0] || {}

        if (pc.votePlayers.length > votePlayers.length) {
          return [pc]
        } else if (pc.votePlayers.length && pc.votePlayers.length === votePlayers.length) {
          result.push(pc)
          return result
        } else {
          return result
        }
      }, [])

      if (!maxVotePlayers.length) {
        return
      }

      if (maxVotePlayers.length > 1) {
        if (this.isSecondVoting) {
          return
        }

        const maxVotePlayersIds = maxVotePlayers.map(player => player.id)
        this.secondVoting(maxVotePlayersIds)
        this.gameSteps.splice(-1, 0, ...this.gameVoting())
      } else {
        const {id, displayName} = maxVotePlayers[0]
        this.gameSteps.splice(-1, 0, ...this.gameLastWord({duration, id, displayName}))
      }
    },
    banPlayer({id}) {
      this.$socket.emit('banPlayer', {id, room: this.room})
    },

    canVoteForKill({id}) {
      const {role, isAlive, global_id} = this.findPc(this.$socket.id) ?? {}
      const {killPlayers = []} = this.findPc(id) ?? {}

      return (
        ['boss', 'mafia'].includes(role) &&
        this.gameInfo.type === 'mafia' &&
        isAlive &&
        !killPlayers.includes(global_id)
      )
    },
    voteForKill({id}) {
      const {global_id} = this.findPc(this.$socket.id)
      this.peerConnections.forEach(pc => {
        if (pc.id === id) {
          pc.killPlayers.push(global_id)
        } else {
          pc.killPlayers = pc.killPlayers.filter(id => id !== global_id)
        }
        this.$socket.emit('updatePlayerInfo', {
          room: this.room,
          id: pc.id,
          killPlayers: pc.killPlayers
        })
      })
    },
    shouldKill() {
      const {id, killPlayers, isHeal, isAlive} = this.peerConnections.reduce((result, pc) => {
        if (pc.killPlayers.length > result.killPlayers.length) {
          return pc
        }
        return result
      })
      if (killPlayers.length && !isHeal && isAlive) {
        this.killPlayer({id})
        this.toggleVideo({id, room: this.room, state: false})
        this.toggleAudio({id, room: this.room, state: false})
        this.addStatKill({id})
      }
    },
    killPlayer({id}) {
      this.$set(this.findPc(id), 'isAlive', false)
      this.$set(this.findPc(id), 'isDeadLastRound', true)
      this.$socket.emit('updatePlayerInfo', {
        room: this.room,
        id,
        isAlive: false,
        isDeadLastRound: true
      })
    },

    canHeal({id}) {
      const {role, isAlive} = this.findPc(this.$socket.id) ?? {}
      const {isHeal, isHealedLastRound} = this.findPc(id) ?? {}

      return (
        role === 'doctor' && role === this.gameInfo.type && isAlive && !isHeal && !isHealedLastRound
      )
    },
    heal({id}) {
      this.peerConnections.forEach(pc => {
        if (pc.id === id) {
          this.$set(pc, 'isHeal', true)
        } else {
          this.$set(pc, 'isHeal', false)
        }
        this.$socket.emit('updatePlayerInfo', {
          room: this.room,
          id: pc.id,
          isHeal: pc.isHeal
        })
      })
    },

    canSeeBadge(player) {
      const {role} = this.findPc(this.$socket.id) ?? {}

      return (
        this.gameInfo.type !== 'exile' &&
        ((['boss', 'mafia'].includes(role) && player.killPlayers.length) ||
          player.votePlayers.length)
      )
    },
    badgeContent(player) {
      return player.killPlayers.length || player.votePlayers.length
    },
    getListPlayers(player) {
      const {role} = this.findPc(this.$socket.id) ?? {}

      if (['boss', 'mafia'].includes(role) && player.killPlayers.length) {
        return player.killPlayers
      } else {
        return player.votePlayers
      }
    },
    newInitiator({id}) {
      clearInterval(this.timer)

      const player = this.findPc(this.$socket.id)
      this.$set(player, 'isInitiator', false)
      this.$socket.emit('updatePlayerInfo', {
        room: this.room,
        id: player.id,
        isInitiator: player.isInitiator
      })

      const playerInitiator = this.findPc(id)
      this.$set(playerInitiator, 'isInitiator', true)
      this.$socket.emit('updatePlayerInfo', {
        room: this.room,
        id: playerInitiator.id,
        isInitiator: playerInitiator.isInitiator
      })

      this.isPause = true
      this.$socket.emit('updateRoomInfo', {
        room: this.room,
        isPause: this.isPause
      })

      this.$socket.emit('newInitiator', {
        id
      })
    },
    secondVoting(players) {
      this.isSecondVoting = true
      this.nominateIndex = 1
      this.$socket.emit('updateRoomInfo', {
        room: this.room,
        isSecondVoting: this.isSecondVoting,
        nominateIndex: this.nominateIndex
      })
      this.peerConnections.forEach(pc => {
        this.$set(pc, 'isNominate', false)
        this.$set(pc, 'nominateIndex', 0)
        this.$set(pc, 'votePlayers', [])
        if (players.includes(pc.id)) {
          this.$set(pc, 'isNominate', true)
          this.$set(pc, 'nominateIndex', this.nominateIndex)
          this.nominateIndex += 1
          this.$socket.emit('updateRoomInfo', {
            room: this.room,
            nominateIndex: this.nominateIndex
          })
        }
        this.$socket.emit('updatePlayerInfo', {
          room: this.room,
          id: pc.id,
          isNominate: pc.isNominate,
          nominateIndex: pc.nominateIndex,
          votePlayers: pc.votePlayers
        })
      })
    },
    addDuration(e, duration = 10000) {
      this.duration += duration
      this.$socket.emit('updateRoomInfo', {room: this.room, duration: this.duration})
    },

    addStat(stat) {
      const lastEl = this.statistics[this.statistics.length - 1] ?? {}
      if (lastEl.title === stat.title) {
        lastEl.players = [...lastEl.players, ...stat.players]
      } else {
        this.statistics.push(stat)
      }
      this.$socket.emit('updateRoomInfo', {
        room: this.room,
        statistics: this.statistics
      })
    },
    addStatPlayers() {
      const players = [
        {
          from: this.peerConnections.map(pc => pc.global_id)
        }
      ]

      this.addStat({
        title: 'players',
        players
      })
    },
    addStatMafia() {
      const players = this.peerConnections
        .filter(pc => pc.killPlayers.length)
        .map(pc => ({
          from: pc.killPlayers,
          to: pc.id
        }))

      this.addStat({
        title: 'mafia',
        icon: 'mdi-axe',
        iconClass: 'error--text',
        players
      })
    },
    addStatCheckRole({fromId, toId}) {
      const {role} = this.findPc(fromId)

      this.addStat({
        title: role,
        icon: 'mdi-magnify',
        iconClass: 'warning--text',
        players: [
          {
            from: [fromId],
            to: toId
          }
        ]
      })
    },
    addStatDoctor() {
      const doctor = this.peerConnections.find(pc => pc.role === 'doctor' && pc.isAlive)
      if (!doctor) return

      const playerIsHealed = this.peerConnections.find(pc => pc.isHeal)

      this.addStat({
        title: 'doctor',
        icon: 'mdi-bottle-tonic-plus',
        iconClass: 'primary--text',
        players: [
          {
            from: [doctor.global_id],
            to: playerIsHealed ? playerIsHealed.id : null
          }
        ]
      })
    },
    addStatNomination({id}) {
      const {global_id} = this.findPc(this.$socket.id)
      this.addStat({
        title: 'nomination',
        icon: 'mdi-account-alert',
        iconClass: 'primary--text',
        players: [
          {
            from: [global_id],
            to: id
          }
        ]
      })
    },
    addStatVoting() {
      const players = this.peerConnections
        .filter(pc => pc.votePlayers.length)
        .map(pc => ({
          from: pc.votePlayers,
          to: pc.id
        }))

      this.addStat({
        title: this.isSecondVoting ? 'secondVotingResult' : 'votingResult',
        icon: 'mdi-account-check',
        iconClass: 'primary--text',
        players
      })
    },
    addStatKill({id}) {
      const {global_id} = this.findPc(id)
      this.addStat({
        title: 'dead',
        icon: 'mdi-emoticon-dead',
        iconClass: 'error--text',
        players: [
          {
            from: [global_id]
          }
        ]
      })
    },

    startGame() {
      const settings = {
        statistics: [],
        gameSteps: [...this.randezvous()],
        duration: 5000,
        gameIsStarted: true,
        isPause: false
      }
      this.$socket.emit('startGame', {room: this.room, ...settings})
      this.setGameInfo({text: this.$t('mafia.startingGame'), type: 'start'})
      this.statistics = settings.statistics
      this.gameSteps = settings.gameSteps
      this.duration = settings.duration
      this.gameIsStarted = settings.gameIsStarted
      this.isPause = settings.isPause
      this.nextStep(this.gameSteps[0], 5000)
      this.makeScreenshots()
      this.addStatPlayers()
    },
    pauseGame() {
      this.isPause = !this.isPause
      this.$socket.emit('updateRoomInfo', {room: this.room, isPause: this.isPause})
    },
    endGame() {
      this.peerConnections.forEach(({id, room}) => {
        this.toggleVideo({id, room, state: true})
        this.toggleAudio({id, room, state: true})
      })
      this.resetGameNight()
      this.resetGameDay()
      this.peerConnections.forEach(pc => {
        this.$set(pc, 'isAlive', true)
        this.$set(pc, 'isVisibleRole', [...this.peerConnections.map(pc => pc.global_id)])
        this.$socket.emit('updatePlayerInfo', {
          room: this.room,
          id: pc.id,
          isAlive: pc.isAlive,
          isVisibleRole: pc.isVisibleRole
        })
      })

      this.duration = 0
      this.isSecondVoting = false
      this.gameIsStarted = false
      this.$socket.emit('updateRoomInfo', {
        room: this.room,
        duration: this.duration,
        isSecondVoting: this.isSecondVoting,
        gameIsStarted: this.gameIsStarted
      })

      clearInterval(this.timer)
    },
    setGameInfo(info) {
      this.gameInfo = info
      this.$socket.emit('setGameInfo', {
        gameInfo: info,
        room: this.room
      })
    },
    makeScreenshots() {
      const canvas = document.querySelector('canvas')
      const videos = document.querySelectorAll('video')

      videos.forEach(video => {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        canvas.getContext('2d').drawImage(video, 0, 0)

        const src = canvas.toDataURL('image/png')
        const player = this.findPc(video.dataset.id)
        this.$set(player, 'src', src)
      })

      canvas.width = 0
      canvas.height = 0
      this.peerConnections.forEach(pc => {
        this.$socket.emit('updatePlayerInfo', {
          room: this.room,
          id: pc.id,
          src: pc.src
        })
      })
    },
    activePlayer({id, global_id, role}) {
      return role && [id, global_id].includes(this.gameInfo.active)
    },

    // gameSteps
    executeGameStep({
      duration = this.duration,
      info = null,
      speech = null,
      emit = null,
      methods = []
    } = {}) {
      this.duration = duration

      if (info) {
        this.setGameInfo(info)
      }

      if (speech) {
        this.speechSpeak(speech)
      }

      if (emit) {
        this.$socket.emit(emit.name, emit.options)
      }

      methods.forEach(({f, args = []}) => {
        this[f](...args)
      })
    },
    setGameNight() {
      this.resetGameDay()
      this.gameSteps.push(...this.gameNight())
    },
    setGameDay() {
      this.gameSteps.push(...this.gameDay())
    },
    setGameVoting() {
      this.gameSteps.splice(-1, 0, ...this.gameVoting())
      this.$socket.emit('gameVoting', {room: this.room})
    },
    setGameExplanation({duration = 30000} = {}) {
      this.peerConnections
        .filter(player => player.isAlive && player.isNominate)
        .sort((playerA, playerB) => (playerA.nominateIndex > playerB.nominateIndex ? 1 : -1))
        .forEach(player => {
          this.gameExplanation({duration, player})
        })
    },
    randezvous(duration = 60000) {
      return [
        ...this.peerConnections
          .filter(player => player.stream)
          .map(player => ({
            method: 'executeGameStep',
            options: {
              duration,
              info: {
                text: `${this.$t('mafia.randezvous')}: ${player.displayName}`,
                type: 'randezvous',
                active: player.id
              }
            }
          })),
        {
          method: 'setGameNight'
        }
      ]
    },
    gameNight(duration = 5000) {
      return [
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.citySleep')
            },
            speech: {
              text: this.$t('mafia.citySleep')
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.mafiaWakeUp')
            },
            speech: {
              text: this.$t('mafia.mafiaWakeUp')
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration: 20000,
            info: {
              text: `${this.$t('mafia.night')}: ${this.$t('mafia.mafia')}`,
              type: 'mafia'
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.mafiaSleep')
            },
            speech: {
              text: this.$t('mafia.mafiaSleep')
            },
            methods: [
              {
                f: 'addStatMafia'
              }
            ]
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.bossWakeUp')
            },
            speech: {
              text: this.$t('mafia.bossWakeUp')
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration: 20000,
            info: {
              text: `${this.$t('mafia.night')}: ${this.$t('mafia.boss')}`,
              type: 'boss'
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.bossSleep')
            },
            speech: {
              text: this.$t('mafia.bossSleep')
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.detectiveWakeUp')
            },
            speech: {
              text: this.$t('mafia.detectiveWakeUp')
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration: 20000,
            info: {
              text: `${this.$t('mafia.night')}: ${this.$t('mafia.detective')}`,
              type: 'detective'
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.detectiveSleep')
            },
            speech: {
              text: this.$t('mafia.detectiveSleep')
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.doctorWakeUp')
            },
            speech: {
              text: this.$t('mafia.doctorWakeUp')
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration: 20000,
            info: {
              text: `${this.$t('mafia.night')}: ${this.$t('mafia.doctor')}`,
              type: 'doctor'
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.doctorSleep')
            },
            speech: {
              text: this.$t('mafia.doctorSleep')
            },
            methods: [
              {
                f: 'addStatDoctor'
              }
            ]
          }
        },
        {
          method: 'shouldKill',
          options: {
            duration: 0
          }
        },
        {
          method: 'setGameDay'
        }
      ]
    },
    gameDay(duration = 5000) {
      return [
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.cityWakeUp')
            },
            speech: {
              text: this.$t('mafia.cityWakeUp')
            }
          }
        },
        {
          method: 'meeting'
        },
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.prepareToTheNomination'),
              type: 'nomination'
            }
          }
        },
        ...this.peerConnections
          .filter(player => player.isAlive && player.stream)
          .map(player => ({
            method: 'executeGameStep',
            options: {
              duration: 60000,
              info: {
                text: `${this.$t('mafia.nomination')}: ${player.displayName}`,
                type: 'nomination',
                active: player.id
              }
            }
          })),
        {
          method: 'setGameVoting'
        },
        {
          method: 'setGameNight'
        }
      ]
    },
    gameVoting(duration = 5000) {
      return [
        {
          method: 'setGameExplanation'
        },
        {
          method: 'executeGameStep',
          options: {
            duration: 10000,
            info: {
              text: this.$t('mafia.voteForExile'),
              type: 'exile'
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration: 10000,
            info: {
              text: this.$t('mafia.votingResult'),
              type: 'voting'
            },
            methods: [
              {
                f: 'addStatVoting'
              }
            ]
          }
        },
        {
          method: 'exile',
          options: {
            duration: 5000
          }
        }
      ]
    },
    gameExplanation({duration, player}) {
      this.gameSteps.splice(-4, 0, {
        method: 'executeGameStep',
        options: {
          duration,
          info: {
            text: `${this.$t('mafia.explanation')}: ${player.displayName}`,
            type: 'explanation',
            active: player.id
          }
        }
      })
    },
    gameLastWord({duration = 5000, id, displayName}) {
      return [
        {
          method: 'executeGameStep',
          options: {
            duration: 60000,
            info: {
              text: `${this.$t('mafia.lastWord')}: ${displayName}`,
              type: 'last_word',
              active: id
            }
          }
        },
        {
          method: 'executeGameStep',
          options: {
            duration,
            info: {
              text: this.$t('mafia.prepareToTheNight')
            },
            methods: [
              {
                f: 'killPlayer',
                args: [{id}]
              },
              {
                f: 'addStatKill',
                args: [{id}]
              },
              {
                f: 'toggleVideo',
                args: [{id, room: this.room, state: false}]
              },
              {
                f: 'toggleAudio',
                args: [{id, room: this.room, state: false}]
              }
            ]
          }
        }
      ]
    },
    meeting({duration = 180000} = {}) {
      this.resetGameNight()
      this.duration = duration
      this.setGameInfo({text: this.$t('mafia.meeting'), type: 'meeting'})
    },

    resetGameNight() {
      this.peerConnections.forEach(pc => {
        if (pc.isHeal) {
          this.$set(pc, 'isHealedLastRound', true)
        } else if (pc.isHealedLastRound && !pc.isHeal) {
          this.$set(pc, 'isHealedLastRound', false)
        }
        this.$set(pc, 'isHeal', false)
        this.$set(pc, 'killPlayers', [])
        this.$set(pc, 'canCheck', true)
        this.$socket.emit('updatePlayerInfo', {
          room: this.room,
          id: pc.id,
          isHealedLastRound: pc.isHealedLastRound,
          isHeal: pc.isHeal,
          killPlayers: pc.killPlayers,
          canCheck: pc.canCheck
        })
      })
    },
    resetGameDay() {
      this.peerConnections.forEach(pc => {
        this.$set(pc, 'isNominate', false)
        this.$set(pc, 'nominateIndex', 0)
        this.$set(pc, 'votePlayers', [])
        this.$set(pc, 'isDeadLastRound', false)
        this.$set(pc, 'canNominate', true)
        this.$socket.emit('updatePlayerInfo', {
          room: this.room,
          id: pc.id,
          isNominate: pc.isNominate,
          nominateIndex: pc.nominateIndex,
          votePlayers: pc.votePlayers,
          isDeadLastRound: pc.isDeadLastRound,
          canNominate: pc.canNominate
        })
      })
      this.nominateIndex = 1
      this.isSecondVoting = false
      this.$socket.emit('updateRoomInfo', {
        room: this.room,
        nominateIndex: this.nominateIndex,
        isSecondVoting: this.isSecondVoting
      })
    },
    shouldEndGame() {
      const mafia = this.peerConnections.filter(
        player =>
          ['boss', 'mafia'].includes(player.role) && player.isAlive && player.role && player.stream
      )
      const citizen = this.peerConnections.filter(
        player =>
          !['boss', 'mafia'].includes(player.role) && player.isAlive && player.role && player.stream
      )

      const getWinner = () => {
        if (mafia.length >= citizen.length) {
          return 'mafiaWin'
        } else if (!mafia.length) {
          return 'citizenWin'
        } else {
          return null
        }
      }

      return {
        done: mafia.length >= citizen.length || !mafia.length,
        winner: getWinner()
      }
    },

    formatRole(player) {
      const {role, isVisibleRole} = this.findPc(this.$socket.id)
      if (
        (isVisibleRole.includes(player.global_id) && player.role) ||
        (player.id === this.$socket.id && player.role)
      ) {
        if (!this.gameIsStarted || player.id === this.$socket.id) {
          return player.role
        }

        if (['boss', 'mafia'].includes(player.role) && role === 'detective') {
          return 'mafia'
        } else if (!['boss', 'mafia'].includes(player.role) && role === 'detective') {
          return 'citizen'
        } else if (!['boss', 'mafia', 'detective'].includes(player.role) && role === 'boss') {
          return 'citizen'
        }

        return player.role
      }

      return 'undefinedRole'
    },
    openDialogAlert({text = this.$t('messages.confirm'), method, args = []}) {
      this.dialogAlert = {
        value: true,
        method,
        text,
        args
      }
    },
    confirmDialogAlert() {
      const {args = []} = this.dialogAlert
      this.dialogAlert.method(...args)
      this.dialogAlert = {
        value: false,
        method: null,
        text: '',
        args: []
      }
    },
    openDialogSettings() {
      const {displayName} = this.findPc(this.$socket.id)
      this.dialogSettings = {
        value: true,
        displayName,
        name: this.name,
        limit: this.limit,
        password: this.password
      }
    },
    updateSettings() {
      this.dialogSettings.value = false
      const {value, speech, displayName, name, limit, password} = this.dialogSettings
      localStorage.setItem('displayName', displayName)
      this.$socket.emit('updatePlayerInfo', {
        room: this.room,
        id: this.$socket.id,
        displayName
      })
      this.name = name
      this.limit = limit
      this.password = password
      this.$socket.emit('updateRoomInfo', {
        room: this.room,
        name,
        limit,
        password
      })
      if (speech) {
        this.speechSpeak({text: speech})
        this.speech = null
      }
    },
    openDialogStat() {
      this.dialogStat.value = true
    },
    sortPlayers() {
      const numbers = this.peerConnections
        .map((pc, index) => index)
        .sort(() => (Math.random() > 0.5 ? 1 : -1))
      const players = this.peerConnections.map(({id}) => ({index: numbers.shift(), id}))

      this.$socket.emit('sortPlayers', {
        room: this.room,
        players
      })
    },
    goToNextStep() {
      this.duration = 0
      this.executeNextStep(this.gameSteps[0])
    },
    nextStep({method, options = {}}, duration = null) {
      // this.duration = options.duration || duration || this.duration
      this.timer = setInterval(() => {
        if (!this.isPause) {
          this.duration = Math.max(0, this.duration - 1000)
          this.$socket.emit('updateRoomInfo', {room: this.room, duration: this.duration})

          if (this.duration <= 0) {
            this.executeNextStep({method, options})
          }
        }
      }, 1000)
    },
    executeNextStep({method, options = {}}) {
      const {done, winner} = this.shouldEndGame()
      if (done) {
        this.endGame()
        this.setGameInfo({text: this.$t(`mafia.${winner}`), type: 'end'})
        this.speechSpeak({text: this.$t(`mafia.${winner}`)})
      } else {
        this[method](options)
        clearInterval(this.timer)
        this.removeNextStep()
        this.nextStep(this.gameSteps[0], this.duration)
      }
    },
    removeNextStep() {
      this.gameSteps.shift()
      this.$socket.emit('updateRoomInfo', {id: this.room, gameSteps: this.gameSteps})
    },
    exit() {
      this.$router.push('/')
    }
  }
}
</script>

<style lang="sass">
.pointer
  &:hover
    cursor: pointer

.bgtext
  // background: #499500
  &--left
    // border-radius: 0 8px 0 8px
    border-radius: 8px
  &--right
    // border-radius: 8px 0 8px 0
    border-radius: 8px

.ghost
  opacity: 0.25
  background: #920031
  border-radius: 10px

video::-webkit-media-controls
  display:none !important

.v-window__container
  background: #1e1e1e !important
</style>
