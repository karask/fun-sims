'use client';
import { Bug, Orbit, Building2 } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
export type SimulatorId = 'ants' | 'solar' | 'city';
export default function HubNavigation({ current, onNavigate }: { current: SimulatorId; onNavigate: (id: SimulatorId) => void }) {
  const { setOpenMobile } = useSidebar();
  return <div className="sidebar-section hub-navigation"><div className="eyebrow">YOUR SIMULATIONS</div><SidebarMenu>
    {([{ id: 'ants', name: 'Ant colony', icon: Bug, number: '01' }, { id: 'solar', name: 'Solar System Lab', icon: Orbit, number: '02' }, { id: 'city', name: 'City Life', icon: Building2, number: '03' }] as const).map(item => <SidebarMenuItem key={item.id}>
      <SidebarMenuButton isActive={current === item.id} size="lg" className="simulation-nav" onClick={() => { setOpenMobile(false); onNavigate(item.id); }} aria-current={current === item.id ? 'page' : undefined}>
        <span className="ant-icon"><item.icon size={20}/></span><span>{item.name}</span><span className="nav-number">{item.number}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>)}
  </SidebarMenu></div>;
}
