package main

import (
	"fmt"
	"net/http"
	"strconv"
)

func deleteRedirect(w http.ResponseWriter, body map[string]interface{}) {
	from, fromSuccess := strFromMap(body, "from")
	if !fromSuccess {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"type of body.from is not string\"}")
		return
	}

	if REDIRECTS.Delete(func(row []string) bool {
		return row[0] == from
	}) {
		_, _ = fmt.Fprintf(w, "{\"ok\": true}")
	} else {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"Nothing deleted\"}")
	}
}

func enableDisableRedirect(w http.ResponseWriter, body map[string]interface{}) {
	from, fromSuccess := strFromMap(body, "from")
	if !fromSuccess {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"type of body.from is not string\"}")
		return
	}

	value, valueSuccess := strFromMap(body, "value")
	if !valueSuccess {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"type of body.value is not string\"}")
		return
	}

	REDIRECTS.Set("active", value, func(row []string) bool {
		return row[0] == from
	})

	_, _ = fmt.Fprintf(w, "{\"ok\": true}")
}

func addRedirect(w http.ResponseWriter, body map[string]interface{}) {
	from, fromSuccess := strFromMap(body, "from")
	if !fromSuccess {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"type of body.from is not string\"}")
		return
	}

	to, toSuccess := strFromMap(body, "to")
	if !toSuccess {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"type of body.to is not string\"}")
		return
	}

	// shouldn't add new row is it already pathExists
	if REDIRECTS.HasRowWith("from", from) || pathExists("./public/"+from) {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"Sorry, that already pathExists as a link or directory\"}")
		return
	}

	if REDIRECTS.Append([]string{from, to, "1", "0"}) {
		_, _ = fmt.Fprintf(w, "{\"ok\": true}")
	} else {
		_, _ = fmt.Fprintf(w,
			"{\"ok\": false, \"error\": \"Incorrect number of columns in REDIRECTS.Append: expected "+
				strconv.Itoa(REDIRECTS.NumColumns())+"\"}")
	}
}

func suggest(w http.ResponseWriter, body map[string]interface{}) {
	suggestion, suggestionSuccess := strFromMap(body, "suggestion")
	if !suggestionSuccess {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"type of body.suggestion is not string\"}")
		return
	}

	if SUGGESTIONS.Append([]string{suggestion, "0"}) {
		_, _ = fmt.Fprintf(w, "{\"ok\": true}")
	} else {
		_, _ = fmt.Fprintf(w,
			"{\"ok\": false, \"error\": \"Incorrect number of columns in SUGGESTIONS.Append: expected "+
				strconv.Itoa(SUGGESTIONS.NumColumns())+"\"}")
	}
}

func doUndoSuggestion(w http.ResponseWriter, body map[string]interface{}) {
	suggestion, suggestionSuccess := strFromMap(body, "suggestion")
	if !suggestionSuccess {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"type of body.suggestion is not string\"}")
		return
	}

	value, valueSuccess := strFromMap(body, "value")
	if !valueSuccess {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"type of body.value is not string\"}")
		return
	}

	SUGGESTIONS.Set("priority", value, func(row []string) bool {
		return row[0] == suggestion
	})

	_, _ = fmt.Fprintf(w, "{\"ok\": true}")
}

func deleteSuggestion(w http.ResponseWriter, body map[string]interface{}) {
	suggestion, suggestionSuccess := strFromMap(body, "suggestion")
	if !suggestionSuccess {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"type of body.suggestion is not string\"}")
		return
	}

	SUGGESTIONS.Delete(func(row []string) bool {
		return row[0] == suggestion
	})

	_, _ = fmt.Fprintf(w, "{\"ok\": true}")
}
