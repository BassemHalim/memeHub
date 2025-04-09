export function DeleteMeme(id: string, token: string) {
    if (!id || !token) {
        console.error("Missing id or token");
        return;
    }
    alert(`Delete meme ${id} with token ${token}`);
    const headers = new Headers();
    headers.append("Authorization", "Bearer " + token);

    const requestOptions = {
        method: "DELETE",
        headers: headers,
    };

    fetch(`/api/admin/meme/${id}`, requestOptions)
        .then((response) => response.text())
        .then((result) => console.log(result))
        .catch((error) => console.error(error));
}
