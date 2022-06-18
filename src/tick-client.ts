// This is a command link test program to query the tick-publisher.ts:

// build: tsc client.ts
// Usage: node client.js

import { io } from 'socket.io-client'

const socket = io('http://localhost:31173')

socket.on('tick', (data: string) => { console.log(`new tick at ${data}`) })
socket.on('message', (data: string) => { console.log(data) })
