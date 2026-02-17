interface MasteryItem {
  lessonId: string;
  title: string;
  mastery: number;
  videoProgress: number;
  questionProgress: number;
}

interface MasteryProgressNavigatorProps {
  sessions: MasteryItem[];
}

export const MasteryProgressNavigator = ({
  sessions,
}: MasteryProgressNavigatorProps) => (
  <div className="space-y-6">
    <p className="text-sm text-muted-foreground">
      Ustalık skoru: Tamamlanan videolar (%60) ve çözülen soruların (%40)
      ağırlıklı ortalamasıdır.
    </p>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {sessions.map((lesson) => (
        <div
          key={lesson.lessonId}
          className="p-4 border border-border rounded-xl bg-card/40 space-y-4"
        >
          <div className="flex justify-between items-start">
            <h4 className="font-bold text-lg">{lesson.title}</h4>
            <div className="text-2xl font-black text-primary">
              %{lesson.mastery}
            </div>
          </div>

          <div className="space-y-3">
            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Video İlerlemesi (%60 Etki)</span>
                <span>%{lesson.videoProgress}</span>
              </div>
              <div className="h-1.5 w-full bg-muted-foreground/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary transition-all duration-500"
                  style={{ width: `${lesson.videoProgress}%` }}
                />
              </div>
            </div>

            <div className="space-y-1">
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>Soru Çözümü (%40 Etki)</span>
                <span>%{lesson.questionProgress}</span>
              </div>
              <div className="h-1.5 w-full bg-muted-foreground/10 rounded-full overflow-hidden">
                <div
                  className="h-full bg-accent transition-all duration-500"
                  style={{ width: `${lesson.questionProgress}%` }}
                />
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  </div>
);
