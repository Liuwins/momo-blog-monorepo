<template>
  <div class="profile-page">
    <app-nav-bar title="个人主页" show-back />

    <div class="profile-header">
      <div
        class="profile-bg"
        :class="{ 'is-owner': isOwner }"
        :style="profile.bgImage ? { backgroundImage: 'linear-gradient(rgba(0,0,0,0.25), rgba(0,0,0,0.4)), url(' + profile.bgImage + ')' } : {}"
        @click="handleBgUpload"
      >
        <div v-if="isOwner" class="bg-upload-hint">
          <van-icon name="photograph" color="#fff" size="20" />
          <span>更换封面</span>
        </div>
      </div>
      <div class="profile-info">
        <div v-if="isOwner" class="avatar-wrapper" @click="showEdit = true">
          <van-image round width="64" height="64" :src="profile.avatar" class="profile-avatar">
            <template #error>
              <img class="avatar-error-img" :src="defaultAvatar" alt="头像" />
            </template>
          </van-image>
          <div class="avatar-edit-mask">
            <van-icon name="photograph" color="#fff" size="16" />
          </div>
        </div>
        <van-image
          v-else
          round
          width="64"
          height="64"
          :src="profile.avatar"
          class="profile-avatar"
        >
          <template #error>
            <img class="avatar-error-img" :src="defaultAvatar" alt="头像" />
          </template>
        </van-image>
        <div class="profile-nickname">{{ profile.nickname }}</div>
        <div class="profile-signature">{{ profile.signature || '这个人很懒，什么都没写' }}</div>
      </div>
      <div class="profile-stats">
        <div class="stat-item" @click="router.push('/profile/' + profile.id)">
          <div class="stat-num">{{ profile.postCount }}</div>
          <div class="stat-label">动态</div>
        </div>
        <div class="stat-item">
          <div class="stat-num">{{ profile.followerCount }}</div>
          <div class="stat-label">粉丝</div>
        </div>
        <div class="stat-item">
          <div class="stat-num">{{ profile.followingCount }}</div>
          <div class="stat-label">关注</div>
        </div>
      </div>
      <MusicPlayer
        v-if="profile.bgMusic"
        :src="profile.bgMusic"
        :auto-play="!isOwner"
        class="profile-music"
      />
      <van-button
        v-if="isOwner"
        size="small"
        plain
        round
        color="#07C160"
        class="edit-btn"
        @click="showEdit = true"
      >
        编辑资料
      </van-button>
      <!-- 非本人：关注/已关注按钮 -->
      <van-button
        v-else-if="userStore.isLoggedIn && profile.id"
        size="small"
        :plain="isFollowing"
        round
        :color="isFollowing ? '#999' : '#07C160'"
        class="edit-btn"
        :loading="followLoading"
        @click="handleToggleFollow"
      >
        {{ isFollowing ? '已关注' : '+ 关注' }}
      </van-button>
    </div>

    <!-- 快捷入口：暗黑模式（仅本人可见） -->
    <div v-if="isOwner" class="quick-entry">
      <div class="entry-item">
        <van-icon name="bulb-o" size="20" color="#07C160" />
        <span>暗黑模式</span>
        <van-switch :model-value="isDark" size="20px" class="arrow" @change="toggleTheme" />
      </div>
    </div>

    <div class="profile-posts">
      <van-pull-refresh v-model="refreshing" @refresh="onRefresh">
        <van-list
          v-model:loading="loading"
          :finished="finished"
          finished-text="没有更多了"
          @load="onLoad"
        >
          <PostCard v-for="item in posts" :key="item.id" :post="item" @comment="handleComment" />
          <van-empty v-if="posts.length === 0 && !loading" description="暂无动态" />
        </van-list>
      </van-pull-refresh>
    </div>

    <!-- 返回顶部 -->
    <BackToTop />

    <van-popup v-model:show="showEdit" position="bottom" round :style="{ height: '60dvh' }">
      <div class="edit-popup">
        <div class="edit-header">
          <span>编辑资料</span>
          <van-icon name="cross" @click="showEdit = false" />
        </div>
        <van-form @submit="handleEdit">
          <van-cell-group inset>
            <div class="avatar-edit-row">
              <span class="avatar-edit-label">头像</span>
              <van-uploader
                v-model="avatarFile"
                :max-count="1"
                :max-size="5 * 1024 * 1024"
                :before-read="beforeAvatarRead"
                :after-read="afterAvatarRead"
                preview-size="48"
                :preview-image="true"
                :deletable="false"
                accept="image/*"
              >
                <van-image round width="48" height="48" :src="editForm.avatar || profile.avatar">
                  <template #error>
                    <img class="avatar-error-img" :src="defaultAvatar" alt="头像" />
                  </template>
                </van-image>
                <div class="avatar-upload-hint">点击更换</div>
              </van-uploader>
            </div>
            <van-field
              v-model="editForm.nickname"
              label="昵称"
              placeholder="请输入昵称"
              maxlength="20"
              :rules="[{ required: true, message: '请输入昵称' }]"
            />
            <van-field
              v-model="editForm.signature"
              label="个性签名"
              placeholder="请输入个性签名"
              maxlength="50"
            />
            <van-field label="背景音乐">
              <template #input>
                <div class="music-edit-row">
                  <input
                    v-model="editForm.bgMusic"
                    placeholder="粘贴音乐URL或上传"
                    class="music-url-input"
                  />
                  <van-uploader
                    :before-read="handleAudioUpload"
                    accept="audio/*"
                    :max-count="1"
                    :show-upload="true"
                    :preview-image="false"
                    :deletable="false"
                  >
                    <van-button size="small" plain type="primary" color="#07C160">
                      上传
                    </van-button>
                  </van-uploader>
                  <van-icon
                    v-if="editForm.bgMusic"
                    name="cross"
                    size="16"
                    color="#999"
                    class="music-clear-icon"
                    @click="editForm.bgMusic = ''"
                  />
                </div>
              </template>
            </van-field>
          </van-cell-group>
          <div style="margin: 16px">
            <van-button round block type="primary" native-type="submit" color="#07C160">
              保存
            </van-button>
          </div>
        </van-form>
      </div>
    </van-popup>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { toast } from '@/utils/toast'
