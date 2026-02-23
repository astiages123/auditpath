import { FC } from 'react';
import { Link } from 'react-router-dom';
import { ROUTES } from '@/utils/routes';
import logo from '@/assets/logo.svg';

export const BrandSection: FC = () => {
  return (
    <Link
      to={ROUTES.HOME}
      className="group flex items-center gap-4 transition-all duration-200 active:scale-95 px-2 py-1 rounded-2xl hover:bg-white/5"
    >
      <div className="relative flex size-14 items-center justify-center transition-all">
        <img
          src={logo}
          alt="AuditPath Logo"
          width={56}
          height={56}
          className="object-contain group-hover:scale-110 group-hover:rotate-3 transition-all duration-300"
        />
      </div>
      <div className="flex flex-col">
        <span className="text-xl md:text-2xl font-heading font-bold tracking-tight bg-linear-to-br from-foreground to-foreground/70 bg-clip-text text-transparent">
          Audit Path
        </span>
        <span className="text-[10px] md:text-[12px] uppercase tracking-normal font-bold text-primary/80 leading-none mt-1">
          BİLGELİK AKADEMİSİ
        </span>
      </div>
    </Link>
  );
};
