import { useRef, useState } from 'react'
import { ArrowLeft, ExternalLink } from 'lucide-react'
import PresetStudio, { type PresetEditorPayload } from './PresetStudio'

const BLOCKBENCH_PATH = '/blockbench/'

export default function App() {
  const [editorOpen, setEditorOpen] = useState(false)
  const [pendingPayload, setPendingPayload] = useState<PresetEditorPayload | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)

  const handleEditorLoad = () => {
    if (!pendingPayload) return
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'pixcape:set-language', language: pendingPayload.language || 'zh-CN' },
      window.location.origin,
    )
    iframeRef.current?.contentWindow?.postMessage(
      { type: 'pixcape:import-preset', payload: pendingPayload },
      window.location.origin,
    )
  }

  return (
    <>
      <div style={{ display: editorOpen ? 'none' : 'block' }}>
        <PresetStudio onOpenEditor={(payload) => {
          setPendingPayload(payload)
          setEditorOpen(true)
        }} />
      </div>
      {editorOpen && (
        <div style={{ position: 'fixed', inset: 0, zIndex: 9999, display: 'flex', flexDirection: 'column', background: '#111318', color: '#f5f5f5' }}>
          <div style={{ height: 48, minHeight: 48, display: 'flex', alignItems: 'center', gap: 16, padding: '0 16px', borderBottom: '1px solid #30333b', background: '#17191f' }}>
            <button onClick={() => setEditorOpen(false)} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, border: '1px solid #454955', borderRadius: 8, padding: '7px 12px', color: 'inherit', background: '#252832', cursor: 'pointer' }}>
              <ArrowLeft size={16} /> {pendingPayload?.language === 'en-US' ? 'Back to Studio' : '返回皮肤工作台'}
            </button>
            <span style={{ fontSize: 13, color: '#b7bbc6' }}>{pendingPayload?.language === 'en-US' ? 'Pixcape Studio · Blockbench (GPL-3.0-or-later)' : 'Pixcape Studio · Blockbench（GPL-3.0-or-later）'}</span>
            <a href={BLOCKBENCH_PATH} target="_blank" rel="noreferrer" style={{ marginLeft: 'auto', display: 'inline-flex', alignItems: 'center', gap: 6, color: '#c8c9ff', fontSize: 13 }}>
              {pendingPayload?.language === 'en-US' ? 'Open in new tab' : '在新标签页打开'} <ExternalLink size={14} />
            </a>
          </div>
          <iframe
            ref={iframeRef}
            title="Pixcape 内置 Blockbench 完整模型编辑器"
            src={BLOCKBENCH_PATH}
            onLoad={handleEditorLoad}
            allow="clipboard-read; clipboard-write; fullscreen"
            style={{ border: 0, width: '100%', flex: 1, minHeight: 0, background: '#111318' }}
          />
        </div>
      )}
    </>
  )
}
