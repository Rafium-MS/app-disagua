import { lazy } from 'react'
import type { LazyExoticComponent } from 'react'
import type { RouteComponentProps } from '../types/router'
import { BarChart3, Building2, FileSpreadsheet, Layers, Search, Upload, Users2 } from 'lucide-react'

export type RouteComponent = LazyExoticComponent<(
  props: RouteComponentProps,
) => JSX.Element>

export type RouteDefinition = {
  path: string
  component: RouteComponent
  label: string
  icon: React.ComponentType<{ className?: string }>
  sidebar?: boolean
}

export const routeDefinitions: RouteDefinition[] = [
  {
    path: '/partners',
    label: 'Parceiros',
    icon: Users2,
    component: lazy(() => import('../pages/Partners/PartnersPage').then((module) => ({
      default: module.PartnersPage,
    }))),
    sidebar: true,
  },
  {
    path: '/stores',
    label: 'Lojas',
    icon: Building2,
    component: lazy(() => import('../pages/Stores/StoresPage').then((module) => ({
      default: module.StoresPage,
    }))),
    sidebar: true,
  },
  {
    path: '/stores/new',
    label: 'Nova loja',
    icon: Building2,
    component: lazy(() => import('../pages/Stores/StoreFormPage').then((module) => ({
      default: module.StoreFormPage,
    }))),
  },
  {
    path: '/stores/:id/edit',
    label: 'Editar loja',
    icon: Building2,
    component: lazy(() => import('../pages/Stores/StoreFormPage').then((module) => ({
      default: module.StoreFormPage,
    }))),
  },
  {
    path: '/stores/import',
    label: 'Importar lojas',
    icon: Upload,
    component: lazy(() => import('../pages/Stores/StoreImportPage').then((module) => ({
      default: module.StoreImportPage,
    }))),
  },
  {
    path: '/stores/duplicates',
    label: 'Duplicidades de lojas',
    icon: Search,
    component: lazy(() => import('../pages/Stores/StoreDuplicatesPage').then((module) => ({
      default: module.StoreDuplicatesPage,
    }))),
  },
  {
    path: '/vouchers/import',
    label: 'Importar Comprovantes',
    icon: Layers,
    component: lazy(() => import('../pages/Import/ImportWizardPage').then((module) => ({
      default: module.ImportWizardPage,
    }))),
    sidebar: true,
  },
  {
    path: '/reports',
    label: 'Relatórios',
    icon: FileSpreadsheet,
    component: lazy(() => import('../pages/Reports/ReportsListPage').then((module) => ({
      default: module.ReportsListPage,
    }))),
    sidebar: true,
  },
  {
    path: '/reports/partners-monthly',
    label: 'Resumo mensal',
    icon: BarChart3,
    component: lazy(() =>
      import('../pages/Reports/PartnersMonthlyReportPage').then((module) => ({
        default: module.default,
      }))
    ),
    sidebar: true,
  },
  {
    path: '/reports/:id',
    label: 'Detalhe do relatório',
    icon: FileSpreadsheet,
    component: lazy(() => import('../pages/Reports/ReportDetailPage').then((module) => ({
      default: module.ReportDetailPage,
    }))),
  },
]
