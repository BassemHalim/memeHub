package queue_test

import (
	"fmt"
	"os"
	"testing"
	"time"

	"github.com/BassemHalim/memeDB/queue"
)


func TestPublish(t *testing.T) {
	q, err := queue.NewMemeQueue(os.Getenv("RABBIT_MQ_URL"))
	if err != nil {
		t.Error(err)
		return
	}
	defer q.Close()
	err = q.Publish("Hello world")
	if err != nil {
		t.Error(err)

	}

}

func TestConsume(t *testing.T){
	q, err := queue.NewMemeQueue(os.Getenv("RABBIT_MQ_URL"))
	if err != nil {
		t.Error(err)
		return
	}
	defer q.Close()
	msgs, err :=q.Consume()
	if err != nil{
		t.Error("Failed to consume" , err)
	}
	i := 0
	for msg := range msgs{
		i++
		fmt.Println(string(msg.Body))
		msg.Ack(false)
		if (i == 1){
			break
		}
		time.Sleep(4 * time.Second)
	}
	fmt.Println("Done Processing msgs")
}