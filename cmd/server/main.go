// Command server is the SING7 HTTP backend.
package main

import (
	"log"
	"net/http"
)

func main() {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", handleHealth)
	mux.HandleFunc("GET /api/songs", handleSongs)

	address := ":8080"
	log.Printf("SING7 server listening on %s", address)

	err := http.ListenAndServe(address, mux) // Runs forever
	if err != nil {
		log.Fatalf("server error: %v", err)
	}
}

// handleHealth reports that the server is up.
func handleHealth(writer http.ResponseWriter, request *http.Request) {
	writer.WriteHeader(http.StatusOK)
	_, _ = writer.Write([]byte("OK"))
}

// handleSongs is a stub returning an empty list until the store is wired in.
func handleSongs(writer http.ResponseWriter, request *http.Request) {
	writer.Header().Set("Content-Type", "application/json")
	_, _ = writer.Write([]byte(`{"songs":[]}`))
}
