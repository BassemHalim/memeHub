package server

import (
	"net/url"
	"strings"

	"github.com/BassemHalim/memeDB/gateway/internal/utils"
)

// returns true if the provided url is whitelisted to download from
func isWhitelisted(domain *url.URL, whitelisted_domains []string) bool {

	host := domain.Host
	for _, whitelisted := range whitelisted_domains {
		if strings.HasSuffix(host, whitelisted) {
			return true
		}
	}
	return false
}

/*
validates provided url to make sure it is
1. a valid url
2. uses https
3. is from a whitelisted domain
4. file size is < MAX_FILE_SIZE (uses a HEAD request not GET)
5. file mime type is image
*/
func (s *Server) ValidateUploadURL(memeURL string) bool {
	s.log.Debug("Validating Upload URL")
	parsed, err := url.Parse(memeURL)
	if err != nil {
		s.log.Debug("Badly formatted URL")
		return false
	}
	if parsed.Scheme != "https" {
		s.log.Debug("insecure connection HTTP")
		return false
	}
	if !isWhitelisted(parsed, s.config.WhitelistedDomains) {
		s.log.Debug("Not whitelisted", "URL", parsed)
		return false
	}

	if !utils.ValidateImageContent(memeURL, s.client) {
		s.log.Debug("Invalid file content")
		return false
	}
	return true
}
