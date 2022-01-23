package CSV

import (
	"encoding/csv"
	"fmt"
	"log"
	"os"
	"strings"
)

type Reader struct {
	path    string
	headers []string
	rows    [][]string
}

func (r *Reader) NumColumns() int {
	return len(r.headers)
}

func (r *Reader) Str() string {
	out := strings.Join(r.headers, ",") + "\n"

	for _, row := range r.rows {
		out += strings.Join(row, ",") + "\n"
	}

	return out
}

func (r *Reader) Save() {
	err := os.WriteFile(r.path, []byte(r.Str()), 0644)
	if err != nil {
		fmt.Println("Error saving CSV '" + r.path + "'")
	}

	r.Load()
}

func (r *Reader) Load() {
	f, err := os.Open(r.path)
	if err != nil {
		log.Fatal("Unable to read input file "+r.path, err)
	}
	defer func(f *os.File) {
		err := f.Close()
		if err != nil {
			_, _ = fmt.Println("Error reading CSV file")
		}
	}(f)

	csvReader := csv.NewReader(f)
	records, err := csvReader.ReadAll()
	if err != nil {
		log.Fatal("Unable to parse file as CSV for "+r.path, err)
	}

	if len(records) < 1 {
		log.Fatal("Nothing in the CSV @ '" + r.path + "'. Must have at least header row.")
	}

	r.headers = records[0]
	r.rows = records[1:]
}

func (r *Reader) columnIdFromName(c string) int {
	for i := 0; i < r.NumColumns(); i++ {
		if r.headers[i] == c {
			return i
		}
	}
	return -1
}

func (r *Reader) Select(column string) []string {
	var c []string
	idx := r.columnIdFromName(column)
	for _, s := range r.rows {
		c = append(c, s[idx])
	}
	return c
}

func (r *Reader) Where(selector func(row []string) bool) [][]string {
	var c [][]string
	for _, s := range r.rows {
		if selector(s) {
			c = append(c, s)
		}
	}
	return c
}

func (r *Reader) SelectFirstWhere(searchColumn string, equals string, selectColumn string) (string, bool) {
	idxSearch := r.columnIdFromName(searchColumn)
	idxFind := r.columnIdFromName(selectColumn)

	for _, s := range r.rows {
		if s[idxSearch] == equals {
			return s[idxFind], true
		}
	}
	return "", false
}

func (r *Reader) SelectWhere(column string, selector func(row []string) bool) []string {
	var c []string
	idx := r.columnIdFromName(column)
	for _, s := range r.rows {
		if selector(s) {
			c = append(c, s[idx])
		}
	}
	return c
}

func (r *Reader) Len() int {
	var n int
	for _, _ = range r.rows {
		n++
	}
	return n
}

func (r *Reader) Update(filter func(row []string) bool, updator func(row []string) []string) {
	for i, row := range r.rows {
		if filter(row) {
			r.rows[i] = updator(row)
		}
	}
	r.Save()
}

func (r *Reader) Set(column string, value string, filter func(row []string) bool) {
	idx := r.columnIdFromName(column)

	for i, row := range r.rows {
		if filter(row) {
			r.rows[i][idx] = value
		}
	}
	r.Save()
}

func (r *Reader) Delete(selector func(row []string) bool) bool {
	found := false
	for i := 0; i < len(r.rows); i++ {
		if !selector(r.rows[i]) {
			continue
		}
		r.rows[i] = r.rows[len(r.rows)-1]
		r.rows = r.rows[:len(r.rows)-1]
		// re-check this row
		i--
		found = true
	}

	r.Save()
	return found
}

func (r *Reader) Append(row []string) bool {
	if len(row) != r.NumColumns() {
		return false
	}
	r.rows = append(r.rows, row)
	r.Save()
	return true
}

func (r *Reader) HasRowWith(column string, entry string) bool {
	idx := r.columnIdFromName(column)
	return len(r.Where(func(row []string) bool {
		return row[idx] == entry
	})) > 0
}

func NewReader(path string) *Reader {
	r := Reader{path: path}
	r.Load()
	return &r
}
