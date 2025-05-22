package middleware

import (
	"net/http"
	"strconv"

	"github.com/prometheus/client_golang/prometheus"
)

var httpsRequestCounter *prometheus.CounterVec

func init() {
	httpsRequestCounter = prometheus.NewCounterVec(
	prometheus.CounterOpts{
		Name: "http_requests_total",
		Help: "Total number of HTTP requests",
	},
	[]string{"status", "method", "path"},
)
	prometheus.MustRegister(httpsRequestCounter)
}

type statusRecorder struct {
	http.ResponseWriter // Embed the ResponseWriter interface
	statusCode int
}

func (sr *statusRecorder) WriteHeader(code int) {
	sr.statusCode = code
	sr.ResponseWriter.WriteHeader(code)
}

func PrometheusMiddleware(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		recorder := &statusRecorder{ResponseWriter: w, statusCode: http.StatusOK}
		next.ServeHTTP(recorder, r)

		method := r.Method
		path := r.URL.Path
		status := strconv.Itoa(recorder.statusCode)
		httpsRequestCounter.WithLabelValues(status, method, path).Inc()

		// Record the status code
		httpsRequestCounter.WithLabelValues(r.Method, r.URL.Path, http.StatusText(recorder.statusCode)).Inc()
	})
}
