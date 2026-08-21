// 获取或生成游客 ID
export function getVisitorId() {
  let vid = localStorage.getItem('visitorId')
  if (!vid) {
    vid = 'v_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 8)
    localStorage.setItem('visitorId', vid)
  }
  return vid
}

// 获取游客昵称
export function getVisitorNickname() {
  return localStorage.getItem('visitorNickname') || ''
}

// 设置游客昵称
export function setVisitorNickname(name) {
  localStorage.setItem('visitorNickname', name)
}
