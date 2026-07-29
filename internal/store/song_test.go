package store

import (
	"os"
	"path/filepath"
	"sort"
	"testing"

	"sing7/internal/song"
)

// corpusDir is the real songs folder relative to this package.
const corpusDir = "../../songs"

// wantCorpusCount is how many songs the real corpus should index. All 28 files
// have a valid title line, and the parser tolerates every softer quirk, so none
// are skipped. Bump this when songs are added or removed.
const wantCorpusCount = 28

func TestLoadCorpusIndexesEverySong(t *testing.T) {
	library, summary, err := LoadSongs(corpusDir)
	if err != nil {
		t.Fatalf("LoadSongs(%q) returned error: %v", corpusDir, err)
	}
	if summary.Loaded != wantCorpusCount {
		t.Errorf("loaded %d songs, want %d", summary.Loaded, wantCorpusCount)
	}
	if len(summary.Skipped) != 0 {
		t.Errorf("skipped %d files, want 0: %+v", len(summary.Skipped), summary.Skipped)
	}
	if got := len(library.All()); got != wantCorpusCount {
		t.Errorf("All() returned %d songs, want %d", got, wantCorpusCount)
	}
}

func TestAllIsSortedByArtistThenTitle(t *testing.T) {
	library, _, err := LoadSongs(corpusDir)
	if err != nil {
		t.Fatalf("LoadSongs: %v", err)
	}

	all := library.All()
	slugs := make([]string, len(all))
	for i, sng := range all {
		slugs[i] = sng.Slug
	}
	if !sort.StringsAreSorted(slugs) {
		t.Errorf("All() is not sorted by slug (artist-then-title): %v", slugs)
	}

	// Spot-check the ordering the owner picked: the two Foo Fighters songs are
	// adjacent, and Everlong sorts before My Hero within that artist.
	everlong := indexOfSlug(all, "foo-fighters-everlong-acoustic")
	myHero := indexOfSlug(all, "foo-fighters-my-hero-acoustic")
	if everlong < 0 || myHero < 0 {
		t.Fatalf("expected both Foo Fighters songs; got everlong=%d myHero=%d", everlong, myHero)
	}
	if everlong >= myHero {
		t.Errorf("Everlong (%d) should sort before My Hero (%d)", everlong, myHero)
	}
}

func TestGet(t *testing.T) {
	library, _, err := LoadSongs(corpusDir)
	if err != nil {
		t.Fatalf("LoadSongs: %v", err)
	}

	got, ok := library.Get("coldplay-dont-panic")
	if !ok {
		t.Fatalf("Get(coldplay-dont-panic) not found")
	}
	if got.Title != "Don't Panic" || got.Artist != "Coldplay" {
		t.Errorf("Get returned %q by %q, want \"Don't Panic\" by \"Coldplay\"", got.Title, got.Artist)
	}

	if _, ok := library.Get("no-such-slug"); ok {
		t.Errorf("Get(no-such-slug) reported found, want not found")
	}
}

func TestSearch(t *testing.T) {
	library, _, err := LoadSongs(corpusDir)
	if err != nil {
		t.Fatalf("LoadSongs: %v", err)
	}

	// A title substring finds the song.
	if !searchFindsSlug(library, "panic", "coldplay-dont-panic") {
		t.Errorf("Search(panic) did not find coldplay-dont-panic")
	}
	// Search is case-insensitive.
	if !searchFindsSlug(library, "PANIC", "coldplay-dont-panic") {
		t.Errorf("Search(PANIC) did not find coldplay-dont-panic")
	}
	// An artist substring finds the song too.
	if !searchFindsSlug(library, "coldplay", "coldplay-dont-panic") {
		t.Errorf("Search(coldplay) did not find coldplay-dont-panic")
	}
	// An empty query returns the whole library, in All() order.
	if got := len(library.Search("")); got != wantCorpusCount {
		t.Errorf("Search(\"\") returned %d songs, want %d", got, wantCorpusCount)
	}
	if got := len(library.Search("   ")); got != wantCorpusCount {
		t.Errorf("Search(whitespace) returned %d songs, want %d", got, wantCorpusCount)
	}
	// A miss returns nothing, not an error.
	if got := len(library.Search("zzzzzz-no-match")); got != 0 {
		t.Errorf("Search(miss) returned %d songs, want 0", got)
	}
}

