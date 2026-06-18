import { ReactNode, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { Calendar, Users, ShoppingCart, BarChart3, LogOut, Server, FileText, Home, HardDrive, Archive, Bell, Package, Layers, Droplets, CalendarOff, Activity, UserPlus, RefreshCw, FolderOpen, KeyRound, Check, X, Globe } from 'lucide-react';
import { useAuth } from '../../contexts/AuthContext';
import { LanguageSwitcher } from '../ui/LanguageSwitcher';
import { supabase } from '../../lib/supabase';

interface MainLayoutProps {
  children: ReactNode;
}

interface NavItem {
  path: string;
  label: string;
  icon: ReactNode;
  disabled?: boolean;
}

interface AdminGroup {
  label: string;
  items: NavItem[];
}

export function MainLayout({ children }: MainLayoutProps) {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, signOut } = useAuth();

  const navItems: NavItem[] = [
    {
      path: '/',
      label: t('nav.home'),
      icon: <Home className="w-5 h-5" />,
      disabled: false
    },
    {
      path: '/agenda',
      label: t('nav.agenda'),
      icon: <Calendar className="w-5 h-5" />,
      disabled: false
    },
    {
      path: '/clients',
      label: t('nav.clients'),
      icon: <Users className="w-5 h-5" />,
      disabled: false
    },
    {
      path: '/orders',
      label: t('nav.orders'),
      icon: <ShoppingCart className="w-5 h-5" />,
      disabled: true
    },
    {
      path: '/stats',
      label: t('nav.stats'),
      icon: <BarChart3 className="w-5 h-5" />,
      disabled: true
    },
    {
      path: '/documents',
      label: 'Mes documents',
      icon: <FolderOpen className="w-5 h-5" />,
      disabled: false
    },
    {
      path: '/notifications',
      label: t('notifications.navLabel'),
      icon: <Bell className="w-5 h-5" />,
      disabled: false
    }
  ];

  const isHrOrAdmin = user?.role === 'hr_manager' || user?.role === 'super_admin';

  const hrGroups: AdminGroup[] = isHrOrAdmin ? [
    {
      label: 'Ressources Humaines',
      items: [
        {
          path: '/hr/registrations',
          label: 'Inscriptions freelance',
          icon: <UserPlus className="w-5 h-5" />,
          disabled: false
        },
        {
          path: '/hr/periodic-documents',
          label: 'Documents périodiques',
          icon: <RefreshCw className="w-5 h-5" />,
          disabled: false
        },
      ]
    },
    {
      label: 'Utilisateurs',
      items: [
        {
          path: '/admin/users',
          label: t('nav.userManagement'),
          icon: <Users className="w-5 h-5" />,
          disabled: false
        },
        {
          path: '/admin/logs',
          label: t('nav.connectionLogs'),
          icon: <Activity className="w-5 h-5" />,
          disabled: false
        },
      ]
    },
  ] : [];

  const adminGroups: AdminGroup[] = user?.role === 'super_admin' ? [
    ...hrGroups,
    {
      label: 'Catalogue',
      items: [
        {
          path: '/admin/categories',
          label: t('nav.categoriesManagement'),
          icon: <Layers className="w-5 h-5" />,
          disabled: false
        },
        {
          path: '/admin/products',
          label: t('nav.productsManagement'),
          icon: <Package className="w-5 h-5" />,
          disabled: false
        },
      ]
    },
    {
      label: 'Outils',
      items: [
        {
          path: '/admin/bulk-mark-reported',
          label: t('nav.bulkMarkReported'),
          icon: <CalendarOff className="w-5 h-5" />,
          disabled: false
        },
      ]
    },
    {
      label: 'Configurations',
      items: [
        {
          path: '/admin/sftp',
          label: t('nav.sftpConfig'),
          icon: <Server className="w-5 h-5" />,
          disabled: false
        },
        {
          path: '/admin/sftp-operations',
          label: t('nav.sftpOps'),
          icon: <HardDrive className="w-5 h-5" />,
          disabled: false
        },
        {
          path: '/admin/file-history',
          label: t('nav.fileHistory'),
          icon: <Archive className="w-5 h-5" />,
          disabled: false
        },
        {
          path: '/admin/notifications',
          label: t('notifications.adminNavLabel'),
          icon: <Bell className="w-5 h-5" />,
          disabled: false
        },
        {
          path: '/admin/country-settings',
          label: t('nav.countrySettings'),
          icon: <Globe className="w-5 h-5" />,
          disabled: false
        },
      ]
    },
  ] : (user?.role === 'hr_manager' ? hrGroups : []);

  const handleNavigation = (path: string, disabled?: boolean) => {
    if (!disabled) {
      navigate(path);
    }
  };

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const initials = user ? `${user.first_name?.[0] || ''}${user.last_name?.[0] || ''}`.toUpperCase() : '';

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [passwordLoading, setPasswordLoading] = useState(false);
  const [passwordSuccess, setPasswordSuccess] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError('');

    if (newPassword.length < 8) {
      setPasswordError('8 caractères minimum');
      return;
    }
    if (newPassword !== confirmNewPassword) {
      setPasswordError('Les mots de passe ne correspondent pas');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: newPassword });
      if (error) throw error;
      setPasswordSuccess(true);
      setNewPassword('');
      setConfirmNewPassword('');
      setTimeout(() => {
        setPasswordSuccess(false);
        setShowPasswordForm(false);
      }, 2000);
    } catch (err) {
      setPasswordError(err instanceof Error ? err.message : 'Erreur');
    } finally {
      setPasswordLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50">
      <div className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0">
        <div className="flex-1 flex flex-col min-h-0 bg-slate-900 shadow-sidebar">
          <div className="flex-1 flex flex-col pt-6 pb-4 overflow-y-auto">
            <div className="flex items-center flex-shrink-0 px-5 mb-8">
              <div className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-brand-400 to-brand-600 text-white rounded-xl">
                <Droplets className="w-5 h-5" />
              </div>
              <span className="ml-3 text-xl font-bold text-white tracking-tight">Alkemia</span>
            </div>

            <nav className="flex-1 px-3 space-y-1">
              {navItems.map((item) => {
                const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
                return (
                  <button
                    key={item.path}
                    onClick={() => handleNavigation(item.path, item.disabled)}
                    disabled={item.disabled}
                    className={`
                      group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg
                      transition-all duration-200
                      ${isActive
                        ? 'bg-white/10 text-white'
                        : item.disabled
                        ? 'text-slate-600 cursor-not-allowed'
                        : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                      }
                    `}
                  >
                    <span className={`transition-colors ${isActive ? 'text-brand-400' : ''}`}>
                      {item.icon}
                    </span>
                    <span className="ml-3 flex-1 text-left">{item.label}</span>
                    {isActive && <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
                  </button>
                );
              })}

              {adminGroups.length > 0 && (
                <>
                  <div className="pt-6 pb-2">
                    <div className="border-t border-slate-700/50" />
                  </div>
                  {adminGroups.map((group) => (
                    <div key={group.label} className="mb-1">
                      <p className="px-3 pt-3 pb-1 text-[11px] font-semibold text-slate-500 uppercase tracking-widest">
                        {group.label}
                      </p>
                      {group.items.map((item) => {
                        const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
                        return (
                          <button
                            key={item.path}
                            onClick={() => handleNavigation(item.path, item.disabled)}
                            disabled={item.disabled}
                            className={`
                              group flex items-center w-full px-3 py-2.5 text-sm font-medium rounded-lg
                              transition-all duration-200
                              ${isActive
                                ? 'bg-white/10 text-white'
                                : item.disabled
                                ? 'text-slate-600 cursor-not-allowed'
                                : 'text-slate-400 hover:bg-white/5 hover:text-slate-200'
                              }
                            `}
                          >
                            <span className={`transition-colors ${isActive ? 'text-brand-400' : ''}`}>
                              {item.icon}
                            </span>
                            <span className="ml-3 flex-1 text-left">{item.label}</span>
                            {isActive && <div className="w-1.5 h-1.5 rounded-full bg-brand-400" />}
                          </button>
                        );
                      })}
                    </div>
                  ))}
                </>
              )}
            </nav>
          </div>

          <div className="flex-shrink-0 border-t border-slate-700/50 p-4">
            <div className="flex items-center mb-3">
              <div className="flex items-center justify-center w-9 h-9 bg-gradient-to-br from-brand-500 to-brand-700 rounded-full text-white text-xs font-bold">
                {initials}
              </div>
              <div className="ml-3 min-w-0">
                <p className="text-sm font-medium text-slate-200 truncate">
                  {user?.first_name} {user?.last_name}
                </p>
                <p className="text-xs text-slate-500 truncate">{user?.email}</p>
              </div>
            </div>

            {showPasswordForm ? (
              <form onSubmit={handlePasswordChange} className="mb-3 p-3 bg-slate-800 rounded-lg space-y-2">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-xs font-medium text-slate-300">Nouveau mot de passe</span>
                  <button
                    type="button"
                    onClick={() => { setShowPasswordForm(false); setPasswordError(''); setNewPassword(''); setConfirmNewPassword(''); }}
                    className="text-slate-500 hover:text-slate-300 transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <input
                  type="password"
                  placeholder="Mot de passe"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  autoComplete="new-password"
                  required
                />
                <input
                  type="password"
                  placeholder="Confirmer"
                  value={confirmNewPassword}
                  onChange={(e) => setConfirmNewPassword(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-slate-700 border border-slate-600 rounded text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  autoComplete="new-password"
                  required
                />
                {passwordError && (
                  <p className="text-xs text-red-400">{passwordError}</p>
                )}
                {passwordSuccess ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400">
                    <Check className="w-3.5 h-3.5" />
                    Mot de passe modifié
                  </div>
                ) : (
                  <button
                    type="submit"
                    disabled={passwordLoading}
                    className="w-full px-3 py-1.5 bg-brand-600 hover:bg-brand-700 text-white text-xs font-medium rounded transition-colors disabled:opacity-50"
                  >
                    {passwordLoading ? 'Modification...' : 'Modifier'}
                  </button>
                )}
              </form>
            ) : (
              <button
                onClick={() => setShowPasswordForm(true)}
                className="flex items-center w-full px-3 py-2 mb-1 text-sm text-slate-400 hover:text-slate-200 hover:bg-white/5 rounded-lg transition-all duration-200"
              >
                <KeyRound className="w-4 h-4 mr-2" />
                Modifier le mot de passe
              </button>
            )}

            <button
              onClick={handleSignOut}
              className="flex items-center w-full px-3 py-2 text-sm text-slate-400 hover:text-red-400 hover:bg-white/5 rounded-lg transition-all duration-200"
            >
              <LogOut className="w-4 h-4 mr-2" />
              {t('auth.logout')}
            </button>
            <p className="px-3 pt-2 text-[10px] text-slate-600">v{__APP_VERSION__}</p>
          </div>
        </div>
      </div>

      <div className="md:pl-64 flex flex-col flex-1">
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-lg border-b border-slate-200/60 px-4 sm:px-6 md:px-8 h-14 flex items-center justify-end">
          <LanguageSwitcher />
        </header>

        <main className="flex-1">
          <div className="py-6">
            <div className="max-w-7xl mx-auto px-4 sm:px-6 md:px-8">
              {children}
            </div>
          </div>
        </main>

        <div className="md:hidden fixed bottom-0 left-0 right-0 bg-slate-900/95 backdrop-blur-lg border-t border-slate-700/50 px-2 py-2 z-40">
          <nav className="flex justify-around">
            {navItems.filter(item => !item.disabled).map((item) => {
              const isActive = location.pathname === item.path || (item.path !== '/' && location.pathname.startsWith(item.path));
              return (
                <button
                  key={item.path}
                  onClick={() => handleNavigation(item.path, item.disabled)}
                  className={`
                    flex flex-col items-center px-3 py-1.5 text-[10px] font-medium rounded-lg transition-all duration-200
                    ${isActive
                      ? 'text-brand-400'
                      : 'text-slate-400'
                    }
                  `}
                >
                  {item.icon}
                  <span className="mt-1">{item.label}</span>
                </button>
              );
            })}
          </nav>
        </div>
      </div>
    </div>
  );
}
