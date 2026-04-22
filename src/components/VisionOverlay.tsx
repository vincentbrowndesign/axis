"use client";

import { useEffect, useRef } from "react";

export default function VisionOverlay() {
  const videoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    let detector: any;

    async function setup() {
      const tf = await import("@tensorflow/tfjs");
      const poseDetection = await import("@tensorflow-models/pose-detection");

      await tf.ready();

      detector = await poseDetection.createDetector(
        poseDetection.SupportedModels.MoveNet
      );

      if (videoRef.current) {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: true,
        });
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }

      loop();
    }

    async function loop() {
      if (!videoRef.current || !detector) return;

      const poses = await detector.estimatePoses(videoRef.current);

      console.log("poses:", poses);

      requestAnimationFrame(loop);
    }

    setup();
  }, []);

  return (
    <div className="min-h-screen bg-black flex items-center justify-center">
      <video
        ref={videoRef}
        className="w-full max-w-md rounded-xl"
        playsInline
        muted
      />
    </div>
  );
}