import { useUserStore } from '@/stores/user'
import { useTheme } from '@/utils/theme'
import { getUserInfo, getMe, getOwnerProfile, updateUserInfo, followUser, unfollowUser } from '@/api/user'
import { getUserPosts } from '@/api/post'
import { uploadImages, uploadAudio } from '@/api/upload'
import { compressImage } from '@/utils/compress'
import BackToTop from '@/components/BackToTop.vue'
import MusicPlayer from '@/components/MusicPlayer.vue'

const route = useRoute()
const router = useRouter()
const userStore = useUserStore()
const { isDark, toggleTheme } = useTheme()

const defaultAvatar = 'https://api.dicebear.com/7.x/avataaars/svg?seed=default'

const profile = ref({
  id: 0,
  nickname: '',
  avatar: '',
  signature: '',
  bgImage: '',
  bgMusic: '',
  postCount: 0,
  followerCount: 0,
  followingCount: 0
})

const posts = ref([])
const loading = ref(false)
const finished = ref(false)
const refreshing = ref(false)
const postPage = ref(1)

// 竞态保护：每次加载递增版本号，回调时校验版本是否匹配
let loadVersion = 0
// 防止 loadProfile 和 van-list 的 onLoad 重复触发首屏加载
let profileReady = false

const showEdit = ref(false)
const editForm = ref({ nickname: '', signature: '', avatar: '', bgImage: '', bgMusic: '' })
const avatarFile = ref([])
// 关注状态
const isFollowing = ref(false)
const followLoading = ref(false)

const isOwner = computed(() => {
  return userStore.userInfo?.id === profile.value.id
})

onMounted(async () => {
  await loadProfile()
})

// 路由参数变化时重新加载（/profile/1 -> /profile/2）
watch(
  () => route.params.id,
  (newId, oldId) => {
    if (newId && newId !== oldId) {
      resetAndLoad()
    }
  }
)

function resetAndLoad() {
  posts.value = []
  postPage.value = 1
  finished.value = false
  loading.value = false
  profileReady = false
  loadProfile()
}

async function loadProfile() {
  const currentVersion = ++loadVersion
  try {
    let userId = route.params.id
    // 刷新后 userInfo 为 null，且路由没有 id 时，用 /users/me 拿当前用户
    if (!userId && !userStore.userInfo) {
      // 游客未登录：获取博主资料
      if (!userStore.isLoggedIn) {
        const owner = await getOwnerProfile()
        if (currentVersion !== loadVersion) return
        if (owner?.id) {
          userId = owner.id
        } else {
          toast.fail('加载失败')
          return
        }
      } else {
        const me = await getMe()
        // 竞态校验：如果期间又切换了用户，放弃本次结果
        if (currentVersion !== loadVersion) return
        userStore.setUserInfo(me)
        userId = me.id
      }
    }
    if (!userId) {
      userId = userStore.userInfo?.id
    }
    if (!userId) {
      toast.fail('加载失败')
      return
    }
    const res = await getUserInfo(userId)
    // 竞态校验
    if (currentVersion !== loadVersion) return
    profile.value = res.user || res
    if (!profile.value || !profile.value.id) {
      toast.fail('加载失败')
      return
    }
    // 同步关注状态
    isFollowing.value = !!res.isFollowing
    editForm.value = {
      nickname: profile.value.nickname,
      signature: profile.value.signature,
      avatar: profile.value.avatar || '',
      bgImage: profile.value.bgImage || '',
      bgMusic: profile.value.bgMusic || ''
    }
    // profile 就绪，允许 onLoad 加载文章列表
    profileReady = true
    // 手动触发首屏加载（van-list 挂载时 profile.id 还是 0 被跳过）
    if (posts.value.length === 0 && !finished.value && !loading.value) {
      onLoad()
    }
  } catch (e) {
    if (currentVersion !== loadVersion) return
    toast.fail('加载失败')
  }
}

