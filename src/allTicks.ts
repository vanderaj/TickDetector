import * as Database from 'better-sqlite3'
import { DateTime } from 'luxon'
import * as clustering from 'density-clustering'

const db = new Database('systems.sqlitedb')

calculateTicks()

function calculateTicks () {
  const freshness = 14400
  const threshold = 5
  const delta = 7500

  const getTimesSql = `SELECT DISTINCT SYSTEM, FIRST_SEEN, DELTA FROM INFLUENCE WHERE INFLUENCE > 0 AND DELTA <= ${freshness}`

  const data = []

  const timesRS = db.prepare(getTimesSql).all()
  if (Array.isArray(timesRS) && timesRS.length) {
    for (const i in timesRS) {
      data.push([moment(timesRS[i].FIRST_SEEN).format('X')])
    }
    console.log(`Scanning ${timesRS.length} items`)
  }

  const dbscan = new clustering.DBSCAN()
  const clusters = dbscan.run(data, delta, threshold)

  for (const i in clusters) {
    const sorted = clusters[i].map((x) => data[x]).sort()
    const size = sorted.length

    // const start = moment.defaultFormat()
    // const start = new moment(sorted[0], 'X')

    

    const detected = new moment(
      sorted[threshold - 1] ? sorted[threshold - 1] : sorted[size - 1],
      'X'
    )
    if (i >= 1) {
      console.log(
        `Tick - ${start.format('YYYY-MM-DD HH:mm:ss')} - ${detected.format(
          'YYYY-MM-DD HH:mm:ss'
        )} - ${size} items`
      )
    }
  }
}
