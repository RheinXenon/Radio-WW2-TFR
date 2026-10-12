# -*- coding: utf-8 -*-
"""
壁纸派生资源生成：深度图、缩略图、光源与色板元数据。

用法：python derive.py <Resources 目录> <输出目录>
对每张壁纸，在输出目录下按相同相对路径（去掉扩展名）建文件夹，写入：
  depth.png  —— 8 位灰度深度图，越亮越近，已做保边平滑与前景膨胀，供视差着色器使用
  thumb.jpg  —— 宽 480 的缩略图，供画廊使用
  meta.json  —— 尺寸、主光源位置与强度、色板
源图比派生物新时才重新生成，可反复运行。
"""
import sys, json
from pathlib import Path

import numpy as np
import cv2
from PIL import Image

MODEL = 'depth-anything/Depth-Anything-V2-Base-hf'
IMAGE_EXT = {'.png', '.jpg', '.jpeg', '.webp'}


def stale(src: Path, outs):
    t = src.stat().st_mtime
    return any((not o.exists()) or o.stat().st_mtime < t for o in outs)


def load_estimator():
    import torch
    from transformers import AutoImageProcessor, AutoModelForDepthEstimation
    torch.set_num_threads(max(1, (torch.get_num_threads() or 4)))
    processor = AutoImageProcessor.from_pretrained(MODEL)
    model = AutoModelForDepthEstimation.from_pretrained(MODEL).eval()

    def estimate(img: Image.Image) -> np.ndarray:
        # 短边 756 推理，比默认 518 边缘更利落
        inputs = processor(images=img, return_tensors='pt',
                           size={'height': 756, 'width': 756})
        with torch.no_grad():
            pred = model(**inputs).predicted_depth  # 相对逆深度，越大越近
        pred = torch.nn.functional.interpolate(
            pred.unsqueeze(1), size=(img.height, img.width),
            mode='bicubic', align_corners=False).squeeze().numpy()
        return pred

    return estimate


def guided_filter(guide: np.ndarray, src: np.ndarray, r: int, eps: float) -> np.ndarray:
    # 灰度引导滤波（He et al.），用盒式均值实现
    box = lambda x: cv2.boxFilter(x, -1, (2 * r + 1, 2 * r + 1))
    mi, ms = box(guide), box(src)
    a = (box(guide * src) - mi * ms) / (box(guide * guide) - mi * mi + eps)
    b = ms - a * mi
    return box(a) * guide + box(b)


def refine_depth(raw: np.ndarray, rgb: np.ndarray) -> np.ndarray:
    lo, hi = np.percentile(raw, [1, 99.5])
    d = np.clip((raw - lo) / max(hi - lo, 1e-6), 0, 1).astype(np.float32)
    # 以原图为引导的保边平滑：去掉纹理噪声，保留物体轮廓
    guide = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
    d = guided_filter(guide, d, r=6, eps=1e-3)
    # 前景向外膨胀几个像素，视差拉伸时由前景盖住边缘，避免出现背景色的光晕
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))
    d = cv2.dilate(d, k)
    d = cv2.GaussianBlur(d, (0, 0), 1.6)
    return np.clip(d, 0, 1)


def find_light(rgb: np.ndarray, depth: np.ndarray):
    h, w = depth.shape
    lum = cv2.cvtColor(rgb, cv2.COLOR_RGB2GRAY).astype(np.float32) / 255
    blur = cv2.GaussianBlur(lum, (0, 0), w * 0.012)
    # 光源只在远处找：天空、地平线上的太阳月亮
    score = blur * np.power(1 - depth, 0.7)
    score[int(h * 0.7):] = 0
    y, x = np.unravel_index(np.argmax(score), score.shape)
    peak = float(blur[y, x])
    mean = float(lum.mean())
    strength = float(np.clip((peak - mean) / max(1 - mean, 1e-3) * 1.4 - 0.35, 0, 1))
    return {'x': round(x / w, 4), 'y': round(y / h, 4), 'strength': round(strength, 3)}


def palette(rgb: np.ndarray):
    small = cv2.resize(rgb, (160, 90), interpolation=cv2.INTER_AREA).reshape(-1, 3).astype(np.float32)
    crit = (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 30, 0.5)
    _, labels, centers = cv2.kmeans(small, 6, None, crit, 4, cv2.KMEANS_PP_CENTERS)
    counts = np.bincount(labels.ravel(), minlength=6)
    hsv = cv2.cvtColor(centers.reshape(1, -1, 3).astype(np.uint8), cv2.COLOR_RGB2HSV)[0]
    lum = centers @ np.array([0.2126, 0.7152, 0.0722])
    big = counts > counts.sum() * 0.04
    hexc = lambda c: '#%02x%02x%02x' % tuple(int(v) for v in c)
    order = np.argsort(lum)
    light = next(i for i in order[::-1] if big[i])
    shadow = next(i for i in order if big[i])
    accent = max((i for i in range(6) if big[i]), key=lambda i: hsv[i][1] * (0.4 + lum[i] / 255))
    return {'light': hexc(centers[light]), 'shadow': hexc(centers[shadow]),
            'accent': hexc(centers[accent]), 'mean': hexc(small.mean(0))}


def main():
    res, out = Path(sys.argv[1]), Path(sys.argv[2])
    jobs = []
    for wall_root in sorted(p for p in res.iterdir() if p.is_dir() and p.name.endswith('Wallpapers')):
        for src in sorted(wall_root.rglob('*')):
            if src.suffix.lower() not in IMAGE_EXT:
                continue
            rel = src.relative_to(res).with_suffix('')
            dst = out / rel
            outs = [dst / 'depth.png', dst / 'thumb.jpg', dst / 'meta.json']
            if stale(src, outs):
                jobs.append((src, dst))
    if not jobs:
        print('壁纸派生资源均为最新')
        return
    print(f'待处理壁纸 {len(jobs)} 张，加载深度模型……', flush=True)
    estimate = load_estimator()
    for i, (src, dst) in enumerate(jobs, 1):
        img = Image.open(src).convert('RGB')
        rgb = np.asarray(img)
        depth = refine_depth(estimate(img), rgb)
        dst.mkdir(parents=True, exist_ok=True)
        cv2.imwrite(str(dst / 'depth.png'), (depth * 255 + 0.5).astype(np.uint8))
        thumb = img.copy()
        thumb.thumbnail((480, 480), Image.LANCZOS)
        thumb.save(dst / 'thumb.jpg', quality=86)
        meta = {'width': img.width, 'height': img.height,
                'light': find_light(rgb, depth), 'palette': palette(rgb)}
        (dst / 'meta.json').write_text(json.dumps(meta, ensure_ascii=False, indent=2), encoding='utf-8')
        print(f'[{i}/{len(jobs)}] {src.relative_to(res)}  光源 {meta["light"]}', flush=True)


if __name__ == '__main__':
    main()
