const express = require('express')
const app = express()
const fetch = require('node-fetch')
const cookieSession = require('cookie-session')
const socketio = require('socket.io')

app.use(express.static('public'))
app.use(
  cookieSession({
    secret: 'secret',
    signed: false
  })
)
app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type')
  res.setHeader('Access-Control-Allow-Credentials', true)

  next()
})

app.get('/test', (req, res) => {
  res.send(JSON.stringify({text: 'test'}, null, 2))
})

const server = app.listen(7000)

const connections = {}
const io = socketio(server)
const sock = io.of('/sock')
sock.on('connect', socket => {
  const playersInRoom = room => {
    const {sockets = {}} = io.nsps['/sock'].adapter.rooms[room] ?? {}
    const players = Object.keys(sockets)

    return players
  }
  const getRooms = () => {
    const {rooms: sockets = {}} = io.nsps['/sock'].adapter
    const rooms = Object.keys(sockets).filter(room => !room.startsWith('/sock#'))
    return rooms
  }
  const addSocketToConnections = () => {
    const socket_id = socket.id.replace('/sock#', '')
    const {query = {}} = io.sockets.sockets?.[socket_id]?.handshake ?? {}
    // const {query = {}} = socket?.handshake ?? {}

    if (query.global_id === 'null') {
      query.global_id = socket.id
      socket.handshake.query.global_id = socket.id
    }

    connections[socket.id] = {
      id: socket.id,
      global_id: query.global_id
    }
  }
  const updateRoomInfo = ({room, ...settings}) => {
    if (connections[room]) {
      Object.entries(settings).forEach(([key, value]) => {
        connections[room][key] = value
      })
      socket.to(room).emit('updateRoomInfo', settings)
    }
  }

  addSocketToConnections()

  socket.on('test', msg => {
    console.log('TEST')
    socket.emit('test', msg)
  })

  socket.on('disconnecting', () => {
    const rooms = Object.keys(socket.rooms)

    rooms.forEach(room => {
      socket.to(room).emit('disconnectPlayer', {
        id: socket.id
      })

      const peerConnections = connections?.[room]?.peerConnections
      if (peerConnections) {
        const player = peerConnections?.[socket.id]
        if (player.isInitiator) {
          const players = playersInRoom(room)
          const player_id = players.find(
            id => !peerConnections[id].isInitiator && peerConnections[id].isAlive
          )

          if (peerConnections?.[player_id]) {
            peerConnections[player_id].isInitiator = true
            socket.to(room).emit('updatePlayerInfo', {
              id: player_id,
              isInitiator: peerConnections[player_id].isInitiator
            })

            player.isInitiator = false
            socket.to(room).emit('updatePlayerInfo', {
              id: player.id,
              isInitiator: player.isInitiator
            })

            socket.to(player_id).emit('newInitiator')
          }
        }
      }
    })

    delete connections[socket.id]
  })

  socket.on('leaveFromRoom', ({room}) => {
    socket.leave(room)

    const players = playersInRoom(room)
    if (!players.length) {
      delete connections[room]
    }

    socket.to(room).emit('disconnectPlayer', {id: socket.id})
  })

  socket.on('join', async settings => {
    const {room} = settings
    const players = playersInRoom(room)
    const existPlayerInRoom = () => {
      const {global_id} = socket.handshake.query
      const sameGlobalId = players.some(id => {
        const socket_id = id.replace('/sock#', '')
        const {query = {}} = io.sockets.sockets[socket_id]?.handshake
        return query.global_id === global_id
      })
      return sameGlobalId
    }
    const addRoomToConnections = room => {
      connections[room] = {
        ...(connections[room] ?? {}),
        room,
        limit: 10,
        nominateIndex: 1,
        duration: 0,
        gameSteps: [],
        gameInfo: {},
        statistics: [],
        isPause: false,
        gameIsStarted: false,
        isSecondVoting: false,
        peerConnections: {}
      }
    }
    const addPlayertoRoom = () => {
      const {global_id} = socket.handshake.query
      const {peerConnections, ...roomSettings} = connections[room]
      const existPlayer = Object.values(peerConnections).find(pc => pc.global_id === global_id)
      if (existPlayer) {
        const player = {
          ...settings,
          ...existPlayer,
          id: socket.id,
          isInitiator: players.length === 0
        }
        delete peerConnections[existPlayer.id]
        peerConnections[socket.id] = player
        sock.to(room).emit('updatePlayerInfo', player)
        socket.emit('updateRoomInfo', roomSettings)
        socket.to(room).emit('join', player)
      } else {
        const newPlayer = {
          ...settings,
          isInitiator: players.length === 0
        }
        connections[room].peerConnections[socket.id] = newPlayer
        sock.to(room).emit('updatePlayerInfo', newPlayer)
        socket.emit('updateRoomInfo', roomSettings)
        socket.to(room).emit('join', newPlayer)
      }
    }
    const existPlayer = room => {
      const {global_id} = socket.handshake.query
      const {peerConnections = {}} = connections?.[room] ?? {}
      const player = Object.values(peerConnections).find(pc => pc.global_id === global_id)

      return player
    }
    const checkPassword = () => {
      return (
        connections?.[room]?.password &&
        connections?.[room]?.password !== settings.password &&
        Object.keys(connections?.[room]?.peerConnections ?? {}).length !== 0
      )
    }

    if (players.length >= connections?.[room]?.limit) {
      socket.emit('message', {msg: 'Room is fool'})
    } else if (existPlayerInRoom()) {
      socket.emit('message', {
        msg:
          'There is player in this room with the same id. Try to come in this room from another browser'
      })
    } else if (connections?.[room]?.gameIsStarted && !existPlayer(settings.room)) {
      socket.emit('message', {
        msg: 'The game has already started'
      })
    } else if (checkPassword()) {
      const {password} = connections[room]
      socket.emit('checkPassword', {password})
    } else {
      socket.join(room)
      if (!players.length) {
        addRoomToConnections(room)
      }
      addPlayertoRoom()
    }
  })

  socket.on('createOffer', ({dest, ...settings}) => {
    socket.to(dest).emit('createOffer', settings)
  })

  socket.on('description', ({uuid, dest, sdp}) => {
    socket.to(dest).emit('description', {
      sdp,
      uuid
    })
  })

  socket.on('iceCandidate', message => {
    socket.to(message.room).emit('iceCandidate', message)
  })

  socket.on('createRoom', settings => {
    connections[settings.room] = settings
  })

  socket.on('getRooms', () => {
    const rooms = getRooms()
      // .filter(room => !connections[room].gameIsStarted)
      .map(room => ({
        ...connections[room],
        players: playersInRoom(room)
      }))
    socket.emit('getRooms', rooms)
  })

  socket.on('updatePlayerInfo', settings => {
    const {peerConnections} = connections?.[settings.room] ?? {}
    if (peerConnections?.[settings.id]) {
      peerConnections[settings.id] = {
        ...peerConnections[settings.id],
        ...settings
      }
    }
    sock.to(settings.room).emit('updatePlayerInfo', settings)
  })

  socket.on('updateRoomInfo', settings => {
    updateRoomInfo(settings)
  })

  socket.on('toggleVideo', ({id, room, state}) => {
    const {peerConnections} = connections?.[room]
    if (peerConnections) {
      peerConnections[id].isVideo = state
      sock.in(room).emit('toggleVideo', {id, state})
    }
  })

  socket.on('toggleAudio', ({id, room, state}) => {
    const {peerConnections} = connections[room]
    peerConnections[id].isAudio = state
    sock.in(room).emit('toggleAudio', {id, state})
  })

  socket.on('startGame', ({room, ...settings}) => {
    const gameRoles = [
      'mafia',
      'citizen',
      'citizen',
      'citizen',
      'mafia',
      'citizen',
      'citizen',
      'citizen',
      'mafia',
      'citizen',
      'citizen',
      'citizen',
      'boss',
      'doctor',
      'detective'
    ]
    const players = playersInRoom(room)

    players
      .sort(() => (Math.random() >= 0.5 ? 1 : -1))
      .forEach(id => {
        const role = gameRoles.pop() ?? 'citizen'
        const {peerConnections} = connections[room]
        peerConnections[id].role = role
        sock.to(room).emit('getRole', {
          id,
          role
        })
      })
    updateRoomInfo({room, ...settings})
  })

  socket.on('setGameInfo', ({room, gameInfo}) => {
    updateRoomInfo({room, gameInfo})
  })

  socket.on('sortPlayers', ({room, players}) => {
    sock.to(room).emit('sortPlayers', {players})
  })

  socket.on('newInitiator', ({id, room}) => {
    sock.to(id).emit('newInitiator')
  })

  socket.on('speechSpeak', ({room, text}) => {
    sock.to(room).emit('speechSpeak', {text})
  })

  socket.on('banPlayer', ({id, room}) => {
    sock.to(room).emit('banPlayer', {id})
  })
})
