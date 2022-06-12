/*
 * Copyright © 2018 Phelbore <phelbore@gmail.com>
 * TypeScript changes and updates (C) 2022 Cmdr Purrfect <vanderaj@gmail.com>
 *
 * This work is free. You can redistribute it and/or modify it under the
 * terms of the Do What The Fuck You Want To Public License, Version 2,
 * as published by Sam Hocevar. See http://www.wtfpl.net/ for more details.
 */

import * as Database from 'better-sqlite3'
import * as zlib from 'zlib'
import * as zmq from 'zeromq'
import * as got from 'got'
import * as moment from 'moment'

const sock = zmq.socket('sub')
const db = new Database('systems.sqlitedb')

const msgStats = [
  1,
  5,
  10,
  15,
  30,
  60,
  120,
  180,
  240,
  300,
  360,
  420,
  480,
  540,
  600
]
// var lock = false
let timer = Date.now()

// const thanks = ['Garud', 'Lyrae Cursorius', 'Purrfect']

config()
console.log('EDDN Listener started')

function config () {
  sock.setsockopt(zmq.ZMQ_RCVHWM, 50)
  eddnConnector()
  setInterval(function () {
    if (Date.now() - timer > 120000) {
      (async () => {
        try {
          const response = await got('https://hosting.zaonce.net/launcher-status/status.json')
          if (JSON.parse(response.body).status === 2) {
            console.log(`${moment().format()} Elite Dangerous Launcher DOWN`)
          }
          timer = Date.now()
        } catch (error) {
          console.log(error.response.body)
        }
      })()
    }
  })
}

function eddnConnector (): void {
  sock.connect('tcp://eddn.edcd.io:9500')
  sock.subscribe('')
  sock.on('close', (fd, ep) => {
    setTimeout(() => { eddnConnector() }, 60000)
  })
  sock.on('close_error', (fd, ep) => {
    setTimeout(() => { eddnConnector() }, 60000)
  })
  sock.on('disconnect', (fd, ep) => {
    setTimeout(() => { eddnConnector() }, 60000)
  })
  sock.on('message', (topic) => {
    try {
      storeEntry(zlib.inflateSync(topic))
    } catch (err) {}
  })
}

function storeEntry (entry: string) {
  timer = Date.now()
  let parsed = null
  try {
    parsed = JSON.parse(entry)
  } catch (err) {
    console.log('err')
  }

  if (
    parsed &&
    parsed.$schemaRef === 'https://eddn.edcd.io/schemas/journal/1'
  ) {
    const systemID = parsed.message.SystemAddress
    const systemName = parsed.message.StarSystem
    const systemX = parsed.message.StarPos[0]
    const systemY = parsed.message.StarPos[1]
    const systemZ = parsed.message.StarPos[2]
    const factions = parsed.message.Factions
    if (systemID && systemName && factions && systemX && systemY && systemZ) {
      const mTime = moment(parsed.message.timestamp)
      const gwTime = moment(parsed.header.gatewayTimestamp)
      const dTime = moment(gwTime).diff(mTime, 'seconds')

      updateStats(
        dTime,
        parsed.header.softwareName,
        parsed.header.softwareVersion
      )
      if (
        dTime < 6000 &&
        parsed.message.timestamp &&
        parsed.header.gatewayTimestamp
      ) {
        const sql = 'INSERT INTO RAW (TIMESTAMP, GW_TIMESTAMP, SOFTWARE, VERSION, MESSAGE) VALUES(?, ?, ?, ?, ?)'
        db.prepare(sql).run(
          parsed.message.timestamp,
          parsed.header.gatewayTimestamp,
          parsed.header.softwareName,
          parsed.header.softwareVersion,
          entry
        )
      }
    }
  }
}

function updateStats (dTime: number, name: string, version: string) {
  const msgCountSql = 'UPDATE MSG_STATS SET COUNT = COUNT + 1 WHERE ROWID = 1'
  const msgOldestSql = 'UPDATE MSG_STATS SET OLDEST = ? WHERE ROWID = 1'

  const oldest = db
    .prepare('SELECT OLDEST FROM MSG_STATS WHERE ROWID = 1')
    .get().OLDEST

  const softwareCountSql = 'INSERT INTO SOFTWARE(SOFTWARE, VERSION, COUNT) VALUES(?, ?, 1) ON CONFLICT(SOFTWARE, VERSION) DO UPDATE SET COUNT=COUNT+1'
  db.prepare(softwareCountSql).run(name, version)

  for (const i in msgStats) {
    const delay: number = msgStats[i]
    if (Math.abs(dTime) <= delay * 60) {
      const msgDelaySql = `UPDATE MSG_STATS SET '${delay}' = MSG_STATS.${delay} + 1 WHERE ROWID = 1`
      db.prepare(msgDelaySql).run(delay, delay)
    }
  }

  db.prepare(msgCountSql).run()
  if (dTime > oldest) {
    db.prepare(msgOldestSql).run(dTime)
  }
}
