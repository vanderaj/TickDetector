/*
 * Copyright © 2018 Phelbore <phelbore@gmail.com>
 * TypeScript changes and updates (C) 2022 Cmdr Purrfect <vanderaj@gmail.com>
 *
 * This work is free. You can redistribute it and/or modify it under the
 * terms of the Do What The Fuck You Want To Public License, Version 2,
 * as published by Sam Hocevar. See http://www.wtfpl.net/ for more details.
 */

// import * as Database from 'better-sqlite3'
// import * as zlib from 'zlib'
// import * as request from 'request'
// import * as moment from 'moment'
// import * as path from 'path'

// const db = new Database('systems.sqlitedb')

// import * as util from 'util'

// var lock = false

// const thanks = ['Garud', 'Lyrae Cursorius', 'Purrfect']

// config()
// console.log('EDDN Processor started')

// function config() {
//   setInterval(getEntries, 1000)
// }

// function getEntries() {
//   if (lock) {
//     return
//   }

//   lock = true
//   let selectSql = 'SELECT ROW, TIMESTAMP, GW_TIMESTAMP, SOFTWARE, VERSION, MESSAGE FROM RAW ORDER BY ROW ASC LIMIT 10'
//   let deleteSql = 'DELETE FROM RAW WHERE ROW IN (?)'
//   let countSql = 'SELECT COUNT(ROW) AS COUNT FROM RAW'
//   let results = db.prepare(selectSql).all()
//   let rowIDs = ''
//   for (let i in results) {
//     parseEntry(JSON.parse(results[i].MESSAGE))
//     rowIDs = '${rowIDs},${results[i].ROW}'
//   }
//   if (rowIDs) {
//     rowIDs = rowIDs.slice(1)
//     deleteSql = 'DELETE FROM RAW WHERE ROW IN (${rowIDs})'
//     db.exec(deleteSql)
//   }
//   lock = false
// }

// function parseEntry(entry) {
//   let timer = Date.now()
//   if (entry.$schemaRef == 'https://eddn.edcd.io/schemas/journal/1') {
//     let systemID = entry.message.SystemAddress
//     let systemName = entry.message.StarSystem
//     let systemX = entry.message.StarPos[0]
//     let systemY = entry.message.StarPos[1]
//     let systemZ = entry.message.StarPos[2]
//     let factions = entry.message.Factions
//     if (systemID && systemName && factions && systemX && systemY && systemZ) {
//       let mTime = moment(entry.message.timestamp)
//       let dTime = moment(entry.header.gatewayTimestamp).diff(mTime, 'seconds')

//       addSystem(systemID, systemName, systemX, systemY, systemZ)
//       if (dTime < 6000 && mTime) {
//         for (let i in entry.message.Factions) {
//           let faction = entry.message.Factions[i]
//           if (faction.Influence > 0) {
//             setInfluence(
//               systemID,
//               faction.Name,
//               faction.Influence,
//               mTime.format()
//             )
//           }
//         }
//       }
//     }
//   }
// }

// function setInfluence(systemID, faction, influence, time) {
//   let getInfluenceSql = 'SELECT ROWID, SYSTEM, FACTION, INFLUENCE, FIRST_SEEN, LAST_SEEN FROM INFLUENCE WHERE SYSTEM = ? AND FACTION = ? AND INFLUENCE = ? ORDER BY FIRST_SEEN DESC LIMIT 7'
//   let setInfluenceSql = 'INSERT INTO INFLUENCE(SYSTEM, FACTION, INFLUENCE, FIRST_SEEN, LAST_SEEN, COUNT) VALUES(?, ?, ?, ?, ?, 1)'
//   let updateInfluenceSql = 'UPDATE INFLUENCE SET FIRST_SEEN = ?, LAST_SEEN = ?, COUNT = COUNT +1, DELTA = null WHERE ROWID = ?'

//   let influences = db
//     .prepare(getInfluenceSql)
//     .all(systemID, faction, influence)
//   if (Array.isArray(influences) && influences.length) {
//     let current_first_seen = influences[0].FIRST_SEEN
//     for (let i in influences) {
//       let record = influences[i]
//       let first = record.FIRST_SEEN
//       let last = record.LAST_SEEN
//       let row = record.ROW
//       let diff = moment(last).diff(time, 'seconds')
//       if (i == 0 && diff > 0) {
//         db.prepare(updateInfluenceSql).run(first, time, row)
//         updateDelta(systemID, faction)
//       }
//     }
//   } else {
//     db.prepare(setInfluenceSql).run(systemID, faction, influence, time, time)
//     updateDelta(systemID, faction)
//   }
// }

// function updateDelta(systemID, faction) {
//   let influencesSql = 'SELECT ROW, FACTION, INFLUENCE, FIRST_SEEN, LAST_SEEN FROM INFLUENCE WHERE INFLUENCE > 0 AND SYSTEM = ? AND FACTION = ? ORDER BY FIRST_SEEN DESC'
//   let updateDeltaSql = 'UPDATE INFLUENCE SET DELTA = ? WHERE ROW = ?'

//   let influences = db.prepare(influencesSql).all(systemID, faction)
//   if (Array.isArray(influences) && influences.length && influences.length > 1) {
//     for (let j = influences.length - 1; j >= 1; j--) {
//       let delta = new moment(influences[j - 1].FIRST_SEEN).diff(
//         influences[j].LAST_SEEN,
//         'seconds'
//       )
//       db.prepare(updateDeltaSql).run(delta, influences[j - 1].ROW)
//     }
//   }
// }

// function addSystem(systemID: number, systemName: string, systemX: number, systemY: number, systemZ: number) {
//   let sql = 'SELECT ID FROM SYSTEMS WHERE ID=? AND NAME=?'
//   let result = db.prepare(sql).get(systemID, systemName)

//   if (!(result && result.ID)) {
//     let insertSql = 'INSERT INTO SYSTEMS (ID, NAME, X, Y, Z) VALUES(?, ?, ?, ?, ?)'
//     db.prepare(insertSql).run(systemID, systemName, systemX, systemY, systemZ)
//   }
// }
