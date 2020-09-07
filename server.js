// const os = require('os')
// const fs = require('fs')
// const serverConfig = {
//   key: fs.readFileSync('./security/key.pem'),
//   cert: fs.readFileSync('./security/cert.pem'),
// }
const app = require('express')()
const fetch = require('node-fetch')
const cookieSession = require('cookie-session')
const https = require('http').createServer(app)
const io = require('socket.io')(https)

app.use(
  cookieSession({
    secret: 'secret',
    signed: false
  })
)

// const client_id = process.env.GITHUB_CLIENT_ID;
const client_id = 'ff10989e8ed773fadf6b'
// const client_secret = process.env.GITHUB_CLIENT_SECRET;
const client_secret = 'dfcea049283f8a46c899c927999b8d927ba84713'
// console.log({ client_id, client_secret });

app.get('/login/github', (req, res) => {
  const redirect_uri = 'http://localhost:8080/'
  res.redirect(
    `https://github.com/login/oauth/authorize?client_id=${client_id}&redirect_uri=${redirect_uri}`
  )
})

async function getAccessToken({code, client_id, client_secret}) {
  const request = await fetch('https://github.com/login/oauth/access_token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      client_id,
      client_secret,
      code
    })
  })
  const text = await request.text()
  const params = new URLSearchParams(text)
  return params.get('access_token')
}

async function fetchGitHubUser(token) {
  const request = await fetch('https://api.github.com/user', {
    headers: {
      Authorization: 'token ' + token
    }
  })
  return await request.json()
}

app.get('/login/github/user', async (req, res) => {
  const token = req.session.access_token
  const user = await fetchGitHubUser(token)
  res.send(user)
})

app.get('/login/github/callback', async (req, res) => {
  const code = req.query.code
  const access_token = await getAccessToken({code, client_id, client_secret})
  const user = await fetchGitHubUser(access_token)
  if (user) {
    req.session.access_token = access_token
    req.session.githubId = user.id
    res.send(JSON.stringify(user, null, 2))
  } else {
    res.send('Login did not succeed!')
  }
})

app.get('/login/logout', (req, res) => {
  if (req.session) req.session = null
  res.send(JSON.stringify({}, null, 2))
})

const playersInRoom = room => {
  const {sockets = {}} = io.sockets.adapter.rooms[room] ?? {}
  const players = Object.keys(sockets)

  return players
}

io.on('connect', socket => {
  socket.on('disconnecting', () => {
    const rooms = Object.keys(socket.rooms)

    rooms.forEach(room => {
      socket.to(room).emit('disconnectPlayer', {
        id: socket.id
      })
    })
  })

  socket.on('join', async settings => {
    const {room} = settings
    const players = playersInRoom(room)

    if (players.length >= 20) {
      socket.emit('message', {msg: 'Room is fool'})
    } else if (players.includes(settings.savedId)) {
      socket.emit('message', {
        msg:
          'There is player in this room with the same id. Try to come in this room from another browser'
      })
    } else {
      socket.join(room)
      const opts = {
        isInitiator: players.length === 0
      }
      io.to(room).emit('updatePlayerInfo', {
        id: settings.id,
        ...opts
      })
      socket.to(room).emit('join', settings)
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

  socket.on('updatePlayerInfo', settings => {
    socket.to(settings.id).emit('updatePlayerInfo', settings)
  })

  socket.on('updateRoomInfo', ({id, ...settings}) => {
    socket.to(id).emit('updateRoomInfo', settings)
  })

  socket.on('toggleVideo', ({id, room, state}) => {
    io.in(room).emit('toggleVideo', {id, state})
    // socket.emit('toggleVideo', id)
    // io.emit('toggleVideo', id)
  })

  socket.on('toggleAudio', ({id, room, state}) => {
    io.in(room).emit('toggleAudio', {id, state})
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
        io.to(room).emit('getRole', {
          id,
          role
        })
      })
    socket.to(room).emit('startGame')
  })

  socket.on('setGameInfo', info => {
    socket.to(info.room).emit('setGameInfo', info)
  })

  socket.on('makeScreenshots', ({room}) => {
    io.to(room).emit('makeScreenshots')
  })

  socket.on('addStat', ({room, ...stat}) => {
    io.to(room).emit('addStat', stat)
  })

  socket.on('statistics', ({id, stat}) => {
    socket.to(id).emit('statistics', stat)
  })

  socket.on('sortPlayers', ({room, players}) => {
    io.to(room).emit('sortPlayers', {players})
  })

  socket.on('resetGameNight', ({room}) => {
    io.to(room).emit('resetGameNight')
  })

  socket.on('resetGameDay', ({room}) => {
    io.to(room).emit('resetGameDay')
  })

  socket.on('endGame', ({room}) => {
    io.to(room).emit('endGame')
  })

  socket.on('newInitiator', ({id, room}) => {
    io.to(room).emit('newInitiator', {
      id
    })
  })

  socket.on('secondVoting', ({room, players}) => {
    socket.to(room).emit('secondVoting', players)
  })

  socket.on('updateSettings', settings => {
    io.to(settings.room).emit('updateSettings', settings)
  })

  socket.on('time', ({room, duration}) => {
    socket.to(room).emit('time', {
      duration
    })
  })

  socket.on('speechSpeak', ({room, text}) => {
    io.to(room).emit('speechSpeak', {text})
  })

  socket.on('voteForKill', ({fromId, toId, room}) => {
    io.to(room).emit('voteForKill', {
      fromId,
      toId
    })
  })

  socket.on('voteForExile', ({fromId, toId, room}) => {
    io.to(room).emit('voteForExile', {
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

  socket.on('nomination', ({id, room}) => {
    io.to(room).emit('nomination', {id})
  })

  socket.on('banPlayer', ({id, room}) => {
    io.to(room).emit('banPlayer', {id})
  })

  socket.on('bye', function() {
    console.log('received bye')
  })
})

app.use((req, res, next) => {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS, PUT, PATCH, DELETE')
  res.setHeader('Access-Control-Allow-Headers', 'X-Requested-With,content-type')
  res.setHeader('Access-Control-Allow-Credentials', true)

  next()
})

https.listen(7000)
