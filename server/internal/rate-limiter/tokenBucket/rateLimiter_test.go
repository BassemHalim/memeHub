package tokenBucket

import (
	"context"
	"log"
	"testing"
	"time"
)

func TestBasic(t *testing.T) {
	l := NewLeakyBucket(10, 1)
	l.Start(context.Background(), func(t Task) error {
		log.Println("Processing task ID: ", t.ID, " Timestamp: ", t.Timestamp, "Payload: ", t.Payload)
		return nil
	})
	defer l.Stop()

	task := Task{
		ID:        "1",
		Payload:   "test",
		Timestamp: time.Now(),
	}
	if err := l.AddTask(task); err != nil {
		t.Errorf("Failed to queue task")
	}
	time.Sleep(1 * time.Second)

}

func TestLimit(t *testing.T) {
	l := NewLeakyBucket(2, 1)
	l.Start(context.Background(), func(t Task) error {
		log.Println("Processing task ID: ", t.ID, " Timestamp: ", t.Timestamp, "Payload: ", t.Payload)
		return nil
	})
	defer l.Stop()

	t1 := Task{
		ID:        "1",
		Payload:   "test",
		Timestamp: time.Now(),
	}
	t2 := Task{
		ID:        "2",
		Payload:   "test2",
		Timestamp: time.Now(),
	}
	t3 := Task{
		ID:        "3",
		Payload:   "should be blocked",
		Timestamp: time.Now(),
	}
	l.AddTask(t1)
	l.AddTask(t2)
	if err := l.AddTask(t3); err == nil {
		t.Errorf("This task should have been blocked")
	}
	time.Sleep(1 * time.Second)
}

func TestQueueSize(t *testing.T) {
	l := NewLeakyBucket(2, 1*time.Second)
	l.Start(context.Background(), func(t Task) error {
		log.Println("Processing task ID: ", t.ID, " Timestamp: ", t.Timestamp, "Payload: ", t.Payload)
		return nil
	})
	defer l.Stop()

	t1 := Task{
		ID:        "1",
		Payload:   "test",
		Timestamp: time.Now(),
	}
	t2 := Task{
		ID:        "2",
		Payload:   "test2",
		Timestamp: time.Now(),
	}
	l.AddTask(t1)
	l.AddTask(t2)
	if l.QueueSize() != 2 {
		t.Errorf("Queue size should be 2")
	}
	time.Sleep(2 * time.Second)
	if !l.IsEmpty() {
		t.Errorf("The queue should be empty now")
	}
}
