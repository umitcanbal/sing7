// Package store holds the parsed song library in memory and serves queries by
// slug and by search term. On load it parses the songs folder, logging and
// skipping files the parser rejects. It is the app's "database": once LoadSongs
// returns, the whole library lives in RAM and every request is served from it.
package store

import (
	"fmt"
	"log"
	"os"
	"path/filepath"
	"sort"
	"strings"

	"sing7/internal/parser"
	"sing7/internal/song"
)

// SongStore is the in-memory song library. After LoadSongs it is read-only, so its
// methods are safe to call concurrently from HTTP handlers without locking.
type SongStore struct {
	bySlug  map[string]song.Song // slug → song, for O(1) Get
	ordered []indexed            // every song, sorted for stable All()/Search() output
}

// indexed is one song plus the precomputed lowercase text Search matches
// against, so a query doesn't rebuild the haystack on every request.
type indexed struct {
	song     song.Song
	haystack string // lowercased "title artist"
}

// Skip records one file that was left out of the library, with the reason.
type Skip struct {
	Path   string
	Reason string
}

// Summary is the outcome of a LoadSongs call: how many songs were indexed and
// which files were skipped and why. LoadSongs also logs this, but returning it lets callers
// (and tests) inspect the result without scraping log output.
type Summary struct {
	Loaded  int
	Skipped []Skip
}

// LoadSongs walks dir for *.txt files, parses each into a song, and builds the
// in-memory index. A file the parser rejects — or whose slug collides with one
// already loaded — is logged and skipped, never fatal: the parser is the app's
// only guardrail, so a bad file simply doesn't enter the library. LoadSongs returns
// an error only when the directory itself cannot be scanned.
func LoadSongs(dir string) (*SongStore, Summary, error) {
	pattern := filepath.Join(dir, "*.txt")
	paths, err := filepath.Glob(pattern)
	if err != nil {
		return nil, Summary{}, fmt.Errorf("scanning %s: %w", dir, err)
	}
	// Sort so processing order is deterministic; this also makes "first file
	// wins" a stable, reproducible outcome when two files share a slug.
	sort.Strings(paths)

	library := &SongStore{bySlug: make(map[string]song.Song, len(paths))}
	var summary Summary

	for _, path := range paths {
		data, err := os.ReadFile(path)
		if err != nil {
			summary.Skipped = append(summary.Skipped, Skip{path, fmt.Sprintf("read error: %v", err)})
			continue
		}

		parsed, err := parser.Parse(data)
		if err != nil {
			summary.Skipped = append(summary.Skipped, Skip{path, fmt.Sprintf("parse error: %v", err)})
			continue
		}

		if existingSong, ok := library.bySlug[parsed.Slug]; ok {
			reason := fmt.Sprintf("duplicate slug %q (already loaded %q — %s)", parsed.Slug, existingSong.Title, existingSong.Artist)
			summary.Skipped = append(summary.Skipped, Skip{path, reason})
			continue
		}

		library.bySlug[parsed.Slug] = parsed
		summary.Loaded++
	}

	library.buildIndex()
	summary.log(dir)
	return library, summary, nil
}

// buildIndex fills the ordered slice from the slug map and sorts it
// artist-then-title. The slug already encodes "artist title" kebab-cased —
// lowercased and with diacritics folded — so ordering by slug gives exactly
// that alphabetisation for free, with no separate collation key to maintain.
func (s *SongStore) buildIndex() {
	s.ordered = make([]indexed, 0, len(s.bySlug))
	for _, sng := range s.bySlug {
		s.ordered = append(s.ordered, indexed{
			song:     sng,
			haystack: strings.ToLower(sng.Title + " " + sng.Artist),
		})
	}
	sort.Slice(s.ordered, func(i, j int) bool {
		return s.ordered[i].song.Slug < s.ordered[j].song.Slug
	})
}

// All returns every song, sorted artist-then-title. The returned slice holds
// pointers directly into the store's own index — callers must not mutate the
// songs through them.
func (s *SongStore) All() []*song.Song {
	result := make([]*song.Song, len(s.ordered))
	for i := range s.ordered {
		result[i] = &s.ordered[i].song
	}
	return result
}

// Get returns the full song for a slug. ok is false when no song has that slug.
func (s *SongStore) Get(slug string) (*song.Song, bool) {
	sng, ok := s.bySlug[slug]
	if !ok {
		return nil, false
	}
	return &sng, true
}

// Search returns the songs whose title or artist contains query, matched
// case-insensitively as a substring, in the same artist-then-title order as
// All. An empty or whitespace-only query returns the whole library. The
// returned pointers point directly into the store — callers must not mutate
// the songs through them.
func (s *SongStore) Search(query string) []*song.Song {
	needle := strings.TrimSpace(strings.ToLower(query))
	if needle == "" {
		return s.All()
	}
	var result []*song.Song
	for i, entry := range s.ordered {
		if strings.Contains(entry.haystack, needle) {
			result = append(result, &s.ordered[i].song)
		}
	}
	return result
}

// log writes a per-skip line and a one-line total to the standard logger, so a
// server startup shows exactly what was loaded and what was left out.
func (sum Summary) log(dir string) {
	for _, skip := range sum.Skipped {
		log.Printf("store: skipped %s — %s", skip.Path, skip.Reason)
	}
	log.Printf("store: loaded %d song(s) from %s, skipped %d", sum.Loaded, dir, len(sum.Skipped))
}
