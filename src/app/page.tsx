"use client";

import { useEffect, useState } from "react";
import { LoadingIcon } from "@/components/LoadingIcon";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  checkStatus,
  generate,
  generate_img,
  generate_img_with_controlnet,
  getUploadUrl,
} from "@/server/generate";

import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectLabel,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

import ImageGenerationResult from "@/components/ImageGenerationResult"; 
// <-- Import default from the new file

// -------------------------------------------------------------------
// ------------------ Main Page Component ----------------------------
// -------------------------------------------------------------------

export default function Page() {
  // Start the user with 500 credits
  const [credits, setCredits] = useState(500);

  return (
    <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-r from-black via-gray-900 to-black text-white py-10 px-4 sm:px-6 lg:px-8">
      {/* Top Title */}
      <h1 className="text-3xl md:text-4xl font-extrabold mb-2 text-pink-500">
        Pixio API Next JS Example
      </h1>

      {/* Credits Display */}
      <p className="text-lg mb-8 text-purple-300">
        Credits Remaining: <span className="font-semibold">{credits}</span>
      </p>

      <Tabs defaultValue="txt2img" className="w-full max-w-5xl">
        {/* Tabs List */}
        <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-md shadow-lg shadow-purple-500/40">
          <TabsTrigger value="txt2img" className="text-white font-semibold">
            Workflow 1
          </TabsTrigger>
          <TabsTrigger value="img2img" className="text-white font-semibold">
            Workflow 2
          </TabsTrigger>
          <TabsTrigger value="controlpose" className="text-white font-semibold">
            Workflow 3
          </TabsTrigger>
        </TabsList>

        {/* Tabs Content */}
        <TabsContent value="txt2img">
          {/* Pass credits + setter to each workflow so they can deduct */}
          <Txt2img credits={credits} setCredits={setCredits} />
        </TabsContent>
        <TabsContent value="img2img">
          <Img2img credits={credits} setCredits={setCredits} />
        </TabsContent>
        <TabsContent value="controlpose">
          <OpenposeToImage credits={credits} setCredits={setCredits} />
        </TabsContent>
      </Tabs>
    </main>
  );
}

// --------------------------------------------------------------
// ------------------ Txt2img Component -------------------------
// --------------------------------------------------------------

/**
 * txt2img generates 2 images per click => 2 * 50 = 100 credits
 */
