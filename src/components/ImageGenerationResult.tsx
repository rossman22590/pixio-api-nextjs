"use client";

import { useEffect, useState } from "react";
import { LoadingIcon } from "@/components/LoadingIcon";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { checkStatus } from "@/server/generate";
import { cn } from "@/lib/utils";

interface ImageGenerationResultProps extends React.ComponentProps<"div"> {
  runId: string;
}

export default function ImageGenerationResult({
  runId,
  className,
}: ImageGenerationResultProps) {
  const [image, setImage] = useState("");
  const [status, setStatus] = useState<string>("preparing");
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Poll for status until "success" and retrieve the image URL
  useEffect(() => {
    if (!runId) return;
    const interval = setInterval(() => {
      checkStatus(runId).then((res) => {
        if (res) setStatus(res.status);
        if (res && res.status === "success") {
          setImage(res.outputs[0]?.data?.images[0].url);
          setLoading(false);
          clearInterval(interval);
        }
      });
    }, 2000);
    return () => clearInterval(interval);
  }, [runId]);

  // Handle the direct download action using a Blob
  const handleDownload = async (e: React.MouseEvent<HTMLButtonElement>) => {
    e.stopPropagation(); // Prevent the click from opening the modal
    if (!image) return;

    try {
      // Fetch the image as a Blob
      const response = await fetch(image);
      const blob = await response.blob();

      // Create a blob URL for forced download
      const blobURL = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = blobURL;
      link.download = "generated-image.png"; // Filename
      link.click();
      URL.revokeObjectURL(blobURL); // Clean up
    } catch (err) {
      console.error("Download error: ", err);
    }
  };

  return (
    <>
      <div
        className={cn(
          "border border-gray-700 w-full aspect-[512/768] rounded-lg relative overflow-hidden cursor-pointer",
          className,
          loading
            ? "bg-gradient-to-r from-pink-500 via-purple-500 to-pink-500 animate-pulse"
            : "bg-gray-800"
        )}
        onClick={() => {
          if (!loading && image) {
            setIsModalOpen(true);
          }
        }}
      >
        {/* Display the image once loaded */}
        {!loading && image && (
          <img
            className="w-full h-full object-contain"
            src={image}
            alt="Generated image"
          />
        )}

        {/* Loading or waiting status */}
        {!image && status && (
          <div className="absolute inset-0 flex items-center justify-center gap-2 text-white">
            {status} <LoadingIcon />
          </div>
        )}

        {loading && <Skeleton className="w-full h-full" />}

        {/* Download Button - only if image is loaded */}
        {!loading && image && (
          <div className="absolute bottom-2 left-0 w-full flex justify-center">
            <Button
              type="button"
              variant="secondary"
              onClick={handleDownload}
              className="bg-gradient-to-r from-pink-500 to-purple-600 text-white"
            >
              Download
            </Button>
          </div>
        )}
      </div>

      {/* Modal for expanded view */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          {/* Close button */}
          <button
            className="absolute top-4 right-4 text-white bg-black/50 hover:bg-black/80 rounded px-3 py-1"
            onClick={() => setIsModalOpen(false)}
          >
            X
          </button>

          {/* Expanded Image */}
          <img
            src={image}
            alt="Expanded generated image"
            className="max-h-full max-w-full object-contain"
          />
        </div>
      )}
    </>
  );
}
