export function receiptFilename(name: string, date: string): string {
  const safeName = name.replace(/[<>:"/\\|?*\u0000-\u001f]/g, '').trim().replace(/[. ]+$/, '').slice(0, 60) || '소비';
  return `WorthIt-${safeName}-${date}`;
}

export async function renderReceipt(node: HTMLElement): Promise<HTMLCanvasElement> {
  await document.fonts.ready;
  const { toCanvas } = await import('html-to-image');
  return toCanvas(node, {
    pixelRatio: 3,
    backgroundColor: '#f8fafc',
    // Use local fallback fonts in the image without downloading the complete Korean webfont.
    skipFonts: true,
  });
}

export async function receiptPng(node: HTMLElement): Promise<Blob> {
  const canvas = await renderReceipt(node);
  return new Promise((resolve, reject) => canvas.toBlob(
    blob => blob ? resolve(blob) : reject(new Error('이미지를 만들지 못했어요. 다시 시도해 주세요.')),
    'image/png'
  ));
}

export function downloadReceipt(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Keep the URL alive until the browser has picked up the download.
  window.setTimeout(() => URL.revokeObjectURL(url), 60_000);
}

export async function saveReceiptPdf(node: HTMLElement, filename: string): Promise<void> {
  const [canvas, { jsPDF }] = await Promise.all([renderReceipt(node), import('jspdf')]);
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true });
  const width = Math.min(110, 273 * canvas.width / canvas.height);
  const height = width * canvas.height / canvas.width;
  pdf.setProperties({ title: 'WorthIt 소비 영수증', creator: 'WorthIt' });
  pdf.addImage(canvas.toDataURL('image/png'), 'PNG', (210 - width) / 2, 12, width, height);
  await pdf.save(`${filename}.pdf`, { returnPromise: true });
}
