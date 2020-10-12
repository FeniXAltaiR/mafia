export default {
  methods: {
    findPc(id) {
      const player = this.peerConnections.find(pc => pc.id === id || pc.global_id === id) ?? {}
      return player
    },
    findIndexPc(id) {
      return this.peerConnections.findIndex(pc => pc.id === id || pc.global_id === id) ?? {}
    },
    speechSpeak({text}) {
      this.$socket.emit('speechSpeak', {text, room: this.room})
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
    toggleAudio({id, room, state = null}) {
      // console.log(id, room)
      const {stream} = this.findPc(id)
      if (stream) {
        const track = stream.getAudioTracks()[0]
        if (track) {
          this.$socket.emit('toggleAudio', {id, room, state: state ?? !track.enabled})
        }
      }
    }
  }
}
