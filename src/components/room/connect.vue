<template>
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
</template>

<script>
import {mapGetters} from 'vuex'
import mixinMafia from '@/mixins/mafia'

export default {
  mixins: [mixinMafia],

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
    }
  }),
  computed: {
    ...mapGetters(['userData', 'game', 'peerConnections'])
  },

  sockets: {
    join(settings) {
      // console.log('JOIN')
      const {stream, pc, ...mySettings} = this.findPc(this.$socket.id)
      this.setUpPeer(settings)
      this.$socket.emit('createOffer', {
        dest: settings.id,
        ...mySettings
      })
    },
    createOffer(settings) {
      // console.log('CREATE OFFER')
      this.setUpPeer(settings)
      this.findPc(settings.id)
        .pc.createOffer()
        .then(description => this.createdDescription(description, settings.id))
        .catch(this.errorHandler)
    },
    description({uuid: peerUuid, sdp}) {
      // console.log('SDP_TYPE', sdp.type)
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
    }
  },

  methods: {
    init(type) {
      const {room} = this.$route.params
      if (room) {
        this.$store.commit('SET_GAME', {room})
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
        room: this.game.room,
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
      this.$store.commit('ADD_PEER_CONNECTIONS', {
        stream,
        ...settings
      })
      this.$socket.emit('join', {
        ...settings
      })
    },
    setUpPeer(settings) {
      // console.log('SET UP PEER')
      const {stream} = this.findPc(this.$socket.id)
      const player = {
        ...settings,
        pc: new RTCPeerConnection(this.pcConfig)
      }
      const existPlayer = this.findPc(settings.global_id)
      if (existPlayer.id) {
        this.$set(existPlayer, 'pc', player.pc)
      } else {
        this.$store.commit('ADD_PEER_CONNECTIONS', player)
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
      // console.log('REMOTE STREAM ADDED', peerUuid)
      const player = this.findPc(peerUuid)
      this.$set(player, 'stream', event.stream)
    },
    gotIceCandidate(event) {
      // console.log('CANDIDATE', event.candidate)
      if (event.candidate != null) {
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
    }
  }
}
</script>
