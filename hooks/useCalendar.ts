import { supabase } from '@/lib/supabase';
import { useAlert } from '@/providers/AlertProvider';
import * as Calendar from 'expo-calendar';
import { useCallback, useEffect, useState } from 'react';

export type CalendarEvent = {
  id: string;
  title: string;
  startDate: string; // ISO String
  endDate: string;
  color?: string;
  type: 'google' | 'app'; // Para sabermos de onde veio
  location?: string;
};

export function useCalendar() {
  const { showAlert } = useAlert();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchEvents = useCallback(async () => {
    try {
      setLoading(true);

      // 1. Pedir Permissão ao Telemóvel
      const { status } = await Calendar.requestCalendarPermissionsAsync();
      let mobileEvents: CalendarEvent[] = [];

      if (status === 'granted') {
        // Buscar todos os calendários do telemóvel
        const calendars = await Calendar.getCalendarsAsync(Calendar.EntityTypes.EVENT);
        const calendarIds = calendars.map(c => c.id);

        // Definir intervalo (ex: Do mês passado até ao próximo mês)
        const startDate = new Date();
        startDate.setMonth(startDate.getMonth() - 1);
        const endDate = new Date();
        endDate.setMonth(endDate.getMonth() + 2);

        // Buscar eventos nativos (Google Calendar, etc)
        const nativeEvents = await Calendar.getEventsAsync(calendarIds, startDate, endDate);
        
        mobileEvents = nativeEvents.map(evt => ({
          id: evt.id,
          title: evt.title,
          startDate: typeof evt.startDate === 'string' ? evt.startDate : evt.startDate.toISOString(),
          endDate: typeof evt.endDate === 'string' ? evt.endDate : evt.endDate.toISOString(),
          color: '#9CA3AF', // Cinzento para eventos externos
          type: 'google' as const,
          location: evt.location || undefined
        }));
      }

      // 2. Buscar Eventos da Nossa App (Supabase)
      // Lembra-te de criar a tabela 'events' que te dei no SQL anterior!
      const { data: appData, error } = await supabase
        .from('events')
        .select('*')
        .order('start_time', { ascending: true });

      if (error) throw error;

      const appEvents: CalendarEvent[] = (appData || []).map((evt: any) => ({
        id: evt.id,
        title: evt.title,
        startDate: evt.start_time,
        endDate: evt.end_time,
        color: '#6366f1', // Roxo (Cor da App) para as nossas aulas
        type: 'app',
        location: evt.location
      }));

      // 3. Misturar tudo
      setEvents([...mobileEvents, ...appEvents]);

    } catch (error: any) {
      console.error("Erro no calendário:", error);
      showAlert({ title: "Erro", message: "Não foi possível carregar a agenda." });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  return { events, loading, refresh: fetchEvents };
}