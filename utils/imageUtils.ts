export const resizeImage = (dataUrl: string, maxWidth: number, maxHeight: number): Promise<string> => {
    return new Promise((resolve) => {
        const img = new Image();
        img.onload = () => {
            const canvas = document.createElement('canvas');
            let width = img.width;
            let height = img.height;

            if (width > maxWidth) {
                height = Math.round((height * maxWidth) / width);
                width = maxWidth;
            }
            if (height > maxHeight) {
                width = Math.round((width * maxHeight) / height);
                height = maxHeight;
            }

            canvas.width = width;
            canvas.height = height;

            const ctx = canvas.getContext('2d');
            if (ctx) {
                ctx.drawImage(img, 0, 0, width, height);
                resolve(canvas.toDataURL('image/jpeg', 0.8));
            } else {
                resolve(dataUrl);
            }
        };
        img.src = dataUrl;
    });
};

export const dataURLtoBlob = (dataurl: string): Blob => {
    const arr = dataurl.split(',');
    const match = arr[0].match(/:(.*?);/);
    const mime = match ? match[1] : 'image/jpeg';
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new Blob([u8arr], { type: mime });
};

export const uploadFileToServer = async (file: Blob, filename: string, tutorName: string, lessonName: string = 'General'): Promise<string> => {
    const formData = new FormData();
    formData.append('file', file, filename);
    formData.append('tutor_name', tutorName);
    formData.append('learner_name', 'System');
    formData.append('lesson_name', lessonName);
    
    // Check if we are on deployed or internal
    // (You can also fetch from an env var, using tutorly.ir as requested)
    const resp = await fetch('https://tutorly.ir/cspro/upload.php', {
        method: 'POST',
        body: formData
    });
    const res = await resp.json();
    if (res.success) return res.filePath;
    throw new Error(res.error || 'Upload failed');
};
