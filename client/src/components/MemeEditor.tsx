// "use client"

// import type React from "react"

// import { useState, useRef, useEffect, useCallback } from "react"
// import { Button } from "@/components/ui/button"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Slider } from "@/components/ui/slider"
// import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
// import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
// import { Trash2, Plus, Download, Upload, Move } from "lucide-react"

// interface TextElement {
//   id: string
//   text: string
//   x: number
//   y: number
//   fontSize: number
//   fontFamily: string
//   color: string
//   isDragging: boolean
// }

// export default function PhotoEditor() {
//   const [image, setImage] = useState<string | null>(null)
//   const [textElements, setTextElements] = useState<TextElement[]>([])
//   const [selectedElement, setSelectedElement] = useState<string | null>(null)
//   const canvasRef = useRef<HTMLCanvasElement>(null)
//   const fileInputRef = useRef<HTMLInputElement>(null)
//   const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 })
//   const [backgroundImage, setBackgroundImage] = useState<HTMLImageElement | null>(null)
//   const overlayCanvasRef = useRef<HTMLCanvasElement>(null)

//   // Handle image upload
//   const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0]
//     if (file) {
//       const reader = new FileReader()
//       reader.onload = (event) => {
//         const img = new Image()
//         img.onload = () => {
//           const maxWidth = 800
//           const maxHeight = 600
//           let width = img.width
//           let height = img.height

//           if (width > maxWidth) {
//             height = (height * maxWidth) / width
//             width = maxWidth
//           }

//           if (height > maxHeight) {
//             width = (width * maxHeight) / height
//             height = maxHeight
//           }

//           setCanvasSize({ width, height })
//           setBackgroundImage(img)
//           setImage(event.target?.result as string)
//         }
//         img.src = event.target?.result as string
//       }
//       reader.readAsDataURL(file)
//     }
//   }

//   // Add new text element
//   const addTextElement = () => {
//     const newElement: TextElement = {
//       id: `text-${Date.now()}`,
//       text: "Edit this text",
//       x: canvasSize.width / 2,
//       y: canvasSize.height / 2,
//       fontSize: 24,
//       fontFamily: "Arial",
//       color: "#000000",
//       isDragging: false,
//     }
//     setTextElements([...textElements, newElement])
//     setSelectedElement(newElement.id)
//   }

//   // Delete text element
//   const deleteTextElement = (id: string) => {
//     setTextElements(textElements.filter((el) => el.id !== id))
//     if (selectedElement === id) {
//       setSelectedElement(null)
//     }
//   }

//   // Update text element properties
//   const updateTextElement = (id: string, updates: Partial<TextElement>) => {
//     setTextElements(textElements.map((el) => (el.id === id ? { ...el, ...updates } : el)))
//   }

//   // Handle mouse events for dragging
//   const handleMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
//     if (!overlayCanvasRef.current) return

//     const rect = overlayCanvasRef.current.getBoundingClientRect()
//     const x = e.clientX - rect.left
//     const y = e.clientY - rect.top

//     // Check if click is on any text element
//     for (let i = textElements.length - 1; i >= 0; i--) {
//       const el = textElements[i]
//       const ctx = overlayCanvasRef.current.getContext("2d")
//       if (!ctx) continue

//       ctx.font = `${el.fontSize}px ${el.fontFamily}`
//       const metrics = ctx.measureText(el.text)
//       const height = el.fontSize

//       if (x >= el.x - 5 && x <= el.x + metrics.width + 5 && y >= el.y - height && y <= el.y + 5) {
//         // Start dragging this element
//         updateTextElement(el.id, { isDragging: true })
//         setSelectedElement(el.id)
//         return
//       }
//     }

//     // If click is not on any element, deselect
//     setSelectedElement(null)
//   }

//   const handleMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
//     if (!overlayCanvasRef.current) return

//     const rect = overlayCanvasRef.current.getBoundingClientRect()
//     const x = e.clientX - rect.left
//     const y = e.clientY - rect.top

//     // Update position of dragged element
//     setTextElements((prevElements) =>
//       prevElements.map((el) => {
//         if (el.isDragging) {
//           return { ...el, x, y }
//         }
//         return el
//       }),
//     )
//   }

//   const handleMouseUp = () => {
//     // Stop dragging all elements
//     setTextElements(
//       textElements.map((el) => {
//         if (el.isDragging) {
//           return { ...el, isDragging: false }
//         }
//         return el
//       }),
//     )
//   }

//   // Save the image
//   const saveImage = () => {
//     if (!canvasRef.current) return

