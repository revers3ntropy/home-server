package main

import (
	"encoding/json"
	"errors"
	"fmt"
	"github.com/joho/godotenv"
	"hp-server/server/csv"
	"io/ioutil"
	"log"
	"net/http"
	"os"
	"strconv"
	"strings"
)

const PORT = "80"

var REDIRECTS = CSV.NewReader("./public/redirects.csv")
var SUGGESTIONS = CSV.NewReader("./public/suggestions.csv")
var TRANSACTIONS = CSV.NewReader("./public/transactions.csv")

var APIs = map[string]func(w http.ResponseWriter, body map[string]interface{}){
	// redirect
	"add-redirect":    addRedirect,
	"delete-redirect": deleteRedirect,
	"toggle-redirect": enableDisableRedirect,

	// suggestions
	"suggest":            suggest,
	"do-undo-suggestion": doUndoSuggestion,
	"delete-suggestion":  deleteSuggestion,

	// charity
	"make-transaction":    makeTransaction,
	"confirm-transaction": confirmTransaction,
	"delete-transaction":  deleteTransaction,
}

func apiCall(w http.ResponseWriter, r *http.Request, path string) {
	// API call is used when it is a POST rather than a GET request

	// read the body of the request
	body, err := ioutil.ReadAll(r.Body)

	if err != nil {
		fmt.Println("Error: Could not read request body")
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"could not read request body\"}")
		log.Println(err)
		panic(err)
		return
	}

	// parse JSON
	var result map[string]interface{}
	err = json.Unmarshal(body, &result)
	if err != nil {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"couldn't unmarshal JSON\"}")
		fmt.Println("Error: Could not unmarshal JSON")
		log.Println(err)
		panic(err)
		return
	}

	if val, ok := APIs[path]; ok {
		val(w, result)
	} else {
		_, _ = fmt.Fprintf(w, "{\"ok\": false, \"error\": \"404 - no API interface found\"}")
	}
}

func redirect(possibleRedirects []string, path string, w http.ResponseWriter, req *http.Request) {
	redirect := possibleRedirects[0]

	REDIRECTS.Update(func(row []string) bool {
		return row[0] == path

	}, func(row []string) []string {
		num, e := strconv.Atoi(row[3])

		if e != nil {
			fmt.Println("Error converting string to int when logging redirect")
			return row
		}

		row[3] = strconv.Itoa(num + 1)
		return row
	})

	http.Redirect(w, req, redirect, http.StatusSeeOther)
}

func HTMLStuff() string {
	// main.js
	addition := "<script defer>"
	jsMain, _ := os.ReadFile("main.js")
	addition += string(jsMain)

	// header.html
	addition += ";const HEADER_DIV = document.createElement('div'); HEADER_DIV.innerHTML = `"
	headerHTML, _ := os.ReadFile("header.html")
	addition += string(headerHTML)
	addition += "`; document.body.prepend(HEADER_DIV)</script>"

	// main.css
	addition += "<style>"
	cssMain, _ := os.ReadFile("main.css")
	addition += string(cssMain)
	addition += "</style>"

	return addition
}

func dealWithFileExt(resource string, content []byte, w http.ResponseWriter) []byte {
	splitParts := strings.Split(resource, ".")
	ending := splitParts[len(splitParts)-1]

	switch ending {
	case "html":
		content = []byte(string(content) + HTMLStuff())
		w.Header().Set("content-type", "text/html; charset=utf-8")
	case "js":
		w.Header().Set("content-type", "application/javascript")
	case "csv":
		w.Header().Set("content-type", "text/plain")
	case "json":
		w.Header().Set("content-type", "application/plain")
	case "txt":
		w.Header().Set("content-type", "text/plain")

	default:
		_, _ = fmt.Fprintf(w, "404 - invalid file extention")
		return []byte("")
	}

	return content
}

func filePreprocessor(fileContent []byte) []byte {
	content := string(fileContent)

	for strings.Contains(content, "#include") {
		idx := strings.Index(content, "#include")

		// space
		idx += len("#include ")

		var path string
		for content[idx] != '#' {
			path += string(content[idx])
			idx++
		}

		fileContent, err := os.ReadFile(path)
		if err != nil {
			fmt.Println("Cannot read included file " + path)
			return fileContent
		}

		content = strings.Replace(content, "#include "+path+"#", string(fileContent), -1)
	}

	return []byte(content)
}

func serveFile(path string, w http.ResponseWriter) {
	var resourcePaths []string

	if len(path) > 0 {
		resourcePaths = append(resourcePaths, "public/"+path)
		resourcePaths = append(resourcePaths, "public/"+path+"/index.html")
	} else {
		resourcePaths = append(resourcePaths, "public/index.html")
	}

	for _, resource := range resourcePaths {
		if _, err := os.Stat(resource); errors.Is(err, os.ErrNotExist) {
			continue
		}

		content, err := os.ReadFile(resource)
		if err != nil {
			continue
		}

		content = dealWithFileExt(resource, content, w)
		content = filePreprocessor(content)

		_, _ = fmt.Fprintf(w, string(content))

		return
	}

	_, _ = fmt.Fprintf(w, "404 Error: Page not found")
}

func handleRequest(w http.ResponseWriter, req *http.Request) {

	// don't really care about security as it is all in a walled garden anyway
	w.Header().Set("Access-Control-Allow-Origin", "*")

	path := strings.Trim(req.URL.Path, "/")

	if req.Method == "POST" {
		apiCall(w, req, path)
		return
	}

	possibleRedirects := REDIRECTS.SelectWhere("to", func(row []string) bool {
		return row[0] == path && row[2] == "1"
	})

	if len(possibleRedirects) > 0 {
		redirect(possibleRedirects, path, w, req)
		return
	}

	serveFile(path, w)
}

func main() {
	if godotenv.Load() != nil {
		fmt.Println("error loading .env")
		return
	}

	fmt.Println("Starting server on port " + PORT)
	log.Fatal(http.ListenAndServe(":"+PORT, http.HandlerFunc(handleRequest)))
}
