package main

import (
	"fmt"
	"net/http"
	"os"
	"os/exec"
	"strconv"
	"strings"
	"time"
)

// REDIRECTS

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

// SUGGESTIONS

func suggest(w http.ResponseWriter, body map[string]interface{}) {
	suggestion, suggestionSuccess := strFromMap(body, "suggestion")
	if !suggestionSuccess {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"type of body.suggestion is not string\"}")
		return
	}

	cleanSuggestion := strings.Replace(suggestion, ",", "", -1)

	if SUGGESTIONS.Append([]string{cleanSuggestion, "0"}) {
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

// CHARITY TRANSACTIONS

func makeTransaction(w http.ResponseWriter, body map[string]interface{}) {
	person, personSuccess := strFromMap(body, "person")
	if !personSuccess {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"type of body.person is not string\"}")
		return
	}

	in, inSuccess := strFromMap(body, "in")
	if !inSuccess {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"type of body.in is not string\"}")
		return
	}

	out, outSuccess := strFromMap(body, "out")
	if !outSuccess {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"type of body.out is not string\"}")
		return
	}

	to, toSuccess := strFromMap(body, "to")
	if !toSuccess {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"type of body.to is not string\"}")
		return
	}

	detail, detailSuccess := strFromMap(body, "detail")
	if !detailSuccess {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"type of body.detail is not string\"}")
		return
	}

	notify, notifySuccess := strFromMap(body, "notify")
	if !notifySuccess {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"type of body.notify is not string\"}")
		return
	}

	current := strconv.Itoa(int(time.Now().Unix()))
	id := strconv.Itoa(TRANSACTIONS.Len())

	TRANSACTIONS.Append([]string{id, person, in, out, current, "", to, detail, "", ""})

	_, _ = fmt.Fprintf(w, "{\"ok\": true}")

	if notify == "1" {
		cmd := exec.Command("/bin/sh", os.Getenv("mailscript"))
		_, err := cmd.Output()
		if err != nil {
			fmt.Println(err.Error())
			return
		}
	}
}

func confirmTransaction(w http.ResponseWriter, body map[string]interface{}) {
	id, idSuccess := strFromMap(body, "id")
	if !idSuccess {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"type of body.id is not string\"}")
		return
	}

	detail, detailSuccess := strFromMap(body, "detail")
	if !detailSuccess {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"type of body.detail is not string\"}")
		return
	}

	current := strconv.Itoa(int(time.Now().Unix()))

	TRANSACTIONS.Set("confirmed", current, func(row []string) bool {
		return row[0] == id
	})

	TRANSACTIONS.Set("confirm_detail", detail, func(row []string) bool {
		return row[0] == id
	})

	_, _ = fmt.Fprintf(w, "{\"ok\": true}")
}

func deleteTransaction(w http.ResponseWriter, body map[string]interface{}) {
	id, idSuccess := strFromMap(body, "id")
	if !idSuccess {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"type of body.id is not string\"}")
		return
	}

	TRANSACTIONS.Delete(func(row []string) bool {
		return row[0] == id
	})

	var i = 0

	// shift ids to make sure that there aren't any gaps
	TRANSACTIONS.Update(func(row []string) bool {
		return true
	}, func(row []string) []string {
		row[0] = strconv.Itoa(i)
		i++
		return row
	})

	_, _ = fmt.Fprintf(w, "{\"ok\": true}")
}