//     // Create a temporary link and trigger download
//     const link = document.createElement("a")
//     link.download = "edited-image.png"
//     link.href = canvasRef.current.toDataURL("image/png")
//     link.click()
//   }

//   const drawBackgroundImage = useCallback(
//     (ctx: CanvasRenderingContext2D) => {
//       if (backgroundImage) {
//         ctx.drawImage(backgroundImage, 0, 0, canvasSize.width, canvasSize.height)
//       } else {
//         ctx.fillStyle = "#f3f4f6"
//         ctx.fillRect(0, 0, canvasSize.width, canvasSize.height)
//         ctx.fillStyle = "#9ca3af"
//         ctx.font = "16px Arial"
//         ctx.textAlign = "center"
//         ctx.fillText("Upload an image to get started", canvasSize.width / 2, canvasSize.height / 2)
//       }
//     },
//     [backgroundImage, canvasSize.height, canvasSize.width],
//   )

//   const drawTextElements = useCallback(
//     (ctx: CanvasRenderingContext2D) => {
//       textElements.forEach((el) => {
//         ctx.font = `${el.fontSize}px ${el.fontFamily}`
//         ctx.fillStyle = el.color
//         ctx.textAlign = "left"
//         ctx.fillText(el.text, el.x, el.y)
//       })
//     },
//     [textElements],
//   )

//   // Draw everything on canvas
//   useEffect(() => {
//     if (!canvasRef.current || !overlayCanvasRef.current) return

//     const canvas = canvasRef.current
//     const ctx = canvas.getContext("2d")
//     if (!ctx) return

//     const overlayCanvas = overlayCanvasRef.current
//     const overlayCtx = overlayCanvas.getContext("2d")
//     if (!overlayCtx) return

//     // Clear both canvases
//     ctx.clearRect(0, 0, canvas.width, canvas.height)
//     overlayCtx.clearRect(0, 0, overlayCanvas.width, overlayCanvas.height)

//     // Draw background image
//     drawBackgroundImage(ctx)

//     // Draw text elements
//     drawTextElements(ctx)

//     // Draw selection box on overlay canvas
//     if (selectedElement) {
//       const element = textElements.find((el) => el.id === selectedElement)
//       if (element) {
//         overlayCtx.font = `${element.fontSize}px ${element.fontFamily}`
//         const metrics = overlayCtx.measureText(element.text)
//         const height = element.fontSize

//         overlayCtx.strokeStyle = "#3b82f6"
//         overlayCtx.lineWidth = 2
//         overlayCtx.strokeRect(element.x - 5, element.y - height, metrics.width + 10, height + 10)
//       }
//     }
//   }, [textElements, selectedElement, drawBackgroundImage, drawTextElements])

//   // Get the selected element
//   const selectedTextElement = textElements.find((el) => el.id === selectedElement)

//   return (
//     <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
//       <div className="lg:col-span-2">
//         <Card className="w-full">
//           <CardHeader>
//             <CardTitle>Canvas</CardTitle>
//           </CardHeader>
//           <CardContent className="flex justify-center">
//             <div className="relative border border-gray-200 rounded-md overflow-hidden">
//               <canvas ref={canvasRef} width={canvasSize.width} height={canvasSize.height} className="touch-none" />
//               <canvas
//                 ref={overlayCanvasRef}
//                 width={canvasSize.width}
//                 height={canvasSize.height}
//                 className="absolute top-0 left-0 touch-none"
//                 onMouseDown={handleMouseDown}
//                 onMouseMove={handleMouseMove}
//                 onMouseUp={handleMouseUp}
//                 onMouseLeave={handleMouseUp}
//               />
//               {selectedElement && (
//                 <div className="absolute bottom-2 right-2 bg-white/80 p-2 rounded-md text-xs">
//                   <Move className="h-4 w-4 inline-block mr-1" /> Drag to move text
//                 </div>
//               )}
//             </div>
//           </CardContent>
//           <CardFooter className="flex justify-between">
//             <Button onClick={() => fileInputRef.current?.click()} variant="outline">
//               <Upload className="h-4 w-4 mr-2" />
//               Upload Image
//             </Button>
//             <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" className="hidden" />
//             <Button onClick={saveImage} disabled={!image}>
//               <Download className="h-4 w-4 mr-2" />
//               Save Image
//             </Button>
//           </CardFooter>
//         </Card>
//       </div>

//       <div>
//         <Card className="w-full">
//           <CardHeader>
//             <CardTitle>Text Elements</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             <Button onClick={addTextElement} className="w-full">
//               <Plus className="h-4 w-4 mr-2" />
//               Add Text
//             </Button>

//             {textElements.length === 0 && (
//               <div className="text-center py-4 text-muted-foreground">No text elements added yet</div>
//             )}

