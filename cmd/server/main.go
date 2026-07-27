// Command server is the SING7 HTTP backend.
package main

import (
	"log"
	"net/http"

	"sing7/internal/httpapi"
	"sing7/internal/store"
)

func main() {

	songsDir := "akordy"

	// Load parses the whole folder into memory and logs its own load summary;
	// it only errors when the directory itself can't be scanned.
	library, _, err := store.LoadSongs(songsDir)
	if err != nil {
		log.Fatalf("loading songs: %v", err)
	}
	log.Printf("SING7 library ready: %d songs from %s", len(library.All()), songsDir)

	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", handleHealth)

	// SongAPI serves the loaded library over /api/songs and /api/songs/{slug}.
	songAPI := httpapi.NewSongAPI(library)
	songAPI.Register(mux)

	address := ":8080"
	log.Printf("SING7 server listening on %s", address)

	err = http.ListenAndServe(address, mux) // Runs forever
	if err != nil {
		log.Fatalf("server error: %v", err)
	}
}

// handleHealth reports that the server is up.
func handleHealth(writer http.ResponseWriter, request *http.Request) {
	writer.WriteHeader(http.StatusOK)
	_, _ = writer.Write([]byte("OK"))
}
