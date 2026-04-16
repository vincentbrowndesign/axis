import { toPng, toSvg } from "html-to-image";
import jsPDF from "jspdf";

type ExportNode = HTMLElement | null;

function assertNode(node: ExportNode): asserts node is HTMLElement {
  if (!node) {
    throw new Error("Export target not found.");
  }
}

export async function downloadPNG(node: ExportNode, filename: string) {
  assertNode(node);

  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#000000",
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function downloadSVG(node: ExportNode, filename: string) {
  assertNode(node);

  const dataUrl = await toSvg(node, {
    cacheBust: true,
    backgroundColor: "#000000",
  });

  const link = document.createElement("a");
  link.download = filename;
  link.href = dataUrl;
  link.click();
}

export async function downloadPDF(node: ExportNode, filename: string) {
  assertNode(node);

  const dataUrl = await toPng(node, {
    cacheBust: true,
    pixelRatio: 2,
    backgroundColor: "#000000",
  });

  const image = new Image();
  image.src = dataUrl;

  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve();
    image.onerror = () => reject(new Error("Failed to render PDF image."));
  });

  const pdf = new jsPDF({
    orientation: image.width >= image.height ? "landscape" : "portrait",
    unit: "px",
    format: [image.width, image.height],
  });

  pdf.addImage(dataUrl, "PNG", 0, 0, image.width, image.height);
  pdf.save(filename);
}