package httpapi

import "sing7/internal/song"

// This file defines the response DTOs — the JSON contract the API serves — and
// the mappers from the internal song.Song to them. The internal model is never
// serialized directly (§7): keeping a separate type here means the parser's
// model can evolve without silently changing the API payload.
//
// Field policy (confirmed with the owner):
//   - Optional metadata omits empty values ("omitempty"): an absent key, year,
//     capo, note, etc. simply doesn't appear in the JSON.
//   - Arrays the frontend iterates (strum, sections, lines, parts) and the
//     chordShapes map are ALWAYS emitted — as [] or {} when empty, never null —
//     so the client can map/index over them without a nil check. The mappers
//     guarantee this by allocating with make.
//   - An untagged section (internal Label == "") maps to an explicit
//     "label": null, not an omitted field (§3/§7).

// songListResponse is the envelope for GET /api/songs.
type songListResponse struct {
	Songs []SongListItemDTO `json:"songs"`
}

// songResponse is the envelope for GET /api/songs/{slug}.
type songResponse struct {
	Song SongDTO `json:"song"`
}

// SongListItemDTO is one row in the browse/search list: just enough to render a
// result and link to the full song by slug.
type SongListItemDTO struct {
	Slug   string `json:"slug"`
	Title  string `json:"title"`
	Artist string `json:"artist"`
	Key    string `json:"key,omitempty"`
}

// SongDTO is the full song payload for the song page.
type SongDTO struct {
	Slug        string                   `json:"slug"`
	Title       string                   `json:"title"`
	Artist      string                   `json:"artist"`
	Meta        MetaDTO                  `json:"meta"`
	Strum       []StrumDTO               `json:"strum"`
	ChordShapes map[string]ChordShapeDTO `json:"chordShapes"`
	Sections    []SectionDTO             `json:"sections"`
}

// MetaDTO is the footer metadata. Every field is optional and omitted when
// empty, so a song with no metadata serializes to "meta": {}.
type MetaDTO struct {
	Key   string   `json:"key,omitempty"`
	Capo  int      `json:"capo,omitempty"`
	Time  string   `json:"time,omitempty"`
	Tempo string   `json:"tempo,omitempty"`
	Year  int      `json:"year,omitempty"`
	Notes []string `json:"notes,omitempty"`
}

// StrumDTO is one strumming pattern. Label is omitted when unlabelled; the
// strokes/beats rows are the content and always present.
type StrumDTO struct {
	Label   string `json:"label,omitempty"`
	Strokes string `json:"strokes"`
	Beats   string `json:"beats"`
}

// ChordShapeDTO is one chord voicing. Frets always appears (a muted string is
// -1); source is "base" or "file".
type ChordShapeDTO struct {
	Frets  []int  `json:"frets"`
	Source string `json:"source"`
}

// SectionDTO is a run of lines. Label is a pointer so an untagged section
// serializes to "label": null rather than being omitted.
type SectionDTO struct {
	Label *string   `json:"label"`
	Lines []LineDTO `json:"lines"`
}

// LineDTO is one rendered line. Annotation is omitted in the
// common case (a normal lyric line with no trailing hint).
type LineDTO struct {
	ChordsOnly bool      `json:"chordsOnly"`
	Parts      []PartDTO `json:"parts"`
	Annotation string    `json:"annotation,omitempty"`
}

// PartDTO is a chord attached to the text that follows it. Either side may be
// absent (a leading lyric with no chord, or a chord with no text), so both omit
// when empty.
type PartDTO struct {
	Chord string `json:"chord,omitempty"`
	Text  string `json:"text,omitempty"`
}

// toSongListItemDTO maps a song to its browse-list row.
func toSongListItemDTO(s song.Song) SongListItemDTO {
	return SongListItemDTO{
		Slug:   s.Slug,
		Title:  s.Title,
		Artist: s.Artist,
		Key:    s.Meta.Key,
	}
}

// toSongDTO maps a song to the full response DTO, allocating every slice/map so
// none serialize as null.
func toSongDTO(s song.Song) SongDTO {
	strum := make([]StrumDTO, len(s.Strum))
	for i, st := range s.Strum {
		strum[i] = StrumDTO{Label: st.Label, Strokes: st.Strokes, Beats: st.Beats}
	}

	shapes := make(map[string]ChordShapeDTO, len(s.ChordShapes))
	for name, sh := range s.ChordShapes {
		frets := sh.Frets
		if frets == nil {
			frets = []int{}
		}
		shapes[name] = ChordShapeDTO{Frets: frets, Source: sh.Source}
	}

	sections := make([]SectionDTO, len(s.Sections))
	for i, sec := range s.Sections {
		sections[i] = toSectionDTO(sec)
	}

	return SongDTO{
		Slug:        s.Slug,
		Title:       s.Title,
		Artist:      s.Artist,
		Meta:        toMetaDTO(s.Meta),
		Strum:       strum,
		ChordShapes: shapes,
		Sections:    sections,
	}
}

// toMetaDTO copies the footer fields; empty ones are dropped by omitempty at
// serialization time.
func toMetaDTO(m song.Meta) MetaDTO {
	return MetaDTO{
		Key:   m.Key,
		Capo:  m.Capo,
		Time:  m.Time,
		Tempo: m.Tempo,
		Year:  m.Year,
		Notes: m.Notes,
	}
}

// toSectionDTO maps a section, turning an empty label into a null pointer and
// allocating the lines/parts slices so they never serialize as null.
func toSectionDTO(sec song.Section) SectionDTO {
	lines := make([]LineDTO, len(sec.Lines))
	for i, ln := range sec.Lines {
		parts := make([]PartDTO, len(ln.Parts))
		for j, p := range ln.Parts {
			parts[j] = PartDTO{Chord: p.Chord, Text: p.Text}
		}
		lines[i] = LineDTO{
			ChordsOnly: ln.ChordsOnly,
			Parts:      parts,
			Annotation: ln.Annotation,
		}
	}
	return SectionDTO{Label: labelPtr(sec.Label), Lines: lines}
}

// labelPtr returns nil for the untagged section (empty label) so it serializes
// to null, and a pointer to the label otherwise.
func labelPtr(label string) *string {
	if label == "" {
		return nil
	}
	return &label
}
