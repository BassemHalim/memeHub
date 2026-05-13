package tokenBucket

import (
    "container/list"
    "context"
    "errors"
    "sync"
    "time"
)

type Task struct {
    ID        string
    Payload   interface{}
    Timestamp time.Time
}

type LeakyBucket struct {
    capacity    int
    rate        time.Duration
    queue       *list.List    // Ordered queue of tasks
    mu          sync.Mutex    // Protects queue
    processChan chan struct{} // Signals when to process next task
    stopChan    chan struct{} // Signals shutdown
    processor   func(Task) error
}

var (
    ErrBucketFull = errors.New("bucket is full")
    ErrStopped    = errors.New("bucket is stopped")
)

func NewLeakyBucket(capacity int, rate time.Duration) *LeakyBucket {
    lb := &LeakyBucket{
        capacity:    capacity,
        rate:        rate,
        queue:       list.New(),
        processChan: make(chan struct{}, capacity),
        stopChan:    make(chan struct{}),
    }
    return lb
}

func (lb *LeakyBucket) Start(ctx context.Context, processor func(Task) error) {
    lb.processor = processor
    go lb.processLoop(ctx)
}

func (lb *LeakyBucket) Stop() {
    close(lb.stopChan)
}

func (lb *LeakyBucket) AddTask(task Task) error {
    lb.mu.Lock()
    defer lb.mu.Unlock()

    if lb.queue.Len() >= lb.capacity {
        return ErrBucketFull
    }

    // Add task to queue
    lb.queue.PushBack(task)

    // Signal processor
    select {
    case lb.processChan <- struct{}{}:
    default:
    }

    return nil
}

func (lb *LeakyBucket) processLoop(ctx context.Context) {
    ticker := time.NewTicker(lb.rate)
    defer ticker.Stop()

    for {
        select {
        case <-ctx.Done():
            return
        case <-lb.stopChan:
            return
        case <-ticker.C:
            lb.processNextTask()
        }
    }
}

func (lb *LeakyBucket) processNextTask() {
    lb.mu.Lock()
    if lb.queue.Len() == 0 {
        lb.mu.Unlock()
        return
    }

    // Get next task
    element := lb.queue.Front()
    task := element.Value.(Task)
    lb.queue.Remove(element)
    lb.mu.Unlock()

    // Process task
    if err := lb.processor(task); err != nil {
        // Handle error (could implement retry logic here)
    }
}

// Helper methods for monitoring
func (lb *LeakyBucket) QueueSize() int {
    lb.mu.Lock()
    defer lb.mu.Unlock()
    return lb.queue.Len()
}

func (lb *LeakyBucket) IsEmpty() bool {
    return lb.QueueSize() == 0
}

func (lb *LeakyBucket) IsFull() bool {
    return lb.QueueSize() >= lb.capacity
}
