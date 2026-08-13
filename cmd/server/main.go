// Command server is the SING7 HTTP backend.
package main

import (
	"log"
	"net/http"

	"sing7/internal/httpapi"
	"sing7/internal/store"
)

var config = struct {
	SongsDir string
	Address  string
}{
	SongsDir: "songs",
	Address:  ":8080",
}

func main() {
	// Load parses the whole folder into memory and logs its own load summary;
	// it only errors when the directory itself can't be scanned.
	library, _, err := store.LoadSongs(config.SongsDir)
	if err != nil {
		log.Fatalf("loading songs: %v", err)
	}
	log.Printf("SING7 library ready: %d songs from %s", len(library.All()), config.SongsDir)

	log.Printf("SING7 server listening on %s", config.Address)

	// err = http.ListenAndServe(config.Address, newRouter(library))
	err = http.ListenAndServe(config.Address, logRequests(newRouter(library)))
	if err != nil {
		log.Fatalf("server error: %v", err)
	}
}

func newRouter(library *store.SongStore) *http.ServeMux {
	mux := http.NewServeMux()
	mux.HandleFunc("GET /health", handleHealth)
	mux.Handle("/rpc/", httpapi.NewSongServiceServer(httpapi.NewSongService(library)))
	return mux
}

func logRequests(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		log.Printf("%s %s", r.Method, r.URL.Path)
		next.ServeHTTP(w, r)
	})
}

// handleHealth reports that the server is up.
func handleHealth(writer http.ResponseWriter, request *http.Request) {
	writer.WriteHeader(http.StatusOK)
	_, _ = writer.Write([]byte("OK"))
}
