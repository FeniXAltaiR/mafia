<template>
  <div class="container">
    <div id="videos">
      <div id="videosWrapper">
        <div id="localVideoWrap" class="videoWrap">
          <video class="videoBox" id="localVideo" autoplay controls></video>
          <button id="videoMenu">toggle Video</button>
          <button id="micMenu">toggle Audio</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
let io;
const Meeting = function(socketioHost) {
  const exports = {};

  // let _isInitiator = false;
  let _localStream;
  let _remoteStream;
  // let _turnReady;
  const _pcConfig = {
    iceServers: [
      {
        url: "stun:stun.l.google.com:19302"
      },
      {
        urls: "turn:your-aws-instance:3478?transport=tcp",
        username: "username",
        credential: "password"
      },
      {
        urls: "stun:your-aws-instance:3478?transport=tcp"
      }
    ]
  };
  const _constraints = { video: true, audio: true };
  let _defaultChannel;
  let _privateAnswerChannel;
  const _offerChannels = {};
  const _opc = {};
  const _apc = {};
  const _sendChannel = {};
  let _room;
  let _myID;
  let _onRemoteVideoCallback;
  let _onLocalVideoCallback;
  let _onChatMessageCallback;
  let _onChatReadyCallback;
  let _onChatNotReadyCallback;
  let _onParticipantHangupCallback;
  const _host = socketioHost;

  ////////////////////////////////////////////////
  // PUBLIC FUNCTIONS
  ////////////////////////////////////////////////
  /**
   *
   * Add callback function to be called when a chat message is available.
   *
   * @param name of the room to join
   */
  function joinRoom(name) {
    _room = name;

    _myID = generateID();
    console.log("Generated ID: " + _myID);

    // Open up a default communication channel
    initDefaultChannel();

    if (_room !== "") {
      console.log("Create or join room", _room);
      _defaultChannel.emit("create or join", { room: _room, from: _myID });
    }

    // Open up a private communication channel
    initPrivateChannel();

    // Get local media data
    navigator.mediaDevices
      .getUserMedia(_constraints)
      .then(handleUserMedia, handleUserMediaError);

    window.onbeforeunload = () => {
      _defaultChannel.emit("message", { type: "bye", from: _myID });
    };
  }

  /**
   *
   * Send a chat message to all channels.
   *
   * @param message String message to be send
   */
  function sendChatMessage(message) {
    console.log("Sending " + message);
    for (const channel in _sendChannel) {
      if (_sendChannel[channel]) {
        _sendChannel[channel].send(message);
      }
    }
  }

  /**
   *
   * Toggle microphone availability.
   *
   */
  function toggleMic() {
    const tracks = _localStream.getTracks();
    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i].kind == "audio") {
        tracks[i].enabled = !tracks[i].enabled;
      }
    }
  }

  /**
   *
   * Toggle video availability.
   *
   */
  function toggleVideo() {
    const tracks = _localStream.getTracks();
    for (let i = 0; i < tracks.length; i++) {
      if (tracks[i].kind == "video") {
        tracks[i].enabled = !tracks[i].enabled;
      }
    }
  }

  /**
   *
   * Add callback function to be called when remote video is available.
   *
   * @param callback of type function(stream, participantID)
   */
  function onRemoteVideo(callback) {
    _onRemoteVideoCallback = callback;
  }

  /**
   *
   * Add callback function to be called when local video is available.
   *
   * @param callback function of type function(stream)
   */
  function onLocalVideo(callback) {
    _onLocalVideoCallback = callback;
  }

  /**
   *
   * Add callback function to be called when chat is available.
   *
   * @parama callback function of type function()
   */
  function onChatReady(callback) {
    _onChatReadyCallback = callback;
  }

  /**
   *
   * Add callback function to be called when chat is no more available.
   *
   * @parama callback function of type function()
   */
  function onChatNotReady(callback) {
    _onChatNotReadyCallback = callback;
  }

  /**
   *
   * Add callback function to be called when a chat message is available.
   *
   * @parama callback function of type function(message)
   */
  function onChatMessage(callback) {
    _onChatMessageCallback = callback;
  }

  /**
   *
   * Add callback function to be called when a a participant left the conference.
   *
   * @parama callback function of type function(participantID)
   */
  function onParticipantHangup(callback) {
    _onParticipantHangupCallback = callback;
  }

  ////////////////////////////////////////////////
  // INIT FUNCTIONS
  ////////////////////////////////////////////////

  function initDefaultChannel() {
    _defaultChannel = openSignalingChannel("");

    _defaultChannel.on("created", function(room) {
      console.log("Created room " + room);
      // _isInitiator = true;
    });

    _defaultChannel.on("join", function(room) {
      console.log("Another peer made a request to join room " + room);
    });

    _defaultChannel.on("joined", function(room) {
      console.log("This peer has joined room " + room);
    });

    _defaultChannel.on("message", function(message) {
      console.log("Client received message:", message);
      if (message.type === "newparticipant") {
        let partID = message.from;
        console.log(message);

        // Open a new communication channel to the new participant
        _offerChannels[partID] = openSignalingChannel(partID);

        // Wait for answers (to offers) from the new participant
        _offerChannels[partID].on("message", function(msg) {
          if (msg.dest === _myID) {
            if (msg.type === "answer") {
              _opc[msg.from].setRemoteDescription(
                new RTCSessionDescription(msg.snDescription),
                setRemoteDescriptionSuccess,
                setRemoteDescriptionError
              );
            } else if (msg.type === "candidate") {
              const candidate = new RTCIceCandidate({
                sdpMLineIndex: msg.label,
                candidate: msg.candidate
              });
              console.log("got ice candidate from " + msg.from);
              _opc[msg.from].addIceCandidate(
                candidate,
                addIceCandidateSuccess,
                addIceCandidateError
              );
            }
          }
        });

        // Send an offer to the new participant
        createOffer(partID);
      } else if (message.type === "bye") {
        hangup(message.from);
      }
    });
  }

  function initPrivateChannel() {
    // Open a private channel (namespace = _myID) to receive offers
    // console.log('myID', _myID)
    _privateAnswerChannel = openSignalingChannel(_myID);

    // Wait for offers or ice candidates
    _privateAnswerChannel.on("message", function(message) {
      if (message.dest === _myID) {
        if (message.type === "offer") {
          const to = message.from;
          createAnswer(message, _privateAnswerChannel, to);
        } else if (message.type === "candidate") {
          const candidate = new RTCIceCandidate({
            sdpMLineIndex: message.label,
            candidate: message.candidate
          });
          _apc[message.from].addIceCandidate(
            candidate,
            addIceCandidateSuccess,
            addIceCandidateError
          );
        }
      }
    });
  }

  // function requestTurn(turn_url) {
  //   let turnExists = false;
  //   for (const i in _pcConfig.iceServers) {
  //     if (_pcConfig.iceServers[i].url.substr(0, 5) === "turn:") {
  //       turnExists = true;
  //       // _turnReady = true;
  //       break;
  //     }
  //   }

  //   if (!turnExists) {
  //     console.log("Getting TURN server from ", turn_url);
  //     const xhr = new XMLHttpRequest();
  //     xhr.onreadystatechange = function() {
  //       if (xhr.readyState === 4 && xhr.status === 200) {
  //         const turnServer = JSON.parse(xhr.responseText);
  //         console.log("Got TURN server: ", turnServer);
  //         _pcConfig.iceServers.push({
  //           url: "turn:" + turnServer.username + "@" + turnServer.turn,
  //           credential: turnServer.password
  //         });
  //         // _turnReady = true;
  //       }
  //     };
  //     xhr.open("GET", turn_url, true);
  //     xhr.send();
  //   }
  // }

  ///////////////////////////////////////////
  // UTIL FUNCTIONS
  ///////////////////////////////////////////

  /**
   *
   * Call the registered _onRemoteVideoCallback
   *
   */
  function addRemoteVideo(stream, from) {
    // call the callback
    _onRemoteVideoCallback(stream, from);
  }

  /**
   *
   * Generates a random ID.
   *
   * @return a random ID
   */
  function generateID() {
    // return 'random'
    const s4 = function() {
      return Math.floor(Math.random() * 0x10000).toString(16);
    };
    return (
      s4() +
      s4() +
      "-" +
      s4() +
      "-" +
      s4() +
      "-" +
      s4() +
      "-" +
      s4() +
      s4() +
      s4()
    );
  }

  ////////////////////////////////////////////////
  // COMMUNICATION FUNCTIONS
  ////////////////////////////////////////////////

  /**
   *
   * Connect to the server and open a signal channel using channel as the channel's name.
   *
   * @return the socket
   */
  function openSignalingChannel(channel) {
    const namespace = _host + "/" + channel;
    console.log("Opening private channel:" + namespace);
    const sckt = io.connect(namespace, {
      forceNew: true,
      transports: ["websocket"],
      nsp: _myID
    });
    console.log(channel, sckt);
    return sckt;
  }

  /**
   *
   * Send an offer to peer with id participantId
   *
   * @param participantId the participant's unique ID we want to send an offer
   */
  function createOffer(participantId) {
    console.log("Creating offer for peer " + participantId);
    _opc[participantId] = new RTCPeerConnection(_pcConfig);
    _opc[participantId].onicecandidate = handleIceCandidateAnswerWrapper(
      _offerChannels[participantId],
      participantId
    );
    _opc[participantId].ontrack = handleRemoteStreamAdded(participantId);
    _opc[participantId].onremovestream = handleRemoteStreamRemoved;
    _opc[participantId].addStream(_localStream);

    try {
      // Reliable Data Channels not yet supported in Chrome
      _sendChannel[participantId] = _opc[
        participantId
      ].createDataChannel("sendDataChannel", { reliable: false });
      _sendChannel[participantId].onmessage = handleMessage;
      console.log("Created send data channel");
    } catch (e) {
      alert(
        "Failed to create data channel. " +
          "You need Chrome M25 or later with RtpDataChannel enabled"
      );
      console.log("createDataChannel() failed with exception: " + e.message);
    }
    _sendChannel[participantId].onopen = handleSendChannelStateChange(
      participantId
    );
    _sendChannel[participantId].onclose = handleSendChannelStateChange(
      participantId
    );

    const onSuccess = function(participantId) {
      return function(sessionDescription) {
        const channel = _offerChannels[participantId];

        // Set Opus as the preferred codec in SDP if Opus is present.
        sessionDescription.sdp = preferOpus(sessionDescription.sdp);

        _opc[participantId].setLocalDescription(
          sessionDescription,
          setLocalDescriptionSuccess,
          setLocalDescriptionError
        );
        console.log("Sending offer to channel " + channel.nsp);
        channel.emit("message", {
          snDescription: sessionDescription,
          from: _myID,
          type: "offer",
          dest: participantId
        });
      };
    };

    _opc[participantId].createOffer(
      onSuccess(participantId),
      handleCreateOfferError
    );
  }

  function createAnswer(sdp, cnl, to) {
    console.log("Creating answer for peer " + to);
    _apc[to] = new RTCPeerConnection(_pcConfig);
    _apc[to].ontrack = handleIceCandidateAnswerWrapper(cnl, to);
    _apc[to].ontrack = handleRemoteStreamAdded(to);
    _apc[to].onremovestream = handleRemoteStreamRemoved;
    _apc[to].addStream(_localStream);
    _apc[to].setRemoteDescription(
      new RTCSessionDescription(sdp.snDescription),
      setRemoteDescriptionSuccess,
      setRemoteDescriptionError
    );

    _apc[to].ondatachannel = gotReceiveChannel(to);

    const onSuccess = function(channel) {
      return function(sessionDescription) {
        87;
        // Set Opus as the preferred codec in SDP if Opus is present.
        sessionDescription.sdp = preferOpus(sessionDescription.sdp);

        _apc[to].setLocalDescription(
          sessionDescription,
          setLocalDescriptionSuccess,
          setLocalDescriptionError
        );
        console.log("Sending answer to channel " + channel.nsp);
        channel.emit("message", {
          snDescription: sessionDescription,
          from: _myID,
          type: "answer",
          dest: to
        });
      };
    };

    _apc[to].createAnswer(onSuccess(cnl), handleCreateAnswerError);
  }

  function hangup(from) {
    console.log("Bye received from " + from);

    if (_opc[from]) {
      _opc[from].close();
      _opc[from] = null;
    }

    if (_apc[from]) {
      _apc[from].close();
      _apc[from] = null;
    }

    _onParticipantHangupCallback(from);
  }

  ////////////////////////////////////////////////
  // HANDLERS
  ////////////////////////////////////////////////

  // SUCCESS HANDLERS

  function handleUserMedia(stream) {
    console.log("Adding local stream");
    _onLocalVideoCallback(stream);
    _localStream = stream;
    _defaultChannel.emit("message", { type: "newparticipant", from: _myID });
  }

  function handleRemoteStreamRemoved(event) {
    console.log("Remote stream removed. Event: ", event);
  }

  function handleRemoteStreamAdded(from) {
    return function(event) {
      console.log("Remote stream added");

      _remoteStream = event.streams[0];

      if (event.track.kind == "video") {
        addRemoteVideo(_remoteStream, from);
      }
    };
  }

  function handleIceCandidateAnswerWrapper(channel, to) {
    return function handleIceCandidate(event) {
      console.log("handleIceCandidate event");
      if (event.candidate) {
        channel.emit("message", {
          type: "candidate",
          label: event.candidate.sdpMLineIndex,
          id: event.candidate.sdpMid,
          candidate: event.candidate.candidate,
          from: _myID,
          dest: to
        });
      } else {
        console.log("End of candidates.");
      }
    };
  }

  function setLocalDescriptionSuccess() {}

  function setRemoteDescriptionSuccess() {}

  function addIceCandidateSuccess() {}

  function gotReceiveChannel(id) {
    return function(event) {
      console.log("Receive Channel Callback");
      _sendChannel[id] = event.channel;
      _sendChannel[id].onmessage = handleMessage;
      _sendChannel[id].onopen = handleReceiveChannelStateChange(id);
      _sendChannel[id].onclose = handleReceiveChannelStateChange(id);
    };
  }

  function handleMessage(event) {
    console.log("Received message: " + event.data);
    _onChatMessageCallback(event.data);
  }

  function handleSendChannelStateChange(participantId) {
    return function() {
      const readyState = _sendChannel[participantId].readyState;
      console.log("Send channel state is: " + readyState);

      // check if we have at least one open channel before we set hat ready to false.
      const open = checkIfOpenChannel();
      enableMessageInterface(open);
    };
  }

  function handleReceiveChannelStateChange(participantId) {
    return function() {
      let readyState = _sendChannel[participantId].readyState;
      console.log("Receive channel state is: " + readyState);

      // check if we have at least one open channel before we set hat ready to false.
      let open = checkIfOpenChannel();
      enableMessageInterface(open);
    };
  }

  function checkIfOpenChannel() {
    let open = false;
    for (const channel in _sendChannel) {
      if (_sendChannel[channel]) {
        open = _sendChannel[channel].readyState == "open";
        if (open == true) {
          break;
        }
      }
    }

    return open;
  }

  function enableMessageInterface(shouldEnable) {
    if (shouldEnable) {
      _onChatReadyCallback();
    } else {
      _onChatNotReadyCallback();
    }
  }

  // ERROR HANDLERS

  function handleCreateOfferError(event) {
    console.log("createOffer() error: ", event);
  }

  function handleCreateAnswerError(event) {
    console.log("createAnswer() error: ", event);
  }

  function handleUserMediaError(error) {
    console.log("getUserMedia error: ", error);
  }

  function setLocalDescriptionError(error) {
    console.log("setLocalDescription error: ", error);
  }

  function setRemoteDescriptionError(error) {
    console.log("setRemoteDescription error: ", error);
  }

  function addIceCandidateError(error) {
    console.log(error);
  }

  ////////////////////////////////////////////////
  // CODEC
  ////////////////////////////////////////////////

  // Set Opus as the default audio codec if it's present.
  function preferOpus(sdp) {
    let sdpLines = sdp.split("\r\n");
    let mLineIndex;
    // Search for m line.
    for (let i = 0; i < sdpLines.length; i++) {
      if (sdpLines[i].search("m=audio") !== -1) {
        mLineIndex = i;
        break;
      }
    }
    if (mLineIndex === null || mLineIndex === undefined) {
      return sdp;
    }

    // If Opus is available, set it as the default in m line.
    for (let i = 0; i < sdpLines.length; i++) {
      if (sdpLines[i].search("opus/48000") !== -1) {
        const opusPayload = extractSdp(sdpLines[i], /:(\d+) opus\/48000/i);
        if (opusPayload) {
          sdpLines[mLineIndex] = setDefaultCodec(
            sdpLines[mLineIndex],
            opusPayload
          );
        }
        break;
      }
    }

    // Remove CN in m line and sdp.
    sdpLines = removeCN(sdpLines, mLineIndex);

    sdp = sdpLines.join("\r\n");
    return sdp;
  }

  function extractSdp(sdpLine, pattern) {
    const result = sdpLine.match(pattern);
    return result && result.length === 2 ? result[1] : null;
  }

  // Set the selected codec to the first in m line.
  function setDefaultCodec(mLine, payload) {
    const elements = mLine.split(" ");
    const newLine = [];
    let index = 0;
    for (let i = 0; i < elements.length; i++) {
      if (index === 3) {
        // Format of media starts from the fourth.
        newLine[index++] = payload; // Put target payload to the first.
      }
      if (elements[i] !== payload) {
        newLine[index++] = elements[i];
      }
    }
    return newLine.join(" ");
  }

  // Strip CN from sdp before CN constraints is ready.
  function removeCN(sdpLines, mLineIndex) {
    const mLineElements = sdpLines[mLineIndex].split(" ");
    // Scan from end for the convenience of removing an item.
    for (let i = sdpLines.length - 1; i >= 0; i--) {
      const payload = extractSdp(sdpLines[i], /a=rtpmap:(\d+) CN\/\d+/i);
      if (payload) {
        const cnPos = mLineElements.indexOf(payload);
        if (cnPos !== -1) {
          // Remove CN payload from m line.
          mLineElements.splice(cnPos, 1);
        }
        // Remove CN line in sdp
        sdpLines.splice(i, 1);
      }
    }

    sdpLines[mLineIndex] = mLineElements.join(" ");
    return sdpLines;
  }

  ////////////////////////////////////////////////
  // EXPORT PUBLIC FUNCTIONS
  ////////////////////////////////////////////////

  exports.joinRoom = joinRoom;
  exports.toggleMic = toggleMic;
  exports.toggleVideo = toggleVideo;
  exports.onLocalVideo = onLocalVideo;
  exports.onRemoteVideo = onRemoteVideo;
  exports.onChatReady = onChatReady;
  exports.onChatNotReady = onChatNotReady;
  exports.onChatMessage = onChatMessage;
  exports.sendChatMessage = sendChatMessage;
  exports.onParticipantHangup = onParticipantHangup;
  return exports;
};

