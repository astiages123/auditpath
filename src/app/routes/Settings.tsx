
import { useState, useMemo, useEffect } from "react";
import { useAuth } from "@/features/auth";
import { getCategories, upsertPomodoroSession, type Category } from "@/shared/lib/core/client-db";
import { Button } from "@/shared/components/ui/button";
import { Input } from "@/shared/components/ui/input";
import { Label } from "@/shared/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/shared/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/shared/components/ui/select";
import { toast } from "sonner";
import { Calendar, Clock, BookOpen, Save, Trash2, Plus, Coffee } from "lucide-react";
import { motion } from "framer-motion";
import { cn } from "@/shared/lib/core/utils";

export default function Settings() {
  const { user } = useAuth();
  const userId = user?.id;

  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCourseId, setSelectedCourseId] = useState<string>("");
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0]);
  
  // Work Session
  const [workStart, setWorkStart] = useState<string>("09:00");
  const [workEnd, setWorkEnd] = useState<string>("09:50");
  
  // Break Session
  const [hasBreak, setHasBreak] = useState<boolean>(true);
  const [breakStart, setBreakStart] = useState<string>("09:50");
  const [breakEnd, setBreakEnd] = useState<string>("10:00");

  const [loading, setLoading] = useState(false);

  useEffect(() => {
    document.title = "Ayarlar | AuditPath";
    getCategories().then(setCategories);
  }, []);

  const courses = useMemo(() => {
    return categories.flatMap(cat => cat.courses.map(course => ({
      ...course,
      categoryName: cat.name
    })));
  }, [categories]);

  const handleSave = async () => {
    if (!userId) {
      toast.error("Lütfen giriş yapın.");
      return;
    }

    if (!selectedCourseId) {
      toast.error("Lütfen bir ders seçin.");
      return;
    }

    setLoading(true);

    try {
      const selectedCourse = courses.find(c => c.id === selectedCourseId);
      
      const workStartTime = new Date(`${date}T${workStart}:00`).getTime();
      const workEndTime = new Date(`${date}T${workEnd}:00`).getTime();
      
      const timeline: { type: string; start: number; end: number }[] = [
        { type: "work", start: workStartTime, end: workEndTime }
      ];

      if (hasBreak) {
        const breakStartTime = new Date(`${date}T${breakStart}:00`).getTime();
        const breakEndTime = new Date(`${date}T${breakEnd}:00`).getTime();
        timeline.push({ type: "break", start: breakStartTime, end: breakEndTime });
      }

      const result = await upsertPomodoroSession({
        id: crypto.randomUUID(),
        courseId: selectedCourseId,
        courseName: selectedCourse?.name || "Bilinmeyen Ders",
        timeline,
        startedAt: workStartTime,
        isCompleted: true
      }, userId);

      if (result.error) {
        throw new Error(result.error);
      }

      toast.success("Oturum başarıyla kaydedildi.");
      
      // Reset times for next entry (increment by 1 hour roughly)
      const nextStart = workEnd;
      setWorkStart(nextStart);
      // Add 50 mins
      const [h, m] = nextStart.split(":").map(Number);
      const nextEnd = new Date(2000, 0, 1, h, m + 50);
      setWorkEnd(`${String(nextEnd.getHours()).padStart(2, '0')}:${String(nextEnd.getMinutes()).padStart(2, '0')}`);
      
      if (hasBreak) {
        setBreakStart(workEnd);
        const nextBreakEnd = new Date(2000, 0, 1, h, m + 60);
        setBreakEnd(`${String(nextBreakEnd.getHours()).padStart(2, '0')}:${String(nextBreakEnd.getMinutes()).padStart(2, '0')}`);
      }

    } catch (e: unknown) {
      console.error(e);
      toast.error("Hata: " + (e instanceof Error ? e.message : "Bilinmeyen hata"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container max-w-2xl mx-auto px-4 py-12">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
      >
        <Card className="border-border/40 bg-background/60 backdrop-blur-xl shadow-2xl rounded-3xl overflow-hidden">
          <CardHeader className="p-8 pb-4">
            <div className="flex items-center gap-4 mb-2">
              <div className="w-12 h-12 rounded-2xl bg-primary/10 flex items-center justify-center">
                <Save className="w-6 h-6 text-primary" />
              </div>
              <div>
                <CardTitle className="text-3xl font-bold">Manuel Oturum Ekle</CardTitle>
                <CardDescription className="text-base">
                  Kaçırdığın veya manuel eklemek istediğin çalışma oturumlarını buradan gir.
                </CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="p-8 pt-4 space-y-8">
            {/* Course Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <BookOpen className="w-4 h-4" /> Ders Seçimi
              </Label>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="h-12 rounded-xl bg-secondary/30 border-border/40">
                  <SelectValue placeholder="Çalıştığın dersi seç..." />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-border/40 bg-background/95 backdrop-blur-xl">
                  {courses.map(course => (
                    <SelectItem key={course.id} value={course.id} className="rounded-lg">
                      {course.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Date Selection */}
            <div className="space-y-3">
              <Label className="text-sm font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-2">
                <Calendar className="w-4 h-4" /> Tarih
              </Label>
              <Input 
                type="date" 
                value={date} 
                onChange={(e) => setDate(e.target.value)}
                className="h-12 rounded-xl bg-secondary/30 border-border/40"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Work Session */}
              <div className="space-y-4 p-5 rounded-2xl bg-blue-500/5 border border-blue-500/10">
                <Label className="text-sm font-black uppercase tracking-widest text-blue-500 flex items-center gap-2">
                  <Clock className="w-4 h-4" /> ÇALIŞMA SÜRESİ
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Başlangıç</span>
                    <Input 
                      type="time" 
                      value={workStart} 
                      onChange={(e) => setWorkStart(e.target.value)}
                      className="h-11 rounded-lg bg-background/50 border-border/20"
                    />
                  </div>
                  <div className="space-y-2">
                    <span className="text-[10px] font-bold text-muted-foreground uppercase">Bitiş</span>
                    <Input 
                      type="time" 
                      value={workEnd} 
                      onChange={(e) => setWorkEnd(e.target.value)}
                      className="h-11 rounded-lg bg-background/50 border-border/20"
                    />
                  </div>
                </div>
              </div>

              {/* Break Session */}
              <div className={cn(
                "space-y-4 p-5 rounded-2xl border transition-all duration-300",
                hasBreak ? "bg-emerald-500/5 border-emerald-500/10" : "bg-muted/10 border-border/20 opacity-60"
              )}>
                <div className="flex items-center justify-between">
                  <Label className={cn(
                    "text-sm font-black uppercase tracking-widest flex items-center gap-2",
                    hasBreak ? "text-emerald-500" : "text-muted-foreground"
                  )}>
                    <Coffee className="w-4 h-4" /> MOLA SÜRESİ
                  </Label>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setHasBreak(!hasBreak)}
                    className="h-6 w-6 p-0 rounded-full"
                  >
                    {hasBreak ? <Trash2 className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
                  </Button>
                </div>
                
                {hasBreak ? (
                  <div className="grid grid-cols-2 gap-3">
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Başlangıç</span>
                      <Input 
                        type="time" 
                        value={breakStart} 
                        onChange={(e) => setBreakStart(e.target.value)}
                        className="h-11 rounded-lg bg-background/50 border-border/20"
                      />
                    </div>
                    <div className="space-y-2">
                      <span className="text-[10px] font-bold text-muted-foreground uppercase">Bitiş</span>
                      <Input 
                        type="time" 
                        value={breakEnd} 
                        onChange={(e) => setBreakEnd(e.target.value)}
                        className="h-11 rounded-lg bg-background/50 border-border/20"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="h-11 flex items-center justify-center">
                    <span className="text-xs font-medium text-muted-foreground">Mola eklenmedi</span>
                  </div>
                )}
              </div>
            </div>

            <Button 
              className="w-full h-14 rounded-2xl text-lg font-bold shadow-xl shadow-primary/20 transition-all active:scale-[0.98]"
              onClick={handleSave}
              disabled={loading}
            >
              {loading ? "Kaydediliyor..." : "Oturumu Kaydet"}
            </Button>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  );
}
