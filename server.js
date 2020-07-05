const os = require('os')
const app = require('express')()
const http = require('http').createServer(app)
const io = require('socket.io')(http)

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type')
  res.setHeader('Access-Control-Allow-Credentials', true)

  next()
})

io.on('connect', function(socket) {
  socket.on('test', msg => {
    console.log(msg)
    socket.emit('test', 'TEST')
  })

  // convenience function to log server messages on the client
  function log() {
    const array = ['Message from server:']
    array.push.apply(array, arguments)
    socket.emit('log', array)
  }

  socket.on('message', function(message) {
    log('Client said: ', message)
    // for a real app, would be room-only (not broadcast)
    socket.broadcast.emit('message', message)
  })

  socket.on('create or join', function(room) {
    // socket.broadcast.emit('created')
    log('Received request to create or join room ' + room)
    console.log('create or join')

    const clientsInRoom = io.sockets.adapter.rooms[room]
    const numClients = clientsInRoom ? Object.keys(clientsInRoom.sockets).length : 0
    log('Room ' + room + ' now has ' + numClients + ' client(s)')

    if (numClients === 0) {
      socket.join(room)
      log('Client ID ' + socket.id + ' created room ' + room)
      socket.emit('created', {
        room,
        id: socket.id
      })
    } else if (numClients <= 12) {
      log('Client ID ' + socket.id + ' joined room ' + room)
      io.sockets.in(room).emit('join', {
        room,
        id: socket.id
      })
      socket.join(room)
      socket.emit('joined', {
        room,
        id: socket.id
      })
      // io.sockets.in(room).emit('ready')
    } else {
      // max two clients
      socket.emit('full', room)
    }
  })

  socket.on('ipaddr', function() {
    const ifaces = os.networkInterfaces()
    for (const dev in ifaces) {
      ifaces[dev].forEach(function(details) {
        if (details.family === 'IPv4' && details.address !== '127.0.0.1') {
          socket.emit('ipaddr', details.address)
        }
      })
    }
  })

  socket.on('bye', function() {
    console.log('received bye')
  })
})

http.listen(7000)
