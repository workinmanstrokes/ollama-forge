export type LocalImageEngine = { kind: "comfy" | "sd"; url: string };

const COMFY = "http://127.0.0.1:8188";
const SD = "http://127.0.0.1:7860";

export async function detectLocalImage(): Promise<LocalImageEngine | null> {
  if (await reachable(`${COMFY}/system_stats`)) return { kind: "comfy", url: COMFY };
  if (await reachable(`${SD}/sdapi/v1/sd-models`)) return { kind: "sd", url: SD };
  return null;
}

async function reachable(url: string): Promise<boolean> {
  try {
    const response = await fetch(url, { signal: AbortSignal.timeout(1200) });
    return response.ok;
  } catch {
    return false;
  }
}

export async function generateLocalImage(engine: LocalImageEngine, prompt: string): Promise<{ note: string; image?: string }> {
  const safe = prompt.replace(/https?:\/\/\S+/g, "").slice(0, 240);
  if (engine.kind === "sd") {
    const response = await fetch(`${engine.url}/sdapi/v1/txt2img`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ prompt: safe, steps: 8, width: 256, height: 256, cfg_scale: 5 }),
    });
    if (!response.ok) throw new Error(`Stable Diffusion returned ${response.status}.`);
    const body = await response.json() as { images?: string[] };
    const image = body.images?.[0];
    if (!image) throw new Error("Stable Diffusion did not return an image.");
    return { note: "Image from the local Stable Diffusion server.", image: `data:image/png;base64,${image}` };
  }
  const checkpoints = await fetch(`${engine.url}/models/checkpoints`).then((response) => response.json()) as string[];
  const checkpoint = checkpoints[0];
  if (!checkpoint) throw new Error("ComfyUI is running and has no checkpoint installed.");
  const workflow = {
    "4": { class_type: "CheckpointLoaderSimple", inputs: { ckpt_name: checkpoint } },
    "6": { class_type: "CLIPTextEncode", inputs: { text: safe, clip: ["4", 1] } },
    "5": { class_type: "EmptyLatentImage", inputs: { width: 256, height: 256, batch_size: 1 } },
    "3": { class_type: "KSampler", inputs: { seed: 1, steps: 8, cfg: 5, sampler_name: "euler", scheduler: "normal", denoise: 1, model: ["4", 0], positive: ["6", 0], negative: ["6", 0], latent_image: ["5", 0] } },
    "8": { class_type: "VAEDecode", inputs: { samples: ["3", 0], vae: ["4", 2] } },
    "9": { class_type: "SaveImage", inputs: { filename_prefix: "forge", images: ["8", 0] } },
  };
  const queued = await fetch(`${engine.url}/prompt`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ prompt: workflow }),
  });
  if (!queued.ok) throw new Error(`ComfyUI returned ${queued.status}.`);
  const body = await queued.json() as { prompt_id?: string; error?: unknown };
  if (!body.prompt_id) throw new Error("ComfyUI did not accept the prompt.");
  return { note: `ComfyUI queued ${body.prompt_id}. Open ComfyUI on this machine to view the image.` };
}
