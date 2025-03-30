package queue

import (
	"context"
	"crypto/tls"
	"encoding/json"
	"time"

	amqp "github.com/rabbitmq/amqp091-go"
)

type MemeQueue struct {
	conn  *amqp.Connection
	ch    *amqp.Channel
	queue amqp.Queue
}

type MemeUploadRequest struct {
	Name      string   `json:"name" validate:"required"`
	MediaURL  string   `json:"media_url,omitempty" validate:"omitempty,url"`
	MimeType  string   `json:"mime_type,omitempty"`
	Tags      []string `json:"tags" validate:"required"`
	ImageData []byte   `json:"image,omitempty" validate:"omitempty,datauri"`
}

func NewMemeQueue(url string) (MemeQueue, error) {
	conn, err := amqp.DialTLS(url, &tls.Config{InsecureSkipVerify: false})
	if err != nil {
		return MemeQueue{}, err
	}
	ch, err := conn.Channel()
	if err != nil {
		conn.Close()
		return MemeQueue{}, err
	}
	q, err := ch.QueueDeclare(
		"meme_queue", // name
		true,         // durable
		false,        // delete when unused
		false,        // exclusive
		false,        // no-wait
		nil,          // arguments
	)
	if err != nil || q.Name != "meme_queue" {
		ch.Close()
		conn.Close()
		return MemeQueue{}, err
	}

	return MemeQueue{conn: conn, ch: ch, queue: q}, nil

}

func (mq *MemeQueue) Close() {
	if mq.ch != nil {
		mq.ch.Close()
	}
	if mq.conn != nil {
		mq.conn.Close()
	}
}

func (mq *MemeQueue) PublishMeme(Meme MemeUploadRequest) error {

	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	body, err := json.Marshal(Meme)
	if err != nil {
		return err
	}

	err = mq.ch.PublishWithContext(ctx,
		"",
		mq.queue.Name,
		false,
		false,
		amqp.Publishing{
			ContentType: "application/json",
			Body:        []byte(body),
		})
	return err
}

func (mq *MemeQueue) Publish(any any) error {
	ctx, cancel := context.WithTimeout(context.Background(), 5*time.Second)
	defer cancel()

	body, err := json.Marshal(any)
	if err != nil {
		return err
	}

	err = mq.ch.PublishWithContext(ctx,
		"",
		mq.queue.Name,
		false,
		false,
		amqp.Publishing{
			ContentType: "application/json",
			Body:        []byte(body),
		})
	return err
}

func (mq *MemeQueue) Consume() (<-chan amqp.Delivery, error) {

	msgs, err := mq.ch.Consume(
		mq.queue.Name, // queue name
		"",            // consumer tag
		false,         // auto-ack
		false,         // exclusive
		false,         // no-local
		false,         // no-wait
		nil,           // args
	)
	if err != nil {
		return nil, err
	}
	return msgs, err
}
