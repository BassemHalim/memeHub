"use client";

import { sendGTMEvent } from "@next/third-parties/google";
import { Button, Form, Input, Modal, Select, SelectProps, Upload } from "antd";
import { TriangleAlert, Upload as UploadIcon } from "lucide-react";
import { useState } from "react";
export default function DialogDemo({ className }: { className?: string }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");
    const [form] = Form.useForm();

    const options: SelectProps["options"] = [
        { label: "Movie", value: "Movie" },
        { label: "TV-Show", value: "TV-Show" },
        { label: "Play", value: "Play" },
        { label: "blank", value: "blank" },
    ];
    const showModal = () => {
        setIsModalOpen(true);
        sendGTMEvent({ event: "meme-upload" });
    };
    const submitForm = () => {
        setLoading(true);
        form.validateFields()
            .then((values) => {
                // Call API to upload meme
                let file: File | undefined, mimeType;
                if (values.imageFile) {
                    file = values.imageFile.file;
                    if (file) {
                        if (file.size > 2 * 1024 * 1024) {
                            setError("Image is too big");
                            throw new Error("Upload file too large");
                        }
                        mimeType = file.type;
                    }
                } else {
                    mimeType = "image/jpeg";
                }
                if (!file && !values.imageUrl) {
                    setError("You must upload an image either a url or file");
                    throw new Error("Missing media");
                }
                const body: FormData = new FormData();
                body.append(
                    "meme",
                    JSON.stringify({
                        name: values.name,
                        media_url: values.imageUrl,
                        mime_type: mimeType,
                        tags: values.tags,
                    })
                );
                if (file) {
                    body.append("image", file);
                }
                const endpoint = new URL(
                    "/api/meme",
                    process.env.NEXT_PUBLIC_API_HOST
                );
                fetch(endpoint, {
                    method: "POST",
                    body: body,
                })
                    .then(async (res) => {
                        if (!res.ok) {
                            const errorData = await res.text();
                            throw new Error(
                                "Failed to upload meme " + errorData
                            );
                        }
                        setIsModalOpen(false);
                        form.resetFields();
                    })
                    .catch((err: Error) => {
                        console.log(err);
                        setError(err.message);
                    });
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    };
    const handleCancel = () => {
        form.resetFields();
        setIsModalOpen(false);
        setError("");
    };
    return (
        <div className={className}>
            <button
                className="bg-gray-200 text-gray-800 p-1 px-2 py-1 rounded-lg flex justify-center items-center gap-2"
                onClick={showModal}
            >
                Upload <UploadIcon />
            </button>
            <Modal
                title="Upload Meme"
                open={isModalOpen}
                confirmLoading={loading}
                onOk={submitForm}
                onCancel={handleCancel}
                footer={[
                    <Button key="back" onClick={handleCancel}>
                        Cancel
                    </Button>,
                    !error ? (
                        <Button
                            key="submit"
                            type="primary"
                            loading={loading}
                            onClick={submitForm}
                        >
                            Submit
                        </Button>
                    ) : null,
                ]}
            >
                {!error ? (
                    <Form
                        form={form}
                        onFinish={submitForm}
                        layout="vertical"
                        initialValues={{
                            name: "",
                            tags: [],
                            imageUrl: "",
                            imageFile: undefined,
                        }}
                    >
                        <Form.Item
                            label="Name"
                            name="name"
                            rules={[
                                {
                                    required: true,
                                    message: "Please input a meme name",
                                },
                            ]}
                        >
                            <Input placeholder="Enter meme name" />
                        </Form.Item>

                        <Form.Item
                            help="Include as many tags as you can (such as movie/show name, actor/actress relevant text etc.) to simplify searching for that meme"
                            label="Tags"
                            name="tags"
                            rules={[
                                {
                                    required: true,
                                    message: "Please select at least one tag",
                                },
                            ]}
                        >
                            <Select
                                mode="tags"
                                style={{ width: "100%" }}
                                placeholder="Add tags..."
                                options={options}
                            />
                        </Form.Item>

                        <Form.Item
                            label="Image URL"
                            name="imageUrl"
                            rules={[{ type: "url", message: "Invalid URL" }]}
                        >
                            <Input />
                        </Form.Item>
                        <Form.Item>
                            <div className="flex justify-around items-center px-4">
                                <div className="h-px border-0 w-2/5 bg-gray-300"></div>
                                <div className="text-center mx-2">or</div>
                                <div className="h-px border-0 w-2/5 bg-gray-300"></div>
                            </div>
                        </Form.Item>

                        <Form.Item
                            label="Upload Image"
                            name="imageFile"
                            valuePropName="imagFile"
                        >
                            <Upload
                                maxCount={1}
                                accept="image/*"
                                beforeUpload={() => false}
                            >
                                <Button icon={<UploadIcon size={20} />}>
                                    Upload
                                </Button>
                            </Upload>
                        </Form.Item>
                    </Form>
                ) : (
                    <div className="text-center">
                        <TriangleAlert
                            size={100}
                            className="mx-auto"
                            color="#cb3c71"
                        />

                        <h2 className="font-bold text-lg">
                            Failed to upload Meme
                        </h2>
                        <p>
                            This is likely because you used a bad image url.
                            <br />
                            Try uploading the image instead of its url
                            <br />
                            Error: {error}
                        </p>
                    </div>
                )}
            </Modal>
        </div>
    );
}
