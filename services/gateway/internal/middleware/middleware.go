package middleware

import (
	"fmt"
	"net/http"
	"strings"

	"github.com/BassemHalim/memeDB/gateway/internal/utils"
	"github.com/golang-jwt/jwt/v5"
)

func Auth(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		// Check if the request has the correct authorization header
		authHeader := r.Header.Get("Authorization")
		authType := strings.Split(authHeader, " ")[0]
		if authHeader == "" || authType != "Bearer" {
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		authToken := strings.Split(authHeader, " ")[1]
		token, err := jwt.Parse(authToken, func(token *jwt.Token) (interface{}, error) {
			// Don't forget to validate the alg is what you expect:
			if _, ok := token.Method.(*jwt.SigningMethodHMAC); !ok {

				return nil, fmt.Errorf("unexpected signing method: %v", token.Header["alg"])
			}
			key := utils.GetEnvOrDefault("JWT_SECRET", "use-openssl-rand--base64-128")
			if len(key) < 100 {
				fmt.Println("=========================NO SECRET KEY PROVIDED a placeholder is used being used =========================")
			}
			return []byte(key), nil
		})
		if err != nil || !token.Valid {
			fmt.Println("Unauthorized request", "Error", err, token)
			http.Error(w, "Unauthorized", http.StatusUnauthorized)
			return
		}
		if claims, ok := token.Claims.(jwt.MapClaims); ok {
			if claims["role"] != "admin" {
				http.Error(w, "Unauthorized", http.StatusUnauthorized)
				return
			}
		}

		next.ServeHTTP(w, r)
	})
}

// Enable CORS for all endpoints
func CORS(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {

		w.Header().Set("Access-Control-Allow-Origin", "*")
		w.Header().Set("Access-Control-Allow-Methods", "GET, OPTIONS")
		w.Header().Set("Access-Control-Allow-Headers", "Content-Type")
		if r.Method == http.MethodOptions {
			w.WriteHeader(http.StatusOK)
			return
		}
		next.ServeHTTP(w, r)
	})
}
