'use client';
import { useEffect, useState } from 'react';
import { LanguageProvider } from '@/lib/i18n/language';
import AntObservatory from '@/components/simulation/ant-observatory';
import SolarLab from '@/components/solar/solar-lab';
import CityLife from '@/components/city/city-life';
import type { SimulatorId } from '@/components/hub-navigation';
export default function Home() {
  const [visible, setVisible] = useState(true);
  useEffect(() => {
    const sync = () => setVisible(!document.hidden);
    sync(); document.addEventListener('visibilitychange', sync);
    return () => document.removeEventListener('visibilitychange', sync);
  }, []);
  const [current, setCurrent] = useState<SimulatorId>('ants');
  const [visited, setVisited] = useState({ ants: false, solar: false, city: false });
  useEffect(() => {
    const sync = () => { const id = location.hash === '#city-life' ? 'city' : location.hash === '#solar-system' ? 'solar' : 'ants'; setCurrent(id); setVisited(v => ({ ...v, [id]: true })); };
    sync(); window.addEventListener('hashchange', sync);
    return () => window.removeEventListener('hashchange', sync);
  }, []);
  useEffect(() => { document.body.dataset.simulator = current; return () => { delete document.body.dataset.simulator; }; }, [current]);
  const navigate = (id: SimulatorId) => { setCurrent(id); setVisited(v => ({ ...v, [id]: true })); location.hash = id === 'city' ? 'city-life' : id === 'solar' ? 'solar-system' : 'ant-colony'; };
  return <LanguageProvider>{visited.ants && <div hidden={current !== 'ants'}><AntObservatory active={visible && current === 'ants'} onNavigate={navigate}/></div>}{visited.solar && <div hidden={current !== 'solar'}><SolarLab active={visible && current === 'solar'} onNavigate={navigate}/></div>}{visited.city && <div hidden={current !== 'city'}><CityLife active={visible && current === 'city'} onNavigate={navigate}/></div>}</LanguageProvider>;
}
