package httpapi

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"strings"
	"testing"

	"sing7/internal/store"
)

const corpusDir = "../../akordy"

// newTestServer loads the real corpus and returns a mux with the API mounted,
// so tests exercise routing (including the {slug} path value) end to end.
func newTestServer(t *testing.T) *http.ServeMux {
	t.Helper()
	library, _, err := store.LoadSongs(corpusDir)
	if err != nil {
		t.Fatalf("loading corpus: %v", err)
	}
	mux := http.NewServeMux()
	NewSongAPI(library).Register(mux)
	return mux
}

// do runs one request against the mux and returns the recorded response.
func do(t *testing.T, mux *http.ServeMux, target string) *httptest.ResponseRecorder {
	t.Helper()
	req := httptest.NewRequest(http.MethodGet, target, nil)
	rec := httptest.NewRecorder()
	mux.ServeHTTP(rec, req)
	return rec
}

func TestListReturnsWholeLibrary(t *testing.T) {
	mux := newTestServer(t)
	rec := do(t, mux, "/api/songs")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	if ct := rec.Header().Get("Content-Type"); !strings.HasPrefix(ct, "application/json") {
		t.Errorf("Content-Type = %q, want application/json", ct)
	}

	var body songListResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding list: %v", err)
	}
	if len(body.Songs) != 28 {
		t.Errorf("got %d songs, want 28", len(body.Songs))
	}
	// The list DTO carries only the summary fields.
	first := body.Songs[0]
	if first.Slug == "" || first.Title == "" || first.Artist == "" {
		t.Errorf("list item missing summary fields: %+v", first)
	}
}

func TestListFiltersByQuery(t *testing.T) {
	mux := newTestServer(t)
	rec := do(t, mux, "/api/songs?q=panic")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var body songListResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding: %v", err)
	}
	if !containsSlug(body.Songs, "coldplay-dont-panic") {
		t.Errorf("q=panic should include coldplay-dont-panic; got %v", slugs(body.Songs))
	}
	// The filter narrows the list well below the full library.
	if len(body.Songs) >= 28 {
		t.Errorf("q=panic returned %d songs, expected a filtered subset", len(body.Songs))
	}
}

func TestGetKnownSlugReturnsFullSong(t *testing.T) {
	mux := newTestServer(t)
	rec := do(t, mux, "/api/songs/coldplay-dont-panic")

	if rec.Code != http.StatusOK {
		t.Fatalf("status = %d, want 200", rec.Code)
	}
	var body songResponse
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding song: %v", err)
	}
	if body.Song.Slug != "coldplay-dont-panic" {
		t.Errorf("slug = %q, want coldplay-dont-panic", body.Song.Slug)
	}
	if body.Song.Title != "Don't Panic" || body.Song.Artist != "Coldplay" {
		t.Errorf("got %q by %q, want \"Don't Panic\" by \"Coldplay\"", body.Song.Title, body.Song.Artist)
	}
	if len(body.Song.Sections) == 0 {
		t.Errorf("full song should have sections")
	}
}

func TestGetUnknownSlugReturns404(t *testing.T) {
	mux := newTestServer(t)
	rec := do(t, mux, "/api/songs/no-such-song")

	if rec.Code != http.StatusNotFound {
		t.Fatalf("status = %d, want 404", rec.Code)
	}
	var body map[string]string
	if err := json.Unmarshal(rec.Body.Bytes(), &body); err != nil {
		t.Fatalf("decoding error body: %v", err)
	}
	if body["error"] == "" {
		t.Errorf("404 body should carry an error message; got %v", body)
	}
}

// --- helpers ---

func containsSlug(items []SongListItemDTO, slug string) bool {
	for _, it := range items {
		if it.Slug == slug {
			return true
		}
	}
	return false
}

func slugs(items []SongListItemDTO) []string {
	out := make([]string, len(items))
	for i, it := range items {
		out[i] = it.Slug
	}
	return out
}
