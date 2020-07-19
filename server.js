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

io.on('connect', socket => {
  socket.on('test', () => {
    socket.emit('test', socket.id)
  })

  socket.on('message', message => {
    // log('Client said: ', message)
    // for a real app, would be room-only (not broadcast)
    socket.to(message.room).emit('message', message)
  })

  socket.on('join', message => {
    const {room} = message
    const {sockets = {}} = io.sockets.adapter.rooms[room] ?? {}

    if (Object.keys(sockets).length >= 12) {
      socket.emit('fullRoom')
    } else {
      socket.join(room)
      socket.to(room).emit('join', message)
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

  socket.on('bye', function() {
    console.log('received bye')
  })
})

https.listen(7000)
