"use client";

import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { type VariantProps, cva } from "class-variance-authority";
import { Plus } from "lucide-react";
import {
  addDays,
  addMonths,
  addYears,
  differenceInMinutes,
  format,
  getMonth,
  isSameDay,
  isSameHour,
  isSameMonth,
  isToday,
  setHours,
  setMonth,
  startOfMonth,
  startOfWeek,
  subDays,
  subMonths,
  subWeeks,
  subYears,
} from "date-fns";
import type { Locale } from "date-fns";
import { enUS } from "date-fns/locale/en-US";
import {
  createContext,
  forwardRef,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import type { ReactNode } from "react";
import { useHotkeys } from "react-hotkeys-hook";

const monthEventVariants = cva("size-2 rounded-full", {
  variants: {
    variant: {
      default: "bg-primary",
      blue: "bg-blue-500",
      green: "bg-green-500",
      pink: "bg-pink-500",
      purple: "bg-purple-500",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

const dayEventVariants = cva("font-bold border-l-4 rounded p-2 text-xs", {
  variants: {
    variant: {
      default: "bg-muted/30 text-muted-foreground border-muted",
      blue: "bg-blue-500/30 text-blue-600 border-blue-500",
      green: "bg-green-500/30 text-green-600 border-green-500",
      pink: "bg-pink-500/30 text-pink-600 border-pink-500",
      purple: "bg-purple-500/30 text-purple-600 border-purple-500",
    },
  },
  defaultVariants: {
    variant: "default",
  },
});

type View = "month" | "year";

type ContextType = {
  view: View;
  setView: (view: View) => void;
  date: Date;
  setDate: (date: Date) => void;
  events: CalendarEvent[];
  locale: Locale;
  setEvents: (date: CalendarEvent[]) => void;
  onChangeView?: (view: View) => void;
  onEventClick?: (event: CalendarEvent) => void;
  enableHotkeys?: boolean;
  today: Date;
};

const Context = createContext<ContextType>({} as ContextType);

export type CalendarEvent = {
  id: string;
  start: Date;
  end: Date;
  title: string;
  color?: VariantProps<typeof monthEventVariants>["variant"];
};

type CalendarProps = {
  children: ReactNode;
  defaultDate?: Date;
  events?: CalendarEvent[];
  view?: View;
  locale?: Locale;
  enableHotkeys?: boolean;
  onChangeView?: (view: View) => void;
  onEventClick?: (event: CalendarEvent) => void;
};

const Calendar = ({
  children,
  defaultDate = new Date(),
  locale = enUS,
  enableHotkeys = true,
  view: _defaultMode = "month",
  onEventClick,
  events: defaultEvents = [],
  onChangeView,
}: CalendarProps) => {
  const [view, setView] = useState<View>(_defaultMode);
  const [date, setDate] = useState(defaultDate);
  const [events, setEvents] = useState<CalendarEvent[]>(defaultEvents);

  const changeView = (view: View) => {
    setView(view);
    onChangeView?.(view);
  };

  useHotkeys("m", () => changeView("month"), {
    enabled: enableHotkeys,
  });

  useHotkeys("y", () => changeView("year"), {
    enabled: enableHotkeys,
  });

  return (
    <Context.Provider
      value={{
        view,
        setView,
        date,
        setDate,
        events,
        setEvents,
        locale,
        enableHotkeys,
        onEventClick,
        onChangeView,
        today: new Date(),
      }}
    >
      {children}
    </Context.Provider>
  );
};

export const useCalendar = () => useContext(Context);

const CalendarViewTrigger = forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement> & {
    view: View;
  }
>(({ children, view, ...props }, ref) => {
  const { view: currentView, setView, onChangeView } = useCalendar();

  return (
    <Button
      ref={ref}
      aria-current={currentView === view}
      size="sm"
      variant="ghost"
      {...props}
      onClick={() => {
        setView(view);
        onChangeView?.(view);
      }}
    >
      {children}
    </Button>
  );
});
CalendarViewTrigger.displayName = "CalendarViewTrigger";

const EventGroup = ({
  events,
  hour,
}: {
  events: CalendarEvent[];
  hour: Date;
}) => {
  const { onEventClick } = useCalendar();

  return (
    <div className="h-20 border-t last:border-b">
      {events
        .filter((event) => isSameHour(event.start, hour))
        .map((event) => {
          const hoursDifference =
            differenceInMinutes(event.end, event.start) / 60;
          const startPosition = event.start.getMinutes() / 60;

          return (
            <div
              key={event.id}
              className={cn(
                "relative cursor-pointer",
                dayEventVariants({ variant: event.color }),
              )}
              style={{
                top: `${startPosition * 100}%`,
                height: `${hoursDifference * 100}%`,
              }}
              onClick={() => onEventClick?.(event)}
            >
              {event.title}
            </div>
          );
        })}
    </div>
  );
};

const CalendarMonthView = ({
  onDateClick,
}: {
  onDateClick?: (date: Date) => void;
}) => {
  const { date, view, events, locale, onEventClick } = useCalendar();

  const monthDates = useMemo(() => getDaysInMonth(date), [date]);
  const weekDays = useMemo(() => generateWeekdays(locale), [locale]);

  if (view !== "month") return null;

  return (
    <div className="flex h-full flex-col overflow-hidden">
      <div className="bg-background sticky top-0 grid flex-shrink-0 grid-cols-7 gap-px border-b">
        {weekDays.map((day, i) => (
          <div
            key={day}
            className={cn(
              "text-muted-foreground mb-2 text-start text-sm",
              [0, 6].includes(i) && "text-muted-foreground/50",
            )}
          >
            {day}
          </div>
        ))}
      </div>
      <div className="-mt-px grid min-h-0 flex-1 auto-rows-fr grid-cols-7 gap-px p-px">
        {monthDates.map((_date) => {
          const currentEvents = events.filter((event) =>
            isSameDay(event.start, _date),
          );

          return (
            <div
              className={cn(
                "text-muted-foreground ring-border group hover:bg-accent/5 relative cursor-pointer overflow-hidden p-2 text-sm ring-1 transition-colors",
                !isSameMonth(date, _date) && "text-muted-foreground/50",
              )}
              key={_date.toString()}
              onClick={() => onDateClick?.(_date)}
            >
              <span
                className={cn(
                  "mb-1 grid size-6 place-items-center rounded-full",
                  isToday(_date) && "bg-primary text-primary-foreground",
                )}
              >
                {format(_date, "d")}
              </span>

              {/* Hover + button */}
              <Button
                size="sm"
                variant="ghost"
                className="absolute top-1 right-1 z-10 h-6 w-6 p-0 opacity-0 transition-opacity group-hover:opacity-100"
                onClick={(e: React.MouseEvent) => {
                  e.stopPropagation();
                  onDateClick?.(_date);
                }}
              >
                <Plus className="h-3 w-3" />
              </Button>

              <div className="max-h-20 space-y-1 overflow-hidden">
                {currentEvents.slice(0, 3).map((event) => {
                  return (
                    <div
                      key={event.id}
                      className="hover:bg-accent relative z-20 flex cursor-pointer items-center gap-1 rounded px-1 text-sm"
                      onClick={(e) => {
                        e.stopPropagation();
                        onEventClick?.(event);
                      }}
                    >
                      <div
                        className={cn(
                          "shrink-0",
                          monthEventVariants({ variant: event.color }),
                        )}
                      ></div>
                      <span className="flex-1 truncate">{event.title}</span>
                      <time className="text-muted-foreground/50 text-xs tabular-nums">
                        {format(event.start, "HH:mm")}
                      </time>
                    </div>
                  );
                })}
                {currentEvents.length > 3 && (
                  <div className="text-muted-foreground px-1 text-xs">
                    +{currentEvents.length - 3} more
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

const CalendarYearView = ({
  onDateClick,
}: {
  onDateClick?: (date: Date) => void;
}) => {
  const { view, date, today, locale } = useCalendar();

  const months = useMemo(() => {
    if (!view) {
      return [];
    }

    return Array.from({ length: 12 }).map((_, i) => {
      return getDaysInMonth(setMonth(date, i));
    });
  }, [date, view]);

  const weekDays = useMemo(() => generateWeekdays(locale), [locale]);

  if (view !== "year") return null;

  return (
    <div
      className="grid h-full grid-cols-4 gap-10 overflow-auto"
      style={{ height: "calc(100vh - 200px)" }}
    >
      {months.map((days, i) => (
        <div key={days[0]?.toString() || i}>
          <span className="text-xl">{format(setMonth(date, i), "MMMM")}</span>

          <div className="my-5 grid grid-cols-7 gap-2">
            {weekDays.map((day) => (
              <div
                key={day}
                className="text-muted-foreground text-center text-xs"
              >
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-x-2 text-center text-xs tabular-nums">
            {days.map((_date) => {
              return (
                <div
                  key={_date.toString()}
                  className={cn(
                    getMonth(_date) !== i && "text-muted-foreground",
                  )}
                >
                  <div
                    className={cn(
                      "hover:bg-accent grid aspect-square size-full cursor-pointer place-content-center rounded tabular-nums transition-colors",
                      isSameDay(today, _date) &&
                        getMonth(_date) === i &&
                        "bg-primary text-primary-foreground rounded-full",
                    )}
                    onClick={() => onDateClick?.(_date)}
                  >
                    {format(_date, "d")}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
};

const CalendarNextTrigger = forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement>
>(({ children, onClick, ...props }, ref) => {
  const { date, setDate, view, enableHotkeys } = useCalendar();

  const next = useCallback(() => {
    if (view === "month") {
      setDate(addMonths(date, 1));
    } else if (view === "year") {
      setDate(addYears(date, 1));
    }
  }, [date, view, setDate]);

  useHotkeys("ArrowRight", () => next(), {
    enabled: enableHotkeys,
  });

  return (
    <Button
      size="icon"
      variant="outline"
      ref={ref}
      {...props}
      onClick={(e: React.MouseEvent) => {
        next();
        onClick?.(e);
      }}
    >
      {children}
    </Button>
  );
});
CalendarNextTrigger.displayName = "CalendarNextTrigger";

const CalendarPrevTrigger = forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement>
>(({ children, onClick, ...props }, ref) => {
  const { date, setDate, view, enableHotkeys } = useCalendar();

  const prev = useCallback(() => {
    if (view === "month") {
      setDate(subMonths(date, 1));
    } else if (view === "year") {
      setDate(subYears(date, 1));
    }
  }, [date, view, setDate]);

  useHotkeys("ArrowLeft", () => prev(), {
    enabled: enableHotkeys,
  });

  return (
    <Button
      size="icon"
      variant="outline"
      ref={ref}
      {...props}
      onClick={(e: React.MouseEvent) => {
        prev();
        onClick?.(e);
      }}
    >
      {children}
    </Button>
  );
});
CalendarPrevTrigger.displayName = "CalendarPrevTrigger";

const CalendarTodayTrigger = forwardRef<
  HTMLButtonElement,
  React.HTMLAttributes<HTMLButtonElement>
>(({ children, onClick, ...props }, ref) => {
  const { setDate, enableHotkeys, today } = useCalendar();

  useHotkeys("t", () => jumpToToday(), {
    enabled: enableHotkeys,
  });

  const jumpToToday = useCallback(() => {
    setDate(today);
  }, [today, setDate]);

  return (
    <Button
      variant="outline"
      ref={ref}
      {...props}
      onClick={(e: React.MouseEvent) => {
        jumpToToday();
        onClick?.(e);
      }}
    >
      {children}
    </Button>
  );
});
CalendarTodayTrigger.displayName = "CalendarTodayTrigger";

const CalendarCurrentDate = () => {
  const { date, view } = useCalendar();

  return (
    <time dateTime={date.toISOString()} className="tabular-nums">
      {format(date, view === "year" ? "yyyy" : "MMMM yyyy")}
    </time>
  );
};

const TimeTable = () => {
  const now = new Date();

  return (
    <div className="w-12 pr-2">
      {Array.from(Array(25).keys()).map((hour) => {
        return (
          <div
            className="text-muted-foreground/50 relative h-20 text-right text-xs last:h-0"
            key={hour}
          >
            {now.getHours() === hour && (
              <div
                className="absolute left-full z-10 h-[2px] w-dvw translate-x-2 bg-red-500"
                style={{
                  top: `${(now.getMinutes() / 60) * 100}%`,
                }}
              >
                <div className="absolute top-1/2 left-0 size-2 -translate-x-1/2 -translate-y-1/2 rounded-full bg-red-500"></div>
              </div>
            )}
            <p className="top-0 -translate-y-1/2">
              {hour === 24 ? 0 : hour}:00
            </p>
          </div>
        );
      })}
    </div>
  );
};

const getDaysInMonth = (date: Date) => {
  const startOfMonthDate = startOfMonth(date);
  const startOfWeekForMonth = startOfWeek(startOfMonthDate, {
    weekStartsOn: 0,
  });

  let currentDate = startOfWeekForMonth;
  const calendar = [];

  while (calendar.length < 42) {
    calendar.push(new Date(currentDate));
    currentDate = addDays(currentDate, 1);
  }

  return calendar;
};

const generateWeekdays = (locale: Locale) => {
  const daysOfWeek = [];
  for (let i = 0; i < 7; i++) {
    const date = addDays(startOfWeek(new Date(), { weekStartsOn: 0 }), i);
    daysOfWeek.push(format(date, "EEEEEE", { locale }));
  }
  return daysOfWeek;
};

export {
  Calendar,
  CalendarCurrentDate,
  CalendarMonthView,
  CalendarNextTrigger,
  CalendarPrevTrigger,
  CalendarTodayTrigger,
  CalendarViewTrigger,
  CalendarYearView,
};
