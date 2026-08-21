import request from './request'

export function login(data) {
  return request.post('/auth/login', data)
}

// 公开接口：获取博主资料（无需登录），供访客浏览封面/头像
export function getOwnerProfile() {
  return request.get('/users/owner')
}

export function getUserInfo(id) {
  return request.get(`/users/${id}`)
}

export function getMe() {
  return request.get('/users/me')
}

export function updateUserInfo(data) {
  return request.put('/users/profile', data)
}

// 关注 / 取消关注
export function followUser(userId) {
  return request.post(`/follows/${userId}`)
}

export function unfollowUser(userId) {
  return request.delete(`/follows/${userId}`)
}

// 关注的人的动态流
export function getFollowingPosts(page = 1, pageSize = 10) {
  return request.get('/follows/posts', { params: { page, pageSize } })
}
