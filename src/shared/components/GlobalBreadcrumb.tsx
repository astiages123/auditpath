import { Link, useLocation } from 'react-router-dom';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { ROUTES } from '@/utils/routes';
import {
  Home,
  Brain,
  BookOpen,
  LibraryBig,
  Trophy,
  ChartScatter,
  LineSquiggle,
  HandCoins,
  BookCheck,
  BookMarked,
  PanelLeft,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { getCourseBySlug } from '@/features/courses/services/courseService';
import { type Course } from '@/features/courses/types/courseTypes';
import { supabase } from '@/lib/supabase';
import { slugify } from '@/utils/stringHelpers';

const ROUTE_LABELS: Record<string, string> = {
  achievements: 'Başarılar',
  statistics: 'İstatistikler',
  costs: 'Maliyet Analizi',
  notes: 'Çalışma Merkezi',
  quiz: 'Çalışma Merkezi',
  library: 'Çalışma Merkezi',
  roadmap: 'Yolculuk',
};

export function GlobalBreadcrumb() {
  const location = useLocation();
  const pathnames = location.pathname.split('/').filter((x) => x);
  const [course, setCourse] = useState<Course | null>(null);
  const [topicName, setTopicName] = useState<string | null>(null);

  // Segment indexers
  const isQuizPath = pathnames[0] === 'quiz';
  const isNotesPath = pathnames[0] === 'notes';
  const courseSlugIdx = 1;
  const topicSlugIdx = 2;

  const courseSlug =
    isQuizPath || isNotesPath ? pathnames[courseSlugIdx] : null;
  const topicSlug = isQuizPath || isNotesPath ? pathnames[topicSlugIdx] : null;

  useEffect(() => {
    async function resolveData() {
      if (courseSlug) {
        const cData = await getCourseBySlug(courseSlug);
        setCourse(cData);

        if (topicSlug && cData) {
          // Fetch topic name by slugifying section_title
          const { data: chunks } = await supabase
            .from('note_chunks')
            .select('section_title')
            .eq('course_id', cData.id);

          if (chunks) {
            const found = chunks.find(
              (c) => slugify(c.section_title) === topicSlug
            );
            setTopicName(found ? found.section_title : topicSlug);
          }
        } else {
          setTopicName(null);
        }
      } else {
        setCourse(null);
        setTopicName(null);
      }
    }
    resolveData();
  }, [courseSlug, topicSlug]);

  if (pathnames.length === 0) return null;

  // Ensure 'quiz' segment appears in the breadcrumb
  const filteredPathnames = pathnames;

  const breadcrumbs = filteredPathnames.map((value, index) => {
    const last = index === filteredPathnames.length - 1;
    const originalIdx = pathnames.indexOf(value);
    const to = `/${pathnames.slice(0, originalIdx + 1).join('/')}`;

    let label = ROUTE_LABELS[value] || value;

    // notes / quiz kök segmentleri artık /library'e işaret eder
    if ((value === 'notes' || value === 'quiz') && originalIdx === 0) {
      return {
        label: 'Çalışma Merkezi',
        to: ROUTES.LIBRARY,
        last,
        originalIdx,
      };
    }

    if (value === 'library') {
      return {
        label: 'Çalışma Merkezi',
        to: ROUTES.LIBRARY,
        last,
        originalIdx,
      };
    }

    if (value === courseSlug && course) {
      label = course.name;
    }

    if (value === topicSlug && topicName) {
      label = topicName;
    }

    return { label, to, last, originalIdx };
  });

  return (
    <div className="">
      <Breadcrumb>
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link to={ROUTES.HOME} className="flex items-center gap-1.5">
                <Home className="size-4" />
                <span>Anasayfa</span>
              </Link>
            </BreadcrumbLink>
          </BreadcrumbItem>

          {breadcrumbs.map((crumb) => (
            <div key={crumb.to} className="flex items-center">
              <BreadcrumbSeparator />
              <BreadcrumbItem>
                {crumb.last ? (
                  <div className="flex items-center gap-1.5">
                    {(() => {
                      const pathValue = pathnames[crumb.originalIdx];

                      if (
                        pathValue === 'library' ||
                        ((pathValue === 'notes' || pathValue === 'quiz') &&
                          crumb.originalIdx === 0)
                      )
                        return <LibraryBig className="size-4" />;
                      if (pathValue === 'quiz')
                        return <Brain className="size-4" />;
                      if (pathValue === 'roadmap')
                        return <LineSquiggle className="size-4" />;
                      if (pathValue === 'achievements')
                        return <Trophy className="size-4" />;
                      if (pathValue === 'statistics')
                        return <ChartScatter className="size-4" />;
                      if (pathValue === 'costs')
                        return <HandCoins className="size-4" />;
                      if (pathValue === 'notes' && crumb.originalIdx === 0)
                        return <BookCheck className="size-4" />;

                      if (crumb.originalIdx === 1)
                        return <BookMarked className="size-4" />;
                      if (crumb.originalIdx > 1)
                        return <BookOpen className="size-4" />;
                      return <PanelLeft className="size-4" />;
                    })()}
                    <BreadcrumbPage>{crumb.label}</BreadcrumbPage>
                  </div>
                ) : (
                  <BreadcrumbLink asChild>
                    <Link to={crumb.to} className="flex items-center gap-1.5">
                      {(() => {
                        const pathValue = pathnames[crumb.originalIdx];

                        if (
                          pathValue === 'library' ||
                          ((pathValue === 'notes' || pathValue === 'quiz') &&
                            crumb.originalIdx === 0)
                        )
                          return <LibraryBig className="size-4" />;
                        if (pathValue === 'quiz')
                          return <Brain className="size-4" />;
                        if (pathValue === 'roadmap')
                          return <LineSquiggle className="size-4" />;
                        if (pathValue === 'achievements')
                          return <Trophy className="size-4" />;
                        if (pathValue === 'statistics')
                          return <ChartScatter className="size-4" />;
                        if (pathValue === 'costs')
                          return <HandCoins className="size-4" />;
                        if (pathValue === 'notes' && crumb.originalIdx === 0)
                          return <BookCheck className="size-4" />;

                        if (crumb.originalIdx === 1)
                          return <BookMarked className="size-4" />;
                        if (crumb.originalIdx > 1)
                          return <BookOpen className="size-4" />;
                        return <PanelLeft className="size-4" />;
                      })()}
                      <span>{crumb.label}</span>
                    </Link>
                  </BreadcrumbLink>
                )}
              </BreadcrumbItem>
            </div>
          ))}
        </BreadcrumbList>
      </Breadcrumb>
    </div>
  );
}
