import Mux from "@mux/mux-node";
import { NextRequest, NextResponse } from "next/server";

const mux = new Mux({
  tokenId: process.env.MUX_TOKEN_ID,
  tokenSecret: process.env.MUX_TOKEN_SECRET,
});

export async function GET(request: NextRequest) {
  try {
    if (!process.env.MUX_TOKEN_ID || !process.env.MUX_TOKEN_SECRET) {
      return NextResponse.json(
        { error: "Missing Mux environment variables." },
        { status: 500 }
      );
    }

    const uploadId = request.nextUrl.searchParams.get("uploadId");

    if (!uploadId) {
      return NextResponse.json(
        { error: "Missing uploadId." },
        { status: 400 }
      );
    }

    const upload = await mux.video.uploads.retrieve(uploadId);

    if (!upload.asset_id) {
      return NextResponse.json({
        upload: {
          id: upload.id,
          status: upload.status,
          asset_id: null,
        },
        asset: null,
      });
    }

    const asset = await mux.video.assets.retrieve(upload.asset_id);

    return NextResponse.json({
      upload: {
        id: upload.id,
        status: upload.status,
        asset_id: upload.asset_id,
      },
      asset: {
        id: asset.id,
        status: asset.status,
        playback_ids: asset.playback_ids ?? [],
      },
    });
  } catch (error) {
    console.error("Mux upload status error:", error);

    return NextResponse.json(
      { error: "Failed to read upload status." },
      { status: 500 }
    );
  }
}