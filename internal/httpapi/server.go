package httpapi

import (
	"context"
	"time"

	"sing7/internal/song"
	"sing7/internal/store"
)

// SongService implements SongServiceServer by delegating to the store.
type SongService struct {
	store *store.SongStore
}

func NewSongService(s *store.SongStore) *SongService {
	return &SongService{store: s}
}

func (s *SongService) ListSongs(_ context.Context, q *string) ([]*SongListItem, error) {
	time.Sleep(time.Second)
	query := ""
	if q != nil {
		query = *q
	}
	songs := s.store.Search(query)
	items := make([]*SongListItem, len(songs))
	for i, sng := range songs {
		items[i] = toSongListItem(sng)
	}
	return items, nil
}

func (s *SongService) GetSong(_ context.Context, slug string) (*Song, error) {
	time.Sleep(time.Second)
	sng, ok := s.store.Get(slug)
	if !ok {
		return nil, ErrSongNotFound
	}
	return toSong(sng), nil
}

func toSongListItem(s *song.Song) *SongListItem {
	item := &SongListItem{
		Slug:   s.Slug,
		Title:  s.Title,
		Artist: s.Artist,
	}
	if s.Meta.Key != "" {
		item.Key = &s.Meta.Key
	}
	return item
}

func toSong(s *song.Song) *Song {
	strum := make([]*Strum, len(s.Strum))
	for i, st := range s.Strum {
		strum[i] = toStrum(st)
	}

	shapes := make(map[string]*ChordShape, len(s.ChordShapes))
	for name, sh := range s.ChordShapes {
		shapes[name] = toChordShape(sh)
	}

	sections := make([]*Section, len(s.Sections))
	for i, sec := range s.Sections {
		sections[i] = toSection(sec)
	}

	return &Song{
		Slug:        s.Slug,
		Title:       s.Title,
		Artist:      s.Artist,
		Meta:        toMeta(s.Meta),
		Strum:       strum,
		ChordShapes: shapes,
		Sections:    sections,
	}
}

func toMeta(m song.Meta) *Meta {
	meta := &Meta{Notes: m.Notes}
	if m.Key != "" {
		meta.Key = &m.Key
	}
	if m.Capo != 0 {
		capo := int32(m.Capo)
		meta.Capo = &capo
	}
	if m.Time != "" {
		meta.Time = &m.Time
	}
	if m.Tempo != "" {
		meta.Tempo = &m.Tempo
	}
	if m.Year != 0 {
		year := int32(m.Year)
		meta.Year = &year
	}
	return meta
}

func toStrum(s song.Strum) *Strum {
	st := &Strum{Strokes: s.Strokes, Beats: s.Beats}
	if s.Label != "" {
		st.Label = &s.Label
	}
	return st
}

func toChordShape(s song.ChordShape) *ChordShape {
	frets := make([]int32, len(s.Frets))
	for i, f := range s.Frets {
		frets[i] = int32(f)
	}
	return &ChordShape{Frets: frets, Source: s.Source}
}

func toSection(s song.Section) *Section {
	lines := make([]*Line, len(s.Lines))
	for i, ln := range s.Lines {
		lines[i] = toLine(ln)
	}
	sec := &Section{Lines: lines}
	if s.Label != "" {
		sec.Label = &s.Label
	}
	return sec
}

func toLine(l song.Line) *Line {
	parts := make([]*Part, len(l.Parts))
	for i, p := range l.Parts {
		parts[i] = toPart(p)
	}
	ln := &Line{ChordsOnly: l.ChordsOnly, Parts: parts}
	if l.Annotation != "" {
		ln.Annotation = &l.Annotation
	}
	return ln
}

func toPart(p song.Part) *Part {
	part := &Part{}
	if p.Chord != "" {
		part.Chord = &p.Chord
	}
	if p.Text != "" {
		part.Text = &p.Text
	}
	return part
}
