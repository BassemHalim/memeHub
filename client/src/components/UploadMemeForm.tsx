"use client";

import { UploadOutlined } from "@ant-design/icons";
import { Button, Form, Input, Modal, Select, SelectProps, Upload } from "antd";
import { useState } from "react";

export default function DialogDemo({ className }: { className?: string }) {
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [loading, setLoading] = useState(false);
    const [form] = Form.useForm();

    const options: SelectProps["options"] = [
        { label: "tag1", value: "tag1" },
        { label: "tag2", value: "tag2" },
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
                    .then(() => {
                        alert("Meme uploaded successfully!");
                        setIsModalOpen(false);
                        form.resetFields();
                    })
                    .catch((err) => {
                        console.error(err);
                    });
                setLoading(false);
            })
            .catch(() => {
                setLoading(false);
            });
    };
    const handleCancel = () => {
        setIsModalOpen(false);
    };
    return (
        <div className={className}>
            <button onClick={showModal}> Upload Meme</button>
            <Modal
                title="Basic Modal"
                open={isModalOpen}
                confirmLoading={loading}
                onOk={submitForm}
                onCancel={handleCancel}
                footer={[
                    <Button key="back" onClick={handleCancel}>
                        Cancel
                    </Button>,
                    <Button
                        key="submit"
                        type="primary"
                        loading={loading}
                        onClick={submitForm}
                    >
                        Submit
                    </Button>,
                ]}
            >
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
                        label="Tags"
                        name="tags"
                        rules={[
                            {
                                required: true,
                                message: "Please select at least one tag!",
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
                            <Button icon={<UploadOutlined />}>Upload</Button>
                        </Upload>
                    </Form.Item>
                </Form>
            </Modal>
        </div>
    );
}
