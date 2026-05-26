'use client';

export const downloadBlob = (blob: Blob, fileName: string) => {
  const link = document.createElement('a');
  const objectUrl = URL.createObjectURL(blob);

  link.href = objectUrl;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(objectUrl);
};

export const shareFileOrDownload = async ({
  blob,
  fileName,
  title,
  text,
}: {
  blob: Blob;
  fileName: string;
  title: string;
  text: string;
}) => {
  const file = new File([blob], fileName, { type: blob.type || 'application/octet-stream' });
  const shareData: ShareData = {
    title,
    text,
    files: [file],
  };

  if (navigator.canShare?.(shareData)) {
    try {
      await navigator.share(shareData);
      return;
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        return;
      }
    }
  }

  downloadBlob(blob, fileName);
};
