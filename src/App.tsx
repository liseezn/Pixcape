import PresetStudio from './PresetStudio'

const BLOCKBENCH_URL = 'https://web.blockbench.net/'

export default function App() {
  return <PresetStudio onOpenEditor={() => window.open(BLOCKBENCH_URL, '_blank', 'noopener,noreferrer')} />
}
