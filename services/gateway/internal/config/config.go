package config

import (
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
