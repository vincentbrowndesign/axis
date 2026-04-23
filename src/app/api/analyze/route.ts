import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const formData = await req.formData();
    const file = formData.get("file");

    if (!file) {
      return NextResponse.json(
        { error: "No file uploaded" },
        { status: 400 }
      );
    }

    // simulate processing delay
    await new Promise((res) => setTimeout(res, 1200));

    // mock shot data (V1)
    const shots = [
      { id: "1", time: 1.8, zone: "left wing", result: "make" },
      { id: "2", time: 4.2, zone: "top", result: "miss" },
      { id: "3", time: 7.1, zone: "right wing", result: "make" },
      { id: "4", time: 10.4, zone: "left corner", result: "miss" },
      { id: "5", time: 13.2, zone: "right wing", result: "make" },
    ];

    return NextResponse.json({
      sessionId: "test-session-001",
      shots,
    });
  } catch (err) {
    console.error(err);

    return NextResponse.json(
      { error: "Analyze failed" },
      { status: 500 }
    );
  }
}