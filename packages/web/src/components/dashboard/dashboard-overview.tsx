"use client";

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar, Clock, Users, Plus, Eye } from "lucide-react";
import { api } from "@/trpc/react";
import { format, isToday, isTomorrow, addDays } from "date-fns";
import { useRouter } from "next/navigation";

export function DashboardOverview() {
  const router = useRouter();
  const today = new Date();
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);

  // Fetch data for dashboard
  const { data: patients = [], isLoading: patientsLoading } =
    api.patients.getAll.useQuery();
  const { data: upcomingAppointments = [], isLoading: appointmentsLoading } =
    api.appointments.getUpcoming.useQuery();

  // Get today's appointments
  const todaysAppointments = upcomingAppointments.filter((apt) =>
    isToday(new Date(apt.startTime)),
  );

  // Get tomorrow's appointments
  const tomorrowsAppointments = upcomingAppointments.filter((apt) =>
    isTomorrow(new Date(apt.startTime)),
  );

  // Get recent patients (last 5)
  const recentPatients = patients.slice(0, 5);

  const stats = {
    totalPatients: patients.length,
    todaysAppointments: todaysAppointments.length,
    tomorrowsAppointments: tomorrowsAppointments.length,
    upcomingAppointments: upcomingAppointments.length,
  };

  if (patientsLoading || appointmentsLoading) {
    return (
      <div className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[...Array(4)].map((_, i) => (
            <Card key={i}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <div className="bg-muted h-4 w-20 animate-pulse rounded" />
                <div className="bg-muted h-4 w-4 animate-pulse rounded" />
              </CardHeader>
              <CardContent>
                <div className="bg-muted mb-2 h-8 w-16 animate-pulse rounded" />
                <div className="bg-muted h-3 w-24 animate-pulse rounded" />
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Total des patients
            </CardTitle>
            <Users className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.totalPatients}</div>
            <p className="text-muted-foreground text-xs">Patients enregistrés</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Rendez-vous d'aujourd'hui
            </CardTitle>
            <Calendar className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.todaysAppointments}</div>
            <p className="text-muted-foreground text-xs">Programmés pour aujourd'hui</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Rendez-vous de demain
            </CardTitle>
            <Clock className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.tomorrowsAppointments}
            </div>
            <p className="text-muted-foreground text-xs">
              Programmés pour demain
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Rendez-vous à venir
            </CardTitle>
            <Calendar className="text-muted-foreground h-4 w-4" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.upcomingAppointments}
            </div>
            <p className="text-muted-foreground text-xs">7 prochains jours</p>
          </CardContent>
        </Card>
      </div>

      {/* Today's Appointments */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Rendez-vous d'aujourd'hui</CardTitle>
              <CardDescription>
                {format(today, "EEEE, MMMM do, yyyy")}
              </CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/calendar")}
            >
              <Eye className="mr-2 h-4 w-4" />
              Voir le calendrier
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {todaysAppointments.length === 0 ? (
            <div className="py-6 text-center">
              <Calendar className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <p className="text-muted-foreground">
                Aucun rendez-vous programmé pour aujourd'hui
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {todaysAppointments.slice(0, 5).map((appointment) => (
                <div
                  key={appointment.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div className="flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <h4 className="font-medium">{appointment.title}</h4>
                      <Badge variant="outline" className="text-xs">
                        {appointment.type.replace("_", " ")}
                      </Badge>
                    </div>
                    <p className="text-muted-foreground text-sm">
                      {appointment.patient.firstName}{" "}
                      {appointment.patient.lastName}
                    </p>
                  </div>
                  <div className="text-muted-foreground text-sm">
                    {format(new Date(appointment.startTime), "h:mm a")}
                  </div>
                </div>
              ))}
              {todaysAppointments.length > 5 && (
                <p className="text-muted-foreground text-center text-sm">
                  +{todaysAppointments.length - 5} autres rendez-vous
                </p>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recent Patients */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Patients récents</CardTitle>
              <CardDescription>Derniers patients enregistrés</CardDescription>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => router.push("/patients")}
            >
              <Eye className="mr-2 h-4 w-4" />
              Voir tout
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {recentPatients.length === 0 ? (
            <div className="py-6 text-center">
              <Users className="text-muted-foreground mx-auto mb-4 h-12 w-12" />
              <p className="text-muted-foreground">
                Aucun patient enregistré pour le moment
              </p>
              <Button className="mt-4" onClick={() => router.push("/patients")}>
                <Plus className="mr-2 h-4 w-4" />
                Ajouter le premier patient
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {recentPatients.map((patient) => (
                <div
                  key={patient.id}
                  className="flex items-center justify-between rounded-lg border p-3"
                >
                  <div>
                    <h4 className="font-medium">
                      {patient.firstName} {patient.lastName}
                    </h4>
                    <p className="text-muted-foreground text-sm">
                      {patient.email ||
                        patient.phoneNumber ||
                        "Aucune information de contact"}
                    </p>
                  </div>
                  {patient.age && (
                    <Badge variant="secondary">{patient.age} ans</Badge>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
