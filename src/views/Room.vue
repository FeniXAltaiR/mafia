<template>
  <div>
    <h1>Realtime communication with WebRTC</h1>

    <div id="videos">
      <video
        v-for="(stream, index) in streams"
        :key="index"
        :srcObject.prop="stream.srcObject"
        muted
        autoplay
        controls
      ></video>
      <!-- <video id="localVideo" autoplay muted playsinline controls></video> -->
      <!-- <video id="remoteVideo" autoplay muted playsinline controls></video> -->
    </div>
  </div>
</template>

<script>
export default {
  data: () => ({
    turnReady: null,
    isChannelReady: false,
    isInitiator: false,
    isStarted: false,
    localStream: null,
    pc: null,
    remoteStream: null,
    pcConfig: {
      iceServers: [
        {
          urls: 'stun:stun.l.google.com:19302'
        }
      ]
    },
    room: null,
    streams: []
  }),

  sockets: {
    connect() {
      console.log('Your socket has connected')
    },
    test(msg) {
      console.log('TEST is completed', msg)
    },
    created({room, id}) {
      console.log(`Created room: ${room}, id: ${id}`)
      this.isInitiator = true
    },
    full(room) {
      console.log('Room ' + room + ' is full')
    },
    join({room, id}) {
      console.log(`Another peer made a request to join room ${room} with id ${id}`)
      console.log('This peer is the initiator of room ' + room + '!')
      this.isChannelReady = true
    },
    joined({room, id}) {
      console.log(`joined room: ${room}, id: ${id}`)
      this.isChannelReady = true
    },
    log(array) {
      console.log.apply(console, array)
    },
    message(message) {
      console.log('Client received message:', message)
      if (message === 'got user media') {
        this.maybeStart()
      } else if (message.type === 'offer') {
        if (!this.isInitiator && !this.isStarted) {
          this.maybeStart()
        }
        this.pc.setRemoteDescription(new RTCSessionDescription(message))
        this.doAnswer()
      } else if (message.type === 'answer' && this.isStarted) {
        this.pc.setRemoteDescription(new RTCSessionDescription(message))
      } else if (message.type === 'candidate' && this.isStarted) {
        const candidate = new RTCIceCandidate({
          sdpMLineIndex: message.label,
          candidate: message.candidate
        })
        this.pc.addIceCandidate(candidate)
      } else if (message === 'bye' && this.isStarted) {
        this.handleRemoteHangup()
      }
    }
  },

  mounted() {
    this.init()
  },
  beforeDestroy() {
    this.sendMessage('bye')
  },

  methods: {
    init() {
      this.$socket.emit('test', 'test')
      const {room} = this.$route.params
      if (room) {
        this.room = room
      }

      if (this.room !== '') {
        this.$socket.emit('create or join', this.room)
        console.log('Attempted to create or join room', this.room)
      }

      const constraints = {
        video: true,
        audio: true
      }

      navigator.mediaDevices
        .getUserMedia(constraints)
        .then(this.gotStream)
        .catch(function(e) {
          alert('getUserMedia() error: ' + e.name)
        })

      console.log('Getting user media with constraints', constraints)

      if (location.hostname !== 'localhost') {
        this.requestTurn(
          'https://computeengineondemand.appspot.com/turn?username=41784574&key=4080218913'
        )
      }
    },
    sendMessage(message) {
      console.log('Client sending message: ', message)
      this.$socket.emit('message', message)
    },
    gotStream(stream) {
      // const localVideo = document.querySelector('#localVideo')
      console.log('Adding local stream.')
      this.localStream = stream
      // localVideo.srcObject = stream
      this.streams.push({
        srcObject: stream
      })
      // console.log(this.streams)
      this.sendMessage('got user media')
      if (this.isInitiator) {
        this.maybeStart()
      }
    },
    maybeStart() {
      console.log('>>>>>>> maybeStart() ', this.isStarted, this.localStream, this.isChannelReady)
      if (
        (!this.isStarted && typeof this.localStream !== 'undefined' && this.isChannelReady) ||
        this.streams.length >= 2
      ) {
        console.log('>>>>>> creating peer connection')
        this.createPeerConnection()
        this.pc.addStream(this.localStream)
        this.isStarted = true
        console.log('isInitiator', this.isInitiator)
        if (this.isInitiator) {
          this.doCall()
        }
      }
    },
    createPeerConnection() {
      try {
        this.pc = new RTCPeerConnection(null)
        this.pc.onicecandidate = this.handleIceCandidate
        this.pc.onaddstream = this.handleRemoteStreamAdded
        this.pc.onremovestream = this.handleRemoteStreamRemoved
        console.log('Created RTCPeerConnnection')
      } catch (e) {
        console.log('Failed to create PeerConnection, exception: ' + e.message)
        alert('Cannot create RTCPeerConnection object.')
        return
      }
    },
    handleIceCandidate(event) {
      console.log('icecandidate event: ', event)
      if (event.candidate) {
        this.sendMessage({
          type: 'candidate',
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate
        })
      } else {
        console.log('End of candidates.')
      }
    },
    handleCreateOfferError(event) {
      console.log('createOffer() error: ', event)
    },
    doCall() {
      console.log('Sending offer to peer')
      this.pc.createOffer(this.setLocalAndSendMessage, this.handleCreateOfferError)
    },
    doAnswer() {
      console.log('Sending answer to peer.')
      this.pc.createAnswer().then(this.setLocalAndSendMessage, this.onCreateSessionDescriptionError)
    },
    setLocalAndSendMessage(sessionDescription) {
      this.pc.setLocalDescription(sessionDescription)
      console.log('setLocalAndSendMessage sending message', sessionDescription)
      this.sendMessage(sessionDescription)
    },
    onCreateSessionDescriptionError(error) {
      console.log('Failed to create session description: ' + error.toString())
    },
    requestTurn(turnURL) {
      let turnExists = false
      for (const i in this.pcConfig.iceServers) {
        if (this.pcConfig.iceServers[i].urls.substr(0, 5) === 'turn:') {
          turnExists = true
          this.turnReady = true
          break
        }
      }
      if (!turnExists) {
        console.log('Getting TURN server from ', turnURL)
        // No TURN server. Get one from computeengineondemand.appspot.com:
        const xhr = new XMLHttpRequest()
        xhr.onreadystatechange = function() {
          if (xhr.readyState === 4 && xhr.status === 200) {
            const turnServer = JSON.parse(xhr.responseText)
            console.log('Got TURN server: ', turnServer)
            this.pcConfig.iceServers.push({
              urls: 'turn:' + turnServer.username + '@' + turnServer.turn,
              credential: turnServer.password
            })
            this.turnReady = true
          }
        }
        xhr.open('GET', turnURL, true)
        xhr.send()
      }
    },
    handleRemoteStreamAdded(event) {
      // const remoteVideo = document.querySelector('#remoteVideo')
      console.log('Remote stream added.')
      // this.remoteStream = event.stream
      // remoteVideo.srcObject = this.remoteStream
      this.streams.push({
        srcObject: event.stream
      })
    },
    handleRemoteStreamRemoved(event) {
      console.log('Remote stream removed. Event: ', event)
    },
    handleRemoteHangup() {
      console.log('Session terminated.')
      this.stop()
      this.isInitiator = false
    },
    stop() {
      this.isStarted = false
      this.pc.close()
      this.pc = null
    }
  }
}
</script>
