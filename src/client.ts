import { io } from 'socket.io-client'

const socket = io('http://localhost:31173')

socket.on('tick', (data: string) => console.log(`new tick at ${data}`))
socket.on('message', (data: string) => { console.log(data); tick = data })
