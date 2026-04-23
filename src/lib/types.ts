export type Shot = {
  id: string;
  time: number;
  zone: string;
  result: "make" | "miss";
};

export type AnalyzeResponse = {
  sessionId: string;
  shots: Shot[];
};