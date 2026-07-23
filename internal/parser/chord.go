package parser

import "strings"

// isChordToken reports whether s is a single valid chord name per the §2.3
// grammar: a root note (A–G plus H) with an optional accidental, an optional
// quality/extension built only from chord-suffix characters, and an optional
// "/bass" note. The quality character set is deliberately narrow so that
// ordinary lyric words (which contain vowels and consonants like e, o, r, t, l)
// fail — that is what lets a whole line of chords be told apart from lyrics.
func isChordToken(s string) bool {
	if s == "" {
		return false
	}
	// A slash splits the chord from its bass note: "C/B", "F#/A#".
	main := s
	if slash := strings.IndexByte(s, '/'); slash >= 0 {
		bass := s[slash+1:]
		main = s[:slash]
		if !isBassNote(bass) {
			return false
		}
	}
	return isRootedQuality(main)
}

// isBassNote reports whether s is a bare root note with an optional accidental
// and nothing else — the shape allowed after a slash.
func isBassNote(s string) bool {
	runes := []rune(s)
	if len(runes) == 0 || !isRootLetter(runes[0]) {
		return false
	}
	rest := runes[1:]
	if len(rest) == 1 && isAccidental(rest[0]) {
		return true
	}
	return len(rest) == 0
}

// isRootedQuality reports whether s is a root note with an optional accidental
// followed by a quality/extension made only of chord-suffix characters.
func isRootedQuality(s string) bool {
	runes := []rune(s)
	if len(runes) == 0 || !isRootLetter(runes[0]) {
		return false
	}
	rest := runes[1:]
	if len(rest) > 0 && isAccidental(rest[0]) {
		rest = rest[1:]
	}
	for _, r := range rest {
		if !isQualityRune(r) {
			return false
		}
	}
	return true
}

// isRootLetter reports whether r is an uppercase note letter. A–G plus H, the
// latter being the Czech/German name for B natural (used by "Hm" = B minor in
// the corpus). Roots are always uppercase, which keeps lowercase lyric words
// from matching. Which pitch H versus B denotes is a transpose-time concern
// (Phase 2), not a classification one.
func isRootLetter(r rune) bool {
	return (r >= 'A' && r <= 'H')
}

// isAccidental reports whether r is a sharp or flat marker.
func isAccidental(r rune) bool {
	return r == '#' || r == 'b'
}

// isQualityRune reports whether r may appear in a chord's quality/extension —
// the letters used by m, maj, min, dim, aug, sus, add and M, plus digits and
// alteration markers. It intentionally excludes common lyric letters (e, o, r,
// t, l, …) so a word can never masquerade as a chord suffix.
func isQualityRune(r rune) bool {
	switch r {
	case 'a', 'd', 'g', 'i', 'j', 'm', 'n', 's', 'u', 'M':
		return true
	case '#', 'b', '+', '-', '°':
		return true
	}
	return r >= '0' && r <= '9'
}
