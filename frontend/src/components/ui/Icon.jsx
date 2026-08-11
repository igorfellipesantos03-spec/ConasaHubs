import {
  BarChart3, Bot, BookOpen, Briefcase, Building2, Calculator, Calendar, ClipboardList,
  Cloud, Code, Cpu, Database, Droplets, Factory, FileText, Files, Gauge, Globe,
  GraduationCap, Handshake, KeyRound, Landmark, LayoutGrid, LifeBuoy, Link as LinkIcon,
  Mail, Map, MessageSquare, Package, Phone, Receipt, Server, Settings, ShieldCheck,
  Star, Terminal, TrendingUp, Truck, UserRound, Users, Wallet, Workflow, Wrench, Zap,
} from 'lucide-react';

/**
 * Mapa explícito em vez de `import * as icons`: importar a biblioteca inteira
 * levava ~1 MB para o bundle, e só estes ícones podem ser escolhidos mesmo.
 */
const ICONES = {
  BarChart3, Bot, BookOpen, Briefcase, Building2, Calculator, Calendar, ClipboardList,
  Cloud, Code, Cpu, Database, Droplets, Factory, FileText, Files, Gauge, Globe,
  GraduationCap, Handshake, KeyRound, Landmark, LayoutGrid, LifeBuoy, Link: LinkIcon,
  Mail, Map, MessageSquare, Package, Phone, Receipt, Server, Settings, ShieldCheck,
  Star, Terminal, TrendingUp, Truck, UserRound, Users, Wallet, Workflow, Wrench, Zap,
};

/** Ícone resolvido pelo nome guardado no banco; nome desconhecido cai no padrão. */
export function Icon({ name, className = 'h-5 w-5', strokeWidth = 1.75, ...rest }) {
  const Component = ICONES[name] ?? LinkIcon;
  return <Component className={className} strokeWidth={strokeWidth} aria-hidden="true" {...rest} />;
}

/** Ícones oferecidos no seletor, agrupados pelo tipo de recurso que representam. */
export const ICONES_DISPONIVEIS = [
  'Link', 'Globe', 'Database', 'Server', 'Cloud', 'Cpu', 'Terminal', 'Code',
  'Workflow', 'Bot', 'Zap', 'Settings', 'Wrench', 'ShieldCheck', 'KeyRound',
  'BookOpen', 'FileText', 'Files', 'ClipboardList', 'GraduationCap',
  'Users', 'UserRound', 'Building2', 'Landmark', 'Briefcase', 'Handshake',
  'Truck', 'Package', 'Factory', 'Droplets', 'Gauge', 'Map',
  'BarChart3', 'TrendingUp', 'Calculator', 'Receipt', 'Wallet',
  'Mail', 'MessageSquare', 'Phone', 'Calendar', 'LifeBuoy', 'LayoutGrid', 'Star',
];
