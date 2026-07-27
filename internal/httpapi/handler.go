package httpapi

import (
	"encoding/json"
	"log"
	"net/http"

	"sing7/internal/store"
)

// SongAPI serves the song store over read-only REST. It holds the store and maps
// each song to a response DTO before writing JSON.
type SongAPI struct {
	store *store.SongStore
}

// NewSongAPI builds a SongAPI over the given store.
func NewSongAPI(s *store.SongStore) *SongAPI {
	return &SongAPI{store: s}
}

// Register attaches the song routes to mux. The caller owns the mux (and any
// other routes, such as /health), so the SongAPI stays a mountable component
// rather than a whole server.
func (a *SongAPI) Register(mux *http.ServeMux) {
	mux.HandleFunc("GET /api/songs", a.handleList)
	mux.HandleFunc("GET /api/songs/{slug}", a.handleGet)
}

// handleList serves GET /api/songs, optionally filtered by ?q=. An empty query
// returns the whole library; results keep the store's artist-then-title order.
func (a *SongAPI) handleList(w http.ResponseWriter, r *http.Request) {
	query := r.URL.Query().Get("q")
	songs := a.store.Search(query)

	items := make([]SongListItemDTO, len(songs))
	for i, s := range songs {
		items[i] = toSongListItemDTO(s)
	}
	writeJSON(w, http.StatusOK, songListResponse{Songs: items})
}

// handleGet serves GET /api/songs/{slug} with the full song DTO, or 404 when no
// song has that slug.
func (a *SongAPI) handleGet(w http.ResponseWriter, r *http.Request) {
	slug := r.PathValue("slug")
	s, ok := a.store.Get(slug)
	if !ok {
		writeError(w, http.StatusNotFound, "song not found")
		return
	}
	writeJSON(w, http.StatusOK, songResponse{Song: toSongDTO(s)})
}

// writeJSON writes payload as JSON with the given status. HTML escaping is off
// so lyrics and strum arrows (↓ · ↑, &, <, >) stay human-readable in the body.
func writeJSON(w http.ResponseWriter, status int, payload any) {
	w.Header().Set("Content-Type", "application/json; charset=utf-8")
	w.WriteHeader(status)

	encoder := json.NewEncoder(w)
	encoder.SetEscapeHTML(false)
	err := encoder.Encode(payload)
	if err != nil {
		// The header and status are already sent, so we can't change the
		// response now — just record it for the operator.
		log.Printf("httpapi: encoding response: %v", err)
	}
}

// writeError writes a JSON error body, e.g. {"error":"song not found"}.
func writeError(w http.ResponseWriter, status int, message string) {
	writeJSON(w, status, map[string]string{"error": message})
}
