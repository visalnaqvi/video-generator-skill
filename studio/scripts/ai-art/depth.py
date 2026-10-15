"""Depth map for an image with Depth Anything V2 (local, on the GPU), run with ComfyUI's own Python:

    <comfyRoot>/python_embeded/python.exe -s studio/scripts/ai-art/depth.py <image.png> <out-depth.png> [model-id]

Writes a 16-bit grayscale PNG the size of the image: 65535 = nearest, 0 = farthest (relative depth).
The model (Apache-2.0, ~100 MB) is downloaded once into the Hugging Face cache.
"""
import sys

import numpy as np
import torch
from PIL import Image
from transformers import pipeline

src, out = sys.argv[1], sys.argv[2]
model = sys.argv[3] if len(sys.argv) > 3 else "depth-anything/Depth-Anything-V2-Small-hf"
device = 0 if torch.cuda.is_available() else -1
pipe = pipeline("depth-estimation", model=model, device=device)
img = Image.open(src).convert("RGB")
pred = pipe(img)["predicted_depth"]
d = pred.squeeze().float()
d = torch.nn.functional.interpolate(d[None, None], size=(img.height, img.width), mode="bicubic", align_corners=False)[0, 0]
d = (d - d.min()) / (d.max() - d.min() + 1e-6)
arr = (d.clamp(0, 1).cpu().numpy() * 65535).astype(np.uint16)
Image.fromarray(arr, mode="I;16").save(out)
print('{"depth": "%s", "w": %d, "h": %d, "device": "%s"}' % (out.replace("\\", "/"), img.width, img.height, "cuda" if device == 0 else "cpu"))
