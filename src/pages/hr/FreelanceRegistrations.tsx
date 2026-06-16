import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { UserPlus, Clock, CheckCircle, XCircle, ChevronRight, Mail, Phone, AlertCircle, Link2, Copy, Check } from 'lucide-react';
import { MainLayout } from '../../components/layout/MainLayout';
import { Card } from '../../components/ui/Card';
import { Badge } from '../../components/ui/Badge';
import { Loading } from '../../components/ui/Loading';
import { EmptyState } from '../../components/ui/EmptyState';
import { useAuth } from '../../contexts/AuthContext';
import { FreelanceService } from '../../services/freelance.service';
import type { FreelanceRegistration } from '../../types/database';

const STATUS_CONFIG: Record<string, { label: string; variant: 'warning' | 'success' | 'danger' | 'info' | 'default'; icon: typeof Clock }> = {
  pending: { label: 'En attente', variant: 'warning', icon: Clock },
  revision_requested: { label: 'Corrections demandées', variant: 'info', icon: AlertCircle },
  approved: { label: 'Validée', variant: 'success', icon: CheckCircle },
  rejected: { label: 'Refusée', variant: 'danger', icon: XCircle },
  finalized: { label: 'Finalisée', variant: 'info', icon: CheckCircle },
};

export function FreelanceRegistrations() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [registrations, setRegistrations] = useState<FreelanceRegistration[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [linkCopied, setLinkCopied] = useState(false);

  const registrationLink = `${window.location.origin}/freelance/register`;

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(registrationLink);
      setLinkCopied(true);
      setTimeout(() => setLinkCopied(false), 2000);
    } catch {
      // fallback
    }
  };

  useEffect(() => {
    loadRegistrations();
  }, [statusFilter]);

  const loadRegistrations = async () => {
    try {
      setLoading(true);
      const data = await FreelanceService.getRegistrations(statusFilter);
      setRegistrations(data);
    } catch (err) {
      console.error('Error loading registrations:', err);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'hr_manager' && user?.role !== 'super_admin') {
    return (
      <MainLayout>
        <div className="text-center py-12">
          <p className="text-slate-600">Accès non autorisé</p>
        </div>
      </MainLayout>
    );
  }

  const pendingCount = registrations.filter(r => r.status === 'pending' || r.status === 'revision_requested').length;

  return (
    <MainLayout>
      <div className="space-y-6 animate-fade-in">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-slate-900">Inscriptions freelance</h1>
            <p className="text-sm text-slate-500 mt-1">
              Gérez les demandes d'inscription des animateurs non salariés
            </p>
          </div>
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-amber-50 border border-amber-200 rounded-lg">
              <Clock className="w-4 h-4 text-amber-600" />
              <span className="text-sm font-medium text-amber-700">{pendingCount} en attente</span>
            </div>
          )}
        </div>

        {/* Shareable registration link */}
        <div className="flex items-center gap-3 p-3 bg-slate-50 border border-slate-200 rounded-xl">
          <Link2 className="w-4 h-4 text-slate-500 flex-shrink-0" />
          <div className="flex-1 min-w-0">
            <p className="text-xs text-slate-500 mb-0.5">Lien d'inscription à partager avec les futurs animateurs</p>
            <p className="text-sm font-mono text-slate-700 truncate">{registrationLink}</p>
          </div>
          <button
            onClick={handleCopyLink}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
              linkCopied
                ? 'bg-green-100 text-green-700'
                : 'bg-white border border-slate-300 text-slate-600 hover:bg-slate-100'
            }`}
          >
            {linkCopied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {linkCopied ? 'Copié' : 'Copier'}
          </button>
        </div>

        {/* Filters */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          {[
            { value: 'all', label: 'Toutes' },
            { value: 'pending', label: 'En attente' },
            { value: 'revision_requested', label: 'Corrections' },
            { value: 'approved', label: 'Validées' },
            { value: 'rejected', label: 'Refusées' },
            { value: 'finalized', label: 'Finalisées' },
          ].map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
                statusFilter === f.value
                  ? 'bg-brand-600 text-white'
                  : 'bg-white text-slate-700 border border-slate-300 hover:bg-slate-50'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>

        {loading ? (
          <Loading text={t('common.loading')} />
        ) : registrations.length === 0 ? (
          <EmptyState
            icon={<UserPlus className="w-16 h-16" />}
            title="Aucune inscription"
            description="Aucune demande d'inscription pour ce filtre."
          />
        ) : (
          <div className="space-y-3">
            {registrations.map(reg => {
              const config = STATUS_CONFIG[reg.status];
              return (
                <Card
                  key={reg.id}
                  padding={false}
                  className="rounded-xl hover:shadow-card-hover transition-shadow cursor-pointer"
                  onClick={() => navigate(`/hr/registrations/${reg.id}`)}
                >
                  <div className="p-4 flex items-center justify-between">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-base font-semibold text-slate-900 truncate">
                          {reg.first_name} {reg.last_name}
                        </h3>
                        <Badge variant={config.variant}>{config.label}</Badge>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-slate-500">
                        <span className="flex items-center gap-1">
                          <Mail className="w-3.5 h-3.5" />
                          {reg.email}
                        </span>
                        <span className="flex items-center gap-1">
                          <Phone className="w-3.5 h-3.5" />
                          {reg.phone}
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        Soumis le {new Date(reg.submitted_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })}
                      </p>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-400 flex-shrink-0 ml-4" />
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </MainLayout>
  );
}
