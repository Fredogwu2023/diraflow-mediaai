import { useState } from 'react'

export default function VideoStudio({
  assets = [],
  canCreateContent,
  apiRequest,
  apiBaseUrl,
  getStoredToken,
  onSaved,
}) {
  const [title, setTitle] = useState('DiraFlow MediaAI Showcase')
  const [caption, setCaption] = useState(
    'Create. Communicate. Produce. Distribute.'
  )
  const [secondsPerScene, setSecondsPerScene] = useState(3)
  const [selectedIds, setSelectedIds] = useState([])
  const [selectedAudioId, setSelectedAudioId] = useState('')
  const [audioVolume, setAudioVolume] = useState(35)
  const [busy, setBusy] = useState(false)
  const [status, setStatus] = useState('')
  const [error, setError] = useState('')

  const images = assets.filter(
    (asset) =>
      asset.status === 'AVAILABLE' &&
      typeof asset.mimeType === 'string' &&
      asset.mimeType.startsWith('image/')
  )

  const audioAssets = assets.filter(
    (asset) =>
      asset.status === 'AVAILABLE' &&
      typeof asset.mimeType === 'string' &&
      asset.mimeType.startsWith('audio/')
  )

  function toggleImage(id) {
    setSelectedIds((current) =>
      current.includes(id)
        ? current.filter((item) => item !== id)
        : [...current, id]
    )
  }

  async function loadImage(asset) {
    const link = await apiRequest(
      `/api/assets/${encodeURIComponent(asset.id)}/download-url`
    )

    if (!link?.success) {
      throw new Error(`Could not retrieve ${asset.originalFilename}.`)
    }

    let sourceUrl = link.downloadUrl
    let objectUrl = false

    if (link.localFile && link.fileUrl) {
      const token = getStoredToken()
      const response = await fetch(`${apiBaseUrl}${link.fileUrl}`, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!response.ok) {
        throw new Error(
          `Could not load ${asset.originalFilename} (${response.status}).`
        )
      }

      sourceUrl = URL.createObjectURL(await response.blob())
      objectUrl = true
    }

    if (!sourceUrl) {
      throw new Error(`No download link for ${asset.originalFilename}.`)
    }

    try {
      const image = new Image()
      image.src = sourceUrl

      await new Promise((resolve, reject) => {
        image.onload = resolve
        image.onerror = () =>
          reject(new Error(`Could not decode ${asset.originalFilename}.`))
      })

      return image
    } finally {
      if (objectUrl) URL.revokeObjectURL(sourceUrl)
    }
  }

  async function loadAudio(asset) {
    const link = await apiRequest(
      `/api/assets/${encodeURIComponent(asset.id)}/download-url`
    )

    if (!link?.success) {
      throw new Error(
        `Could not retrieve audio file: ${asset.originalFilename}.`
      )
    }

    let sourceUrl = link.downloadUrl
    let objectUrl = null

    if (link.localFile && link.fileUrl) {
      const token = getStoredToken()
      const fileUrl = /^https?:\/\//i.test(link.fileUrl)
        ? link.fileUrl
        : `${apiBaseUrl}${link.fileUrl.startsWith('/') ? '' : '/'}${link.fileUrl}`

      const response = await fetch(fileUrl, {
        headers: token ? { Authorization: `Bearer ${token}` } : {},
      })

      if (!response.ok) {
        throw new Error(`Could not load audio file (${response.status}).`)
      }

      sourceUrl = URL.createObjectURL(await response.blob())
      objectUrl = sourceUrl
    }

    if (!sourceUrl) {
      throw new Error('No download link was returned for the audio file.')
    }

    const audio = new Audio()
    audio.preload = 'auto'
    audio.loop = true
    audio.crossOrigin = 'anonymous'
    audio.src = sourceUrl

    try {
      await new Promise((resolve, reject) => {
        audio.oncanplay = resolve
        audio.onerror = () => reject(
          new Error('The selected audio could not be decoded by this browser.')
        )
        audio.load()
      })

      return { audio, objectUrl, sourceUrl }
    } catch (cause) {
      audio.pause()
      audio.removeAttribute('src')
      audio.load()

      if (objectUrl) URL.revokeObjectURL(objectUrl)

      throw cause
    }
  }
  async function uploadVideo(file) {
    const request = await apiRequest('/api/assets/upload-url', {
      method: 'POST',
      body: JSON.stringify({
        originalFilename: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
      }),
    })

    if (!request?.success || !request?.asset?.id) {
      throw new Error('The server did not return a valid upload request.')
    }

    if (request.uploadMode === 'local') {
      const formData = new FormData()
      formData.append('file', file)

      const token = getStoredToken()
      const response = await fetch(
        `${apiBaseUrl}/api/assets/${encodeURIComponent(request.asset.id)}/local-upload`,
        {
          method: 'POST',
          headers: token ? { Authorization: `Bearer ${token}` } : {},
          body: formData,
        }
      )

      const result = await response.json().catch(() => null)

      if (!response.ok || !result?.success) {
        throw new Error(result?.message || `Upload failed (${response.status}).`)
      }
    } else {
      if (!request.uploadUrl) {
        throw new Error('The server did not return a storage upload URL.')
      }

      const response = await fetch(request.uploadUrl, {
        method: 'PUT',
        headers: request.requiredHeaders || {
          'Content-Type': file.type,
        },
        body: file,
      })

      if (!response.ok) {
        throw new Error(`Storage upload failed (${response.status}).`)
      }

      const completion = await apiRequest(
        `/api/assets/${encodeURIComponent(request.asset.id)}/complete`,
        { method: 'POST' }
      )

      if (!completion?.success) {
        throw new Error('The server could not verify the uploaded video.')
      }
    }

    return request.asset
  }

  async function renderVideo() {
    if (!canCreateContent) {
      setError('Your account does not have permission to create media.')
      return
    }

    const scenes = images.filter((image) => selectedIds.includes(image.id))

    if (!scenes.length) {
      setError('Select at least one available image for your video.')
      return
    }

    if (
      typeof MediaRecorder === 'undefined' ||
      typeof HTMLCanvasElement.prototype.captureStream !== 'function'
    ) {
      setError('This browser does not support canvas video recording.')
      return
    }

    setBusy(true)
    setError('')
    setStatus('Loading selected images...')

    let stream
    let recorder
    let audioContext
    let audioElement
    let audioObjectUrl

    try {
      const loadedImages = []

      for (const asset of scenes) {
        loadedImages.push({
          asset,
          image: await loadImage(asset),
        })
      }

      const canvas = document.createElement('canvas')
      canvas.width = 1280
      canvas.height = 720

      const context = canvas.getContext('2d')

      if (!context) {
        throw new Error('Could not initialise the video canvas.')
      }

      const selectedAudio = audioAssets.find(
        (asset) => asset.id === selectedAudioId
      )

      const mimeTypeCandidates = selectedAudio
        ? [
            'video/webm;codecs=vp8,opus',
            'video/webm;codecs=vp9,opus',
            'video/webm',
          ]
        : [
            'video/webm;codecs=vp8',
            'video/webm;codecs=vp9',
            'video/webm',
          ]

      const mimeType = mimeTypeCandidates.find(
        (type) => MediaRecorder.isTypeSupported(type)
      )

      if (!mimeType) {
        throw new Error(
          'This browser does not support a compatible WebM recording format.'
        )
      }

      stream = canvas.captureStream(30)


      if (selectedAudio) {
        setStatus('Loading background audio...')

        const loadedAudio = await loadAudio(selectedAudio)
        audioElement = loadedAudio.audio
        audioObjectUrl = loadedAudio.objectUrl
        audioElement.volume = 1

        const AudioContextClass =
          window.AudioContext || window.webkitAudioContext

        if (!AudioContextClass) {
          throw new Error('This browser does not support audio mixing.')
        }

        audioContext = new AudioContextClass()
        await audioContext.resume()

        const audioSource = audioContext.createMediaElementSource(audioElement)
        const gainNode = audioContext.createGain()
        const destination = audioContext.createMediaStreamDestination()

        gainNode.gain.value = audioVolume / 100
        audioSource.connect(gainNode)
        gainNode.connect(destination)

        destination.stream.getAudioTracks().forEach((track) => {
          stream.addTrack(track)
        })
      }

      const chunks = []
      recorder = new MediaRecorder(stream, { mimeType })

      const recordingFinished = new Promise((resolve, reject) => {
        recorder.ondataavailable = (event) => {
          if (event.data?.size) chunks.push(event.data)
        }
        recorder.onerror = () =>
          reject(new Error('The browser encountered a recording error.'))
        recorder.onstop = () => resolve()
      })

      const drawScene = (scene, index) => {
        const image = scene.image
        const scale = Math.max(
          canvas.width / image.naturalWidth,
          canvas.height / image.naturalHeight
        )
        const width = image.naturalWidth * scale
        const height = image.naturalHeight * scale

        context.fillStyle = '#111827'
        context.fillRect(0, 0, canvas.width, canvas.height)
        context.drawImage(
          image,
          (canvas.width - width) / 2,
          (canvas.height - height) / 2,
          width,
          height
        )

        context.fillStyle = 'rgba(8, 15, 30, 0.72)'
        context.fillRect(0, 500, canvas.width, 220)

        context.fillStyle = '#ffffff'
        context.textBaseline = 'top'
        context.font = 'bold 38px Arial'
        context.fillText(title.trim() || 'DiraFlow MediaAI', 52, 526, 1160)

        context.font = '24px Arial'
        context.fillStyle = '#e5e7eb'
        context.fillText(caption.trim(), 54, 583, 1160)

        context.font = '18px Arial'
        context.fillStyle = '#cbd5e1'
        context.fillText(
          `Scene ${index + 1} of ${loadedImages.length}`,
          54,
          642
        )
      }

      recorder.start(250)

      if (audioElement) {
        await audioElement.play()
      }

      for (let index = 0; index < loadedImages.length; index += 1) {
        setStatus(`Recording scene ${index + 1} of ${loadedImages.length}...`)
        drawScene(loadedImages[index], index)

        const deadline = performance.now() + Number(secondsPerScene) * 1000

        while (performance.now() < deadline) {
          await new Promise((resolve) => setTimeout(resolve, 100))
        }
      }

      setStatus('Finalising video recording...')
      recorder.stop()

      await Promise.race([
        recordingFinished,
        new Promise((_, reject) => {
          window.setTimeout(
            () => reject(
              new Error('The browser did not finish finalising the recording within 15 seconds.')
            ),
            15000
          )
        }),
      ])

      const blob = new Blob(chunks, { type: mimeType })

      if (!blob.size) {
        throw new Error('The browser produced an empty video.')
      }

      const safeName =
        (title.trim() || 'diraflow-video')
          .replace(/[^a-z0-9_-]+/gi, '-')
          .replace(/^-+|-+$/g, '')
          .slice(0, 70) || 'diraflow-video'

      const file = new File([blob], `${safeName}.webm`, {
        type: 'video/webm',
      })

      setStatus(`Uploading rendered video (${(file.size / 1048576).toFixed(2)} MB)...`)
      const savedAsset = await uploadVideo(file)

      setStatus('Video uploaded. Refreshing the Media Library...')
      await onSaved?.(savedAsset)
      setStatus('Video saved and opened in Studio Theatre.')
    } catch (cause) {
      if (recorder?.state === 'recording') {
        recorder.stop()
      }

      setError(cause.message || 'Video rendering failed.')
      setStatus('')
    } finally {
      if (audioElement) {
        audioElement.pause()
        audioElement.removeAttribute('src')
        audioElement.load()
      }

      stream?.getTracks().forEach((track) => track.stop())

      if (audioContext && audioContext.state !== 'closed') {
        await audioContext.close().catch(() => {})
      }

      if (audioObjectUrl) {
        URL.revokeObjectURL(audioObjectUrl)
      }

      setBusy(false)
    }
  }

  return (
    <section className="workspace-card" style={{ marginTop: 24 }}>
      <h2>Video Studio â€” image to video</h2>
      <p>
        Create a 16:9 slideshow video from your available image assets.
        The video is rendered in this browser and saved to your Media Library.
      </p>

      <label style={{ display: 'block', marginBottom: 12 }}>
        Video title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          maxLength={120}
          disabled={busy}
          style={{ display: 'block', width: '100%', marginTop: 6 }}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 12 }}>
        Scene caption
        <input
          value={caption}
          onChange={(event) => setCaption(event.target.value)}
          maxLength={180}
          disabled={busy}
          style={{ display: 'block', width: '100%', marginTop: 6 }}
        />
      </label>

      <label style={{ display: 'block', marginBottom: 16 }}>
        Seconds per scene
        <select
          value={secondsPerScene}
          onChange={(event) => setSecondsPerScene(Number(event.target.value))}
          disabled={busy}
          style={{ display: 'block', marginTop: 6 }}
        >
          <option value={2}>2 seconds</option>
          <option value={3}>3 seconds</option>
          <option value={5}>5 seconds</option>
          <option value={8}>8 seconds</option>
        </select>
      </label>

      <h3>Background audio</h3>
      <p>
        Optional: choose an audio file already uploaded to your Media Library.
        The audio will loop if it is shorter than the slideshow.
      </p>

      <label style={{ display: 'block', marginBottom: 12 }}>
        Audio track
        <select
          value={selectedAudioId}
          onChange={(event) => setSelectedAudioId(event.target.value)}
          disabled={busy}
          style={{ display: 'block', width: '100%', marginTop: 6 }}
        >
          <option value="">No background audio</option>
          {audioAssets.map((asset) => (
            <option key={asset.id} value={asset.id}>
              {asset.originalFilename}
            </option>
          ))}
        </select>
      </label>

      {audioAssets.length === 0 && (
        <p>Upload an MP3, WAV, OGG or other supported audio file to the Media Library first.</p>
      )}

      <label style={{ display: 'block', marginBottom: 20 }}>
        Background volume: {audioVolume}%
        <input
          type="range"
          min="0"
          max="100"
          step="5"
          value={audioVolume}
          onChange={(event) => setAudioVolume(Number(event.target.value))}
          disabled={busy || !selectedAudioId}
          style={{ display: 'block', width: '100%', marginTop: 6 }}
        />
      </label>

      <h3>Select images ({selectedIds.length} selected)</h3>

      {images.length === 0 ? (
        <p>Upload at least one image before creating a video.</p>
      ) : (
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
            gap: 10,
          }}
        >
          {images.map((asset) => (
            <label
              key={asset.id}
              style={{
                display: 'flex',
                alignItems: 'flex-start',
                gap: 8,
                padding: 12,
                border: '1px solid var(--border-color, #dfe4ec)',
                borderRadius: 10,
                overflowWrap: 'anywhere',
              }}
            >
              <input
                type="checkbox"
                checked={selectedIds.includes(asset.id)}
                onChange={() => toggleImage(asset.id)}
                disabled={busy}
              />
              <span>{asset.originalFilename}</span>
            </label>
          ))}
        </div>
      )}

      <div style={{ marginTop: 18 }}>
        <button
          type="button"
          className="primary-button"
          onClick={renderVideo}
          disabled={busy || !canCreateContent || images.length === 0}
        >
          {busy ? 'Creating video...' : 'Render and save WebM video'}
        </button>
      </div>

      {status && <p role="status" style={{ marginTop: 12 }}>{status}</p>}
      {error && <p role="alert" style={{ marginTop: 12 }}>{error}</p>}
      {!canCreateContent && (
        <p>Content creation permission is required to render and save videos.</p>
      )}
    </section>
  )
}
