"use client";

import * as React from "react";
import { Bar, BarChart, CartesianGrid, XAxis, Line, LineChart } from "recharts";
import { trpc } from "@/trpc/react";
import { useDashboard } from "@/contexts/dashboard-context";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  ChartConfig,
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";

const usersChartConfig = {
  users: {
    label: "Users",
    color: "var(--chart-1)",
  },
} satisfies ChartConfig;

const subscribersChartConfig = {
  subscribers: {
    label: "Subscribers",
    color: "var(--chart-2)",
  },
} satisfies ChartConfig;

export function AdminCharts() {
  const { period } = useDashboard();

  const { data: analytics, isLoading } = trpc.analytics.getAnalytics.useQuery({
    period,
  });

  // Generate complete date range based on selected period
  const generateDateRange = (period: string) => {
    const endDate = new Date();
    let startDate = new Date();

    switch (period) {
      case "today":
        startDate.setHours(0, 0, 0, 0);
        endDate.setHours(23, 59, 59, 999);
        break;
      case "7d":
        startDate.setDate(endDate.getDate() - 7);
        break;
      case "30d":
        startDate.setDate(endDate.getDate() - 30);
        break;
      case "90d":
        startDate.setDate(endDate.getDate() - 90);
        break;
      case "1y":
        startDate.setFullYear(endDate.getFullYear() - 1);
        break;
      case "all":
        startDate = new Date("2020-01-01"); // Set to a very early date for all time
        break;
      default:
        startDate.setDate(endDate.getDate() - 30);
    }

    const dates = [];
    const currentDate = new Date(startDate);

    while (currentDate <= endDate) {
      dates.push(currentDate.toISOString().split("T")[0]);
      currentDate.setDate(currentDate.getDate() + 1);
    }

    return dates;
  };

  // Transform data for users chart
  const usersChartData = React.useMemo(() => {
    if (!analytics) return [];

    const { usersOverTime } = analytics;
    const dateRange = generateDateRange(period);

    const dataMap = new Map<string, { date: string; users: number }>();

    // Initialize all dates with zero values
    dateRange.forEach((date) => {
      dataMap.set(date, {
        date,
        users: 0,
      });
    });

    // Add users data
    usersOverTime?.forEach((item: any) => {
      const existing = dataMap.get(item.date);
      if (existing) {
        existing.users = item.count;
      }
    });

    return Array.from(dataMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [analytics, period]);

  // Transform data for subscribers chart
  const subscribersChartData = React.useMemo(() => {
    if (!analytics) return [];

    const { subscribersOverTime } = analytics;
    const dateRange = generateDateRange(period);

    const dataMap = new Map<string, { date: string; subscribers: number }>();

    // Initialize all dates with zero values
    dateRange.forEach((date) => {
      dataMap.set(date, {
        date,
        subscribers: 0,
      });
    });

    // Add subscribers data
    subscribersOverTime?.forEach((item: any) => {
      const existing = dataMap.get(item.date);
      if (existing) {
        existing.subscribers = item.count;
      }
    });

    return Array.from(dataMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [analytics, period]);

  // Transform data for cumulative users chart
  const cumulativeUsersChartData = React.useMemo(() => {
    if (!analytics) return [];

    const { cumulativeUsersOverTime } = analytics;
    const dateRange = generateDateRange(period);

    const dataMap = new Map<string, { date: string; users: number }>();

    // Initialize all dates with zero values
    dateRange.forEach((date) => {
      dataMap.set(date, {
        date,
        users: 0,
      });
    });

    // Add cumulative users data from backend
    cumulativeUsersOverTime?.forEach((item: any) => {
      const existing = dataMap.get(item.date);
      if (existing) {
        existing.users = item.cumulative;
      }
    });

    // Convert to array and sort by date
    return Array.from(dataMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [analytics, period]);

  // Transform data for cumulative subscribers chart
  const cumulativeSubscribersChartData = React.useMemo(() => {
    if (!analytics) return [];

    const { cumulativeSubscribersOverTime } = analytics;
    const dateRange = generateDateRange(period);

    const dataMap = new Map<string, { date: string; subscribers: number }>();

    // Initialize all dates with zero values
    dateRange.forEach((date) => {
      dataMap.set(date, {
        date,
        subscribers: 0,
      });
    });

    // Add cumulative subscribers data from backend
    cumulativeSubscribersOverTime?.forEach((item: any) => {
      const existing = dataMap.get(item.date);
      if (existing) {
        existing.subscribers = item.cumulative;
      }
    });

    // Convert to array and sort by date
    return Array.from(dataMap.values()).sort(
      (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime(),
    );
  }, [analytics, period]);

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="@container/card">
            <CardHeader>
              <div className="bg-muted h-6 w-32 animate-pulse rounded"></div>
              <div className="bg-muted h-4 w-48 animate-pulse rounded"></div>
            </CardHeader>
            <div className="bg-muted mx-4 mb-4 h-64 animate-pulse rounded"></div>
          </Card>
          <Card className="@container/card">
            <CardHeader>
              <div className="bg-muted h-6 w-32 animate-pulse rounded"></div>
              <div className="bg-muted h-4 w-48 animate-pulse rounded"></div>
            </CardHeader>
            <div className="bg-muted mx-4 mb-4 h-64 animate-pulse rounded"></div>
          </Card>
        </div>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <Card className="@container/card">
            <CardHeader>
              <div className="bg-muted h-6 w-32 animate-pulse rounded"></div>
              <div className="bg-muted h-4 w-48 animate-pulse rounded"></div>
            </CardHeader>
            <div className="bg-muted mx-4 mb-4 h-64 animate-pulse rounded"></div>
          </Card>
          <Card className="@container/card">
            <CardHeader>
              <div className="bg-muted h-6 w-32 animate-pulse rounded"></div>
              <div className="bg-muted h-4 w-48 animate-pulse rounded"></div>
            </CardHeader>
            <div className="bg-muted mx-4 mb-4 h-64 animate-pulse rounded"></div>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col gap-4">
      {/* First Row - Daily Charts */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Users Chart */}
        <Card>
          <CardHeader>
            <CardTitle>New users</CardTitle>
            <CardDescription>
              <span className="@[540px]/card:block hidden">
                New user registrations over time
              </span>
              <span className="@[540px]/card:hidden">User growth</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={usersChartConfig}
              className="h-[250px] w-full"
            >
              <BarChart accessibilityLayer data={usersChartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => {
                        return new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                      }}
                      hideLabel
                    />
                  }
                />
                <Bar dataKey="users" fill="var(--color-users)" radius={8} />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Subscribers Chart */}
        <Card>
          <CardHeader>
            <CardTitle>Subscriptions</CardTitle>
            <CardDescription>
              <span className="@[540px]/card:block hidden">
                New subscriptions over time
              </span>
              <span className="@[540px]/card:hidden">Subscription growth</span>
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={subscribersChartConfig}
              className="h-[250px] w-full"
            >
              <BarChart accessibilityLayer data={subscribersChartData}>
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  tickMargin={10}
                  axisLine={false}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => {
                        return new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                      }}
                      hideLabel
                    />
                  }
                />
                <Bar
                  dataKey="subscribers"
                  fill="var(--color-subscribers)"
                  radius={8}
                />
              </BarChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      {/* Second Row - Cumulative Charts */}
      <div className="grid min-h-0 flex-1 grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Cumulative Users Chart */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Total users (accumulative)</CardTitle>
            <CardDescription>
              <span className="@[540px]/card:block hidden">
                Cumulative user growth over time
              </span>
              <span className="@[540px]/card:hidden">Total users</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col p-6">
            <ChartContainer config={usersChartConfig} className="w-full flex-1">
              <LineChart
                accessibilityLayer
                data={cumulativeUsersChartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => {
                        return new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                      }}
                      hideLabel
                    />
                  }
                />
                <Line
                  dataKey="users"
                  type="linear"
                  stroke="var(--color-users)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>

        {/* Cumulative Subscribers Chart */}
        <Card className="flex flex-col">
          <CardHeader>
            <CardTitle>Total subscribers (accumulative)</CardTitle>
            <CardDescription>
              <span className="@[540px]/card:block hidden">
                Cumulative subscription growth over time
              </span>
              <span className="@[540px]/card:hidden">Total subscribers</span>
            </CardDescription>
          </CardHeader>
          <CardContent className="flex flex-1 flex-col p-6">
            <ChartContainer
              config={subscribersChartConfig}
              className="w-full flex-1"
            >
              <LineChart
                accessibilityLayer
                data={cumulativeSubscribersChartData}
                margin={{
                  top: 20,
                  right: 30,
                  left: 20,
                  bottom: 20,
                }}
              >
                <CartesianGrid vertical={false} />
                <XAxis
                  dataKey="date"
                  tickLine={false}
                  axisLine={false}
                  tickMargin={8}
                  tickFormatter={(value) => {
                    const date = new Date(value);
                    return date.toLocaleDateString("en-US", {
                      month: "short",
                      day: "numeric",
                    });
                  }}
                />
                <ChartTooltip
                  cursor={false}
                  content={
                    <ChartTooltipContent
                      labelFormatter={(value) => {
                        return new Date(value).toLocaleDateString("en-US", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        });
                      }}
                      hideLabel
                    />
                  }
                />
                <Line
                  dataKey="subscribers"
                  type="linear"
                  stroke="var(--color-subscribers)"
                  strokeWidth={2}
                  dot={false}
                />
              </LineChart>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