async function onLoad() {
  // 等 profile 加载完成（van-list 挂载时 profile.id 还是 0）
  if (!profileReady || !profile.value.id) {
    loading.value = false
    return
  }
  // 防止与 loadProfile 的手动触发重复
  if (loading.value) return
  loading.value = true
  try {
    const res = await getUserPosts(profile.value.id, {
      page: postPage.value,
      pageSize: 10
    })
    if (!res.list || res.list.length < 10) {
      finished.value = true
    }
    // 适配 PostCard 需要的 user 嵌套结构
    const items = (res.list || []).map((p) => ({
      ...p,
      user: {
        id: p.userId,
        nickname: p.nickname,
        avatar: p.avatar
      }
    }))
    posts.value.push(...items)
    postPage.value++
  } catch (e) {
    finished.value = true
    toast.fail('加载失败')
  } finally {
    loading.value = false
  }
}

async function onRefresh() {
  posts.value = []
  postPage.value = 1
  finished.value = false
  loading.value = false
  refreshing.value = false
  await onLoad()
}

function beforeAvatarRead(file) {
  if (file.size > 5 * 1024 * 1024) {
    toast.fail('图片不能超过5MB')
    return false
  }
  return true
}

async function afterAvatarRead(file) {
  try {
    const compressed = await compressImage(file.file, 400, 5 * 1024 * 1024)
    const res = await uploadImages([compressed])
    if (res.urls && res.urls.length > 0) {
      editForm.value.avatar = res.urls[0]
      toast.success('头像已上传')
    } else {
      toast.fail('上传失败')
    }
  } catch (e) {
    toast.fail('头像上传失败')
  }
}

async function handleEdit() {
  try {
    const payload = {
      nickname: editForm.value.nickname,
      signature: editForm.value.signature
    }
    if (editForm.value.avatar && editForm.value.avatar.trim()) {
      payload.avatar = editForm.value.avatar.trim()
    }
    payload.bgImage = (editForm.value.bgImage || '').trim()
    payload.bgMusic = (editForm.value.bgMusic || '').trim()
    await updateUserInfo(payload)
    profile.value.nickname = editForm.value.nickname
    profile.value.signature = editForm.value.signature
    if (editForm.value.avatar && editForm.value.avatar.trim()) {
      profile.value.avatar = editForm.value.avatar.trim()
    }
    profile.value.bgImage = payload.bgImage
    profile.value.bgMusic = payload.bgMusic
    userStore.setUserInfo({ ...userStore.userInfo, ...payload })
    showEdit.value = false
    toast.success('保存成功')
  } catch (e) {
    toast.fail('保存失败')
  }
}

// 点击背景图区域上传新背景图（仅本人）
async function handleBgUpload() {
  if (!isOwner.value) return
  const input = document.createElement('input')
  input.type = 'file'
  input.accept = 'image/*'
  input.onchange = async (e) => {
    const file = e.target.files && e.target.files[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) {
      toast.fail('图片不能超过5MB')
      return
    }
    try {
      const compressed = await compressImage(file, 1280, 5 * 1024 * 1024)
      const res = await uploadImages([compressed])
      if (res.urls && res.urls.length > 0) {
        const bgImage = res.urls[0]
        await updateUserInfo({ bgImage })
        profile.value.bgImage = bgImage
        editForm.value.bgImage = bgImage
        toast.success('背景图已更新')
      } else {
        toast.fail('上传失败')
      }
    } catch (e) {
      toast.fail('上传失败')
    }
  }
  input.click()
}

// 编辑弹窗中上传音频文件
async function handleAudioUpload(file) {
  if (!file) return false
  const allowedTypes = ['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/aac', 'audio/mp4', 'audio/x-m4a', 'audio/webm', 'audio/flac', 'audio/x-flac']
  if (!allowedTypes.includes(file.type)) {
    toast.fail(`不支持的音频格式（${file.type || '未知'}），支持 mp3/wav/ogg/aac/m4a/flac/webm`)
    return false
  }
  if (file.size > 20 * 1024 * 1024) {
    toast.fail('音频不能超过20MB')
    return false
  }
  try {
    const res = await uploadAudio(file)
    if (res.url) {
      editForm.value.bgMusic = res.url
      toast.success('音频已上传')
    } else {
      toast.fail('音频上传失败：服务器未返回文件地址')
    }
  } catch (e) {
    // 具体原因（类型/大小/权限/网络）已由请求拦截器弹出，这里只兜底并记录日志
    console.error('[音频上传失败]', e?.response?.status, e?.response?.data || e)
    if (!e?.__toasted) {
      toast.fail(e?.message || '音频上传失败，请稍后重试')
    }
  }
  return false
}

