'use client';
import { useEffect, useState } from 'react';
import AntObservatory from '@/components/simulation/ant-observatory';
import SolarLab from '@/components/solar/solar-lab';
import type { SimulatorId } from '@/components/hub-navigation';
export default function Home() {
  const [current, setCurrent] = useState<SimulatorId>('ants');
  const [visited, setVisited] = useState({ ants: false, solar: false });
  useEffect(() => {
    const sync = () => { const id = location.hash === '#solar-system' ? 'solar' : 'ants'; setCurrent(id); setVisited(v => ({ ...v, [id]: true })); };
    sync(); window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  useEffect(() => { document.body.dataset.simulator = current; return () => { delete document.body.dataset.simulator; }; }, [current]);
  const navigate = (id: SimulatorId) => { setCurrent(id); setVisited(v => ({ ...v, [id]: true })); location.hash = id === 'solar' ? 'solar-system' : 'ant-colony'; };
  return <>{visited.ants && <div hidden={current !== 'ants'}><AntObservatory active={current === 'ants'} onNavigate={navigate}/></div>}{visited.solar && <div hidden={current !== 'solar'}><SolarLab active={current === 'solar'} onNavigate={navigate}/></div>}</>;
}
