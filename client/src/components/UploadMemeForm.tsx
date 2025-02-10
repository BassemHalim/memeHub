"use client";

import { UploadOutlined, WarningTwoTone } from "@ant-design/icons";
import { Button, Form, Input, Modal, Select, SelectProps, Upload } from "antd";
import { useState } from "react";

export default function DialogDemo({ className }: { className?: string }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState(false);
    const [form] = Form.useForm();

    const options: SelectProps["options"] = [
        { label: "Movie", value: "Movie" },
        { label: "TV-Show", value: "TV-Show" },
        { label: "blank", value: "blank" },
    ];
    const showModal = () => {
        setIsModalOpen(true);
    };
    const submitForm = () => {
        setLoading(true);
        form.validateFields()
            .then((values) => {
                // alert(JSON.stringify(values));
                // Call API to upload meme
                let file, mimeType;
                if (values.imageFile) {
                    file = values.imageFile.file;
                    mimeType = file.type;
                } else {
                    mimeType = "image/jpeg";
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
                body.append("image", file);
                fetch(process.env.NEXT_PUBLIC_API_HOST + "/meme", {
                    method: "POST",
                    body: body,
                })
                    .then((res) => {
                        if (!res.ok) {
                            throw new Error(
                                "Failed to upload meme " + res.status
                            );
                        }
                        alert("Meme uploaded successfully!");
                        setIsModalOpen(false);
                        form.resetFields();
                    })
                    .catch((err) => {
                        console.log(err);
                        setError(true);
                        // update UI to mention failed upload
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
        setError(false);
    };
    return (
        <div className={className}>
            <button
                className="bg-gray-200 text-gray-800 p-1 px-2 py-1 rounded-lg"
                onClick={showModal}
            >
                Upload <UploadOutlined className="text-lg" />{" "}
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

                        <div className="text-center">or</div>

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
                                <Button icon={<UploadOutlined />}>
                                    Upload
                                </Button>
                            </Upload>
                        </Form.Item>
                    </Form>
                ) : (
                    <div className="text-center text-lg">
                        <WarningTwoTone
                            twoToneColor={"#cb3c71"}
                            className="text-5xl"
                        />
                        <h2 className="font-bold text-lg">
                            Failed to upload Meme
                        </h2>
                        <p>Please try again later</p>
                    </div>
                )}
            </Modal>
        </div>
    );
}
