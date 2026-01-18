"use client";

import { useState } from "react";
import { CategoryCard } from "./CategoryCard";
import { type Category } from "@/lib/client-db";
import { motion } from "framer-motion";

interface CategoryGridProps {
  categories: Category[];
  categoryProgress?: Record<
    string,
    { completedVideos: number; completedHours: number; completedCourses: number }
  >;
}

export function CategoryGrid({
  categories,
  categoryProgress = {},
}: CategoryGridProps) {
  const [expandedCategoryId, setExpandedCategoryId] = useState<string | null>(null);

  const handleToggle = (id: string) => {
    setExpandedCategoryId((prev) => (prev === id ? null : id));
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.5 } },
  };

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start"
    >
      {categories.map((category) => {
        const stats = categoryProgress[category.id];
        return (
          <motion.div key={category.id} variants={itemVariants}>
            <CategoryCard
              id={category.id}
              name={category.name}
              slug={category.slug}
              totalHours={category.total_hours}
              courses={category.courses}
              completedVideos={stats?.completedVideos || 0}
              completedHours={stats?.completedHours || 0}
              // completedCourses={stats?.completedCourses || 0}
              isOpen={expandedCategoryId === category.id}
              onToggle={() => handleToggle(category.id)}
            />
          </motion.div>
        );
      })}
    </motion.div>
  );
}
