package config

import (
	"crypto/tls"
	"crypto/x509"
	"encoding/json"
	"fmt"
	"os"

	"google.golang.org/grpc/credentials"
)

type Config struct {
	WhitelistedDomains []string `json:"whitelisted_domains"`
	MaxUploadSize      int64    `json:"max_upload_size"`
	Port               int32    `json:"port"`
	TokenRate          int32    `json:"rate_limit"`
	BurstRate          int32    `json:"burst_rate"`
	LogLevel           int8     `json:"log_level"`
	Credentials        credentials.TransportCredentials
}

func NewConfig() (*Config, error) {
	var conf = &Config{}
	err := conf.loadConfigFile()
	if err != nil {
		return nil, err
	}
	
	return conf, nil
}

// loads config from 'config.json'
func (c *Config) loadConfigFile() error {
	data, err := os.ReadFile("config.json")
	if err != nil {
		return fmt.Errorf("error reading config file: %v", err)
	}
	var cfg = Config{}
	if err := json.Unmarshal(data, &cfg); err != nil {
		return fmt.Errorf("error parsing config: %v", err)
	}
	*c = cfg

	return nil
}

func loadTLSCredentials() (credentials.TransportCredentials, error) {
	// Load certificate of the CA who signed server's certificate

	pemServerCA, err := os.ReadFile("cert/ca-cert.pem")
	if err != nil {
		return nil, err
	}

	certPool := x509.NewCertPool()
	if !certPool.AppendCertsFromPEM(pemServerCA) {
		return nil, fmt.Errorf("failed to add server CA's certificate")
	}

	// Create the credentials and return it
	config := &tls.Config{
		RootCAs: certPool,
	}

	return credentials.NewTLS(config), nil
}
