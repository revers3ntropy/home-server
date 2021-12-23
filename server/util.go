package main

import "os"

func pathExists(path string) bool {
	_, err := os.Stat(path)
	if err == nil {
		return true
	}
	if os.IsNotExist(err) {
		return false
	}
	return false
}

func strFromMap(m map[string]interface{}, key string) (string, bool) {
	value_ := m[key]
	switch v := value_.(type) {
	case string:
		return v, true
	default:
		return "", false
	}
}
