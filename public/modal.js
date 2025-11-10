// Modal functions
function openDevelopedBy() {
    document.getElementById('developedByModal').style.display = 'block';
    // Resize any member images to the modal target size for consistency
    const imgs = document.querySelectorAll('#developedByModal .member img');
    imgs.forEach(img => {
        // allow reprocessing in case we previously applied a 'cover' crop; remove flag
        delete img.dataset.resized;
        resizeImageToFit(img, 150, 150).catch(err => console.warn('Image resize failed', err));
    });
}

function closeDevelopedBy() {
    document.getElementById('developedByModal').style.display = 'none';
}

// Close modal when clicking outside of it
window.onclick = function(event) {
    const modal = document.getElementById('developedByModal');
    if (event.target == modal) {
        modal.style.display = 'none';
    }
}

// Resize an HTMLImageElement to the requested width/height using contain semantics (fit whole image)
function resizeImageToFit(imgEl, targetW, targetH) {
    return new Promise((resolve, reject) => {
        const src = imgEl.src;
        if (!src) return reject(new Error('img has no src'));

        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
            try {
                const sw = img.naturalWidth;
                const sh = img.naturalHeight;
                // calculate scale to contain (fit entire image)
                const scale = Math.min(targetW / sw, targetH / sh);
                const dw = Math.round(sw * scale);
                const dh = Math.round(sh * scale);

                // center the image in the canvas
                const offsetX = Math.round((targetW - dw) / 2);
                const offsetY = Math.round((targetH - dh) / 2);

                const canvas = document.createElement('canvas');
                canvas.width = targetW;
                canvas.height = targetH;
                const ctx = canvas.getContext('2d');

                // fill with transparent or neutral background to avoid harsh borders
                ctx.fillStyle = '#e2e8f0';
                ctx.fillRect(0, 0, targetW, targetH);

                // draw the scaled image centered
                ctx.drawImage(img, offsetX, offsetY, dw, dh);

                // convert to jpeg data URL to reduce size
                const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
                imgEl.src = dataUrl;
                imgEl.dataset.resized = '1';
                resolve();
            } catch (e) {
                reject(e);
            }
        };
        img.onerror = (e) => reject(new Error('failed to load image'));
        img.src = src;
    });
}