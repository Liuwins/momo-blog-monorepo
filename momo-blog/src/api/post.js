import request from './request'

export function getPosts(params) {
  return request.get('/posts', { params })
}

export function getPostDetail(id) {
  return request.get(`/posts/${id}`)
}

export function createPost(data) {
  return request.post('/posts', data)
}

export function updatePost(id, data) {
  return request.put(`/posts/${id}`, data)
}

export function deletePost(id) {
  return request.delete(`/posts/${id}`)
}

export function getUserPosts(userId, params) {
  return request.get(`/users/${userId}/posts`, { params })
}

export function toggleLike(postId, visitorId) {
  const params = visitorId ? { visitorId } : {}
  return request.post(`/posts/${postId}/like`, null, { params })
}

export function getLikeStatus(postId, visitorId) {
  const params = visitorId ? { visitorId } : {}
  return request.get(`/posts/${postId}/like-status`, { params })
}

export function getTags(period) {
  const params = period ? { period } : {}
  return request.get('/posts/tags', { params })
}

// 评论
export function getComments(postId) {
  return request.get(`/comments/post/${postId}`)
}

export function createComment(data) {
  return request.post('/comments', data)
}

export function deleteComment(id) {
  return request.delete(`/comments/${id}`)
}

export function approveComment(id) {
  return request.post(`/comments/${id}/approve`)
}

export function rejectComment(id) {
  return request.post(`/comments/${id}/reject`)
}

export function getPendingComments(params) {
  return request.get('/comments/admin/pending', { params })
}

export function getPendingCount() {
  return request.get('/comments/admin/pending-count')
}
