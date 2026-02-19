'use client'

import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  BarChart3,
  Users,
  Phone,
  List,
  Building2,
  DollarSign,
  Calendar,
  Mail,
  FileText,
  Settings,
  UserCog,
} from 'lucide-react'
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import type { Perfil } from '@/types/database'

const voluntarioNav = [
  { href: '/', label: 'Dashboard', icon: BarChart3 },
  { href: '/electores', label: 'Mis Electores', icon: Users },
  { href: '/llamadas', label: 'Llamadas', icon: Phone },
]

const adminNav = [
  { href: '/', label: 'Dashboard', icon: BarChart3 },
  { href: '/electores', label: 'Electores', icon: Users },
  { href: '/llamadas', label: 'Llamadas', icon: Phone },
  { href: '/lista', label: 'Lista', icon: List },
  { href: '/comisiones', label: 'Comisiones', icon: Building2 },
  { href: '/gastos', label: 'Gastos', icon: DollarSign },
  { href: '/eventos', label: 'Eventos', icon: Calendar },
  { href: '/campanas', label: 'Campañas Email', icon: Mail },
  { href: '/cartas', label: 'Cartas', icon: FileText },
  { href: '/flow-config', label: 'Flow Config', icon: Settings },
  { href: '/usuarios', label: 'Usuarios', icon: UserCog },
]

interface AppSidebarProps {
  perfil: Perfil
}

export function AppSidebar({ perfil }: AppSidebarProps) {
  const pathname = usePathname()
  const navItems = perfil.rol === 'Admin' ? adminNav : voluntarioNav

  return (
    <Sidebar>
      <SidebarHeader className="border-b px-4 py-3">
        <div className="flex items-center gap-3">
          <Image
            src="/logo.jpeg"
            alt="Peñarol"
            width={36}
            height={36}
            className="rounded-full shrink-0"
          />
          <div>
            <p className="font-semibold text-sm leading-tight">Elecciones Peñarol</p>
            <p className="text-xs text-muted-foreground capitalize">{perfil.rol}</p>
          </div>
        </div>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Navegación</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems.map((item) => {
                const Icon = item.icon
                const isActive =
                  item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
                return (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={isActive}>
                      <Link href={item.href}>
                        <Icon className="h-4 w-4" />
                        <span>{item.label}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}