func TestLoadSkipsUnparseableFile(t *testing.T) {
	dir := t.TempDir()
	writeFile(t, dir, "good.txt", "Good Song — Some Artist\n\nC\nla la la\n")
	// A file with no "Title — Artist" line: the parser rejects it, the store
	// skips it. (A blank first line is the one thing Parse errors on.)
	writeFile(t, dir, "bad.txt", "\n\njust some words\n")

	library, summary, err := LoadSongs(dir)
	if err != nil {
		t.Fatalf("LoadSongs: %v", err)
	}
	if summary.Loaded != 1 {
		t.Errorf("loaded %d, want 1", summary.Loaded)
	}
	if len(summary.Skipped) != 1 {
		t.Fatalf("skipped %d files, want 1: %+v", len(summary.Skipped), summary.Skipped)
	}
	if filepath.Base(summary.Skipped[0].Path) != "bad.txt" {
		t.Errorf("skipped %q, want bad.txt", summary.Skipped[0].Path)
	}
	if _, ok := library.Get("some-artist-good-song"); !ok {
		t.Errorf("good song was not indexed")
	}
}

func TestLoadKeepsFirstOnDuplicateSlug(t *testing.T) {
	dir := t.TempDir()
	// Both files produce the same slug ("artist-song"); the parser succeeds on
	// both, so the store must resolve the collision itself. Sorted processing
	// makes "a-first.txt" win.
	writeFile(t, dir, "a-first.txt", "Song — Artist\n\nC\nkeep me\n")
	writeFile(t, dir, "b-second.txt", "Song — Artist\n\nG\ndrop me\n")

	library, summary, err := LoadSongs(dir)
	if err != nil {
		t.Fatalf("LoadSongs: %v", err)
	}
	if summary.Loaded != 1 {
		t.Errorf("loaded %d, want 1", summary.Loaded)
	}
	if len(summary.Skipped) != 1 {
		t.Fatalf("skipped %d, want 1: %+v", len(summary.Skipped), summary.Skipped)
	}
	if filepath.Base(summary.Skipped[0].Path) != "b-second.txt" {
		t.Errorf("skipped %q, want b-second.txt (first file should win)", summary.Skipped[0].Path)
	}
	sng, ok := library.Get("artist-song")
	if !ok {
		t.Fatalf("slug artist-song not indexed")
	}
	if len(sng.Sections) == 0 || len(sng.Sections[0].Lines) == 0 {
		t.Fatalf("kept song has no lines")
	}
}

func TestLoadMissingDirIsEmptyNotError(t *testing.T) {
	// Glob of a nonexistent directory matches nothing and is not an OS error,
	// so LoadSongs yields an empty library rather than failing.
	library, summary, err := LoadSongs(filepath.Join(t.TempDir(), "does-not-exist"))
	if err != nil {
		t.Fatalf("LoadSongs of missing dir returned error: %v", err)
	}
	if summary.Loaded != 0 || len(library.All()) != 0 {
		t.Errorf("expected empty library, got loaded=%d all=%d", summary.Loaded, len(library.All()))
	}
}

// --- helpers ---

func indexOfSlug(songs []song.Song, slug string) int {
	for i, sng := range songs {
		if sng.Slug == slug {
			return i
		}
	}
	return -1
}

func writeFile(t *testing.T, dir, name, content string) {
	t.Helper()
	err := os.WriteFile(filepath.Join(dir, name), []byte(content), 0o644)
	if err != nil {
		t.Fatalf("writing %s: %v", name, err)
	}
}

func searchFindsSlug(s *SongStore, query, slug string) bool {
	for _, sng := range s.Search(query) {
		if sng.Slug == slug {
			return true
		}
	}
	return false
}
