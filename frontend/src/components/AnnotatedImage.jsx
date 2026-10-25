import { useEffect, useRef } from "react";

// Stable empty array so the effect below does not re-run on every render
const NO_ANIMALS = [];


/**
 * Draws detector bounding boxes + confidence on top of an image.
 *
 * Put this file at: frontend/src/components/AnnotatedImage.jsx
 *
 * Props
 *   src     : image URL (blob URL of the live snapshot / uploaded image)
 *   animals : result.animals from POST /analyze. Each item needs
 *             detection.box = { x1, y1, x2, y2 }  (pixels of the image
 *             that was sent to the backend) and detection.confidence (0-1)
 *
 * The canvas is the same size as the image that was analysed, so the box
 * coordinates line up exactly. CSS only scales it down for display.
 */
function AnnotatedImage({ src, animals = NO_ANIMALS }) {

  const canvasRef = useRef(null);


  useEffect(() => {

    if (!src) {
      return;
    }

    const image = new Image();

    image.onload = () => {

      const canvas = canvasRef.current;

      if (!canvas) {
        return;
      }

      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;

      const ctx = canvas.getContext("2d");

      ctx.drawImage(image, 0, 0);

      // Keep line and text readable on large camera frames
      const scale = Math.max(canvas.width / 640, 1);
      const fontSize = 16 * scale;
      const padding = 4 * scale;

      ctx.lineWidth = 3 * scale;
      ctx.font = `600 ${fontSize}px sans-serif`;
      ctx.textBaseline = "top";

      animals.forEach((animal) => {

        const detection = animal.detection;
        const box = detection?.box;

        if (!box) {
          return;
        }

        const { x1, y1, x2, y2 } = box;

        const name = detection.class_name || "Animal";

        const confidence =
          detection.confidence !== undefined &&
          detection.confidence !== null
            ? ` ${(Number(detection.confidence) * 100).toFixed(1)}%`
            : "";

        const label = `${name}${confidence}`;

        // Box
        ctx.strokeStyle = "#15803d";
        ctx.strokeRect(x1, y1, x2 - x1, y2 - y1);

        // Label background (sits above the box, or inside if no room)
        const labelHeight = fontSize + padding * 2;
        const labelWidth = ctx.measureText(label).width + padding * 2;
        const labelY = y1 - labelHeight >= 0 ? y1 - labelHeight : y1;

        ctx.fillStyle = "#15803d";
        ctx.fillRect(x1, labelY, labelWidth, labelHeight);

        // Label text
        ctx.fillStyle = "#ffffff";
        ctx.fillText(label, x1 + padding, labelY + padding);

      });

    };

    image.src = src;

  }, [src, animals]);


  return (

    <canvas
      ref={canvasRef}
      style={{
        display: "block",
        width: "100%",
        maxWidth: "900px",
        borderRadius: "12px"
      }}
    />

  );

}


export default AnnotatedImage;