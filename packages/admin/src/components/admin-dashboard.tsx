"use client";

import { trpc } from "@/trpc/react";
import { TrendingUp, TrendingDown } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardAction,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { AdminCharts } from "./admin-charts";
import { useDashboard } from "@/contexts/dashboard-context";

export function AdminDashboard() {
  const { period } = useDashboard();
  const { data: analytics, isLoading: analyticsLoading } =
    trpc.analytics.getAnalytics.useQuery({
      period,
    });

  // Get previous period data for growth calculations
  const getPreviousPeriod = (currentPeriod: string) => {
    switch (currentPeriod) {
      case "today":
        return "7d";
      case "7d":
        return "30d";
      case "30d":
        return "90d";
      case "90d":
        return "1y";
      case "1y":
        return "all";
      case "all":
        return "all";
      default:
        return "30d";
    }
  };

  const { data: previousAnalytics } = trpc.analytics.getAnalytics.useQuery({
    period: getPreviousPeriod(period),
  });

  // Calculate growth rates
  const calculateGrowthRate = (current: number, previous: number) => {
    if (previous === 0) return current > 0 ? 100 : 0;
    return ((current - previous) / previous) * 100;
  };

  if (analyticsLoading) {
    return (
      <div className="flex flex-1 flex-col gap-2">
        <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
          <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:shadow-xs grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
            {[...Array(4)].map((_, i) => (
              <Card key={i} className="@container/card animate-pulse">
                <CardHeader>
                  <div className="bg-muted h-4 w-24 rounded"></div>
                  <div className="bg-muted mt-2 h-8 w-16 rounded"></div>
                  <div className="bg-muted ml-auto mt-2 h-6 w-12 rounded"></div>
                </CardHeader>
                <CardFooter>
                  <div className="bg-muted h-3 w-32 rounded"></div>
                </CardFooter>
              </Card>
            ))}
          </div>
          <div className="px-4 lg:px-6">
            <div className="space-y-4">
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="animate-pulse">
                  <CardHeader>
                    <div className="bg-muted h-6 w-32 rounded"></div>
                    <div className="bg-muted h-4 w-48 rounded"></div>
                  </CardHeader>
                  <div className="bg-muted mx-4 mb-4 h-64 rounded"></div>
                </Card>
                <Card className="animate-pulse">
                  <CardHeader>
                    <div className="bg-muted h-6 w-32 rounded"></div>
                    <div className="bg-muted h-4 w-48 rounded"></div>
                  </CardHeader>
                  <div className="bg-muted mx-4 mb-4 h-64 rounded"></div>
                </Card>
              </div>
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
                <Card className="animate-pulse">
                  <CardHeader>
                    <div className="bg-muted h-6 w-32 rounded"></div>
                    <div className="bg-muted h-4 w-48 rounded"></div>
                  </CardHeader>
                  <div className="bg-muted mx-4 mb-4 h-64 rounded"></div>
                </Card>
                <Card className="animate-pulse">
                  <CardHeader>
                    <div className="bg-muted h-6 w-32 rounded"></div>
                    <div className="bg-muted h-4 w-48 rounded"></div>
                  </CardHeader>
                  <div className="bg-muted mx-4 mb-4 h-64 rounded"></div>
                </Card>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const summary = analytics?.summary || {
    totalUsers: 0,
    totalOrganizations: 0,
    totalSubscribers: 0,
  };

  const previousSummary = previousAnalytics?.summary || {
    totalUsers: 0,
    totalOrganizations: 0,
    totalSubscribers: 0,
  };

  const userGrowth = calculateGrowthRate(
    summary.totalUsers,
    previousSummary.totalUsers,
  );
  const organizationGrowth = calculateGrowthRate(
    summary.totalOrganizations,
    previousSummary.totalOrganizations,
  );
  const subscriberGrowth = calculateGrowthRate(
    summary.totalSubscribers,
    previousSummary.totalSubscribers,
  );

  // Format period labels
  const getPeriodLabel = (period: string) => {
    switch (period) {
      case "today":
        return "today";
      case "7d":
        return "last 7 days";
      case "30d":
        return "last 30 days";
      case "90d":
        return "last 90 days";
      case "1y":
        return "last year";
      case "all":
        return "all time";
      default:
        return period;
    }
  };

  const getPreviousPeriodLabel = (currentPeriod: string) => {
    switch (currentPeriod) {
      case "today":
        return "last 7 days";
      case "7d":
        return "last 30 days";
      case "30d":
        return "last 90 days";
      case "90d":
        return "last year";
      case "1y":
        return "all time";
      case "all":
        return "all time";
      default:
        return "previous period";
    }
  };

  return (
    <div className="flex flex-1 flex-col gap-2">
      <div className="flex flex-col gap-4 py-4 md:gap-6 md:py-6">
        {/* Summary Cards */}
        <div className="*:data-[slot=card]:from-primary/5 *:data-[slot=card]:to-card dark:*:data-[slot=card]:bg-card *:data-[slot=card]:shadow-xs grid grid-cols-1 gap-4 px-4 *:data-[slot=card]:bg-gradient-to-t sm:grid-cols-2 lg:grid-cols-4 lg:px-6">
          <Card className="@container/card">
            <CardHeader>
              <CardDescription>
                Users ({getPeriodLabel(period)})
              </CardDescription>
              <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                {summary.totalUsers.toLocaleString()}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  {userGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {userGrowth >= 0 ? "+" : ""}
                  {userGrowth.toFixed(1)}%
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="text-muted-foreground text-sm">
              {previousSummary.totalUsers.toLocaleString()} in{" "}
              {getPreviousPeriodLabel(period)}
            </CardFooter>
          </Card>

          <Card className="@container/card">
            <CardHeader>
              <CardDescription>
                Organizations ({getPeriodLabel(period)})
              </CardDescription>
              <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                {summary.totalOrganizations.toLocaleString()}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  {organizationGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {organizationGrowth >= 0 ? "+" : ""}
                  {organizationGrowth.toFixed(1)}%
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="text-muted-foreground text-sm">
              {previousSummary.totalOrganizations.toLocaleString()} in{" "}
              {getPreviousPeriodLabel(period)}
            </CardFooter>
          </Card>

          <Card className="@container/card">
            <CardHeader>
              <CardDescription>
                Subscribers ({getPeriodLabel(period)})
              </CardDescription>
              <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                {summary.totalSubscribers.toLocaleString()}
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  {subscriberGrowth >= 0 ? (
                    <TrendingUp className="h-4 w-4" />
                  ) : (
                    <TrendingDown className="h-4 w-4" />
                  )}
                  {subscriberGrowth >= 0 ? "+" : ""}
                  {subscriberGrowth.toFixed(1)}%
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="text-muted-foreground text-sm">
              {previousSummary.totalSubscribers.toLocaleString()} in{" "}
              {getPreviousPeriodLabel(period)}
            </CardFooter>
          </Card>

          <Card className="@container/card">
            <CardHeader>
              <CardDescription>
                Conversion Rate ({getPeriodLabel(period)})
              </CardDescription>
              <CardTitle className="@[250px]/card:text-3xl text-2xl font-semibold tabular-nums">
                {summary.totalUsers > 0
                  ? (
                      (summary.totalSubscribers / summary.totalUsers) *
                      100
                    ).toFixed(1)
                  : 0}
                %
              </CardTitle>
              <CardAction>
                <Badge variant="outline">
                  <TrendingUp className="h-4 w-4" />
                  {(previousSummary.totalUsers > 0
                    ? (previousSummary.totalSubscribers /
                        previousSummary.totalUsers) *
                      100
                    : 0) -
                    (summary.totalUsers > 0
                      ? (summary.totalSubscribers / summary.totalUsers) * 100
                      : 0) >=
                  0
                    ? "+"
                    : ""}
                  {(
                    (summary.totalUsers > 0
                      ? (summary.totalSubscribers / summary.totalUsers) * 100
                      : 0) -
                    (previousSummary.totalUsers > 0
                      ? (previousSummary.totalSubscribers /
                          previousSummary.totalUsers) *
                        100
                      : 0)
                  ).toFixed(1)}
                  %
                </Badge>
              </CardAction>
            </CardHeader>
            <CardFooter className="text-muted-foreground text-sm">
              {previousSummary.totalUsers > 0
                ? (
                    (previousSummary.totalSubscribers /
                      previousSummary.totalUsers) *
                    100
                  ).toFixed(1)
                : 0}
              % in {getPreviousPeriodLabel(period)}
            </CardFooter>
          </Card>
        </div>

        {/* Charts */}
        <div className="px-4 lg:px-6">
          <AdminCharts />
        </div>
      </div>
    </div>
  );
}
