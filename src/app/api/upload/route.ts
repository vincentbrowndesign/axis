import Mux from "@mux/mux-node";
import { NextResponse } from "next/server";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID!,
  tokenSecret: process.env.MUX_TOKEN_SECRET!,
});

export async function POST() {
  try {
    const hasTokenId = !!process.env.MUX_TOKEN_ID;
    const hasTokenSecret = !!process.env.MUX_TOKEN_SECRET;

    console.log("MUX_TOKEN_ID exists:", hasTokenId);
    console.log("MUX_TOKEN_SECRET exists:", hasTokenSecret);

    if (!hasTokenId || !hasTokenSecret) {
      return NextResponse.json(
        { error: "Missing Mux environment variables." },
        { status: 500 }
      );
    }

    const upload = await mux.video.uploads.create({
      cors_origin: "*",
      new_asset_settings: {
        playback_policies: ["public"],
        video_quality: "basic",
      },
    });

    return NextResponse.json({
      uploadId: upload.id,
      uploadUrl: upload.url,
      assetId: upload.asset_id ?? null,
      status: upload.status,
    });
  } catch (error) {
    console.error("Mux upload URL error:", error);

    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Failed to create Mux upload URL.",
      },
      { status: 500 }
    );
  }
}