import { FC } from 'react';
import { History, ChevronDown } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { tr } from 'date-fns/locale';
import { type AiGenerationCost } from '@/features/analytics/logic/analyticsLogic';

interface AnalyticsTableProps {
  logs: AiGenerationCost[];
  visibleCount: number;
  deferredVisibleCount: number;
  isPending: boolean;
  rate: number;
  formatCurrency: (value: number) => string;
  onLoadMore: () => void;
}

const getUsageTypeBadge = (type: string | null) => {
  switch (type) {
    case 'analysis':
      return (
        <Badge
          variant="outline"
          className="bg-blue-500/10 text-blue-400 border-blue-500/20"
        >
          Analiz
        </Badge>
      );
    case 'drafting':
      return (
        <Badge
          variant="outline"
          className="bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
        >
          Üretim
        </Badge>
      );
    case 'validation':
      return (
        <Badge
          variant="outline"
          className="bg-amber-500/10 text-amber-400 border-amber-500/20"
        >
          Denetleme
        </Badge>
      );
    case 'revision':
      return (
        <Badge
          variant="outline"
          className="bg-purple-500/10 text-purple-400 border-purple-500/20"
        >
          Revizyon
        </Badge>
      );
    default:
      return <Badge variant="secondary">{type || '-'}</Badge>;
  }
};

export const AnalyticsTable: FC<AnalyticsTableProps> = ({
  logs,
  visibleCount,
  deferredVisibleCount,
  isPending,
  rate,
  formatCurrency,
  onLoadMore,
}) => {
  return (
    <Card className="bg-card/30 border-border shadow-lg">
      <CardHeader className="border-b border-border/40 bg-card/20 py-4 flex flex-row items-center justify-between">
        <div className="flex items-center gap-2">
          <History className="w-5 h-5 text-muted-foreground" />
          <CardTitle className="text-lg font-heading font-bold text-white">
            Son İşlemler
          </CardTitle>
        </div>
        <Badge
          variant="outline"
          className="text-[10px] uppercase font-bold tracking-tighter"
        >
          Limit: 10,000 Kayıt
        </Badge>
      </CardHeader>
      <CardContent className="p-0">
        {/* Desktop Table */}
        <div className="hidden md:block">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="bg-muted/30 border-b border-border/40 hover:bg-muted/30">
                  <TableHead className="font-heading font-bold text-xs uppercase tracking-widest pl-6">
                    Tarih
                  </TableHead>
                  <TableHead className="font-heading font-bold text-xs uppercase tracking-widest text-center">
                    Tür
                  </TableHead>
                  <TableHead className="font-heading font-bold text-xs uppercase tracking-widest pl-10">
                    Model
                  </TableHead>
                  <TableHead className="font-heading font-bold text-xs uppercase tracking-widest text-right">
                    Token Detayı
                  </TableHead>
                  <TableHead className="font-heading font-bold text-xs uppercase tracking-widest text-right">
                    Süre
                  </TableHead>
                  <TableHead className="font-heading font-bold text-xs uppercase tracking-widest text-right pr-6">
                    Maliyet
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody
                style={{
                  opacity: isPending ? 0.7 : 1,
                  transition: 'opacity 200ms ease-in-out',
                }}
              >
                {logs.slice(0, visibleCount).map((log) => (
                  <TableRow
                    key={log.id}
                    className="border-b border-border/20 hover:bg-muted/50 transition-colors group"
                  >
                    <TableCell className="pl-6 font-mono text-[14px] text-muted-foreground">
                      {log.created_at
                        ? format(new Date(log.created_at), 'dd MMM HH:mm', {
                            locale: tr,
                          })
                        : '-'}
                    </TableCell>
                    <TableCell className="text-center">
                      {getUsageTypeBadge(log.usage_type)}
                    </TableCell>
                    <TableCell className="font-medium text-white text-sm pl-10">
                      {log.model}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex flex-col text-[11px] font-mono">
                        <span className="text-white font-bold">
                          {log.total_tokens?.toLocaleString()}
                        </span>
                        <span className="text-muted-foreground opacity-60">
                          Girdi:{log.prompt_tokens} / Çıktı:
                          {log.completion_tokens} / Cache:
                          {log.cached_tokens}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right text-xs font-mono text-muted-foreground">
                      {log.latency_ms
                        ? `${(log.latency_ms / 1000).toFixed(2)}s`
                        : '-'}
                    </TableCell>
                    <TableCell className="text-right pr-6">
                      <span
                        className={`text-sm font-bold ${log.cost_usd === 0 ? 'text-emerald-400/50 ' : 'text-primary'}`}
                      >
                        {log.cost_usd === 0
                          ? 'Ücretsiz'
                          : formatCurrency((log.cost_usd || 0) * rate)}
                      </span>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </div>

        {/* Mobile Card List */}
        <div className="md:hidden divide-y divide-border/20">
          {logs.slice(0, visibleCount).map((log) => (
            <div
              key={log.id}
              className="p-4 space-y-3 hover:bg-muted/30 transition-colors"
            >
              <div className="flex items-center justify-between">
                <span className="text-[12px] font-mono text-muted-foreground">
                  {log.created_at
                    ? format(new Date(log.created_at), 'dd MMM HH:mm', {
                        locale: tr,
                      })
                    : '-'}
                </span>
                {getUsageTypeBadge(log.usage_type)}
              </div>
              <div className="flex items-center justify-between">
                <span className="font-bold text-white text-sm">
                  {log.model}
                </span>
                <span
                  className={`text-sm font-bold ${log.cost_usd === 0 ? 'text-emerald-400/50 ' : 'text-primary'}`}
                >
                  {log.cost_usd === 0
                    ? 'Ücretsiz'
                    : formatCurrency((log.cost_usd || 0) * rate)}
                </span>
              </div>
              <div className="flex items-center justify-between text-[11px] font-mono text-muted-foreground bg-black/10 p-2 rounded-lg border border-border/10">
                <div className="flex flex-col">
                  <span className="text-white/40">Token</span>
                  <span className="text-white">
                    {log.total_tokens?.toLocaleString()}
                  </span>
                </div>
                <div className="flex flex-col text-right">
                  <span className="text-white/40">Süre</span>
                  <span className="text-white">
                    {log.latency_ms
                      ? `${(log.latency_ms / 1000).toFixed(2)}s`
                      : '-'}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>

        {logs.length > deferredVisibleCount && (
          <div className="p-6 border-t border-border/40 bg-card/10 flex justify-center">
            <Button
              variant="ghost"
              size="sm"
              onClick={onLoadMore}
              className="group flex items-center gap-2 hover:bg-primary/10 hover:text-primary transition-all duration-300 rounded-full px-8"
            >
              <ChevronDown className="size-4 group-hover:translate-y-1 transition-transform" />
              <span className="font-heading font-bold uppercase tracking-widest text-[11px]">
                Daha Fazla Yükle ({logs.length - visibleCount})
              </span>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
