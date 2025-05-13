export const validateImage = (file: File) => {
    return new Promise((resolve, reject) => {
        // First check MIME type (basic filter)
        if (!file.type.match("image.*")) {
            return reject("File is not an image");
        }

        // Create a FileReader to read the file
        const reader = new FileReader();

        // Set up the onload handler
        reader.onload = (e) => {
            // Create an image element
            const img = new Image();

            // Set up handlers for the image element
            img.onload = () => resolve(true); // Image loaded successfully
            img.onerror = () => reject("Invalid image file"); // Failed to load as image

            // Set the source to the file data
            img.src = e.target?.result as string;
        };

        // Handle FileReader errors
        reader.onerror = () => reject("Error reading file");

        // Read the file as a data URL
        reader.readAsDataURL(file);
    });
};
