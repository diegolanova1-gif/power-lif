import type { MediaType } from './media'

const SKIP_VIDEO_BELOW = 2 * 1024 * 1024

export async function compressMedia(
  file: File,
  mediaType: MediaType,
  onProgress?: (label: string, ratio: number) => void,
): Promise<File> {
  if (mediaType === 'image') return compressImage(file)
  if (mediaType === 'video') return compressVideo(file, onProgress)
  return file
}

// Canvas resize → JPEG 0.8, max 1920px
function compressImage(file: File): Promise<File> {
  const MAX = 1920
  return new Promise<File>(resolve => {
    const img = new Image()
    img.onload = () => {
      URL.revokeObjectURL(img.src)
      let { width, height } = img
      if (width <= MAX && height <= MAX && file.size < 500_000) {
        resolve(file)
        return
      }
      if (width > height && width > MAX) {
        height = Math.round(height * (MAX / width))
        width = MAX
      } else if (height > MAX) {
        width = Math.round(width * (MAX / height))
        height = MAX
      }
      const canvas = document.createElement('canvas')
      canvas.width = width
      canvas.height = height
      canvas.getContext('2d')!.drawImage(img, 0, 0, width, height)
      canvas.toBlob(
        blob => {
          if (!blob || blob.size >= file.size) { resolve(file); return }
          resolve(new File([blob], file.name.replace(/\.[^.]+$/, '.jpg'), { type: 'image/jpeg' }))
        },
        'image/jpeg',
        0.8,
      )
    }
    img.onerror = () => { URL.revokeObjectURL(img.src); resolve(file) }
    img.src = URL.createObjectURL(file)
  })
}

// FFmpeg.wasm → 480p H.264 CRF 28, AAC 64k
let ffmpegInstance: Awaited<ReturnType<typeof initFFmpeg>> | null = null
let ffmpegLoadPromise: Promise<Awaited<ReturnType<typeof initFFmpeg>>> | null = null

async function initFFmpeg() {
  const { FFmpeg } = await import('@ffmpeg/ffmpeg')
  const { toBlobURL } = await import('@ffmpeg/util')
  const ff = new FFmpeg()
  const base = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/umd'
  await ff.load({
    coreURL: await toBlobURL(`${base}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${base}/ffmpeg-core.wasm`, 'application/wasm'),
  })
  return ff
}

async function getFFmpeg() {
  if (ffmpegInstance) return ffmpegInstance
  if (ffmpegLoadPromise) return ffmpegLoadPromise
  ffmpegLoadPromise = initFFmpeg().then(
    ff => { ffmpegInstance = ff; return ff },
    err => { ffmpegLoadPromise = null; throw err },
  )
  return ffmpegLoadPromise
}

async function compressVideo(
  file: File,
  onProgress?: (label: string, ratio: number) => void,
): Promise<File> {
  if (file.size < SKIP_VIDEO_BELOW) return file

  onProgress?.('Preparando compresor…', 0)
  const ff = await getFFmpeg()
  const { fetchFile } = await import('@ffmpeg/util')

  ff.on('progress', ({ progress }: { progress: number }) => {
    onProgress?.('Comprimiendo…', Math.min(progress, 1))
  })

  const ext = file.name.includes('.') ? file.name.split('.').pop()!.toLowerCase() : 'mp4'
  const inputName = `input.${ext}`
  const outputName = 'output.mp4'

  await ff.writeFile(inputName, await fetchFile(file))
  await ff.exec([
    '-i', inputName,
    '-vf', 'scale=-2:480',
    '-c:v', 'libx264',
    '-preset', 'fast',
    '-crf', '28',
    '-c:a', 'aac',
    '-b:a', '64k',
    '-movflags', '+faststart',
    '-y', outputName,
  ])

  const data = await ff.readFile(outputName)
  await ff.deleteFile(inputName)
  await ff.deleteFile(outputName)

  const blob = new Blob([new Uint8Array(data as Uint8Array)], { type: 'video/mp4' })
  if (blob.size >= file.size) return file

  return new File([blob], file.name.replace(/\.[^.]+$/, '.mp4'), { type: 'video/mp4' })
}