function handleComment(_post) {}

// 关注 / 取消关注（乐观更新 + 失败回滚）
async function handleToggleFollow() {
  if (followLoading.value) return
  followLoading.value = true
  const prev = isFollowing.value
  isFollowing.value = !prev
  // 同步乐观更新粉丝数
  profile.value.followerCount = Math.max(
    0,
    (profile.value.followerCount || 0) + (isFollowing.value ? 1 : -1)
  )
  try {
    if (isFollowing.value) {
      await followUser(profile.value.id)
      toast.success('已关注')
    } else {
      await unfollowUser(profile.value.id)
      toast.success('已取消关注')
    }
  } catch (e) {
    // 回滚
    isFollowing.value = prev
    profile.value.followerCount = Math.max(0, (profile.value.followerCount || 0) + (prev ? 1 : -1))
    toast.fail('操作失败')
  } finally {
    followLoading.value = false
  }
}
</script>

<style scoped>
.profile-page {
  min-height: 100dvh;
  background: var(--bg-card);
}

.profile-header {
  position: relative;
  padding-bottom: 16px;
}

.profile-bg {
  position: relative;
  height: 120px;
  background: linear-gradient(135deg, var(--theme-color) 0%, var(--theme-color-light) 100%);
  background-size: cover;
  background-position: center;
  background-repeat: no-repeat;
}

.profile-bg.is-owner {
  cursor: pointer;
}

.bg-upload-hint {
  position: absolute;
  right: 12px;
  bottom: 12px;
  display: flex;
  align-items: center;
  gap: 4px;
  padding: 4px 10px;
  background: rgba(0, 0, 0, 0.4);
  border-radius: 14px;
  color: #fff;
  font-size: 12px;
  backdrop-filter: blur(4px);
}

.profile-music {
  margin: 12px 16px 0;
}

.profile-info {
  text-align: center;
  margin-top: -32px;
}

.profile-avatar {
  border: 3px solid #fff;
  border-radius: 50%;
}

.avatar-error-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.profile-nickname {
  font-size: 18px;
  font-weight: 600;
  margin-top: 8px;
}

.profile-signature {
  font-size: 13px;
  color: var(--text-light);
  margin-top: 4px;
}

.profile-stats {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin-top: 16px;
}

.stat-item {
  text-align: center;
}

.stat-num {
  font-size: 18px;
  font-weight: 600;
}

.stat-label {
  font-size: 12px;
  color: var(--text-light);
  margin-top: 2px;
}

.edit-btn {
  display: block;
  margin: 12px auto 0;
}

.quick-entry {
  border-top: 8px solid var(--border-light);
  border-bottom: 8px solid var(--border-light);
}

.entry-item {
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 14px 16px;
  font-size: 15px;
  color: var(--text-primary);
  cursor: pointer;
  background: var(--bg-card);
}

.entry-item:active {
  background: var(--bg-hover);
}

.entry-item .arrow {
  margin-left: auto;
}

.profile-posts {
  border-top: 8px solid var(--border-light);
}

.edit-popup {
  height: 100%;
  display: flex;
  flex-direction: column;
}

.edit-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px;
  font-size: 16px;
  font-weight: 500;
  border-bottom: 1px solid var(--border-light);
}

.avatar-edit-row {
  display: flex;
  align-items: center;
  gap: 12px;
  padding: 12px 16px;
}

.avatar-edit-label {
  width: 56px;
  font-size: 14px;
  color: var(--text-primary);
  flex-shrink: 0;
}

.avatar-upload-hint {
  font-size: 12px;
  color: var(--text-link);
  text-align: center;
  margin-top: 4px;
}

.avatar-wrapper {
  position: relative;
  display: inline-block;
  cursor: pointer;
}

.avatar-edit-mask {
  position: absolute;
  bottom: 0;
  right: 0;
  width: 20px;
  height: 20px;
  border-radius: 50%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
}

.music-edit-row {
  display: flex;
  align-items: center;
  gap: 8px;
  width: 100%;
}

.music-url-input {
  flex: 1;
  min-width: 0;
  border: 1px solid var(--border-color);
  border-radius: 4px;
  padding: 4px 8px;
  font-size: 14px;
  color: var(--text-primary);
  background: var(--bg-card);
  outline: none;
}

.music-url-input:focus {
  border-color: var(--theme-color);
}

.music-clear-icon {
  cursor: pointer;
  flex-shrink: 0;
}
</style>
