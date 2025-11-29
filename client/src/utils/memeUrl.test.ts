import { memePagePath } from "./memeUrl";

describe("memePagePath", () => {
    it("returns root path for null meme", () => {
        expect(memePagePath(null as any)).toBe("/");
    });

    it("generates correct URL for meme with name", () => {
        const meme = { id: "12345", name: "Funny Meme Name", tags: [] } as any;
        expect(memePagePath(meme)).toBe("/meme/12345/Funny-Meme-Name");
    });

    it("generates URL using first tag when name is empty", () => {
        const meme = { id: "12345", name: "", tags: ["funny"] } as any;
        expect(memePagePath(meme)).toBe("/meme/12345/funny");
    });

     it("generates URL using first tag when sanitized name is empty", () => {
        const meme = { id: "12345", name: "🤡", tags: ["funny"] } as any;
        expect(memePagePath(meme)).toBe("/meme/12345/funny");
    });

    it("generates URL with 'meme' tag when name and tags are empty", () => {
        const meme = { id: "12345", name: "", tags: [] } as any;
        expect(memePagePath(meme)).toBe("/meme/12345/meme");
    });

    it("encodes special characters in slug", () => {
        const meme = { id: "12345", name: "Meme & Fun!", tags: [] } as any;
        expect(memePagePath(meme)).toBe("/meme/12345/Meme-Fun");
    });

    it("handles non-Latin characters correctly", () => {
        const meme = { id: "12345", name: "مضحك ميم", tags: [] } as any;
        expect(memePagePath(meme)).toBe(`/meme/12345/${encodeURIComponent("مضحك-ميم")}`);
    });
});