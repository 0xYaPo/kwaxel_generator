import React, {
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import defaultSpriteUrl from "./assets/kwaxel_default.png";

/**
 * Kwaxel Generator — 32×32 Pixel Art Studio
 * Tools: pencil | eraser | fill | eyedropper
 * Features: brush sizes, zoom, grid, undo/redo, import (PNG/JPG), export (×1/×2/×4/×8).
 * Pixels stored as 0xAARRGGBB (Uint32Array).
 */

const W = 32;
const H = 32;
const MAX_HISTORY = 200;

const clamp = (v, min, max) => Math.max(min, Math.min(max, v));
const toIndex = (x, y) => y * W + x;

const hexToArgb = (hex) => {
  // supports #rgb, #rrggbb, #aarrggbb
  let s = hex.replace("#", "").trim();
  if (s.length === 3) {
    const r = s[0] + s[0],
      g = s[1] + s[1],
      b = s[2] + s[2];
    return (
      (0xff << 24) |
      (parseInt(r, 16) << 16) |
      (parseInt(g, 16) << 8) |
      parseInt(b, 16)
    );
  }
  if (s.length === 6) {
    const r = s.slice(0, 2),
      g = s.slice(2, 4),
      b = s.slice(4, 6);
    return (
      (0xff << 24) |
      (parseInt(r, 16) << 16) |
      (parseInt(g, 16) << 8) |
      parseInt(b, 16)
    );
  }
  if (s.length === 8) {
    const a = s.slice(0, 2),
      r = s.slice(2, 4),
      g = s.slice(4, 6),
      b = s.slice(6, 8);
    return (
      (parseInt(a, 16) << 24) |
      (parseInt(r, 16) << 16) |
      (parseInt(g, 16) << 8) |
      parseInt(b, 16)
    );
  }
  return 0xff000000; // default black
};

const copyPixels = (src) => new Uint32Array(src);

function useDevicePixelRatio() {
  const [dpr, setDpr] = useState(() => window.devicePixelRatio || 1);
  useEffect(() => {
    const onChange = () => setDpr(window.devicePixelRatio || 1);
    window.addEventListener("resize", onChange);
    return () => window.removeEventListener("resize", onChange);
  }, []);
  return dpr;
}

/** Robust conversion: ARGB Uint32Array <-> ImageData (RGBA) */
function pixelsToImageData(pixels, w = W, h = H) {
  const data = new Uint8ClampedArray(w * h * 4);
  for (let i = 0; i < w * h; i++) {
    const argb = pixels[i] >>> 0;
    const a = (argb >>> 24) & 0xff;
    const r = (argb >>> 16) & 0xff;
    const g = (argb >>> 8) & 0xff;
    const b = argb & 0xff;
    const o = i * 4;
    data[o] = r;
    data[o + 1] = g;
    data[o + 2] = b;
    data[o + 3] = a;
  }
  return new ImageData(data, w, h);
}
function imageDataToPixels(imageData) {
  const { width: w, height: h, data } = imageData;
  const out = new Uint32Array(w * h);
  for (let i = 0; i < w * h; i++) {
    const o = i * 4;
    const r = data[o],
      g = data[o + 1],
      b = data[o + 2],
      a = data[o + 3];
    out[i] =
      ((a & 0xff) << 24) |
      ((r & 0xff) << 16) |
      ((g & 0xff) << 8) |
      (b & 0xff);
  }
  return out;
}

/** Helper: nearest-neighbor resample any <img> to W×H and return ImageData */
function pixelsFromImageElement(img, targetW, targetH) {
  // Stage original
  const stage = document.createElement("canvas");
  stage.width = img.width;
  stage.height = img.height;
  stage.getContext("2d").drawImage(img, 0, 0);

  // Nearest-neighbor scale to target
  const tmp = document.createElement("canvas");
  tmp.width = targetW;
  tmp.height = targetH;
  const tctx = tmp.getContext("2d");
  tctx.imageSmoothingEnabled = false;
  tctx.drawImage(
    stage,
    0,
    0,
    stage.width,
    stage.height,
    0,
    0,
    targetW,
    targetH
  );

  return tctx.getImageData(0, 0, targetW, targetH);
}

export default function KwaxelGenerator() {
  const [pixels, setPixels] = useState(() => new Uint32Array(W * H)); // transparent start
  const [tool, setTool] = useState("pencil"); // pencil | eraser | fill | eyedropper
  const [brush, setBrush] = useState(1); // 1 | 2 | 4
  const [color, setColor] = useState("#3b82f6");
  const [showGrid, setShowGrid] = useState(true);
  const [scale, setScale] = useState(16); // CSS px per pixel
  const [isPainting, setIsPainting] = useState(false);
  const [history, setHistory] = useState([]); // Uint32Array snapshots
  const [future, setFuture] = useState([]);

  const canvasRef = useRef(null);
  const overlayRef = useRef(null);
  const inputFileRef = useRef(null);
  const dpr = useDevicePixelRatio();

  // Checker background (for transparency) — used directly on canvas style
  const checkerPos = useMemo(
    () =>
      `0 0, 0 ${scale / 2}px, ${scale / 2}px -${scale / 2}px, -${scale / 2}px 0px`,
    [scale]
  );

  /** Load default sprite once on mount (no history entry) */
  useEffect(() => {
    let cancelled = false;
    const img = new Image();
    img.onload = () => {
      if (cancelled) return;
      const imageData = pixelsFromImageElement(img, W, H);
      setPixels(imageDataToPixels(imageData));
    };
    img.onerror = (err) => console.error("Failed to load default sprite:", err);
    img.src = defaultSpriteUrl; // local asset handled by Vite
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** DRAW — main canvas */
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    
    // Set dimensions accounting for device pixel ratio
    canvas.width = W * scale * dpr;
    canvas.height = H * scale * dpr;
    canvas.style.width = `${W * scale}px`;
    canvas.style.height = `${H * scale}px`;

    ctx.scale(dpr, dpr);
    ctx.imageSmoothingEnabled = false;

    // Draw pixels
    const imageData = pixelsToImageData(pixels);
    const tmp = document.createElement("canvas");
    tmp.width = W;
    tmp.height = H;
    tmp.getContext("2d").putImageData(imageData, 0, 0);

    ctx.drawImage(tmp, 0, 0, W, H, 0, 0, W * scale, H * scale);
  }, [pixels, scale, dpr]);

  /** DRAW — grid overlay */
  const drawGrid = useCallback(() => {
    const canvas = overlayRef.current;
    const ctx = canvas.getContext("2d");

    // Match main canvas dimensions exactly
    canvas.width = W * scale * dpr;
    canvas.height = H * scale * dpr;
    canvas.style.width = `${W * scale}px`;
    canvas.style.height = `${H * scale}px`;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    
    if (!showGrid) return;

    ctx.scale(dpr, dpr);
    ctx.strokeStyle = "rgba(0,0,0,0.1)";
    ctx.lineWidth = 1;

    // Draw vertical lines
    for (let x = 0; x <= W; x++) {
      const px = x * scale;
      ctx.beginPath();
      ctx.moveTo(px, 0);
      ctx.lineTo(px, H * scale);
      ctx.stroke();
    }

    // Draw horizontal lines
    for (let y = 0; y <= H; y++) {
      const py = y * scale;
      ctx.beginPath();
      ctx.moveTo(0, py);
      ctx.lineTo(W * scale, py);
      ctx.stroke();
    }
  }, [showGrid, scale, dpr]);

  // First paint must be aligned: run before browser paints
  useLayoutEffect(() => {
    redraw();
    drawGrid();
  }, [redraw, drawGrid]);

  // Keep in sync on window resizes / DPR changes
  useEffect(() => {
    const onResize = () => {
      redraw();
      drawGrid();
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [redraw, drawGrid]);

  /** History */
  const pushHistory = useCallback((prevPixels) => {
    setHistory((h) => {
      const next = [...h, copyPixels(prevPixels)];
      return next.length > MAX_HISTORY
        ? next.slice(next.length - MAX_HISTORY)
        : next;
    });
    setFuture([]);
  }, []);

  const undo = useCallback(() => {
    setHistory((h) => {
      if (h.length === 0) return h;
      setFuture((f) => [copyPixels(pixels), ...f]);
      setPixels(h[h.length - 1]);
      return h.slice(0, -1);
    });
  }, [pixels]);

  const redo = useCallback(() => {
    setFuture((f) => {
      if (f.length === 0) return f;
      setHistory((h) => [...h, copyPixels(pixels)]);
      setPixels(f[0]);
      return f.slice(1);
    });
  }, [pixels]);

  /** Painting */
  const cssToPixel = (clientX, clientY) => {
    const rect = canvasRef.current.getBoundingClientRect();
    const x = clamp(Math.floor((clientX - rect.left) / scale), 0, W - 1);
    const y = clamp(Math.floor((clientY - rect.top) / scale), 0, H - 1);
    return { x, y };
  };

  const setPixel = (buf, x, y, argb) => {
    if (x < 0 || y < 0 || x >= W || y >= H) return;
    buf[toIndex(x, y)] = argb >>> 0;
  };

  const drawBrush = (buf, x, y, argb) => {
    const r = Math.floor(brush / 2);
    for (let j = -r; j < brush - r; j++) {
      for (let i = -r; i < brush - r; i++) {
        setPixel(buf, x + i, y + j, argb);
      }
    }
  };

  const floodFill = (buf, x, y, target, replacement) => {
    if (target === replacement) return;
    const stack = [[x, y]];
    while (stack.length) {
      const [cx, cy] = stack.pop();
      if (cx < 0 || cy < 0 || cx >= W || cy >= H) continue;
      const idx = toIndex(cx, cy);
      if (buf[idx] !== target) continue;
      buf[idx] = replacement;
      stack.push([cx + 1, cy], [cx - 1, cy], [cx, cy + 1], [cx, cy - 1]);
    }
  };

  const handlePaintAt = (x, y, withHistory = false) => {
    setPixels((prev) => {
      const next = copyPixels(prev);
      const current = prev[toIndex(x, y)];
      const argb = tool === "eraser" ? 0x00000000 : hexToArgb(color);

      if (withHistory) pushHistory(prev);

      if (tool === "pencil" || tool === "eraser") {
        drawBrush(next, x, y, argb);
      } else if (tool === "fill") {
        floodFill(next, x, y, current, argb);
      } else if (tool === "eyedropper") {
        const picked = prev[toIndex(x, y)];
        const r = (picked >>> 16) & 0xff;
        const g = (picked >>> 8) & 0xff;
        const b = picked & 0xff;
        setColor(
          `#${[r, g, b].map((n) => n.toString(16).padStart(2, "0")).join("")}`
        );
        return prev; // no pixel change
      }
      return next;
    });
  };

  /** Pointer events */
  const onPointerDown = (e) => {
    e.preventDefault();
    setIsPainting(true);
    const { x, y } = cssToPixel(e.clientX, e.clientY);
    handlePaintAt(x, y, true);
  };
  const onPointerMove = (e) => {
    if (!isPainting) return;
    const { x, y } = cssToPixel(e.clientX, e.clientY);
    handlePaintAt(x, y, false);
  };
  const onPointerUp = () => setIsPainting(false);

  /** Import (user-chosen file; nearest-neighbor to 32×32) */
  const importFromFile = async (file) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    await new Promise((res, rej) => {
      img.onload = res;
      img.onerror = rej;
      img.src = url;
    });
    const imageData = pixelsFromImageElement(img, W, H);
    pushHistory(pixels);
    setPixels(imageDataToPixels(imageData));
    URL.revokeObjectURL(url);
  };

  /** Export PNG at ×1/×2/×4/×8 */
  const exportPng = (mult = 1) => {
    const out = document.createElement("canvas");
    out.width = W * mult;
    out.height = H * mult;
    const octx = out.getContext("2d");
    octx.imageSmoothingEnabled = false;

    const img = pixelsToImageData(pixels, W, H);
    const tmp = document.createElement("canvas");
    tmp.width = W;
    tmp.height = H;
    const tctx = tmp.getContext("2d");
    tctx.putImageData(img, 0, 0);

    octx.drawImage(tmp, 0, 0, W, H, 0, 0, W * mult, H * mult);

    const link = document.createElement("a");
    link.href = out.toDataURL("image/png");
    link.download = `kwaxel_${W}x${H}_x${mult}.png`;
    link.click();
  };

  /** Keyboard shortcuts */
  useEffect(() => {
    const onKey = (e) => {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      } else if ((e.ctrlKey || e.metaKey) && k === "y") {
        e.preventDefault();
        redo();
      } else if (k === "b") setTool("pencil");
      else if (k === "e") setTool("eraser");
      else if (k === "g") setTool("fill");
      else if (k === "i") setTool("eyedropper");
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [undo, redo]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <div className="container">
        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2">
          <ToolButton
            active={tool === "pencil"}
            onClick={() => setTool("pencil")}
            title="Pencil (B)"
          >
            ✏️
          </ToolButton>
          <ToolButton
            active={tool === "eraser"}
            onClick={() => setTool("eraser")}
            title="Eraser (E)"
          >
            🧽
          </ToolButton>
          <ToolButton
            active={tool === "fill"}
            onClick={() => setTool("fill")}
            title="Fill (G)"
          >
            🪣
          </ToolButton>
          <ToolButton
            active={tool === "eyedropper"}
            onClick={() => setTool("eyedropper")}
            title="Eyedropper (I)"
          >
            🎯
          </ToolButton>

        <div className="h-6 w-px bg-gray-300 mx-2" />

        <label className="inline-flex items-center gap-2 text-sm">
          Color
          <input
            type="color"
            value={color}
            onChange={(e) => setColor(e.target.value)}
            className="w-10 h-8 p-0 border rounded cursor-pointer"
            aria-label="Current color"
          />
        </label>

        <label className="inline-flex items-center gap-2 text-sm">
          Brush
          <select
            value={brush}
            onChange={(e) => setBrush(parseInt(e.target.value, 10))}
            className="border rounded px-2 py-1"
            aria-label="Brush size"
          >
            <option value={1}>1×1</option>
            <option value={2}>2×2</option>
            <option value={4}>4×4</option>
          </select>
        </label>

        <label className="inline-flex items-center gap-2 text-sm">
          Zoom
          <input
            type="range"
            min={8}
            max={32}
            step={1}
            value={scale}
            onChange={(e) => setScale(parseInt(e.target.value, 10))}
            aria-label="Zoom"
          />
          <span className="tabular-nums text-xs">{scale}x</span>
        </label>

        <label className="inline-flex items-center gap-2 text-sm">
          <input
            type="checkbox"
            checked={showGrid}
            onChange={(e) => setShowGrid(e.target.checked)}
          />
          Grid
        </label>

        <div className="ml-auto flex items-center gap-2">
          <button
            className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
            onClick={() => undo()}
          >
            Undo
          </button>
          <button
            className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
            onClick={() => redo()}
          >
            Redo
          </button>
          <input
            ref={inputFileRef}
            type="file"
            accept="image/*"
            className="hidden"
            onChange={(e) =>
              e.target.files?.[0] && importFromFile(e.target.files[0])
            }
          />
          <button
            className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
            onClick={() => inputFileRef.current?.click()}
          >
            Import
          </button>
          <div className="relative">
            <ExportMenu onExport={exportPng} />
          </div>
        </div>
      </div>

        {/* Canvas block — wrapper uses exact content size so overlay fits perfectly */}
        <div
          className="canvas-container"
          style={{
            width: `${W * scale}px`,
            height: `${H * scale}px`,
          }}
        >
          <canvas
            ref={overlayRef}
            width={W * scale * dpr}
            height={H * scale * dpr}
            className="pointer-events-none"
            style={{
              width: `${W * scale}px`,
              height: `${H * scale}px`,
              zIndex: 1
            }}
            aria-hidden
          />
          <canvas
            ref={canvasRef}
            width={W * scale * dpr}
            height={H * scale * dpr}
            style={{
              width: `${W * scale}px`,
              height: `${H * scale}px`,
              zIndex: 2,
              backgroundImage:
                "linear-gradient(45deg, rgba(0,0,0,.08) 25%, transparent 25%)," +
                "linear-gradient(-45deg, rgba(0,0,0,.08) 25%, transparent 25%)," +
                "linear-gradient(45deg, transparent 75%, rgba(0,0,0,.08) 75%)," +
                "linear-gradient(-45deg, transparent 75%, rgba(0,0,0,.08) 75%)",
              backgroundSize: `${scale}px ${scale}px`,
              backgroundPosition: checkerPos,
            }}
            onPointerDown={onPointerDown}
            onPointerMove={onPointerMove}
            onPointerUp={onPointerUp}
            onPointerLeave={onPointerUp}
            role="img"
            aria-label="32 by 32 pixel canvas"
          />
        </div>

        {/* Swatches */}
        <div className="flex flex-wrap gap-2">
          {[
            "#000000",
            "#ffffff",
            "#ef4444",
            "#f59e0b",
            "#fbbf24",
            "#10b981",
            "#3b82f6",
            "#8b5cf6",
            "#ec4899",
          ].map((sw) => (
            <button
              key={sw}
              className="w-6 h-6 rounded border"
              style={{ background: sw }}
              onClick={() => setColor(sw)}
              aria-label={`Set color ${sw}`}
              title={sw}
            />
          ))}
        </div>
      </div>
    </div>
  );
}

/** UI bits */
function ToolButton({ active, children, ...rest }) {
  return (
    <button
      className={`px-3 py-1.5 text-sm rounded border hover:bg-gray-50 ${
        active ? "bg-gray-100 border-gray-400" : ""
      }`}
      {...rest}
    >
      {children}
    </button>
  );
}

function ExportMenu({ onExport }) {
  const [open, setOpen] = useState(false);
  useEffect(() => {
    const onDocClick = () => setOpen(false);
    if (open) document.addEventListener("click", onDocClick, { once: true });
    return () => document.removeEventListener("click", onDocClick);
  }, [open]);
  return (
    <div>
      <button
        className="px-3 py-1.5 text-sm rounded border hover:bg-gray-50"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((v) => !v);
        }}
      >
        Export PNG
      </button>
      {open && (
        <div
          className="absolute right-0 mt-1 w-40 rounded-lg border bg-white shadow-lg overflow-hidden z-10"
          onClick={(e) => e.stopPropagation()}
        >
          {[1, 2, 4, 8].map((m) => (
            <button
              key={m}
              className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50"
              onClick={() => onExport(m)}
            >
              {`Download ×${m}`}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
