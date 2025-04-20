package meme

type UploadRequest struct {
	Name      string   `json:"name" validate:"required"`
	MediaURL  string   `json:"media_url,omitempty" validate:"omitempty,url"`
	MimeType  string   `json:"mime_type,omitempty"`
	Tags      []string `json:"tags" validate:"required"`
	ImageData []byte   `json:"image,omitempty" validate:"omitempty,datauri"`
}
type AddTagsRequest struct{
	Tags []string `json:"tags" validate:"required"`
}

type PatchRequest struct {
	Name      string   `json:"name,omitempty" validate:"omitempty"`
	MediaURL  string   `json:"media_url,omitempty" validate:"omitempty,url"`
	MimeType  string   `json:"mime_type,omitempty"`
	Tags      []string `json:"tags,omitempty" validate:"omitempty"`
	ImageData []byte   `json:"image,omitempty" validate:"omitempty,datauri"`
}