function Txt2img({
  credits,
  setCredits,
}: {
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [positivePrompt, setPositivePrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [runIds, setRunIds] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Check if user has enough credits
    if (credits < 100) {
      alert("Not enough credits to generate images!");
      return;
    }

    // Deduct 100 credits
    setCredits((prev) => prev - 100);

    setLoading(true);
    const promises = Array(2)
      .fill(null)
      .map(() =>
        generate(positivePrompt, negativePrompt)
          .then((res) => {
            if (res) {
              setRunIds((ids) => [...ids, res.run_id]);
            }
            return res;
          })
          .catch(console.error)
      );

    Promise.all(promises).finally(() => setLoading(false));
  };

  return (
    <Card className="w-full mt-8 bg-gradient-to-r from-gray-800 to-black shadow-2xl text-white">
      <CardHeader className="p-4 border-b border-purple-600">
        Pixio API Text2Img
        <div className="text-sm text-purple-300">
          Generates 2 images per click (100 credits).
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="positive-prompt" className="text-purple-300">
              Positive prompt
            </Label>
            <Input
              id="positive-prompt"
              type="text"
              value={positivePrompt}
              onChange={(e) => setPositivePrompt(e.target.value)}
              className="mt-1 bg-gray-700 border border-gray-600 w-full"
            />
          </div>
          <div>
            <Label htmlFor="negative-prompt" className="text-purple-300">
              Negative prompt
            </Label>
            <Input
              id="negative-prompt"
              type="text"
              value={negativePrompt}
              onChange={(e) => setNegativePrompt(e.target.value)}
              className="mt-1 bg-gray-700 border border-gray-600 w-full"
            />
          </div>

          <Button
            type="submit"
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white w-full"
            disabled={loading || credits < 100}
          >
            Generate {loading && <LoadingIcon />}
          </Button>

          {runIds.length > 0 && (
            <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {runIds.map((runId, index) => (
                <ImageGenerationResult key={index} runId={runId} />
              ))}
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}

// --------------------------------------------------------------
// ------------------ Img2img Component -------------------------
// --------------------------------------------------------------
/**
 * img2img => 1 image => 50 credits
 */
function Img2img({
  credits,
  setCredits,
}: {
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [prompt, setPrompt] = useState<File>();
  const [image, setImage] = useState("");
  const [loading, setLoading] = useState(false);
  const [runId, setRunId] = useState("");
  const [status, setStatus] = useState<string>();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files) return;
    setPrompt(e.target.files[0]);
  };

  useEffect(() => {
    if (!runId) return;

    const interval = setInterval(() => {
      checkStatus(runId).then((res) => {
        if (res) setStatus(res.status);
        if (res?.status === "success") {
          setImage(res.outputs[0]?.data?.images[0].url);
          setLoading(false);
          clearInterval(interval);
        }
      });
    }, 2000);

    return () => clearInterval(interval);
  }, [runId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading || !prompt) return;

    // Check if user has enough credits (50)
    if (credits < 50) {
      alert("Not enough credits!");
      return;
    }
    setCredits((prev) => prev - 50);

    setStatus("Uploading...");
    getUploadUrl(prompt.type, prompt.size)
      .then((res) => {
        if (!res) return;

        fetch(res.upload_url, {
          method: "PUT",
          body: prompt,
          headers: {
            "Content-Type": prompt.type,
            "x-amz-acl": "public-read",
            "Content-Length": `${prompt.size}`,
          },
        }).then((_res) => {
          if (_res.ok) {
            setLoading(true);
            generate_img(res.download_url).then((res) => {
              if (res) {
                setRunId(res.run_id);
                setStatus("Processing...");
              } else {
                setStatus("Error occurred.");
              }
            });
          }
        });
      })
      .catch(console.error);
  };

  return (
    <Card className="w-full mt-8 bg-gradient-to-r from-gray-800 to-black shadow-2xl text-white">
      <CardHeader className="p-4 border-b border-purple-600">
        Pixio API Img2Img
        <div className="text-sm text-purple-300">
          Upload an image to transform (50 credits).
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="image" className="text-purple-300">
              Image prompt
            </Label>
            <Input
              id="image"
              type="file"
              onChange={handleFileChange}
              className="mt-1 bg-gray-700 border border-gray-600 w-full"
            />
          </div>

          <Button
            type="submit"
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white w-full"
            disabled={loading || credits < 50}
          >
            Generate {loading && <LoadingIcon />}
          </Button>

          {runId && (
            <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <ImageGenerationResult runId={runId} />
            </div>
          )}

          {status && <p className="mt-2 text-sm text-purple-300">{status}</p>}
        </form>
      </CardContent>
    </Card>
  );
}

// --------------------------------------------------------------
// ------------------ OpenposeToImage Component -----------------
// --------------------------------------------------------------
/**
 * controlpose => 1 image => 50 credits
 */
function OpenposeToImage({
  credits,
  setCredits,
}: {
  credits: number;
  setCredits: React.Dispatch<React.SetStateAction<number>>;
}) {
  const [prompt, setPrompt] = useState("");
  const [pose, setPose] = useState(
    "https://pub-6230db03dc3a4861a9c3e55145ceda44.r2.dev/openpose-pose%20(1).png"
  );
  const [loading, setLoading] = useState(false);
  const [runId, setRunId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

    // Check credits
    if (credits < 50) {
      alert("Not enough credits!");
      return;
    }
    setCredits((prev) => prev - 50);

    setLoading(true);
    generate_img_with_controlnet(pose, prompt)
      .then((res) => {
        if (res) {
          setRunId(res.run_id);
        }
      })
      .finally(() => setLoading(false));
  };

  return (
    <Card className="w-full mt-8 bg-gradient-to-r from-gray-800 to-black shadow-2xl text-white">
      <CardHeader className="p-4 border-b border-purple-600">
        Pixio API OpenPose
        <div className="text-sm text-purple-300">
          Use an OpenPose skeleton to guide generation (50 credits).
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form className="space-y-4" onSubmit={handleSubmit}>
          <div>
            <Label htmlFor="prompt" className="text-purple-300">
              Prompt
            </Label>
            <Input
              id="prompt"
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              className="mt-1 bg-gray-700 border border-gray-600 w-full"
            />
          </div>

          <div>
            <Label className="text-purple-300">Pose Options</Label>
            <Select
              onValueChange={(value) => setPose(value)}
              defaultValue={pose}
            >
              <SelectTrigger className="mt-1 bg-gray-700 border border-gray-600 w-full">
                <SelectValue placeholder="Select Pose" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel className="text-purple-500">
                    Choose a Pose
                  </SelectLabel>
                  <SelectItem value="https://pose-url-1">Pose 1</SelectItem>
                  <SelectItem value="https://pose-url-2">Pose 2</SelectItem>
                </SelectGroup>
              </SelectContent>
            </Select>
          </div>

          <Button
            type="submit"
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white w-full"
            disabled={loading || credits < 50}
          >
            Generate {loading && <LoadingIcon />}
          </Button>

          {runId && (
            <div className="mt-6">
              <ImageGenerationResult runId={runId} />
            </div>
          )}
        </form>
      </CardContent>
    </Card>
  );
}



// --- old ---- //

// "use client";

// import { useEffect, useState } from "react";
// import { LoadingIcon } from "@/components/LoadingIcon";
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardHeader } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import {
//   checkStatus,
//   generate,
//   generate_img,
//   generate_img_with_controlnet,
//   getUploadUrl,
// } from "@/server/generate";

// import {
//   Tabs,
//   TabsContent,
//   TabsList,
//   TabsTrigger,
// } from "@/components/ui/tabs";
// import {
//   Select,
//   SelectContent,
//   SelectGroup,
//   SelectItem,
//   SelectLabel,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";

// // ------------------ ImageGenerationResult Component ------------------
// // Shows each generated image, a download button, and handles "click to expand" modal.

// import { Skeleton } from "@/components/ui/skeleton";
// import { cn } from "@/lib/utils";

// export function ImageGenerationResult({
//   runId,
//   className,
// }: { runId: string } & React.ComponentProps<"div">) {
//   const [image, setImage] = useState("");
//   const [status, setStatus] = useState<string>("preparing");
//   const [loading, setLoading] = useState(true);
//   const [isModalOpen, setIsModalOpen] = useState(false);

//   // Poll for status until "success" and retrieve the image URL
//   useEffect(() => {
//     if (!runId) return;
//     const interval = setInterval(() => {
//       checkStatus(runId).then((res) => {
//         if (res) setStatus(res.status);
//         if (res && res.status === "success") {
//           setImage(res.outputs[0]?.data?.images[0].url);
//           setLoading(false);
//           clearInterval(interval);
//         }
//       });
//     }, 2000);
//     return () => clearInterval(interval);
//   }, [runId]);

//   // Handle the direct download action using a Blob
//   const handleDownload = async (e: React.MouseEvent<HTMLButtonElement>) => {
//     e.stopPropagation(); // Prevent the click from opening the modal
//     if (!image) return;

//     try {
//       // Fetch the image as a Blob
//       const response = await fetch(image);
//       const blob = await response.blob();

//       // Create a blob URL for forced download
//       const blobURL = URL.createObjectURL(blob);
//       const link = document.createElement("a");
//       link.href = blobURL;
//       link.download = "generated-image.png"; // Filename for the downloaded image
//       link.click();
//       URL.revokeObjectURL(blobURL); // Clean up the URL object
//     } catch (err) {
//       console.error("Download error: ", err);
//     }
//   };

//   return (
//     <>
//       <div
//         className={cn(
//           "border border-gray-700 w-full aspect-[512/768] rounded-lg relative overflow-hidden cursor-pointer",
//           className,
//           loading
//             ? "bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 animate-pulse"
//             : "bg-gray-800"
//         )}
//         // Click image container to open the full-screen modal if image is ready
//         onClick={() => {
//           if (!loading && image) {
//             setIsModalOpen(true);
//           }
//         }}
//       >
//         {/* The displayed image when loading finishes */}
//         {!loading && image && (
//           <img
//             className="w-full h-full object-contain"
//             src={image}
//             alt="Generated image"
//           />
//         )}
//         {/* Loading status overlay */}
//         {!image && status && (
//           <div className="absolute inset-0 flex items-center justify-center gap-2 text-white">
//             {status} <LoadingIcon />
//           </div>
//         )}
//         {/* Skeleton for the loading stage */}
//         {loading && <Skeleton className="w-full h-full" />}

//         {/* Download Button - only visible if not loading and we have an image */}
//         {!loading && image && (
//           <div className="absolute bottom-2 left-0 w-full flex justify-center">
//             <Button
//               type="button" // <-- This ensures clicking won't submit the form
//               variant="secondary"
//               onClick={handleDownload}
//               className="bg-gradient-to-r from-pink-500 to-purple-600 text-white"
//             >
//               Download
//             </Button>
//           </div>
//         )}
//       </div>

//       {/* -------- Modal for expanded view -------- */}
//       {isModalOpen && (
//         <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
//           {/* Close button */}
//           <button
//             className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/80 rounded px-3 py-1"
//             onClick={() => setIsModalOpen(false)}
//           >
//             X
//           </button>

//           {/* Expanded Image */}
//           <img
//             src={image}
//             alt="Expanded generated image"
//             className="max-h-full max-w-full object-contain"
//           />
//         </div>
//       )}
//     </>
//   );
// }

// // ------------------ Main Page Component ------------------
// export default function Page() {
//   return (
//     <main className="flex min-h-screen flex-col items-center justify-center bg-gradient-to-r from-black via-gray-900 to-black text-white py-10 px-4 sm:px-6 lg:px-8">
//       {/* Top Title */}
//       <h1 className="text-3xl md:text-4xl font-extrabold mb-8 text-pink-500">
//         Pixio API Next JS Example
//       </h1>

//       <Tabs defaultValue="txt2img" className="w-full max-w-5xl">
//         {/* Tabs List */}
//         <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-md shadow-lg shadow-purple-500/40">
//           <TabsTrigger value="txt2img" className="text-white font-semibold">
//             Workflow 1
//           </TabsTrigger>
//           <TabsTrigger value="img2img" className="text-white font-semibold">
//             Workflow 2
//           </TabsTrigger>
//           <TabsTrigger value="controlpose" className="text-white font-semibold">
//             Workflow 3
//           </TabsTrigger>
//         </TabsList>

//         {/* Tabs Content */}
//         <TabsContent value="txt2img">
//           <Txt2img />
//         </TabsContent>
//         <TabsContent value="img2img">
//           <Img2img />
//         </TabsContent>
//         <TabsContent value="controlpose">
//           <OpenposeToImage />
//         </TabsContent>
//       </Tabs>
//     </main>
//   );
// }

// // ------------------ Txt2img Component ------------------
// function Txt2img() {
//   const [positivePrompt, setPositivePrompt] = useState("");
//   const [negativePrompt, setNegativePrompt] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [runIds, setRunIds] = useState<string[]>([]);

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (loading) return;

//     setLoading(true);
//     const promises = Array(2)
//       .fill(null)
//       .map(() =>
//         generate(positivePrompt, negativePrompt)
//           .then((res) => {
//             if (res) {
//               setRunIds((ids) => [...ids, res.run_id]);
//             }
//             return res;
//           })
//           .catch(console.error)
//       );

//     Promise.all(promises).finally(() => setLoading(false));
//   };

//   return (
//     <Card className="w-full mt-8 bg-gradient-to-r from-gray-800 to-black shadow-2xl text-white">
//       <CardHeader className="p-4 border-b border-purple-600">
//         Pixio API Text2Img
//         <div className="text-sm text-purple-300">
//           A simple text2img demo. Enter prompts to generate two images.
//         </div>
//       </CardHeader>
//       <CardContent className="p-6">
//         <form className="space-y-4" onSubmit={handleSubmit}>
//           <div>
//             <Label htmlFor="positive-prompt" className="text-purple-300">
//               Positive prompt
//             </Label>
//             <Input
//               id="positive-prompt"
//               type="text"
//               value={positivePrompt}
//               onChange={(e) => setPositivePrompt(e.target.value)}
//               className="mt-1 bg-gray-700 border border-gray-600 w-full"
//             />
//           </div>

//           <div>
//             <Label htmlFor="negative-prompt" className="text-purple-300">
//               Negative prompt
//             </Label>
//             <Input
//               id="negative-prompt"
//               type="text"
//               value={negativePrompt}
//               onChange={(e) => setNegativePrompt(e.target.value)}
//               className="mt-1 bg-gray-700 border border-gray-600 w-full"
//             />
//           </div>

//           <Button
//             type="submit"
//             className="bg-gradient-to-r from-pink-500 to-purple-600 text-white w-full"
//             disabled={loading}
//           >
//             Generate {loading && <LoadingIcon />}
//           </Button>

//           {runIds.length > 0 && (
//             <div className="mt-6 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
//               {runIds.map((runId, index) => (
//                 <ImageGenerationResult key={index} runId={runId} />
//               ))}
//             </div>
//           )}
//         </form>
//       </CardContent>
//     </Card>
//   );
// }

// // ------------------ Img2img Component ------------------
// function Img2img() {
//   const [prompt, setPrompt] = useState<File>();
//   const [image, setImage] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [runId, setRunId] = useState("");
//   const [status, setStatus] = useState<string>();

//   const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
//     if (!e.target.files) return;
//     setPrompt(e.target.files[0]);
//   };

//   useEffect(() => {
//     if (!runId) return;

//     const interval = setInterval(() => {
//       checkStatus(runId).then((res) => {
//         if (res) setStatus(res.status);
//         if (res?.status === "success") {
//           setImage(res.outputs[0]?.data?.images[0].url);
//           setLoading(false);
//           clearInterval(interval);
//         }
//       });
//     }, 2000);

//     return () => clearInterval(interval);
//   }, [runId]);

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (loading || !prompt) return;

//     setStatus("Uploading...");
//     getUploadUrl(prompt.type, prompt.size)
//       .then((res) => {
//         if (!res) return;

//         fetch(res.upload_url, {
//           method: "PUT",
//           body: prompt,
//           headers: {
//             "Content-Type": prompt.type,
//             "x-amz-acl": "public-read",
//             "Content-Length": `${prompt.size}`,
//           },
//         }).then((_res) => {
//           if (_res.ok) {
//             setLoading(true);
//             generate_img(res.download_url).then((res) => {
//               if (res) {
//                 setRunId(res.run_id);
//                 setStatus("Processing...");
//               } else {
//                 setStatus("Error occurred.");
//               }
//             });
//           }
//         });
//       })
//       .catch(console.error);
//   };

//   return (
//     <Card className="w-full mt-8 bg-gradient-to-r from-gray-800 to-black shadow-2xl text-white">
//       <CardHeader className="p-4 border-b border-purple-600">
//         Pixio API Img2Img
//         <div className="text-sm text-purple-300">
//           Upload an image to transform it using Img2Img.
//         </div>
//       </CardHeader>
//       <CardContent className="p-6">
//         <form className="space-y-4" onSubmit={handleSubmit}>
//           <div>
//             <Label htmlFor="image" className="text-purple-300">
//               Image prompt
//             </Label>
//             <Input
//               id="image"
//               type="file"
//               onChange={handleFileChange}
//               className="mt-1 bg-gray-700 border border-gray-600 w-full"
//             />
//           </div>

//           <Button
//             type="submit"
//             className="bg-gradient-to-r from-pink-500 to-purple-600 text-white w-full"
//             disabled={loading}
//           >
//             Generate {loading && <LoadingIcon />}
//           </Button>

//           {/* Show a single image result when done */}
//           {runId && (
//             <div className="mt-6 grid grid-cols-1 lg:grid-cols-2 gap-6">
//               <ImageGenerationResult runId={runId} />
//             </div>
//           )}

//           {status && <p className="mt-2 text-sm text-purple-300">{status}</p>}
//         </form>
//       </CardContent>
//     </Card>
//   );
// }

// // ------------------ OpenposeToImage Component ------------------
// function OpenposeToImage() {
//   const [prompt, setPrompt] = useState("");
//   const [pose, setPose] = useState(
//     "https://pub-6230db03dc3a4861a9c3e55145ceda44.r2.dev/openpose-pose%20(1).png"
//   );
//   const [loading, setLoading] = useState(false);
//   const [runId, setRunId] = useState("");

//   const handleSubmit = (e: React.FormEvent) => {
//     e.preventDefault();
//     if (loading) return;

//     setLoading(true);
//     generate_img_with_controlnet(pose, prompt)
//       .then((res) => {
//         if (res) {
//           setRunId(res.run_id);
//         }
//       })
//       .finally(() => setLoading(false));
//   };

//   return (
//     <Card className="w-full mt-8 bg-gradient-to-r from-gray-800 to-black shadow-2xl text-white">
//       <CardHeader className="p-4 border-b border-purple-600">
//         Pixio API OpenPose
//         <div className="text-sm text-purple-300">
//           Use an OpenPose skeleton to guide the image generation.
//         </div>
//       </CardHeader>
//       <CardContent className="p-6">
//         <form className="space-y-4" onSubmit={handleSubmit}>
//           <div>
//             <Label htmlFor="prompt" className="text-purple-300">
//               Prompt
//             </Label>
//             <Input
//               id="prompt"
//               type="text"
//               value={prompt}
//               onChange={(e) => setPrompt(e.target.value)}
//               className="mt-1 bg-gray-700 border border-gray-600 w-full"
//             />
//           </div>

//           <div>
//             <Label className="text-purple-300">Pose Options</Label>
//             <Select
//               onValueChange={(value) => setPose(value)}
//               defaultValue={pose}
//             >
//               <SelectTrigger className="mt-1 bg-gray-700 border border-gray-600 w-full">
//                 <SelectValue placeholder="Select Pose" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectGroup>
//                   <SelectLabel className="text-purple-500">
//                     Choose a Pose
//                   </SelectLabel>
//                   <SelectItem value="https://pose-url-1">Pose 1</SelectItem>
//                   <SelectItem value="https://pose-url-2">Pose 2</SelectItem>
//                 </SelectGroup>
//               </SelectContent>
//             </Select>
//           </div>

//           <Button
//             type="submit"
//             className="bg-gradient-to-r from-pink-500 to-purple-600 text-white w-full"
//             disabled={loading}
//           >
//             Generate {loading && <LoadingIcon />}
//           </Button>

//           {runId && (
//             <div className="mt-6">
//               <ImageGenerationResult runId={runId} />
//             </div>
//           )}
//         </form>
//       </CardContent>
//     </Card>
//   );
// }
