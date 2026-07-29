package main

import (
	"encoding/json"
	"fmt"
	"os"
	"path/filepath"
	"sing7/internal/parser"
)

func main() {
	files, err := filepath.Glob("songs/*.txt")
	if err != nil {
		fmt.Fprintf(os.Stderr, "glob: %v\n", err)
		os.Exit(1)
	}

	outDir := "tmp/debug"
	err = os.MkdirAll(outDir, 0755)
	if err != nil {
		fmt.Fprintf(os.Stderr, "mkdir: %v\n", err)
		os.Exit(1)
	}

	for _, path := range files {
		data, err := os.ReadFile(path)
		if err != nil {
			fmt.Fprintf(os.Stderr, "read %s: %v\n", path, err)
			continue
		}

		song, err := parser.Parse(data)
		if err != nil {
			fmt.Fprintf(os.Stderr, "parse %s: %v\n", path, err)
			continue
		}

		out, err := json.MarshalIndent(song, "", "  ")
		if err != nil {
			fmt.Fprintf(os.Stderr, "json %s: %v\n", path, err)
			continue
		}

		outPath := filepath.Join(outDir, song.Slug+".json")
		err = os.WriteFile(outPath, out, 0644)
		if err != nil {
			fmt.Fprintf(os.Stderr, "write %s: %v\n", outPath, err)
			continue
		}

		fmt.Printf("wrote %s\n", outPath)
	}
}
