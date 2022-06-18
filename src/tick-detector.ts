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

// import * as zlib from 'zlib'
// import * as got from 'got'
// import * as path from 'path'
// import * as util from 'util'

const db = new Database('systems.sqlitedb')

let lock = false

// const thanks = ['Garud', 'Lyrae Cursorius', 'Purrfect']

config()
console.log('Tick Detector started')

function config() {
  setInterval(getEntries, 1000) // every second
}

function getEntries() {
  if (lock) {
    return
  }

  lock = true
  const selectSql = 'SELECT ROW, TIMESTAMP, GW_TIMESTAMP, SOFTWARE, VERSION, MESSAGE FROM RAW ORDER BY ROW ASC LIMIT 10'
  let deleteSql = 'DELETE FROM RAW WHERE ROW IN (?)'
  // const countSql = 'SELECT COUNT(ROW) AS COUNT FROM RAW'
  const results = db.prepare(selectSql).all()
  let rowIDs = ''
  for (const i in results) {
    parseEntry(JSON.parse(results[i].MESSAGE))
    rowIDs = `${rowIDs},${results[i].ROW}`
  }
  if (rowIDs) {
    rowIDs = rowIDs.slice(1)
    deleteSql = `DELETE FROM RAW WHERE ROW IN (${rowIDs})`
    db.exec(deleteSql)
  }
  lock = false
}

function parseEntry(entry) {
  // const timer = Date.now()
  if (entry.$schemaRef === 'https://eddn.edcd.io/schemas/journal/1') {
    const systemID = entry.message.SystemAddress
    const systemName = entry.message.StarSystem
    const systemX = entry.message.StarPos[0]
    const systemY = entry.message.StarPos[1]
    const systemZ = entry.message.StarPos[2]
    const factions = entry.message.Factions
    if (systemID && systemName && factions && systemX && systemY && systemZ) {
      const mTime = moment(entry.message.timestamp)
      const dTime = moment(entry.header.gatewayTimestamp).diff(mTime, 'seconds') // Uses ISO 8601 format

      addSystem(systemID, systemName, systemX, systemY, systemZ)
      if (dTime < 6000 && mTime) {
        for (const i in entry.message.Factions) {
          const faction = entry.message.Factions[i]
          if (faction.Influence > 0) {
            setInfluence(systemID, faction.Name, faction.Influence, mTime.format())
          }
        }
      }
    }
  }
}

function setInfluence(systemID: number, faction: string, influence: number, time: number) {
  const getInfluenceSql =
    'SELECT ROWID, SYSTEM, FACTION, INFLUENCE, FIRST_SEEN, LAST_SEEN FROM INFLUENCE WHERE SYSTEM = ? AND FACTION = ? AND INFLUENCE = ? ORDER BY FIRST_SEEN DESC LIMIT 7'
  const setInfluenceSql =
    'INSERT INTO INFLUENCE(SYSTEM, FACTION, INFLUENCE, FIRST_SEEN, LAST_SEEN, COUNT) VALUES(?, ?, ?, ?, ?, 1)'
  const updateInfluenceSql =
    'UPDATE INFLUENCE SET FIRST_SEEN = ?, LAST_SEEN = ?, COUNT = COUNT +1, DELTA = null WHERE ROWID = ?'

  const influences = db.prepare(getInfluenceSql).all(systemID, faction, influence)
  if (Array.isArray(influences) && influences.length) {
    // const current_first_seen = influences[0].FIRST_SEEN
    for (const i in influences) {
      const record = influences[i]
      const first = record.FIRST_SEEN
      const last = record.LAST_SEEN
      const row = record.ROW
      const diff = moment(last).diff(time, 'seconds')
      if (i === 0 && diff > 0) {
        db.prepare(updateInfluenceSql).run(first, time, row)
        updateDelta(systemID, faction)
      }
    }
  } else {
    db.prepare(setInfluenceSql).run(systemID, faction, influence, time, time)
    updateDelta(systemID, faction)
  }
}

function updateDelta(systemID: number, faction: string) {
  const influencesSql =
    'SELECT ROW, FACTION, INFLUENCE, FIRST_SEEN, LAST_SEEN FROM INFLUENCE WHERE INFLUENCE > 0 AND SYSTEM = ? AND FACTION = ? ORDER BY FIRST_SEEN DESC'
  const updateDeltaSql = 'UPDATE INFLUENCE SET DELTA = ? WHERE ROW = ?'

  const influences = db.prepare(influencesSql).all(systemID, faction)
  if (Array.isArray(influences) && influences.length && influences.length > 1) {
    for (let j = influences.length - 1; j >= 1; j--) {
      const delta = new moment(influences[j - 1].FIRST_SEEN).diff(influences[j].LAST_SEEN, 'seconds')
      db.prepare(updateDeltaSql).run(delta, influences[j - 1].ROW)
    }
  }
}

function addSystem(systemID: number, systemName: string, systemX: number, systemY: number, systemZ: number) {
  const sql = 'SELECT ID FROM SYSTEMS WHERE ID=? AND NAME=?'
  const result = db.prepare(sql).get(systemID, systemName)

  if (!(result && result.ID)) {
    const insertSql = 'INSERT INTO SYSTEMS (ID, NAME, X, Y, Z) VALUES(?, ?, ?, ?, ?)'
    db.prepare(insertSql).run(systemID, systemName, systemX, systemY, systemZ)
  }
}
