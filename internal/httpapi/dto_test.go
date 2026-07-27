package httpapi

import (
	"encoding/json"
	"strings"
	"testing"

	"sing7/internal/song"
)

// marshal is a tiny helper: map a song to its DTO and return the compact JSON.
func marshal(t *testing.T, s song.Song) string {
	t.Helper()
	data, err := json.Marshal(toSongDTO(s))
	if err != nil {
		t.Fatalf("marshal: %v", err)
	}
	return string(data)
}

func TestUntaggedSectionLabelSerializesToNull(t *testing.T) {
	s := song.Song{
		Sections: []song.Section{
			{Label: "", Lines: []song.Line{{Parts: []song.Part{{Text: "hi"}}}}},
		},
	}
	got := marshal(t, s)
	if !strings.Contains(got, `"label":null`) {
		t.Errorf("untagged section should serialize label as null; got %s", got)
	}
}

func TestTaggedSectionLabelSerializesToString(t *testing.T) {
	s := song.Song{
		Sections: []song.Section{{Label: "Verse 1", Lines: []song.Line{}}},
	}
	got := marshal(t, s)
	if !strings.Contains(got, `"label":"Verse 1"`) {
		t.Errorf("tagged section should serialize its label; got %s", got)
	}
}

func TestEmptyMetaSerializesToEmptyObject(t *testing.T) {
	got := marshal(t, song.Song{}) // no metadata at all
	if !strings.Contains(got, `"meta":{}`) {
		t.Errorf("empty meta should serialize to {}; got %s", got)
	}
}

func TestPopulatedMetaOmitsOnlyEmptyFields(t *testing.T) {
	s := song.Song{Meta: song.Meta{Key: "F", Tempo: "122 BPM", Year: 2000}}
	got := marshal(t, s)
	// present fields appear...
	for _, want := range []string{`"key":"F"`, `"tempo":"122 BPM"`, `"year":2000`} {
		if !strings.Contains(got, want) {
			t.Errorf("expected %s in %s", want, got)
		}
	}
	// ...absent ones (capo 0, no time, no notes) are dropped.
	for _, unwanted := range []string{`"capo"`, `"time"`, `"notes"`} {
		if strings.Contains(got, unwanted) {
			t.Errorf("did not expect %s in %s", unwanted, got)
		}
	}
}

func TestArraysAndMapNeverSerializeAsNull(t *testing.T) {
	// A song with nil Strum, nil ChordShapes, nil Sections must still emit
	// [] / {}, so the frontend can iterate/index without a nil check.
	got := marshal(t, song.Song{})
	for _, want := range []string{`"strum":[]`, `"chordShapes":{}`, `"sections":[]`} {
		if !strings.Contains(got, want) {
			t.Errorf("expected %s in %s", want, got)
		}
	}
}

func TestPartOmitsEmptyChordOrText(t *testing.T) {
	s := song.Song{
		Sections: []song.Section{{
			Label: "Intro",
			Lines: []song.Line{
				{ChordsOnly: true, Parts: []song.Part{{Chord: "Am"}}}, // chord, no text
				{Parts: []song.Part{{Text: "All that we "}}},          // text, no chord
			},
		}},
	}
	got := marshal(t, s)
	if !strings.Contains(got, `"chordsOnly":true`) {
		t.Errorf("chords-only line should carry chordsOnly:true; got %s", got)
	}
	if strings.Contains(got, `{"chord":"Am","text":""}`) {
		t.Errorf("empty text should be omitted; got %s", got)
	}
	if !strings.Contains(got, `{"chord":"Am"}`) {
		t.Errorf("expected {\"chord\":\"Am\"} with no text; got %s", got)
	}
	if !strings.Contains(got, `{"text":"All that we "}`) {
		t.Errorf("expected text-only part with no chord; got %s", got)
	}
	// A normal lyric line still carries chordsOnly, as an explicit false — it is
	// always present, never inferred from omission.
	if !strings.Contains(got, `"chordsOnly":false`) {
		t.Errorf("normal lyric line should carry chordsOnly:false; got %s", got)
	}
}

func TestListItemOmitsEmptyKey(t *testing.T) {
	withKey := toSongListItemDTO(song.Song{Slug: "a", Title: "A", Artist: "X", Meta: song.Meta{Key: "F"}})
	data, _ := json.Marshal(withKey)
	if !strings.Contains(string(data), `"key":"F"`) {
		t.Errorf("expected key present; got %s", data)
	}

	noKey := toSongListItemDTO(song.Song{Slug: "b", Title: "B", Artist: "Y"})
	data, _ = json.Marshal(noKey)
	if strings.Contains(string(data), `"key"`) {
		t.Errorf("expected key omitted; got %s", data)
	}
}
