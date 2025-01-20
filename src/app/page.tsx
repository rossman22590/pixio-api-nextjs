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
import { ImageGenerationResult } from "@/components/ImageGenerationResult";

export default function Page() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-between bg-black text-white">
      <Tabs defaultValue="txt2img" className="w-full max-w-[600px] mt-10">
        <TabsList className="grid w-full grid-cols-3 bg-gradient-to-r from-pink-500 to-purple-600 rounded-md">
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
        <TabsContent value="txt2img">
          <Txt2img />
        </TabsContent>
        <TabsContent value="img2img">
          <Img2img />
        </TabsContent>
        <TabsContent value="controlpose">
          <OpenposeToImage />
        </TabsContent>
      </Tabs>
    </main>
  );
}

function Txt2img() {
  const [positivePrompt, setPositivePrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [loading, setLoading] = useState(false);
  const [runIds, setRunIds] = useState<string[]>([]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

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
    <Card className="w-full max-w-[600px] bg-gradient-to-r from-gray-800 to-black shadow-lg text-white">
      <CardHeader className="p-4 border-b border-purple-600">
        Pixio API Example App
        <div className="text-sm text-purple-300">
          Our text2img demo -{" "}
          <a href="https://myapps.ai" className="underline">
            start building today!
          </a>
        </div>
      </CardHeader>
      <CardContent className="p-6">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Label htmlFor="positive-prompt">Positive prompt</Label>
          <Input
            id="positive-prompt"
            type="text"
            value={positivePrompt}
            onChange={(e) => setPositivePrompt(e.target.value)}
            className="bg-gray-700 border border-gray-600"
          />
          <Label htmlFor="negative-prompt">Negative prompt</Label>
          <Input
            id="negative-prompt"
            type="text"
            value={negativePrompt}
            onChange={(e) => setNegativePrompt(e.target.value)}
            className="bg-gray-700 border border-gray-600"
          />
          <Button
            type="submit"
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white"
            disabled={loading}
          >
            Generate {loading && <LoadingIcon />}
          </Button>
          <div className="grid grid-cols-2 gap-4 mt-4">
            {runIds.map((runId, index) => (
              <ImageGenerationResult key={index} runId={runId} />
            ))}
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

function Img2img() {
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
    <Card className="w-full max-w-[600px] bg-gradient-to-r from-gray-800 to-black shadow-lg text-white">
      <CardHeader className="p-4 border-b border-purple-600">
        Img2Img Generation
      </CardHeader>
      <CardContent className="p-6">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Label htmlFor="image">Image prompt</Label>
          <Input id="image" type="file" onChange={handleFileChange} />
          <Button
            type="submit"
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white"
            disabled={loading}
          >
            Generate {loading && <LoadingIcon />}
          </Button>
          {runId && <ImageGenerationResult runId={runId} />}
          {status && <p>{status}</p>}
        </form>
      </CardContent>
    </Card>
  );
}

function OpenposeToImage() {
  const [prompt, setPrompt] = useState("");
  const [pose, setPose] = useState(
    "https://pub-6230db03dc3a4861a9c3e55145ceda44.r2.dev/openpose-pose%20(1).png"
  );
  const [loading, setLoading] = useState(false);
  const [runId, setRunId] = useState("");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (loading) return;

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
    <Card className="w-full max-w-[600px] bg-gradient-to-r from-gray-800 to-black shadow-lg text-white">
      <CardHeader className="p-4 border-b border-purple-600">
        OpenPose to Image
      </CardHeader>
      <CardContent className="p-6">
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Label htmlFor="prompt">Prompt</Label>
          <Input
            id="prompt"
            type="text"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
          />
          <Select
            onValueChange={(value) => setPose(value)}
            defaultValue={pose}
          >
            <SelectTrigger>
              <SelectValue placeholder="Select Pose" />
            </SelectTrigger>
            <SelectContent>
              <SelectGroup>
                <SelectItem value="https://pose-url-1">Pose 1</SelectItem>
                <SelectItem value="https://pose-url-2">Pose 2</SelectItem>
              </SelectGroup>
            </SelectContent>
          </Select>
          <Button
            type="submit"
            className="bg-gradient-to-r from-pink-500 to-purple-600 text-white"
            disabled={loading}
          >
            Generate {loading && <LoadingIcon />}
          </Button>
          {runId && <ImageGenerationResult runId={runId} />}
        </form>
      </CardContent>
    </Card>
  );
}
