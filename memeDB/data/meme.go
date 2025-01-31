package data

type Tag struct {
	ID   string
	name string
}
type Meme struct {
	ID    string
	Image Image
	Tags  []Tag
}

func NewMeme(image Image, )*Meme{
	return &Meme{
		Image: image,
		
}
func SaveMeme(m *Meme)error{

	
}