//             {textElements.map((element) => (
//               <Card
//                 key={element.id}
//                 className={`p-3 ${selectedElement === element.id ? "border-primary" : ""}`}
//                 onClick={() => setSelectedElement(element.id)}
//               >
//                 <div className="flex justify-between items-center mb-2">
//                   <div
//                     className="font-medium truncate"
//                     style={{
//                       color: element.color,
//                       fontFamily: element.fontFamily,
//                       fontSize: `${Math.min(element.fontSize, 24)}px`,
//                     }}
//                   >
//                     {element.text || "Text"}
//                   </div>
//                   <Button variant="ghost" size="icon" onClick={() => deleteTextElement(element.id)}>
//                     <Trash2 className="h-4 w-4" />
//                   </Button>
//                 </div>
//               </Card>
//             ))}
//           </CardContent>
//         </Card>

//         {selectedTextElement && (
//           <Card className="w-full mt-4">
//             <CardHeader>
//               <CardTitle>Edit Text</CardTitle>
//             </CardHeader>
//             <CardContent className="space-y-4">
//               <div className="space-y-2">
//                 <Label htmlFor="text-content">Text Content</Label>
//                 <Input
//                   id="text-content"
//                   value={selectedTextElement.text}
//                   onChange={(e) => updateTextElement(selectedTextElement.id, { text: e.target.value })}
//                 />
//               </div>

//               <div className="space-y-2">
//                 <Label htmlFor="font-family">Font Family</Label>
//                 <Select
//                   value={selectedTextElement.fontFamily}
//                   onValueChange={(value) => updateTextElement(selectedTextElement.id, { fontFamily: value })}
//                 >
//                   <SelectTrigger>
//                     <SelectValue placeholder="Select font" />
//                   </SelectTrigger>
//                   <SelectContent>
//                     <SelectItem value="Arial">Arial</SelectItem>
//                     <SelectItem value="Verdana">Verdana</SelectItem>
//                     <SelectItem value="Times New Roman">Times New Roman</SelectItem>
//                     <SelectItem value="Courier New">Courier New</SelectItem>
//                     <SelectItem value="Georgia">Georgia</SelectItem>
//                     <SelectItem value="Comic Sans MS">Comic Sans MS</SelectItem>
//                   </SelectContent>
//                 </Select>
//               </div>

//               <div className="space-y-2">
//                 <Label htmlFor="font-size">Font Size: {selectedTextElement.fontSize}px</Label>
//                 <Slider
//                   id="font-size"
//                   min={8}
//                   max={72}
//                   step={1}
//                   value={[selectedTextElement.fontSize]}
//                   onValueChange={(value) => updateTextElement(selectedTextElement.id, { fontSize: value[0] })}
//                 />
//               </div>

//               <div className="space-y-2">
//                 <Label htmlFor="text-color">Text Color</Label>
//                 <div className="flex items-center gap-2">
//                   <Input
//                     id="text-color"
//                     type="color"
//                     value={selectedTextElement.color}
//                     onChange={(e) => updateTextElement(selectedTextElement.id, { color: e.target.value })}
//                     className="w-12 h-8 p-1"
//                   />
//                   <Input
//                     value={selectedTextElement.color}
//                     onChange={(e) => updateTextElement(selectedTextElement.id, { color: e.target.value })}
//                     className="flex-1"
//                   />
//                 </div>
//               </div>

//               <div className="space-y-2">
//                 <Label>Position</Label>
//                 <div className="grid grid-cols-2 gap-2">
//                   <div className="space-y-1">
//                     <Label htmlFor="position-x" className="text-xs">
//                       X: {Math.round(selectedTextElement.x)}
//                     </Label>
//                     <Slider
//                       id="position-x"
//                       min={0}
//                       max={canvasSize.width}
//                       step={1}
//                       value={[selectedTextElement.x]}
//                       onValueChange={(value) => updateTextElement(selectedTextElement.id, { x: value[0] })}
//                     />
//                   </div>
//                   <div className="space-y-1">
//                     <Label htmlFor="position-y" className="text-xs">
//                       Y: {Math.round(selectedTextElement.y)}
//                     </Label>
//                     <Slider
//                       id="position-y"
//                       min={0}
//                       max={canvasSize.height}
//                       step={1}
//                       value={[selectedTextElement.y]}
//                       onValueChange={(value) => updateTextElement(selectedTextElement.id, { y: value[0] })}
//                     />
//                   </div>
//                 </div>
//               </div>
//             </CardContent>
//           </Card>
//         )}
//       </div>
//     </div>
//   )
// }

