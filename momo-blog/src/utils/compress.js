export function compressImage(file, maxWidth = 800, maxSize = 2 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    // 非图片或过小且无需缩放的，直接返回
    if (!file.type || !file.type.startsWith('image/')) {
      resolve(file)
      return
    }

    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = (e) => {
      const img = new Image()
      img.src = e.target.result
      img.onload = () => {
        // 宽度未超限且体积未超限，无需压缩
        if (img.width <= maxWidth && file.size <= maxSize) {
          resolve(file)
          return
        }

        const canvas = document.createElement('canvas')
        let { width, height } = img

        if (width > maxWidth) {
          height = (maxWidth / width) * height
          width = maxWidth
        }

        canvas.width = width
        canvas.height = height
        const ctx = canvas.getContext('2d')
        ctx.drawImage(img, 0, 0, width, height)

        canvas.toBlob(
          (blob) => {
            if (blob.size <= maxSize) {
              resolve(new File([blob], file.name, { type: file.type }))
            } else {
              const quality = Math.min(0.9, maxSize / blob.size)
              canvas.toBlob(
                (blob2) => {
                  resolve(new File([blob2], file.name, { type: file.type }))
                },
                file.type,
                quality
              )
            }
          },
          file.type,
          0.9
        )
      }
      img.onerror = () => resolve(file)
    }
    reader.onerror = reject
  })
}