export default {
  data: () => ({}),

  mounted() {
    io = this.$socket;
    this.init();
    // this.$socket.connect();
    // this.$socket.on('connect', () => {
    //   console.log(12345345)
    // })
  },

  methods: {
    init() {
      const host = "127.0.0.1:7000"; // HOST_ADDRESS gets injected into room.ejs from the server side when it is rendered

      const toggleVideo = stream => {
        const track = stream.getVideoTracks()[0];
        track.enabled = !track.enabled;
      };

      const toggleMic = stream => {
        const track = stream.getAudioTracks()[0];
        track.enabled = !track.enabled;
      };

      /////////////////////////////////
      // CREATE MEETING
      /////////////////////////////////
      const meeting = new Meeting(host);

      meeting.onLocalVideo(function(stream) {
        document.querySelector("#localVideo").srcObject = stream;

        document.querySelector("#micMenu").addEventListener("click", () => {
          toggleMic(stream);
        });

        document.querySelector("#videoMenu").addEventListener("click", () => {
          toggleVideo(stream);
        });

        document.querySelector("#localVideo").setAttribute("muted", true);
      });

      meeting.onRemoteVideo(function(stream, participantID) {
        addRemoteVideo(stream, participantID);
      });

      meeting.onParticipantHangup(function(participantID) {
        // Someone just left the meeting. Remove the participants video
        removeRemoteVideo(participantID);
      });

      meeting.onChatReady(function() {
        console.log("Chat is ready");
      });

      // const room = window.location.pathname.match(/([^\/]*)\/*$/)[1];
      const { room } = this.$route.params;
      meeting.joinRoom(room);

      function addRemoteVideo(stream, participantID) {
        const $videoBox = document.createElement("div");
        $videoBox.setAttribute("class", "videoWrap");
        $videoBox.setAttribute("id", participantID);

        const video = document.createElement("video");
        video.setAttribute("class", "videoBox");
        video.autoplay = true;
        video.srcObject = stream;

        $videoBox.append(video);
        document.querySelector("#videosWrapper").append($videoBox);
        adjustVideoSize();
      }

      function removeRemoteVideo(participantID) {
        document.querySelector("#" + participantID).remove();
        adjustVideoSize();
      }

      function adjustVideoSize() {
        const numOfVideos = document.querySelectorAll(".videoWrap").length;
        if (numOfVideos > 2) {
          const $container = document.querySelector("#videosWrapper");
          let newWidth;
          for (let i = 1; i <= numOfVideos; i++) {
            newWidth = $container.width() / i;

            // check if we can start a new row
            const scale =
              newWidth / document.querySelector(".videoWrap").width();
            const newHeight =
              document.querySelector(".videoWrap").height() * scale;
            const columns = Math.ceil($container.width() / newWidth);
            const rows = numOfVideos / columns;

            if (newHeight * rows <= $container.height()) {
              break;
            }
          }

          const percent = (newWidth / $container.width()) * 100;
          document.querySelector(".videoWrap").css("width", percent - 5 + "%");
          document.querySelector(".videoWrap").css("height", "auto");

          //let numOfColumns = Math.ceil(Math.sqrt(numOfVideos));
          let numOfColumns;
          for (let i = 2; i <= numOfVideos; i++) {
            if (numOfVideos % i === 0) {
              numOfColumns = i;
              break;
            }
          }
          document
            .querySelector("#videosWrapper")
            .find("br")
            .remove();
          document
            .querySelector(".videoWrap:nth-child(" + numOfColumns + "n)")
            .after("<br>");
        } else if (numOfVideos == 2) {
          document.querySelector(".videoWrap").width("auto");
          document.querySelector("#localVideoWrap").css("width", 20 + "%");
          document
            .querySelector("#videosWrapper")
            .find("br")
            .remove();
        } else {
          document.querySelector("#localVideoWrap").width("auto");
          document
            .querySelector("#videosWrapper")
            .find("br")
            .remove();
        }
      }
    }
  }
};
</script>
