package main

import (
	"database/sql"
	_ "github.com/go-sql-driver/mysql"
	"os"
)

func connect() *sql.DB {
	username, usernameOk := os.LookupEnv("username")
	password, passwordOk := os.LookupEnv("password")
	if !usernameOk {
		panic("username env variable not set")
	}
	if !passwordOk {
		panic("password env variable not set")
	}

	db, err := sql.Open("mysql", username+":"+password+"@tcp(127.0.0.1:3306)/homeserver")

	// if there is an error opening the connection, handle it
	if err != nil {
		panic(err.Error())
	}

	return db
}
