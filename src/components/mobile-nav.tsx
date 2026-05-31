'use client'

import { useState } from 'react'
import Link from 'next/link'
import Image from 'next/image'
import { usePathname } from 'next/navigation'
import {
  Menu,
  X,
  LogOut,
  BarChart3,
  Users,
  Phone,
  List,
  UserCheck,
  Building2,
  DollarSign,
  Calendar,
  Mail,
  FileText,
  Settings,
  UserCog,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { logout } from '@/app/login/actions'
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
  { href: '/personas-lista', label: 'Personas Lista', icon: UserCheck },
  { href: '/comisiones', label: 'Comisiones', icon: Building2 },
  { href: '/gastos', label: 'Gastos', icon: DollarSign },
  { href: '/eventos', label: 'Eventos', icon: Calendar },
  { href: '/campanas', label: 'Campañas Email', icon: Mail },
  { href: '/cartas', label: 'Cartas', icon: FileText },
  { href: '/flow-config', label: 'Flow Config', icon: Settings },
  { href: '/usuarios', label: 'Usuarios', icon: UserCog },
]

interface MobileNavProps {
  perfil: Perfil
}

export function MobileNav({ perfil }: MobileNavProps) {
  const [isOpen, setIsOpen] = useState(false)
  const pathname = usePathname()
  const navItems = perfil.rol === 'Admin' ? adminNav : voluntarioNav

  const handleLinkClick = () => setIsOpen(false)

  return (
    <>
      <Button
        variant="ghost"
        size="icon"
        className="md:hidden -ml-1"
        onClick={() => setIsOpen(true)}
      >
        <Menu className="h-5 w-5" />
        <span className="sr-only">Abrir menú</span>
      </Button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex flex-col bg-background md:hidden animate-in slide-in-from-top duration-300">
          <div className="flex h-14 shrink-0 items-center justify-between border-b px-4">
            <div className="flex items-center gap-3">
              <Image
                src="/logo.jpeg"
                alt="Peñarol"
                width={32}
                height={32}
                className="rounded-full shrink-0"
              />
              <span className="font-semibold text-sm">Elecciones Peñarol</span>
            </div>
            <Button variant="ghost" size="icon" onClick={() => setIsOpen(false)}>
              <X className="h-5 w-5" />
              <span className="sr-only">Cerrar menú</span>
            </Button>
          </div>

          <nav className="flex-1 overflow-y-auto px-2 py-3">
            {navItems.map((item) => {
              const Icon = item.icon
              const isActive =
                item.href === '/' ? pathname === '/' : pathname.startsWith(item.href)
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={handleLinkClick}
                  className={[
                    'flex items-center gap-3 rounded-md px-3 min-h-[56px] text-base font-medium transition-colors',
                    isActive
                      ? 'bg-accent text-accent-foreground'
                      : 'text-foreground hover:bg-accent hover:text-accent-foreground',
                  ].join(' ')}
                >
                  <Icon className="h-5 w-5 shrink-0" />
                  <span>{item.label}</span>
                </Link>
              )
            })}
          </nav>

          <div className="border-t px-4 py-4 flex items-center justify-between gap-3">
            <div className="flex flex-col min-w-0">
              <p className="text-sm font-medium truncate">{perfil.nombre}</p>
              <p className="text-xs text-muted-foreground capitalize">{perfil.rol}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              className="shrink-0 text-destructive hover:text-destructive"
              onClick={() => logout()}
            >
              <LogOut className="h-4 w-4 mr-2" />
              Salir
            </Button>
          </div>
        </div>
      )}
    </>
  )
}
