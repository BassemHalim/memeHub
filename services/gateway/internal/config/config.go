package config

import (
	"fmt"

	"github.com/fsnotify/fsnotify"
	"github.com/spf13/viper"
	"google.golang.org/grpc/credentials"
)

type Config struct {
	WhitelistedDomains []string `json:"whitelisted_domains"`
	ApplicationDomains []string `json:"application_domains"`
	MaxUploadSize      int64    `json:"max_upload_size"`
	Port               int32    `json:"port"`
	TokenRate          int32    `json:"rate_limit"`
	BurstRate          int32    `json:"burst_rate"`
	LogLevel           int8     `json:"log_level"`
	Credentials        credentials.TransportCredentials
}

func NewConfig() (*Config, error) {
	var conf = loadViperConfig()
	conf.PrintConfig()
	viper.OnConfigChange(func(e fsnotify.Event) {

		fmt.Println("Config file changed:", e.Name)
		conf = loadViperConfig()
		conf.PrintConfig()

	})
	viper.WatchConfig()
	return conf, nil
}

func (c *Config) PrintConfig() {
	fmt.Println("--------------------Config--------------------")
	fmt.Printf("Whitelisted Domains:  %v\n", c.WhitelistedDomains)
	fmt.Printf("Application Domains:  %v\n", c.ApplicationDomains)
	fmt.Printf("Max Upload Size:      %d\n", c.MaxUploadSize)
	fmt.Printf("Port:                 %d\n", c.Port)
	fmt.Printf("Token Rate:           %d\n", c.TokenRate)
	fmt.Printf("Burst Rate:           %d\n", c.BurstRate)
	fmt.Printf("Log Level:            %d\n", c.LogLevel)
	fmt.Println("---------------------------------------------")
}
func loadViperConfig() *Config {
	viper.SetConfigFile("config.yaml")
	viper.SetConfigType("yaml")
	err := viper.ReadInConfig()
	if err != nil {
		panic(fmt.Errorf("fatal error config file: %w", err))
	}
	viper.SetDefault("max_upload_size", 2000000) // 2 MB
	viper.SetDefault("port", 8080)
	viper.SetDefault("rate_limit", 100)
	viper.SetDefault("burst_rate", 10)
	viper.SetDefault("log_level", 1)
	viper.SetDefault("whitelisted_domains", []string{"gstatic.com"})
	viper.SetDefault("application_domains", []string{"localhost", "qasrelmemez.com"})
	cfg := Config{
		WhitelistedDomains: viper.GetStringSlice("whitelisted_domains"),
		ApplicationDomains: viper.GetStringSlice("application_domains"),
		MaxUploadSize:      viper.GetInt64("max_upload_size"),
		Port:               int32(viper.GetInt("port")),
		TokenRate:          int32(viper.GetInt("rate_limit")),
		BurstRate:          int32(viper.GetInt("burst_rate")),
		LogLevel:           int8(viper.GetInt("log_level")),
	}

	return &cfg
}
