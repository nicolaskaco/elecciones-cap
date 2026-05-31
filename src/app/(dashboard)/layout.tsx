export const dynamic = 'force-dynamic'

import { getRequiredPerfil } from '@/lib/auth'
import { AppSidebar } from '@/components/app-sidebar'
import { UserNav } from '@/components/user-nav'
import { MobileNav } from '@/components/mobile-nav'
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from '@/components/ui/sidebar'
import { Separator } from '@/components/ui/separator'

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const perfil = await getRequiredPerfil()

  return (
    <SidebarProvider>
      <AppSidebar perfil={perfil} />
      <SidebarInset>
        <header className="flex h-14 shrink-0 items-center gap-2 border-b px-4">
          <SidebarTrigger className="-ml-1 hidden md:inline-flex" />
          <Separator orientation="vertical" className="mr-2 h-4 hidden md:block" />
          <MobileNav perfil={perfil} />
          <div className="flex flex-1 items-center justify-end">
            <UserNav perfil={perfil} />
          </div>
        </header>
        <main className="flex flex-1 flex-col gap-4 p-4">{children}</main>
      </SidebarInset>
    </SidebarProvider>
  )
}
