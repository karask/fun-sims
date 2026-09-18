'use client';
import { useLanguage, useT } from '@/lib/i18n/language';
import { Bug, Orbit, Building2, Languages } from 'lucide-react';
import { SidebarMenu, SidebarMenuItem, SidebarMenuButton, useSidebar } from '@/components/ui/sidebar';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
export type SimulatorId = 'ants' | 'solar' | 'city';
export default function HubNavigation({ current, onNavigate }: { current: SimulatorId; onNavigate: (id: SimulatorId) => void }) {
 const tr = useT();
  const { language, setLanguage } = useLanguage();
  const { setOpenMobile } = useSidebar();
  return <div className="sidebar-section hub-navigation"><div className="eyebrow">{tr("YOUR SIMULATIONS")}</div><SidebarMenu>
    {([{ id: 'ants', name: 'Ant colony', icon: Bug, number: '01' }, { id: 'solar', name: 'Solar System Lab', icon: Orbit, number: '02' }, { id: 'city', name: 'City Life', icon: Building2, number: '03' }] as const).map(item => <SidebarMenuItem key={item.id}>
      <SidebarMenuButton isActive={current === item.id} size="lg" className="simulation-nav" onClick={() => { setOpenMobile(false); onNavigate(item.id); }} aria-current={current === item.id ? 'page' : undefined}>
        <span className="ant-icon"><item.icon size={20}/></span><span>{tr(item.name)}</span><span className="nav-number">{tr(item.number)}</span>
      </SidebarMenuButton>
    </SidebarMenuItem>)}
  </SidebarMenu><div className="language-control"><label htmlFor={`language-${current}`}><Languages size={15}/>{tr("Language")}</label><Select value={language} onValueChange={value => setLanguage(value === "el" ? "el" : "en")}><SelectTrigger id={`language-${current}`} aria-label={tr("Language")}><SelectValue/></SelectTrigger><SelectContent><SelectItem value="en"><span lang="en">English</span></SelectItem><SelectItem value="el"><span lang="el">Ελληνικά</span></SelectItem></SelectContent></Select></div></div>;
}
