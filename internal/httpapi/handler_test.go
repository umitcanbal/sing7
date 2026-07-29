package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"sing7/internal/store"
)

const corpusDir = "../../songs"

// newTestServer loads the real corpus and returns a mux with the webrpc handler mounted.
func newTestServer(t *testing.T) *http.ServeMux {
	t.Helper()
	library, _, err := store.LoadSongs(corpusDir)
	if err != nil {
		t.Fatalf("loading corpus: %v", err)
	}
	mux := http.NewServeMux()
	mux.Handle("/rpc/", NewSongServiceServer(NewSongService(library)))
	return mux
}

// post sends a POST request with a JSON body to the mux and returns the response.
func post(t *testing.T, mux *http.ServeMux, path, body string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodPost, path, strings.NewReader(body))
	req.Header.Set("Content-Type", "application/json")
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	return rec
}

func TestListSongsReturnsWholeLibrary(t *testing.T) {
	mux := newTestServer(t)
	rec := post(t, mux, "/rpc/SongService/ListSongs", "{}")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}

	var body struct {
		Songs []SongListItem `json:"songs"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding list: %v", err)
	}
	if len(body.Songs) != 28 {
		t.Errorf("got %d songs, want 28", len(body.Songs))
	}
	first := body.Songs[0]
	if first.Slug == "" || first.Title == "" || first.Artist == "" {
		t.Errorf("list item missing fields: %+v", first)
	}
}

func TestListSongsFiltersByQuery(t *testing.T) {
	mux := newTestServer(t)
	rec := post(t, mux, "/rpc/SongService/ListSongs", `{"q":"panic"}`)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}

	var body struct {
		Songs []SongListItem `json:"songs"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding: %v", err)
	}
	if !containsSlug(body.Songs, "coldplay-dont-panic") {
		t.Errorf("q=panic should include coldplay-dont-panic; got %v", slugs(body.Songs))
	}
	if len(body.Songs) >= 28 {
		t.Errorf("q=panic returned %d songs, expected a filtered subset", len(body.Songs))
	}
}

func TestGetSongReturnsFullSong(t *testing.T) {
	mux := newTestServer(t)
	rec := post(t, mux, "/rpc/SongService/GetSong", `{"slug":"coldplay-dont-panic"}`)

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}

	var body struct {
		Song Song `json:"song"`
	}
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding song: %v", err)
	}
	if body.Song.Slug != "coldplay-dont-panic" {
		t.Errorf("slug = %q, want coldplay-dont-panic", body.Song.Slug)
	}
	if body.Song.Title != "Don't Panic" || body.Song.Artist != "Coldplay" {
		t.Errorf("got %q by %q", body.Song.Title, body.Song.Artist)
	}
	if len(body.Song.Sections) == 0 {
		t.Errorf("full song should have sections")
	}
}

func TestGetSongUnknownSlugReturns404(t *testing.T) {
	mux := newTestServer(t)
	rec := post(t, mux, "/rpc/SongService/GetSong", `{"slug":"no-such-song"}`)

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}

	var body WebRPCError
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding error body: %v", err)
	}
	if body.Code != ErrSongNotFound.Code {
		t.Errorf("error code = %d, want %d", body.Code, ErrSongNotFound.Code)
	}
}

// --- helpers ---

func containsSlug(items []SongListItem, slug string) bool {
	for _, it := range items {
		if it.Slug == slug {
			return true
		}
	}
	return false
}

func slugs(items []SongListItem) []string {
	out := make([]string, len(items))
	for i, it := range items {
		out[i] = it.Slug
	}
	return out
}
