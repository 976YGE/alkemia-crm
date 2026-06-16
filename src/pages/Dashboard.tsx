import { ReactNode } from 'react';
import { useNavigate } from 'react-router-dom';
import { Calendar, Server, Users, Activity, ArrowRight, Layers, Package, CalendarOff, HardDrive } from 'lucide-react';
import { MainLayout } from '../components/layout/MainLayout';
import { useAuth } from '../contexts/AuthContext';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Bonjour';
  if (hour < 18) return 'Bon apres-midi';
  return 'Bonsoir';
}

const ACCENT_COLORS = {
  teal: { bg: 'bg-brand-50', border: 'border-l-brand-500', icon: 'text-brand-600' },
  amber: { bg: 'bg-amber-50', border: 'border-l-amber-500', icon: 'text-amber-600' },
  slate: { bg: 'bg-slate-100', border: 'border-l-slate-500', icon: 'text-slate-600' },
  emerald: { bg: 'bg-emerald-50', border: 'border-l-emerald-500', icon: 'text-emerald-600' },
  sky: { bg: 'bg-sky-50', border: 'border-l-sky-500', icon: 'text-sky-600' },
  rose: { bg: 'bg-rose-50', border: 'border-l-rose-500', icon: 'text-rose-600' },
  orange: { bg: 'bg-orange-50', border: 'border-l-orange-500', icon: 'text-orange-600' },
} as const;

interface AdminGroup {
  label: string;
  actions: {
    title: string;
    description: string;
    icon: ReactNode;
    path: string;
    accent: typeof ACCENT_COLORS[keyof typeof ACCENT_COLORS];
  }[];
}

export function Dashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();

  const quickActions = [
    {
      title: 'Agenda',
      description: 'Voir les rendez-vous',
      icon: <Calendar className="w-6 h-6" />,
      path: '/agenda',
      accent: ACCENT_COLORS.teal,
    }
  ];

  const adminGroups: AdminGroup[] = user?.role === 'super_admin' ? [
    {
      label: 'Utilisateurs',
      actions: [
        {
          title: 'Gestion des utilisateurs',
          description: 'Gerer les comptes utilisateurs',
          icon: <Users className="w-6 h-6" />,
          path: '/admin/users',
          accent: ACCENT_COLORS.amber,
        },
        {
          title: 'Journaux de connexion',
          description: 'Consulter l\'historique des connexions',
          icon: <Activity className="w-6 h-6" />,
          path: '/admin/logs',
          accent: ACCENT_COLORS.slate,
        },
      ]
    },
    {
      label: 'Catalogue',
      actions: [
        {
          title: 'Categories',
          description: 'Gerer les categories de produits',
          icon: <Layers className="w-6 h-6" />,
          path: '/admin/categories',
          accent: ACCENT_COLORS.sky,
        },
        {
          title: 'Produits',
          description: 'Gerer le catalogue produits',
          icon: <Package className="w-6 h-6" />,
          path: '/admin/products',
          accent: ACCENT_COLORS.teal,
        },
      ]
    },
    {
      label: 'Outils',
      actions: [
        {
          title: 'Initialisation des comptes rendus',
          description: 'Marquer des rendez-vous en masse',
          icon: <CalendarOff className="w-6 h-6" />,
          path: '/admin/bulk-mark-reported',
          accent: ACCENT_COLORS.rose,
        },
      ]
    },
    {
      label: 'Configurations',
      actions: [
        {
          title: 'Configuration SFTP',
          description: 'Gerer les acces SFTP par pays',
          icon: <Server className="w-6 h-6" />,
          path: '/admin/sftp',
          accent: ACCENT_COLORS.emerald,
        },
        {
          title: 'Operations SFTP',
          description: 'Lancer et suivre les synchronisations',
          icon: <HardDrive className="w-6 h-6" />,
          path: '/admin/sftp-operations',
          accent: ACCENT_COLORS.orange,
        },
      ]
    },
  ] : [];

  const today = new Date().toLocaleDateString('fr-FR', {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric'
  });

  return (
    <MainLayout>
      <div className="space-y-8 animate-fade-in pb-20 md:pb-4">
        <div className="bg-gradient-to-r from-brand-50 via-brand-50/50 to-transparent rounded-2xl p-6 md:p-8">
          <h1 className="text-2xl md:text-3xl font-bold text-slate-900">
            {getGreeting()}, {user?.first_name}
          </h1>
          <p className="mt-2 text-slate-500 capitalize">
            {today}
          </p>
        </div>

        <div>
          <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
            Acces rapides
          </h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {quickActions.map((action) => (
              <button
                key={action.path}
                onClick={() => navigate(action.path)}
                className={`group bg-white rounded-xl shadow-card border border-slate-200/60 border-l-4 ${action.accent.border} p-5 text-left hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200`}
              >
                <div className={`inline-flex p-2.5 rounded-xl ${action.accent.bg} mb-4`}>
                  <span className={action.accent.icon}>{action.icon}</span>
                </div>
                <h3 className="text-base font-semibold text-slate-900 mb-1">
                  {action.title}
                </h3>
                <p className="text-slate-500 text-sm mb-3">
                  {action.description}
                </p>
                <span className="inline-flex items-center text-sm font-medium text-brand-600 group-hover:text-brand-700">
                  Ouvrir <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                </span>
              </button>
            ))}
          </div>
        </div>

        {adminGroups.length > 0 && adminGroups.map((group) => (
          <div key={group.label}>
            <h2 className="text-sm font-semibold text-slate-500 uppercase tracking-wider mb-4">
              {group.label}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {group.actions.map((action) => (
                <button
                  key={action.path}
                  onClick={() => navigate(action.path)}
                  className={`group bg-white rounded-xl shadow-card border border-slate-200/60 border-l-4 ${action.accent.border} p-5 text-left hover:shadow-card-hover hover:-translate-y-0.5 transition-all duration-200`}
                >
                  <div className={`inline-flex p-2.5 rounded-xl ${action.accent.bg} mb-4`}>
                    <span className={action.accent.icon}>{action.icon}</span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-900 mb-1">
                    {action.title}
                  </h3>
                  <p className="text-slate-500 text-sm mb-3">
                    {action.description}
                  </p>
                  <span className="inline-flex items-center text-sm font-medium text-brand-600 group-hover:text-brand-700">
                    Ouvrir <ArrowRight className="w-4 h-4 ml-1 group-hover:translate-x-0.5 transition-transform" />
                  </span>
                </button>
              ))}
            </div>
          </div>
        ))}
      </div>
    </MainLayout>
  );
}
