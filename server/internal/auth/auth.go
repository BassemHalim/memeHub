package auth

import (
	"encoding/json"
	"fmt"
	"net/http"
	"os"

	"github.com/golang-jwt/jwt/v5"
	"golang.org/x/crypto/bcrypt"
)

func hashedPassword() {
	hashedPassword, err := bcrypt.GenerateFromPassword([]byte("your-admin-password"), bcrypt.DefaultCost)
	if err != nil {
		fmt.Println(err)
		return
	}
	fmt.Println(string(hashedPassword)) // Store this in ADMIN_PASS_HASH
}

func GenerateAdminJWT(username string) (string, error) {
	jwtSecret, ok := os.LookupEnv("JWT_SECRET")
	if !ok {
		return "", fmt.Errorf("JWT_SECRET not set")
	}
	claims := jwt.MapClaims{
		"username": username,
		"role":     "admin",
	}
	token := jwt.NewWithClaims(jwt.SigningMethodHS256, claims)
	tokenString, err := token.SignedString([]byte(jwtSecret))
	if err != nil {
		return "", fmt.Errorf("failed to sign token: %v", err)
	}
	return tokenString, nil
}

func Login(rw http.ResponseWriter, r *http.Request) {
	if r.Method != http.MethodPost {
		http.Error(rw, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	rw.Header().Set("Access-Control-Allow-Methods", "GET, POST, OPTIONS")

	username, password, ok := r.BasicAuth()
	if !ok {
		http.Error(rw, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if username == "" || password == "" {
		http.Error(rw, "Unauthorized", http.StatusUnauthorized)
		return
	}
	adminUser, ok := os.LookupEnv("ADMIN_USER")
	if !ok {
		fmt.Println("ADMIN_USER not set")
		http.Error(rw, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	hashedAdminPass, ok := os.LookupEnv("ADMIN_PASS_HASH")
	if !ok {
		fmt.Println("ADMIN_PASS_HASH not set")
		http.Error(rw, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	if username != adminUser {
		http.Error(rw, "Unauthorized", http.StatusUnauthorized)
		return
	}
	if err := bcrypt.CompareHashAndPassword([]byte(hashedAdminPass), []byte(password)); err != nil {
		http.Error(rw, "Unauthorized", http.StatusUnauthorized)
		return
	}
	tokenString, err := GenerateAdminJWT(username)
	if err != nil {
		http.Error(rw, "Internal Server Error", http.StatusInternalServerError)
		return
	}
	resp, err := json.Marshal(map[string]string{
		"token": tokenString,
		"role":  "admin",
	})
	if err != nil {
		http.Error(rw, "Internal Server Error", http.StatusInternalServerError)
		return
	}

	rw.Header().Set("Content-Type", "application/json")
	rw.WriteHeader(http.StatusOK)
	rw.Write([]byte(resp))
}
