import { motion } from "framer-motion";
import { ReactNode } from "react";

interface BentoGridProps {
    children: ReactNode;
    className?: string;
}

export function BentoGrid({ children, className = "" }: BentoGridProps) {
    return (
        <motion.div
            initial="hidden"
            animate="show"
            variants={{
                show: {
                    transition: {
                        staggerChildren: 0.1,
                    },
                },
            }}
            className={`grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6 auto-rows-[minmax(180px,auto)] ${className}`}
        >
            {children}
        </motion.div>
    );
}

interface BentoCardProps {
    children: ReactNode;
    colSpan?: 1 | 2 | 3;
    rowSpan?: 1 | 2;
    onClick?: () => void;
    className?: string;
    isAlarm?: boolean;
}

export function BentoCard({
    children,
    colSpan = 1,
    rowSpan = 1,
    onClick,
    className = "",
    isAlarm = false,
}: BentoCardProps) {
    const colSpanClasses = {
        1: "",
        2: "md:col-span-2",
        3: "md:col-span-2 lg:col-span-3",
    };

    const rowSpanClasses = {
        1: "",
        2: "md:row-span-2",
    };

    const alarmClasses = isAlarm
        ? "bg-destructive/10 border-destructive/30 hover:border-destructive/50"
        : "bg-card/40 border-border/40 hover:border-primary/40";

    const itemVariants = {
        hidden: { opacity: 0, y: 20 },
        show: { opacity: 1, y: 0, transition: { duration: 0.4 } },
    };

    return (
        <motion.div
            variants={itemVariants}
            onClick={onClick}
            className={`
                bento-card
                ${colSpanClasses[colSpan]}
                ${rowSpanClasses[rowSpan]}
                ${alarmClasses}
                relative overflow-hidden
                rounded-[2.5rem] border
                p-6 md:p-8
                backdrop-blur-xl
                transition-all duration-500 ease-out
                hover:shadow-2xl hover:shadow-primary/5
                hover:-translate-y-1
                ${onClick ? "cursor-pointer" : ""}
                ${className}
            `}
        >
            {/* Glossy overlay effect */}
            <div className="absolute inset-0 bg-linear-to-br from-white/5 to-transparent pointer-events-none" />
            <div className="relative z-10 h-full">
                {children}
            </div>
        </motion.div>
    );
}
