// const os = require('os')
const app = require('express')()
// const fs = require('fs')
// const serverConfig = {
//   key: fs.readFileSync('./security/key.pem'),
//   cert: fs.readFileSync('./security/cert.pem'),
// }
const https = require('http').createServer(app)
const io = require('socket.io')(https)

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type')
  res.setHeader('Access-Control-Allow-Credentials', true)

  next()
})

const playersInRoom = room => {
  const {sockets = {}} = io.sockets.adapter.rooms[room] ?? {}
  const players = Object.keys(sockets)

  return players
}

io.on('connect', socket => {
  socket.on('isInitiator', ({room}) => {
    const players = playersInRoom(room)

    socket.emit('isInitiator', {
      id: socket.id,
      isInitiator: players.length === 0
    })
  })

  socket.on('message', message => {
    // log('Client said: ', message)
    // for a real app, would be room-only (not broadcast)
    socket.to(message.room).emit('message', message)
  })

  socket.on('join', message => {
    const {room} = message
    const players = playersInRoom(room)

    if (players.length >= 12) {
      socket.emit('fullRoom')
    } else {
      socket.join(room)
      socket.to(room).emit('join', message)
      // socket.emit('test', socket.rooms)
    }
  })

  socket.on('createOffer', ({uuid, dest, displayName}) => {
    socket.to(dest).emit('createOffer', {
      displayName,
      uuid
    })
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

  socket.on('toggleVideo', ({id, room}) => {
    io.in(room).emit('toggleVideo', id)
    // socket.emit('toggleVideo', id)
    // io.emit('toggleVideo', id)
  })

  // socket.on('ipaddr', function() {
  //   const ifaces = os.networkInterfaces()
  //   for (const dev in ifaces) {
  //     ifaces[dev].forEach(function(details) {
  //       if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
  //         socket.emit('ipaddr', details.address)
  //       }
  //     })
  //   }
  // })

  socket.on('startGame', ({room}) => {
    const gameRoles = ['boss', 'citizen', 'doctor', 'detective', 'mafia']
    const players = playersInRoom(room)

    players.forEach(uuid => {
      const role = gameRoles.pop() || 'citizen'
      io.to(room).emit('getRole', {
        uuid,
        role
      })
    })
    socket.to(room).emit('startGame')
  })

  socket.on('setGameInfo', info => {
    socket.to(info.room).emit('setGameInfo', info)
  })

  socket.on('resetCanCheckRole', ({room}) => {
    socket.to(room).emit('resetCanCheckRole')
  })

  socket.on('endGame', ({room}) => {
    socket.to(room).emit('endGame')
  })

  socket.on('time', ({room, time}) => {
    socket.to(room).emit('time', {
      time
    })
  })

  socket.on('voteForkill', ({fromId, toId, room}) => {
    io.to(room).emit('voteForkill', {
      fromId,
      toId
    })
  })

  socket.on('kill', ({id, room}) => {
    io.to(room).emit('kill', {
      id
    })
  })

  socket.on('heal', ({toId, room}) => {
    io.to(room).emit('heal', {
      toId
    })
  })

  socket.on('bye', function() {
    console.log('received bye')
  })
})

https.listen(7000)
