// Tick-server

// Copyright (c) 2022 Andrew van der Stock (Cmdr Purrfect) <vanderaj@gmail.com>

// This publishes a small API to the tick server for apps to obtain the latest known ticks.

// Language: go

package main

func NewTickServer() *TickServer {
	return &TickServer{}
}

func main() void {
	// Create a new tick server
	server := NewTickServer()

	// Start the tick server
	server.Start()
}
