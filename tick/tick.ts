/*
 * Copyright © 2018 Phelbore <phelbore@gmail.com>
 * TypeScript changes and updates (C) 2022 Cmdr Purrfect <vanderaj@gmail.com>
 *
 * This work is free. You can redistribute it and/or modify it under the
 * terms of the Do What The Fuck You Want To Public License, Version 2,
 * as published by Sam Hocevar. See http://www.wtfpl.net/ for more details.
 */

import * as Database from 'better-sqlite3'
import { DateTime } from 'luxon'
import * as path from 'path'
import * as clustering from 'density-clustering'
import { Server } from 'socket.io'
import * as express from 'express'

// @ts-ignore
import * as json2html from 'node-json2html'

const app = express()
const router = express.Router()
const port = 9001

const db = new Database('systems.sqlitedb')

let lock = false

config()
console.log('Tick Publisher started')

function config () {
  // Express
  configAPI()

  const io = new Server(31173, { pingTimeout: 30000, allowEIO3: true })

  io.on('connection', function (sock) {
    sock.send(getLastTick())
    console.log(
      `New connection: ${moment().format()} - ${
        sock.client.conn.remoteAddress
      }`
    )
  })

  // Periodic
  const freshness = 14400
  const threshold = 5
  const delta = 7500
  calculateTicks(freshness, threshold, delta)
  setInterval(calculateTicks, 60000, freshness, threshold, delta)
}

function configAPI () {
  app.get('/', (req, res) => res.sendFile(path.join(__dirname, 'tick.html')))
  app.get('/allTicks', (req, res) =>
    res.sendFile(path.join(__dirname, 'allTicks.html'))
  )
  app.get('/license', (req, res) =>
    res.sendFile(path.join(__dirname, 'license.txt'))
  )
  app.use('/api', router)
  app.listen(port)

  router.get('/testTicks', (req, res) => {
    const freshness = parseInt(req.query.freshness) ? req.query.freshness : 7200
    const threshold = req.query.threshold ? req.query.threshold : 5
    const delta = req.query.delta ? req.query.delta : 1800
    const ticks = allTicks(freshness, threshold, delta)
    if (req.query.table) {
      const transform = {
        tag: 'tr',
        children: [
          {
            tag: 'td',
            html: `${start}`
          },
          {
            tag: 'td',
            html: `${detected}`
          },
          {
            tag: 'td',
            html: `${size}`
          },
          {
            tag: 'td',
            html: `${delay}`
          }
        ]
      }
      const header =
        '<tr><th>Start</th><th>Detected</th><th>Count</th><th>Delay</th></tr>'
      res.send(
        `<table border=1>${header}${json2html.transform(
          ticks,
          transform
        )}</table>`
      )
    } else {
      res.json(ticks)
    }
  })

  router.get('/ticks', (req, res) => {
    const start = req.query.start ? req.query.start : '2014-12-16'
    const end = req.query.end ? req.query.end : new Date()
    res.json(getTicks(start, end))
  })

  router.get('/tick', (req, res) => {
    res.json(getLastTick())
  })
}

function getLastTick () {
  const tickSql = 'SELECT TIME FROM TICK ORDER BY TIME DESC LIMIT 1'
  const rs = db.prepare(tickSql).get()
  if (rs && rs.TIME) {
    return rs.TIME
  }
}

function calculateTicks (freshness: number, threshold: number, delta: number) {
  if (lock) {
    return
  }

  lock = true

  const getTimesSql = `SELECT DISTINCT SYSTEM, FIRST_SEEN, DELTA FROM INFLUENCE WHERE DATETIME(FIRST_SEEN) >= DATETIME(?) AND INFLUENCE > 0 AND DELTA IS NOT NULL AND DELTA <= ${freshness}`

  let start = DateTime.now().minus({ months: 1 }).toFormat('YYYY-MM-DDTHH:mm:ssZ')

  const lastTick = getLastTick()
  if (lastTick.isValid) {
    start = lastTick.toFormat('YYYY-MM-DDTHH:mm:ssZ')
  }

  const data = []

  const timesRS = db.prepare(getTimesSql).all(start)
  if (Array.isArray(timesRS) && timesRS.length) {
    for (const i in timesRS) {
      data.push([moment(timesRS[i].FIRST_SEEN).format('X')])
    }
  }

  const dbscan = new clustering.DBSCAN()
  const clusters = dbscan.run(data, delta, threshold)

  const noise = dbscan.noise
  for (const i in clusters) {
    const sorted = clusters[i].map((x) => data[x]).sort()
    const size = sorted.length
    const start = new moment(sorted[0], 'X')
    const end = new moment(sorted[size - 1], 'X')
    const detected = new moment(sorted[threshold - 1], 'X')
    if (i >= 1) {
      console.log(
        `Tick - ${start.format('YYYY-MM-DD HH:mm:ss')} - ${detected.format(
          'YYYY-MM-DD HH:mm:ss'
        )} - ${size} items`
      )
      io.sockets.emit('tick', start.format('YYYY-MM-DDTHH:mm:ssZ'))
      io.sockets.send(start.format('YYYY-MM-DDTHH:mm:ssZ'))
      for (const s in io.sockets.sockets) {
        console.log(io.sockets.sockets[s].conn.remoteAddress)
      }
    }
    saveTick(start)
  }
  const runEnd = new moment()
  setTimeout(() => {
    lock = false
  }, 30000)
}

function saveTick (time) {
  const tickSql = 'INSERT INTO TICK(TIME) VALUES(?)'

  db.prepare(tickSql).run(moment(time).format('YYYY-MM-DDTHH:mm:ssZ'))
}

function getTicks (start, end) {
  start = moment(start).format('YYYY-MM-DD')
  end = moment(end).format('YYYY-MM-DD')
  const tickSql = 'SELECT TIME FROM TICK WHERE DATE(TIME) BETWEEN ? and ?'
  const ticks = db.prepare(tickSql).all(start, end)
  return ticks
}

function allTicks (freshness, threshold, delta) {
  const getTimesSql = `SELECT DISTINCT SYSTEM, FIRST_SEEN, DELTA FROM INFLUENCE
		WHERE INFLUENCE > 0 AND DELTA <= ${freshness}`

  const data = []
  const allTicks = []

  const timesRS = db.prepare(getTimesSql).all()
  if (Array.isArray(timesRS) && timesRS.length) {
    for (const i in timesRS) {
      data.push([moment(timesRS[i].FIRST_SEEN).format('X')])
    }
  }

  const dbscan = new clustering.DBSCAN()
  const clusters = dbscan.run(data, delta, threshold)

  let counter = 0
  const noise = dbscan.noise
  for (const i in clusters) {
    const sorted = clusters[i].map((x) => data[x]).sort()
    const size = sorted.length
    const start = new moment(sorted[0], 'X')
    const end = new moment(sorted[size - 1], 'X')
    const detected = new moment(
      sorted[threshold - 1] ? sorted[threshold - 1] : sorted[size - 1],
      'X'
    )
    const tick = {}
    tick.start = start.format('YYYY-MM-DD HH:mm:ss')
    tick.detected = detected.format('YYYY-MM-DD HH:mm:ss')
    tick.size = size
    tick.delay = detected.diff(start, 'minutes')
    allTicks.push(tick)
    counter++
  }
  return allTicks
}
