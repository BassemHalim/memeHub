package leakyBucket

import (
	"fmt"
	"sync"
	"time"
)

type leakyBucket struct {
	capacity int
	water    int
	rate     int // token / sec
	lastLeak time.Time
	stop     chan bool
	mu       sync.Mutex
}

func NewRateLimiter(capacity int, rate int) *leakyBucket {

	rl := &leakyBucket{
		capacity: capacity,
		water:    0,
		rate:     rate,
		lastLeak: time.Now(),
		stop:     make(chan bool),
	}
	rl.Start()
	return rl
}

func (b *leakyBucket) Start() {
	ticker := time.NewTicker(time.Second)

	go func() {
		defer ticker.Stop()
		for {
			select {
			case <-b.stop:
				return
			case <-ticker.C: // block until next tick
				b.Leak()
			}
		}
	}()

}
func (b *leakyBucket) Stop() {
	b.stop <- true
}

func (b *leakyBucket) Leak() {
	fmt.Println("processing queue")
	currTime := time.Now()
	elapsed := currTime.Sub(b.lastLeak)
	leaked := int(elapsed.Seconds()) * b.rate
	if leaked > 0 {
		b.mu.Lock()
		defer b.mu.Unlock()
		b.water -= leaked
		b.lastLeak = currTime
	}
}

func (b *leakyBucket) AllowRequest() bool {
	b.mu.Lock()
	defer b.mu.Unlock()
	if b.water >= b.capacity {
		// reject request
		return false
	}
	b.water++
	return true

}
