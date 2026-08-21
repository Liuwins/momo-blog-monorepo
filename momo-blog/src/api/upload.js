import request from './request'

export function uploadImages(files) {
  const formData = new FormData()
  files.forEach((file) => {
    formData.append('files', file)
  })
  // 不要手动设置 Content-Type！axios 会自动生成正确的 multipart boundary
  return request.post('/upload', formData, {
    timeout: 60000
  })
}

export function uploadVideo(file) {
  const formData = new FormData()
  formData.append('file', file)
  // 视频较大，超时设为 3 分钟
  return request.post('/upload/video', formData, {
    timeout: 180000
  })
}

export function uploadAudio(file) {
  const formData = new FormData()
  formData.append('file', file)
  return request.post('/upload/audio', formData, {
    timeout: 120000
  })
}
